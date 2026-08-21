import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Proxies feedback to the central Isaly Feedback Hub (isaly-platform,
// https://feedback.isaly.se) — the same hub Hönskoll, Studieplan, Quick Job
// Fit and Snap & Savor report into. No local feedback table: everything is
// stored in the hub. FEEDBACK_HUB_API_KEY is a Supabase secret (never
// VITE_-prefixed, so it never reaches the client bundle) tied to a row for
// this app in isaly-platform-prod's `apps` table.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function hubBase(): string {
  return (Deno.env.get("FEEDBACK_HUB_URL") || "https://feedback.isaly.se").replace(/\/$/, "");
}

function hubApiKey(): string {
  const key = Deno.env.get("FEEDBACK_HUB_API_KEY");
  if (!key) throw new Error("Feedback Hub saknar API-nyckel (FEEDBACK_HUB_API_KEY).");
  return key;
}

const CATEGORIES = new Set(["bug", "suggestion", "other"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) return json({ error: "Unauthorized" }, 401);
  const email = user.email;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const op = body?.["op"];

  try {
    if (op === "submit") {
      const message = typeof body?.["message"] === "string" ? (body["message"] as string).trim() : "";
      if (!message || message.length > 4000) return json({ error: "Ogiltigt meddelande." }, 400);
      const category = CATEGORIES.has(body?.["category"] as string) ? (body!["category"] as string) : "other";

      const res = await fetch(`${hubBase()}/api/public/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: hubApiKey(),
          message,
          category,
          user_identifier: email,
          page_url: body?.["page_url"] ?? null,
          os: body?.["os"] ?? null,
          device: body?.["device"] ?? null,
        }),
      });
      if (!res.ok) {
        console.error(`[feedback-hub] submit failed ${res.status}: ${await res.text().catch(() => "")}`);
        return json({ error: "Kunde inte skicka feedback just nu. Försök igen om en stund." }, 502);
      }
      const result = (await res.json().catch(() => ({}))) as { id?: string };
      return json({ id: result.id ?? null });
    }

    if (op === "list") {
      const url = new URL(`${hubBase()}/api/public/feedback/mine`);
      url.searchParams.set("api_key", hubApiKey());
      url.searchParams.set("user_identifier", email);
      const res = await fetch(url);
      if (!res.ok) return json({ error: "Kunde inte hämta din feedback just nu." }, 502);
      const result = (await res.json()) as { feedback?: unknown[] };
      return json({ feedback: result.feedback ?? [] });
    }

    if (op === "get") {
      const id = typeof body?.["id"] === "string" ? (body["id"] as string) : "";
      if (!id) return json({ error: "id saknas." }, 400);
      const url = new URL(`${hubBase()}/api/public/feedback/mine/${encodeURIComponent(id)}`);
      url.searchParams.set("api_key", hubApiKey());
      url.searchParams.set("user_identifier", email);
      const res = await fetch(url);
      if (!res.ok) return json({ error: "Kunde inte hämta ärendet just nu." }, 502);
      const result = (await res.json()) as { feedback?: unknown; replies?: unknown[] };
      if (!result.feedback) return json({ error: "Ärendet hittades inte." }, 404);
      return json({ feedback: result.feedback, replies: result.replies ?? [] });
    }

    return json({ error: "Okänd åtgärd." }, 400);
  } catch (err) {
    console.error("[feedback-hub] unhandled error", err);
    return json({ error: err instanceof Error ? err.message : "Ett oväntat fel uppstod." }, 500);
  }
});
