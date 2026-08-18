import type { PlantWithSpecies, TaskType } from "@/types/domain";
import { addDays, formatFriendlyDate } from "@/lib/date";

export interface CareRow {
  taskType: TaskType;
  label: string;
  lastDone: string | null;
  nextRecommended: string | null; // pre-formatted, friendly text
  loggable: boolean;
}

const ROW_ORDER: { taskType: TaskType; label: string }[] = [
  { taskType: "watering", label: "Vattning" },
  { taskType: "fertilizing", label: "Gödsling" },
  { taskType: "pruning", label: "Beskärning" },
  { taskType: "repotting", label: "Omplantering" },
  { taskType: "other", label: "Övrigt" },
];

export function buildCareRows(
  plant: PlantWithSpecies,
  lastDoneByType: Partial<Record<TaskType, string>>,
  today: string,
): CareRow[] {
  return ROW_ORDER.map(({ taskType, label }) => {
    const lastDone = lastDoneByType[taskType] ?? null;

    let nextRecommended: string | null = null;
    if (taskType === "watering" && plant.effectiveWateringIntervalDays !== null) {
      const baseline = lastDone ?? plant.purchaseDate ?? plant.createdAt.slice(0, 10);
      nextRecommended = formatFriendlyDate(addDays(baseline, plant.effectiveWateringIntervalDays));
    } else if (taskType === "fertilizing" && plant.effectiveFertilizingIntervalDays !== null) {
      const baseline = lastDone ?? plant.purchaseDate ?? plant.createdAt.slice(0, 10);
      nextRecommended = formatFriendlyDate(addDays(baseline, plant.effectiveFertilizingIntervalDays));
    } else if (taskType === "pruning" && plant.speciesDetails?.pruningPeriod) {
      nextRecommended = plant.speciesDetails.pruningPeriod;
    }

    return { taskType, label, lastDone, nextRecommended, loggable: true };
  });
}

export { formatFriendlyDate };
