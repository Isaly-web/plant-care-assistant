import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { HarvestFormDialog } from "@/components/harvest/HarvestFormDialog";
import { usePlantsWithSpecies, useAllHarvestsQuery } from "@/hooks/queries";
import { formatFullDate, monthName } from "@/lib/date";

export const Route = createFileRoute("/_authenticated/skord")({
  head: () => ({ meta: [{ title: "Skörd – Plant Care Assistant" }] }),
  component: HarvestPage,
});

function HarvestPage() {
  const { data: plants, isLoading: plantsLoading } = usePlantsWithSpecies();
  const harvestsQuery = useAllHarvestsQuery();

  const plantById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);

  const upcoming = useMemo(
    () =>
      plants.filter(
        (p) => p.speciesDetails?.harvestStartMonth !== null && p.speciesDetails?.harvestStartMonth !== undefined,
      ),
    [plants],
  );

  const isLoading = plantsLoading || harvestsQuery.isLoading;

  return (
    <div>
      <PageHeader
        title="Skörd"
        subtitle="Håll koll på vad som är på gång och vad du redan skördat"
        action={<HarvestFormDialog plants={plants} />}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">Skördeperioder</h2>
              <div className="space-y-2">
                {upcoming.map((p) => {
                  const s = p.speciesDetails!;
                  return (
                    <Link key={p.id} to="/vaxter/$id" params={{ id: p.id }}>
                      <Card className="flex items-center gap-3 p-3">
                        <span className="text-2xl">{p.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            Förväntad period: {monthName(s.harvestStartMonth!)}
                            {s.harvestEndMonth !== s.harvestStartMonth ? `–${monthName(s.harvestEndMonth!)}` : ""}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Skördehistorik</h2>
            {(harvestsQuery.data ?? []).length === 0 ? (
              <EmptyState emoji="🧺" title="Inga skördar registrerade" description="Logga din första skörd med knappen ovan." />
            ) : (
              <div className="space-y-2">
                {harvestsQuery.data!.map((h) => {
                  const plant = plantById.get(h.plantId);
                  return (
                    <Card key={h.id} className="flex items-center gap-3 p-3">
                      {h.photoUrl ? (
                        <img src={h.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <span className="text-2xl">{plant?.emoji ?? "🧺"}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {formatFullDate(h.harvestDate)} · {plant?.name ?? "Okänd växt"}
                        </p>
                        <p className="text-sm text-[var(--color-ink-muted)]">
                          {h.cropName ?? ""}
                          {h.quantity ? ` · ${h.quantity} ${h.unit ?? ""}` : ""}
                        </p>
                        {h.notes && <p className="mt-0.5 text-sm text-[var(--color-ink)]">{h.notes}</p>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
