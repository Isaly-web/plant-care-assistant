import { useMemo } from "react";
import { usePlantsWithSpecies, useAllCareTasksQuery } from "./queries";
import { useWeatherForPlants } from "./useWeatherForPlants";
import { useRecommendedActions } from "./useRecommendedActions";
import { overallStatus, nextUpSummary } from "@/services/ruleEngine";
import { latestCompletedByType } from "@/services/careTaskService";
import type { PlantWithSpecies, RecommendedAction, UrgencyStatus } from "@/types/domain";
import { todayDateOnly } from "@/lib/date";

export interface PlantBoardEntry {
  plant: PlantWithSpecies;
  actions: RecommendedAction[];
  status: UrgencyStatus;
  /** Only set when status is "ok" — a forward-looking, non-actionable hint. */
  nextUpSummary: string | null;
}

export function usePlantBoard() {
  const { data: plants, isLoading: plantsLoading } = usePlantsWithSpecies();
  const { weatherByLocation, isLoading: weatherLoading } = useWeatherForPlants(plants);
  const careTasksQuery = useAllCareTasksQuery();
  const careTasks = useMemo(() => careTasksQuery.data ?? [], [careTasksQuery.data]);
  const actions = useRecommendedActions(plants, weatherByLocation, careTasks);

  const entries: PlantBoardEntry[] = useMemo(() => {
    const today = todayDateOnly();
    const tasksByPlant = new Map<string, typeof careTasks>();
    for (const task of careTasks) {
      const list = tasksByPlant.get(task.plantId) ?? [];
      list.push(task);
      tasksByPlant.set(task.plantId, list);
    }
    const actionsByPlant = new Map<string, RecommendedAction[]>();
    for (const action of actions) {
      const list = actionsByPlant.get(action.plantId) ?? [];
      list.push(action);
      actionsByPlant.set(action.plantId, list);
    }

    return plants.map((plant) => {
      const plantActions = actionsByPlant.get(plant.id) ?? [];
      const lastDone = latestCompletedByType(tasksByPlant.get(plant.id) ?? []);
      const status = overallStatus(plantActions);
      return {
        plant,
        actions: plantActions,
        status,
        nextUpSummary:
          status === "ok" ? nextUpSummary(plant, lastDone.watering ?? null, lastDone.fertilizing ?? null, today) : null,
      };
    });
  }, [plants, actions, careTasks]);

  return {
    entries,
    actions,
    isLoading: plantsLoading || weatherLoading || careTasksQuery.isLoading,
  };
}
