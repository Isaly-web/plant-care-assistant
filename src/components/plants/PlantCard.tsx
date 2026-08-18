import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PlantBoardEntry } from "@/hooks/usePlantBoard";

export function PlantCard({ entry }: { entry: PlantBoardEntry }) {
  const { plant, actions, status, nextUpSummary } = entry;
  const headline = actions[0]?.title ?? nextUpSummary ?? "Inget att göra just nu";

  return (
    <Link to={`/vaxter/${plant.id}`} className="block">
      <Card className="flex items-center gap-3 p-3 transition-transform active:scale-[0.99]">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-surface-muted)] text-2xl">
          {plant.photoUrl ? (
            <img src={plant.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{plant.emoji}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-display text-base font-semibold text-[var(--color-ink)]">{plant.name}</p>
            <StatusBadge status={status} className="shrink-0" />
          </div>
          <p className="truncate text-xs text-[var(--color-ink-muted)]">
            {plant.species || plant.speciesDetails?.name || "Okänd art"}
            {plant.variety ? ` · ${plant.variety}` : ""} · {plant.indoorOutdoor === "indoor" ? "Inomhus" : "Ute"}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--color-ink)]">{headline}</p>
        </div>
      </Card>
    </Link>
  );
}
