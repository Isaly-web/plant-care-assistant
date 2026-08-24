import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getPlantDiagnosisProvider, ProviderError, type ImageInput } from "./providers/index.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STORAGE_BUCKET = "plant-diagnosis-photos";

// Basic abuse/cost protection until a real subscription plan exists — same
// pattern and rationale as identify-plant's DAILY_IDENTIFICATION_LIMIT.
const DAILY_DIAGNOSIS_LIMIT = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

type RawCandidate = {
  issue_type: string;
  name: string;
  confidence: number;
  severity: string | null;
  description: string;
  recommended_actions: string[];
};

/** snake_case (AI schema / DB storage) -> camelCase (client contract). */
function toClientCandidate(raw: RawCandidate) {
  return {
    issueType: raw.issue_type,
    name: raw.name,
    confidence: raw.confidence,
    severity: raw.severity,
    description: raw.description,
    recommendedActions: raw.recommended_actions,
  };
}

type LogParams = {
  userId: string;
  diagnosisId: string | null;
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
  const provider = getPlantDiagnosisProvider();

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
      await supabase.from("ai_diagnosis_log").insert({
        user_id: params.userId,
        diagnosis_id: params.diagnosisId,
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
      console.error(`[diagnose-plant:${requestId}] failed to write ai_diagnosis_log`, err);
    }
  }

  let userId: string | null = null;
  let diagnosisId: string | null = null;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);
    userId = user.id;

    const body = await req.json().catch(() => null);
    diagnosisId = typeof body?.diagnosisId === "string" ? body.diagnosisId : null;
    if (!diagnosisId) return json({ error: "diagnosisId saknas" }, 400);

    // --- diagnosis row (RLS on the user's own JWT scopes this to their row) ---
    const { data: diagnosis, error: fetchError } = await supabase
      .from("plant_diagnoses")
      .select(
        "id, plant_id, storage_path, symptom_description, status, ai_issue_type, ai_name, ai_confidence, ai_severity, ai_description, ai_recommended_actions, ai_alternatives, ai_observations",
      )
      .eq("id", diagnosisId)
      .maybeSingle();
    if (fetchError || !diagnosis) return json({ error: "Diagnosen hittades inte." }, 404);

    // Idempotent on retry: a completed/acknowledged diagnosis is returned
    // as-is instead of spending another AI call.
    if (diagnosis.status === "completed" || diagnosis.status === "acknowledged") {
      return json({
        diagnosis: {
          issueType: diagnosis.ai_issue_type,
          name: diagnosis.ai_name,
          confidence: diagnosis.ai_confidence,
          severity: diagnosis.ai_severity,
          description: diagnosis.ai_description,
          recommendedActions: (diagnosis.ai_recommended_actions ?? []) as string[],
        },
        alternatives: ((diagnosis.ai_alternatives ?? []) as RawCandidate[]).map(toClientCandidate),
        observations: (diagnosis.ai_observations ?? []) as string[],
      });
    }

    // --- rate limit (unenforced beyond this fixed cap — see comment above) ---
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("plant_diagnoses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((recentCount ?? 0) > DAILY_DIAGNOSIS_LIMIT) {
      return json({ error: "Du har nått din gräns för växtdiagnoser idag. Försök igen imorgon." }, 429);
    }

    // --- plant context for the prompt (RLS scopes this to the caller's own plant) ---
    const { data: plant, error: plantError } = await supabase
      .from("plants")
      .select("name, species, indoor_outdoor")
      .eq("id", diagnosis.plant_id)
      .maybeSingle();
    if (plantError || !plant) return json({ error: "Växten hittades inte." }, 404);

    // --- download the photo (private bucket, same user's JWT) ---
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(diagnosis.storage_path);
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
      const result = await provider.analyze(image, {
        plantName: plant.name,
        species: plant.species,
        indoorOutdoor: plant.indoor_outdoor,
        symptomDescription: diagnosis.symptom_description,
      });
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
        `[diagnose-plant:${requestId}] ${providerError.code}: ${providerError.message}`,
        providerError.technicalDetail,
      );
      await supabase
        .from("plant_diagnoses")
        .update({ status: "failed", error_message: providerError.code })
        .eq("id", diagnosisId);
      await logAttempt({
        userId,
        diagnosisId,
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

    // --- persist the AI's observation ---
    const { error: updateError } = await supabase
      .from("plant_diagnoses")
      .update({
        status: "completed",
        ai_issue_type: analysis.diagnosis.issue_type,
        ai_name: analysis.diagnosis.name,
        ai_confidence: analysis.diagnosis.confidence,
        ai_severity: analysis.diagnosis.severity,
        ai_description: analysis.diagnosis.description,
        ai_recommended_actions: analysis.diagnosis.recommended_actions,
        ai_alternatives: analysis.alternatives,
        ai_observations: analysis.observations,
        ai_provider: provider.name,
        ai_model: provider.model,
        ai_raw_response: analysis,
        diagnosed_at: new Date().toISOString(),
      })
      .eq("id", diagnosisId);
    if (updateError) {
      await logAttempt({
        userId,
        diagnosisId,
        provider: provider.name,
        model: provider.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        processingTimeMs: Date.now() - startedAt,
        status: "error",
        errorType: "db_update",
        error: updateError.message,
      });
      return json({ error: "Kunde inte spara diagnosen." }, 500);
    }

    await logAttempt({
      userId,
      diagnosisId,
      provider: provider.name,
      model: provider.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      processingTimeMs: Date.now() - startedAt,
      status: "success",
    });

    return json({
      diagnosis: toClientCandidate(analysis.diagnosis),
      alternatives: analysis.alternatives.map(toClientCandidate),
      observations: analysis.observations,
    });
  } catch (err) {
    console.error(`[diagnose-plant:${requestId}] unhandled error`, err);
    if (userId) {
      await logAttempt({
        userId,
        diagnosisId,
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
