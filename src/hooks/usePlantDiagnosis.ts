import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "./queries";
import {
  acknowledgePlantDiagnosis,
  discardPlantDiagnosis,
  diagnosePlant,
  type DiagnosePlantOutcome,
} from "@/services/plantDiagnosisService";

/** Runs the full diagnose flow (validate -> upload -> server-side AI call)
 * for the current user's plant. No automatic toast on error: the diagnosis
 * page shows the failure inline with its own retry/cancel actions, matching
 * the identification page's error handling. */
export function useDiagnosePlant() {
  const { user } = useAuth();
  const mutation = useMutation<DiagnosePlantOutcome, Error, { plantId: string; file: File; symptomDescription: string | null }>({
    mutationFn: (vars) => diagnosePlant(user!.id, vars.plantId, vars.file, vars.symptomDescription),
  });
  return {
    diagnosePlant: mutation.mutateAsync,
    isDiagnosing: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** Keeps a completed diagnosis as history for the plant. */
export function useAcknowledgePlantDiagnosis(plantId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (diagnosisId: string) => acknowledgePlantDiagnosis(diagnosisId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.diagnosesForPlant(plantId) }),
  });
  return { acknowledgeDiagnosis: mutation.mutateAsync, isAcknowledging: mutation.isPending };
}

/** Discards a diagnosis attempt the user didn't confirm — a bad photo they
 * want to retake, or they backed out entirely. */
export function useDiscardPlantDiagnosis() {
  const mutation = useMutation({
    mutationFn: (vars: { diagnosisId: string; storagePath: string }) =>
      discardPlantDiagnosis(vars.diagnosisId, vars.storagePath),
  });
  return { discardDiagnosis: mutation.mutateAsync, isDiscarding: mutation.isPending };
}
