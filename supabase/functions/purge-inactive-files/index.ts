import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { purgeInactiveFiles } from "./purge.ts";

// POST /functions/v1/purge-inactive-files — removes plant photos after 12 months of inactivity
// (backlog B3). Only callable with the service-role key (pg_cron via Vault); the publishable key
// is public and never accepted. Body {"dryRun": true} only reports. NOT scheduled until a lawyer
// has confirmed the period; run a dry run first.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sameSecret(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0 && a.length === b.length;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const token = /^Bearer (.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!serviceKey || !url || !token || !(await sameSecret(token, serviceKey))) {
    return json({ error: "Unauthorized" }, 401);
  }
  let dryRun = false;
  try {
    dryRun = ((await req.json()) as { dryRun?: unknown })?.dryRun === true;
  } catch {
    /* empty body = real run */
  }
  try {
    const admin = createClient(url, serviceKey, {
      db: { schema: "plant_care" },
      auth: { persistSession: false },
    });
    return json(await purgeInactiveFiles(admin, { dryRun }));
  } catch {
    return json({ error: "Purge failed" }, 500);
  }
});
