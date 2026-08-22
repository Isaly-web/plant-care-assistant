import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getPlantIdentificationProvider, ProviderError, type ImageInput } from "./providers/index.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STORAGE_BUCKET = "plant-identification-photos";

// Basic abuse/cost protection until a real subscription plan exists (see
// section 12 of the spec) — a fixed per-user daily cap on identification
// attempts, checked before any AI call is made. Designed so a future
// subscription tier can replace the constant with a per-user limit column
// without changing the shape of this check.
const DAILY_IDENTIFICATION_LIMIT = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

type RawCandidate = { scientific_name: string; common_name: string; confidence: number };

/** snake_case (AI schema / DB storage) -> camelCase (client contract). */
function toClientCandidate(raw: RawCandidate) {
  return { scientificName: raw.scientific_name, commonName: raw.common_name, confidence: raw.confidence };
}

type LogParams = {
  userId: string;
  identificationId: string | null;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  processingTimeMs: number;
  status: "success" | "error";
  errorType?: string;
  error?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const provider = getPlantIdentificationProvider();

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  // Runs with the caller's own JWT — never the service role — so every read
  // and write below is already scoped by RLS to the caller's own rows.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    db: { schema: "plant_care" },
    auth: { persistSession: false },
  });

  async function logAttempt(params: LogParams) {
    try {
      await supabase.from("ai_identification_log").insert({
        user_id: params.userId,
        identification_id: params.identificationId,
        provider: params.provider,
        model: params.model,
        input_tokens: params.inputTokens ?? null,
        output_tokens: params.outputTokens ?? null,
        processing_time_ms: params.processingTimeMs,
        status: params.status,
        error_type: params.errorType ?? null,
        error: params.error ?? null,
      });
    } catch (err) {
      console.error(`[identify-plant:${requestId}] failed to write ai_identification_log`, err);
    }
  }

  let userId: string | null = null;
  let identificationId: string | null = null;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);
    userId = user.id;

    const body = await req.json().catch(() => null);
    identificationId = typeof body?.identificationId === "string" ? body.identificationId : null;
    if (!identificationId) return json({ error: "identificationId saknas" }, 400);

    // --- identification row (RLS on the user's own JWT scopes this to their row) ---
    const { data: identification, error: fetchError } = await supabase
      .from("plant_identifications")
      .select("id, storage_path, status, ai_scientific_name, ai_common_name, ai_confidence, ai_alternatives, ai_observations")
      .eq("id", identificationId)
      .maybeSingle();
    if (fetchError || !identification) return json({ error: "Identifieringen hittades inte." }, 404);

    // Idempotent on retry: a completed/confirmed identification is returned
    // as-is instead of spending another AI call.
    if (identification.status === "completed" || identification.status === "confirmed") {
      return json({
        identification: {
          scientificName: identification.ai_scientific_name,
          commonName: identification.ai_common_name,
          confidence: identification.ai_confidence,
        },
        alternatives: ((identification.ai_alternatives ?? []) as RawCandidate[]).map(toClientCandidate),
        observations: (identification.ai_observations ?? []) as string[],
      });
    }

    // --- rate limit (unenforced beyond this fixed cap — see comment above) ---
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("plant_identifications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((recentCount ?? 0) > DAILY_IDENTIFICATION_LIMIT) {
      return json({ error: "Du har nått din gräns för växtidentifieringar idag. Försök igen imorgon." }, 429);
    }

    // --- download the photo (private bucket, same user's JWT) ---
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(identification.storage_path);
    if (downloadError || !fileData) {
      return json({ error: "Kunde inte läsa den uppladdade bilden." }, 500);
    }
    const bytes = new Uint8Array(await fileData.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const image: ImageInput = { mediaType: fileData.type || "image/jpeg", base64: btoa(binary) };

    // --- call the configured AI provider (see providers/index.ts) ---
    let analysis;
    let usage: { inputTokens?: number; outputTokens?: number } = {};
    try {
      const result = await provider.analyze(image);
      analysis = result.analysis;
      usage = result.usage;
    } catch (err) {
      const providerError =
        err instanceof ProviderError
          ? err
          : new ProviderError("provider_error", "AI-tjänsten kunde inte analysera bilden.", err);
      // Technical detail (provider status codes, raw payload snippets,
      // validation issues) stays server-side in the log. Only the
      // pre-written, safe message goes to the client.
      console.error(
        `[identify-plant:${requestId}] ${providerError.code}: ${providerError.message}`,
        providerError.technicalDetail,
      );
      await supabase
        .from("plant_identifications")
        .update({ status: "failed", error_message: providerError.code })
        .eq("id", identificationId);
      await logAttempt({
        userId,
        identificationId,
        provider: provider.name,
        model: provider.model,
        processingTimeMs: Date.now() - startedAt,
        status: "error",
        errorType: providerError.code,
        error: String(providerError.technicalDetail ?? providerError.message).slice(0, 500),
      });
      const status =
        providerError.code === "missing_api_key"
          ? 500
          : providerError.code === "invalid_response"
            ? 422
            : 502;
      return json({ error: providerError.message }, status);
    }

    // --- persist the AI's observation (never the user-confirmed identity — see plants table) ---
    const { error: updateError } = await supabase
      .from("plant_identifications")
      .update({
        status: "completed",
        ai_scientific_name: analysis.identification.scientific_name,
        ai_common_name: analysis.identification.common_name,
        ai_confidence: analysis.identification.confidence,
        ai_alternatives: analysis.alternatives,
        ai_observations: analysis.observations,
        ai_provider: provider.name,
        ai_model: provider.model,
        ai_raw_response: analysis,
        identified_at: new Date().toISOString(),
      })
      .eq("id", identificationId);
    if (updateError) {
      await logAttempt({
        userId,
        identificationId,
        provider: provider.name,
        model: provider.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        processingTimeMs: Date.now() - startedAt,
        status: "error",
        errorType: "db_update",
        error: updateError.message,
      });
      return json({ error: "Kunde inte spara identifieringen." }, 500);
    }

    await logAttempt({
      userId,
      identificationId,
      provider: provider.name,
      model: provider.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      processingTimeMs: Date.now() - startedAt,
      status: "success",
    });

    return json({
      identification: toClientCandidate(analysis.identification),
      alternatives: analysis.alternatives.map(toClientCandidate),
      observations: analysis.observations,
    });
  } catch (err) {
    console.error(`[identify-plant:${requestId}] unhandled error`, err);
    if (userId) {
      await logAttempt({
        userId,
        identificationId,
        provider: provider.name,
        model: provider.model,
        processingTimeMs: Date.now() - startedAt,
        status: "error",
        errorType: "unhandled",
        error: String(err).slice(0, 500),
      });
    }
    return json({ error: "Ett oväntat fel uppstod. Försök igen." }, 500);
  }
});
