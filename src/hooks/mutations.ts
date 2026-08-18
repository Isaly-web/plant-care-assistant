import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPlant, updatePlant, archivePlant, type UpsertPlantInput } from "@/services/plantService";
import {
  logCompletedTask,
  createManualTask,
  completeTask,
  deleteTask,
  type LogCompletedTaskInput,
  type CreateManualTaskInput,
} from "@/services/careTaskService";
import { createHarvest, deleteHarvest, type CreateHarvestInput } from "@/services/harvestService";
import { seedDemoData } from "@/services/demoData";
import { queryKeys } from "./queries";

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, keys: readonly (readonly unknown[])[]) {
  keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key as unknown[] }));
}

export function useCreatePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertPlantInput) => createPlant(input),
    onSuccess: () => {
      invalidateAll(queryClient, [queryKeys.plants]);
      toast.success("Växten är tillagd");
    },
    onError: () => toast.error("Kunde inte lägga till växten. Försök igen."),
  });
}

export function useUpdatePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UpsertPlantInput> }) => updatePlant(id, input),
    onSuccess: () => {
      invalidateAll(queryClient, [queryKeys.plants]);
      toast.success("Ändringarna är sparade");
    },
    onError: () => toast.error("Kunde inte spara ändringarna."),
  });
}

export function useArchivePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archivePlant(id),
    onSuccess: () => {
      invalidateAll(queryClient, [queryKeys.plants]);
      toast.success("Växten är borttagen");
    },
    onError: () => toast.error("Kunde inte ta bort växten."),
  });
}

export function useLogCompletedTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogCompletedTaskInput) => logCompletedTask(input),
    onSuccess: (task) => {
      invalidateAll(queryClient, [queryKeys.careTasks, queryKeys.careTasksForPlant(task.plantId)]);
      toast.success("Markerad som klar");
    },
    onError: () => toast.error("Kunde inte markera som klar."),
  });
}

export function useCreateManualTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateManualTaskInput) => createManualTask(input),
    onSuccess: (task) => {
      invalidateAll(queryClient, [queryKeys.careTasks, queryKeys.careTasksForPlant(task.plantId)]);
      toast.success("Aktiviteten är tillagd");
    },
    onError: () => toast.error("Kunde inte lägga till aktiviteten."),
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSuccess: (task) => {
      invalidateAll(queryClient, [queryKeys.careTasks, queryKeys.careTasksForPlant(task.plantId)]);
      toast.success("Markerad som klar");
    },
    onError: () => toast.error("Kunde inte markera som klar."),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => invalidateAll(queryClient, [queryKeys.careTasks]),
    onError: () => toast.error("Kunde inte ta bort aktiviteten."),
  });
}

export function useCreateHarvest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHarvestInput) => createHarvest(input),
    onSuccess: (harvest) => {
      invalidateAll(queryClient, [queryKeys.harvests, queryKeys.harvestsForPlant(harvest.plantId)]);
      toast.success("Skörden är registrerad");
    },
    onError: () => toast.error("Kunde inte registrera skörden."),
  });
}

export function useSeedDemoData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: seedDemoData,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Demodata tillagd — ta en titt på Idag!");
    },
    onError: () => toast.error("Kunde inte lägga till demodata."),
  });
}

export function useDeleteHarvest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHarvest(id),
    onSuccess: () => invalidateAll(queryClient, [queryKeys.harvests]),
    onError: () => toast.error("Kunde inte ta bort skörden."),
  });
}
