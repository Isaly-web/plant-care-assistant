import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Server-only: verifies the caller's Supabase JWT for TanStack Start server
// functions (createServerFn().middleware([requireSupabaseAuth])). Reuses the
// same VITE_SUPABASE_* vars as the browser client (src/integrations/supabase/client.ts)
// — Vite inlines import.meta.env in server bundles too, but only for
// statically-analyzable property access (import.meta.env["LITERAL_NAME"]);
// a computed/variable key isn't inlined and reads back as undefined, so the
// two lookups below must stay as separate literal accesses, not a shared
// helper indexed by a parameter.
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY saknas — se .env.example");
    }

    const request = getRequest();
    const authHeader = request?.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: no bearer token provided");
    }
    const token = authHeader.slice("Bearer ".length);
    if (token.split(".").length !== 3) {
      throw new Error("Unauthorized: invalid token");
    }

    const supabase = createClient<Database, "plant_care">(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      db: { schema: "plant_care" },
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Unauthorized: invalid token");
    }

    return next({ context: { supabase, userId: data.claims.sub, claims: data.claims } });
  },
);
