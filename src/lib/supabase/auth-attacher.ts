import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

// Must be registered as a global `functionMiddleware` in src/start.ts —
// otherwise the browser never attaches the bearer token to serverFn RPCs,
// and src/lib/supabase/server-auth.ts rejects every call as unauthorized.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
