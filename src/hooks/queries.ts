import { useQuery } from "@tanstack/react-query";
import { fetchPlants, toPlantWithSpecies } from "@/services/plantService";
import { fetchAllSpecies } from "@/services/speciesService";
import { fetchAllCareTasks, fetchCareTasksForPlant } from "@/services/careTaskService";
import { fetchAllHarvests, fetchHarvestsForPlant } from "@/services/harvestService";
import { fetchLatestWeatherByLocation } from "@/services/weatherSnapshotService";
import { fetchNotifications } from "@/services/notificationService";
import { fetchMyFeedback, fetchFeedbackDetail } from "@/services/feedbackService";
import type { PlantWithSpecies } from "@/types/domain";
import { useMemo } from "react";

export const queryKeys = {
  plants: ["plants"] as const,
  species: ["species"] as const,
  careTasks: ["care_tasks"] as const,
  careTasksForPlant: (plantId: string) => ["care_tasks", plantId] as const,
  harvests: ["harvests"] as const,
  harvestsForPlant: (plantId: string) => ["harvests", plantId] as const,
  weather: ["weather"] as const,
  notifications: ["notifications"] as const,
  feedback: ["feedback"] as const,
  feedbackDetail: (id: string) => ["feedback", id] as const,
};

export function useSpeciesQuery() {
  return useQuery({ queryKey: queryKeys.species, queryFn: fetchAllSpecies, staleTime: 1000 * 60 * 30 });
}

export function usePlantsQuery() {
  return useQuery({ queryKey: queryKeys.plants, queryFn: fetchPlants });
}

/** Plants merged with their species defaults — what the rule engine and UI consume. */
export function usePlantsWithSpecies(): { data: PlantWithSpecies[]; isLoading: boolean } {
  const plantsQuery = usePlantsQuery();
  const speciesQuery = useSpeciesQuery();

  const data = useMemo(() => {
    if (!plantsQuery.data) return [];
    const speciesById = new Map((speciesQuery.data ?? []).map((s) => [s.id, s]));
    return plantsQuery.data.map((plant) => toPlantWithSpecies(plant, plant.speciesId ? speciesById.get(plant.speciesId) ?? null : null));
  }, [plantsQuery.data, speciesQuery.data]);

  return { data, isLoading: plantsQuery.isLoading || speciesQuery.isLoading };
}

export function usePlantWithSpecies(plantId: string | undefined) {
  const { data, isLoading } = usePlantsWithSpecies();
  const plant = useMemo(() => data.find((p) => p.id === plantId) ?? null, [data, plantId]);
  return { plant, isLoading };
}

export function useAllCareTasksQuery() {
  return useQuery({ queryKey: queryKeys.careTasks, queryFn: fetchAllCareTasks });
}

export function useCareTasksForPlantQuery(plantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careTasksForPlant(plantId ?? ""),
    queryFn: () => fetchCareTasksForPlant(plantId!),
    enabled: !!plantId,
  });
}

export function useAllHarvestsQuery() {
  return useQuery({ queryKey: queryKeys.harvests, queryFn: fetchAllHarvests });
}

export function useHarvestsForPlantQuery(plantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.harvestsForPlant(plantId ?? ""),
    queryFn: () => fetchHarvestsForPlant(plantId!),
    enabled: !!plantId,
  });
}

export function useWeatherQuery() {
  return useQuery({ queryKey: queryKeys.weather, queryFn: fetchLatestWeatherByLocation });
}

export function useNotificationsQuery() {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: fetchNotifications });
}

export function useMyFeedbackQuery() {
  return useQuery({ queryKey: queryKeys.feedback, queryFn: fetchMyFeedback, retry: 1 });
}

export function useFeedbackDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.feedbackDetail(id ?? ""),
    queryFn: () => fetchFeedbackDetail(id!),
    enabled: !!id,
    retry: 1,
  });
}
