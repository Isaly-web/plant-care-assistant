import { useMemo } from "react";
import type { PlantWithSpecies, WeatherSnapshot, RecommendedAction, CareTask } from "@/types/domain";
import { evaluateAllRules } from "@/services/ruleEngine";
import { latestCompletedByType } from "@/services/careTaskService";
import { weatherLocationForPlant } from "./useWeatherForPlants";
import { todayDateOnly } from "@/lib/date";

export function useRecommendedActions(
  plants: PlantWithSpecies[],
  weatherByLocation: Map<string, WeatherSnapshot>,
  careTasks: CareTask[],
): RecommendedAction[] {
  return useMemo(() => {
    const today = todayDateOnly();
    const tasksByPlant = new Map<string, CareTask[]>();
    for (const task of careTasks) {
      const list = tasksByPlant.get(task.plantId) ?? [];
      list.push(task);
      tasksByPlant.set(task.plantId, list);
    }

    const actions: RecommendedAction[] = [];
    for (const plant of plants) {
      const plantTasks = tasksByPlant.get(plant.id) ?? [];
      const lastDone = latestCompletedByType(plantTasks);
      const weather = plant.indoorOutdoor === "outdoor" ? weatherByLocation.get(weatherLocationForPlant(plant)) ?? null : null;

      actions.push(
        ...evaluateAllRules({
          plant,
          weather,
          lastWateredDate: lastDone.watering ?? null,
          lastFertilizedDate: lastDone.fertilizing ?? null,
          today,
        }),
      );
    }
    return actions;
  }, [plants, weatherByLocation, careTasks]);
}
