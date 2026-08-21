import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { usePlantBoard } from "@/hooks/usePlantBoard";
import { useLogCompletedTask, useSeedDemoData } from "@/hooks/mutations";
import { Button } from "@/components/ui/button";
import type { RecommendedAction } from "@/types/domain";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Idag – Plant Care Assistant" }] }),
  component: TodayPage,
});

function TodayPage() {
  const { entries, actions, isLoading } = usePlantBoard();
  const logCompleted = useLogCompletedTask();
  const seedDemo = useSeedDemoData();

  const urgent = useMemo(() => actions.filter((a) => a.urgency === "urgent"), [actions]);
  const soon = useMemo(() => actions.filter((a) => a.urgency === "soon"), [actions]);
  const okEntries = useMemo(() => entries.filter((e) => e.status === "ok"), [entries]);

  function handleComplete(action: RecommendedAction) {
    logCompleted.mutate({
      plantId: action.plantId,
      taskType: action.taskType,
      title: action.title,
      description: action.reason,
      priority: action.priority,
      source: "rule_engine",
    });
  }

  const todayLabel = format(new Date(), "EEEE d MMMM", { locale: sv });

  return (
    <div>
      <PageHeader title="Idag" subtitle={capitalize(todayLabel)} />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="Inga växter ännu"
          description="Lägg till din första växt så börjar Plant Care Assistant hålla koll åt dig."
          action={
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/vaxter/ny"
                className="inline-flex h-11 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-medium text-white"
              >
                Lägg till växt
              </Link>
              <Button variant="ghost" size="sm" disabled={seedDemo.isPending} onClick={() => seedDemo.mutate()}>
                {seedDemo.isPending ? "Laddar demodata…" : "Eller prova med exempeldata"}
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-8">
          <Section title="Behöver göras idag" emoji="🔴" count={urgent.length}>
            {urgent.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">Inget akut just nu.</p>
            ) : (
              urgent.map((action) => (
                <TaskRow key={action.id} action={action} onComplete={handleComplete} isCompleting={logCompleted.isPending} />
              ))
            )}
          </Section>

          <Section title="Snart" emoji="🟡" count={soon.length}>
            {soon.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">Inget som närmar sig.</p>
            ) : (
              soon.map((action) => (
                <TaskRow key={action.id} action={action} onComplete={handleComplete} isCompleting={logCompleted.isPending} />
              ))
            )}
          </Section>

          <Section title="Inget att göra" emoji="🟢" count={okEntries.length}>
            {okEntries.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">Alla växter har något på gång.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {okEntries.map(({ plant, nextUpSummary }) => (
                  <Link
                    key={plant.id}
                    to="/vaxter/$id"
                    params={{ id: plant.id }}
                    className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  >
                    <span>{plant.emoji}</span>
                    <span className="font-medium">{plant.name}</span>
                    {nextUpSummary && <span className="text-[var(--color-ink-muted)]">· {nextUpSummary}</span>}
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, emoji, count, children }: { title: string; emoji: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-ink)]">
        <span>{emoji}</span>
        {title}
        {count > 0 && <span className="text-sm font-normal text-[var(--color-ink-muted)]">({count})</span>}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
