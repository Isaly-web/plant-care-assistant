import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationsQuery } from "@/hooks/queries";
import { formatRelativePast } from "@/lib/date";
import { Bell, LogOut, MessageSquare, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/installningar")({
  head: () => ({ meta: [{ title: "Inställningar – Plant Care Assistant" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const notificationsQuery = useNotificationsQuery();

  // _authenticated/route.tsx's auth guard only runs on route transitions
  // (beforeLoad), not reactively when the session context updates — so
  // signOut() alone leaves the user stranded on the current protected page
  // until a manual refresh. Navigate explicitly instead of relying on that
  // guard to react to the state change on its own.
  async function handleSignOut() {
    await signOut();
    navigate({ to: "/logga-in", replace: true });
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Inställningar" />

      <Card className="p-4">
        <p className="text-sm text-[var(--color-ink-muted)]">Inloggad som</p>
        <p className="font-medium">{user?.email}</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Logga ut
        </Button>
      </Card>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
          <Bell className="h-4 w-4" /> Notiser
        </h2>
        <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
          Push-notiser är förberedda men inte aktiverade ännu. Här är notishistoriken.
        </p>
        {(notificationsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Inga notiser ännu.</p>
        ) : (
          <div className="space-y-2">
            {notificationsQuery.data!.map((n) => (
              <Card key={n.id} className="p-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">{n.message}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{formatRelativePast(n.createdAt)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <button onClick={() => navigate({ to: "/feedback" })} className="w-full text-left">
        <Card className="flex items-center gap-3 p-4">
          <MessageSquare className="h-4 w-4 text-[var(--color-ink-muted)]" />
          <div className="flex-1">
            <p className="text-sm font-medium">Min feedback</p>
            <p className="text-xs text-[var(--color-ink-muted)]">Se status och svar på feedback du skickat in</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--color-ink-muted)]" />
        </Card>
      </button>

      <Card className="p-4 text-xs text-[var(--color-ink-muted)]">
        Plant Care Assistant · MVP · Väderdata är mockad tills en riktig väder-API kopplas in.
      </Card>
    </div>
  );
}
