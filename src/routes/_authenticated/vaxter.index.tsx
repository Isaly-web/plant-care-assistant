import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { PlantCard } from "@/components/plants/PlantCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlantBoard, type PlantBoardEntry } from "@/hooks/usePlantBoard";

export const Route = createFileRoute("/_authenticated/vaxter/")({
  head: () => ({ meta: [{ title: "Mina växter – Plant Care Assistant" }] }),
  component: PlantsPage,
});

type FilterKey = "all" | "indoor" | "outdoor" | "fruit_berry" | "flower" | "tree" | "other";

const FILTERS: { key: FilterKey; label: string; predicate: (e: PlantBoardEntry) => boolean }[] = [
  { key: "all", label: "Alla", predicate: () => true },
  { key: "indoor", label: "Inomhus", predicate: (e) => e.plant.indoorOutdoor === "indoor" },
  { key: "outdoor", label: "Utomhus", predicate: (e) => e.plant.indoorOutdoor === "outdoor" },
  {
    key: "fruit_berry",
    label: "Frukt & bär",
    predicate: (e) => ["fruit_tree", "berry"].includes(e.plant.speciesDetails?.category ?? ""),
  },
  { key: "flower", label: "Blommor", predicate: (e) => e.plant.speciesDetails?.category === "flower" },
  {
    key: "tree",
    label: "Träd",
    predicate: (e) => ["fruit_tree", "mediterranean"].includes(e.plant.speciesDetails?.category ?? ""),
  },
  {
    key: "other",
    label: "Övrigt",
    predicate: (e) => !e.plant.speciesDetails || e.plant.speciesDetails.category === "other",
  },
];

function PlantsPage() {
  const { entries, isLoading } = usePlantBoard();
  const [filter, setFilter] = useState<FilterKey>("all");

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filtered = useMemo(() => entries.filter(active.predicate), [entries, active]);

  return (
    <div>
      <PageHeader title="Mina växter" subtitle={`${entries.length} ${entries.length === 1 ? "växt" : "växter"}`} />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)} className="mb-5">
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState emoji="🔍" title="Inga växter i denna kategori" />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <PlantCard key={entry.plant.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
