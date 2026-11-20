import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getSession();
    // Back to the page the user tried to open once they have signed in (Isaly App Foundation).
    if (error || !data.session)
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    return { session: data.session };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
