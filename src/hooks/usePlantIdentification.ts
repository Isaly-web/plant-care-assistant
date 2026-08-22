import { useMutation } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  discardPlantIdentification,
  identifyPlant,
  type IdentifyPlantOutcome,
} from "@/services/plantIdentificationService";

/** Runs the full identify flow (validate -> upload -> server-side AI call)
 * for the current user. No automatic toast on error: the identification
 * page shows the failure inline with its own retry/cancel actions (per the
 * spec's error-handling requirements), rather than a generic toast. */
export function useIdentifyPlant() {
  const { user } = useAuth();
  const mutation = useMutation<IdentifyPlantOutcome, Error, File>({
    mutationFn: (file: File) => identifyPlant(user!.id, file),
  });
  return {
    identifyPlant: mutation.mutateAsync,
    isIdentifying: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** Abandons an identification attempt the user didn't confirm — a bad photo
 * they want to retake, or they backed out entirely. */
export function useDiscardPlantIdentification() {
  const mutation = useMutation({
    mutationFn: (vars: { identificationId: string; storagePath: string }) =>
      discardPlantIdentification(vars.identificationId, vars.storagePath),
  });
  return { discardIdentification: mutation.mutateAsync, isDiscarding: mutation.isPending };
}
