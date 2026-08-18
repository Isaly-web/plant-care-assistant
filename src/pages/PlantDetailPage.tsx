import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HarvestFormDialog } from "@/components/harvest/HarvestFormDialog";
import { usePlantBoard } from "@/hooks/usePlantBoard";
import { usePlantsWithSpecies } from "@/hooks/queries";
import { useCareTasksForPlantQuery, useHarvestsForPlantQuery } from "@/hooks/queries";
import { useArchivePlant, useLogCompletedTask } from "@/hooks/mutations";
import { latestCompletedByType } from "@/services/careTaskService";
import { buildCareRows } from "@/components/plants/careScheduleHelpers";
import { formatFriendlyDate, formatFullDate, formatRelativePast, todayDateOnly } from "@/lib/date";
import { TASK_TYPE_LABELS } from "@/types/domain";

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entries, isLoading: boardLoading } = usePlantBoard();
  const { data: allPlants } = usePlantsWithSpecies();
  const careTasksQuery = useCareTasksForPlantQuery(id);
  const harvestsQuery = useHarvestsForPlantQuery(id);
  const archivePlant = useArchivePlant();
  const logCompleted = useLogCompletedTask();

  const entry = entries.find((e) => e.plant.id === id);
  const careTasks = useMemo(() => careTasksQuery.data ?? [], [careTasksQuery.data]);
  const lastDoneByType = useMemo(() => latestCompletedByType(careTasks), [careTasks]);
  const careRows = entry ? buildCareRows(entry.plant, lastDoneByType, todayDateOnly()) : [];

  const historyItems = useMemo(() => {
    const fromTasks = careTasks
      .filter((t) => t.completedAt)
      .map((t) => ({
        date: t.completedAt!.slice(0, 10),
        label: `${TASK_TYPE_LABELS[t.taskType]}${t.description ? ` – ${t.description}` : ""}`,
      }));
    const fromHarvests = (harvestsQuery.data ?? []).map((h) => ({
      date: h.harvestDate,
      label: `Skörd${h.cropName ? `: ${h.cropName}` : ""}${h.quantity ? ` (${h.quantity} ${h.unit ?? ""})` : ""}`,
    }));
    return [...fromTasks, ...fromHarvests].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [careTasks, harvestsQuery.data]);

  if (boardLoading || !entry) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const { plant, actions, status } = entry;

  function handleArchive() {
    if (!confirm(`Ta bort ${plant.name}? Historik och skördar bevaras men växten döljs från listan.`)) return;
    archivePlant.mutate(plant.id, { onSuccess: () => navigate("/vaxter") });
  }

  return (
    <div className="pb-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-2 -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Tillbaka
      </button>

      <Card className="mb-5 overflow-hidden p-0">
        <div className="flex h-40 items-center justify-center bg-[var(--color-surface-muted)] text-6xl">
          {plant.photoUrl ? (
            <img src={plant.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{plant.emoji}</span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">{plant.name}</h1>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {plant.species || plant.speciesDetails?.name || "Okänd art"}
                {plant.variety ? ` · ${plant.variety}` : ""}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <Tag>{plant.indoorOutdoor === "indoor" ? "Inomhus" : "Utomhus"}</Tag>
            {plant.location && <Tag>{plant.location}</Tag>}
            {plant.containerType && <Tag>{plant.containerType === "pot" ? "Kruka" : "Mark"}</Tag>}
          </div>

          {plant.notes && <p className="mt-3 text-sm text-[var(--color-ink)]">{plant.notes}</p>}

          <div className="mt-4 flex gap-2">
            <Link to={`/vaxter/${plant.id}/redigera`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Redigera
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-1.5 text-[var(--color-urgent)]" onClick={handleArchive}>
              <Trash2 className="h-3.5 w-3.5" /> Ta bort
            </Button>
          </div>
        </div>
      </Card>

      <section className="mb-5">
        <h2 className="mb-2 font-display text-lg font-semibold">Nästa åtgärd</h2>
        {actions.length === 0 ? (
          <Card className="p-4 text-sm text-[var(--color-ink-muted)]">🟢 Inget att göra just nu.</Card>
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <Card key={action.id} className="p-4">
                <p className="font-medium">
                  {action.urgency === "urgent" ? "🔴" : "🟡"} {action.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{action.reason}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Tabs defaultValue="skotsel">
        <TabsList className="mb-4">
          <TabsTrigger value="skotsel">Skötsel</TabsTrigger>
          <TabsTrigger value="skord">Skörd</TabsTrigger>
          <TabsTrigger value="historik">Historik</TabsTrigger>
        </TabsList>

        <TabsContent value="skotsel" className="space-y-2">
          {careRows.map((row) => (
            <Card key={row.taskType} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{row.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Senast: {row.lastDone ? formatFriendlyDate(row.lastDone) : "Aldrig registrerad"}
                  {row.nextRecommended && <> · Nästa: {row.nextRecommended}</>}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={logCompleted.isPending}
                onClick={() =>
                  logCompleted.mutate({
                    plantId: plant.id,
                    taskType: row.taskType,
                    title: row.label,
                    source: "manual",
                  })
                }
              >
                Klar
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="skord" className="space-y-3">
          <HarvestFormDialog plants={allPlants} fixedPlantId={plant.id} />
          {(harvestsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Inga skördar registrerade ännu.</p>
          ) : (
            <div className="space-y-2">
              {harvestsQuery.data!.map((h) => (
                <Card key={h.id} className="p-4">
                  <p className="font-medium">
                    {formatFullDate(h.harvestDate)}
                    {h.cropName ? ` · ${h.cropName}` : ""}
                  </p>
                  {h.quantity && (
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      {h.quantity} {h.unit ?? ""}
                    </p>
                  )}
                  {h.notes && <p className="mt-1 text-sm text-[var(--color-ink)]">{h.notes}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historik" className="space-y-2">
          {historyItems.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Ingen historik ännu.</p>
          ) : (
            historyItems.map((item, i) => (
              <div key={i} className="flex items-baseline gap-3 border-b border-[var(--color-border)] py-2 text-sm last:border-0">
                <span className="w-16 shrink-0 text-[var(--color-ink-muted)]">{formatFriendlyDate(item.date)}</span>
                <span className="text-[var(--color-ink-muted)]" title={formatRelativePast(item.date)}>
                  –
                </span>
                <span>{item.label}</span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-[var(--color-ink-muted)]">
      {children}
    </span>
  );
}
