import { useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui/spinner";
import { DiagnoseCapture } from "@/components/plants/DiagnoseCapture";
import { DiagnosisResult } from "@/components/plants/DiagnosisResult";
import { usePlantWithSpecies } from "@/hooks/queries";
import {
  useAcknowledgePlantDiagnosis,
  useDiagnosePlant,
  useDiscardPlantDiagnosis,
} from "@/hooks/usePlantDiagnosis";
import type { DiagnosePlantOutcome } from "@/services/plantDiagnosisService";

export const Route = createFileRoute("/_authenticated/vaxter/$id/diagnos")({
  head: () => ({ meta: [{ title: "Diagnostisera växt – Plant Care Assistant" }] }),
  component: DiagnosePlantPage,
});

function DiagnosePlantPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const { plant, isLoading } = usePlantWithSpecies(id);
  const { diagnosePlant, isDiagnosing, reset } = useDiagnosePlant();
  const { discardDiagnosis } = useDiscardPlantDiagnosis();
  const { acknowledgeDiagnosis, isAcknowledging } = useAcknowledgePlantDiagnosis(id);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [outcome, setOutcome] = useState<DiagnosePlantOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  function backToPlant() {
    navigate({ to: "/vaxter/$id", params: { id } });
  }

  async function handleSelect(file: File) {
    setError(null);
    try {
      const result = await diagnosePlant({ plantId: id, file, symptomDescription });
      setOutcome(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte diagnostisera växten. Försök igen.");
    }
  }

  function handleRetake() {
    if (outcome) {
      discardDiagnosis({ diagnosisId: outcome.diagnosisId, storagePath: outcome.storagePath });
    }
    setOutcome(null);
    setError(null);
    reset();
  }

  async function handleSave() {
    if (!outcome) return;
    await acknowledgeDiagnosis(outcome.diagnosisId);
    backToPlant();
  }

  function handleClose() {
    if (outcome) {
      discardDiagnosis({ diagnosisId: outcome.diagnosisId, storagePath: outcome.storagePath });
    }
    backToPlant();
  }

  if (isLoading || !plant) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <button
        onClick={() => router.history.back()}
        className="mb-2 -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Tillbaka
      </button>
      <PageHeader
        title="Diagnostisera växt"
        subtitle={`Ta eller välj ett foto av ${plant.name}, så försöker vi se vad som är fel.`}
      />

      {!outcome ? (
        <DiagnoseCapture
          symptomDescription={symptomDescription}
          onSymptomDescriptionChange={setSymptomDescription}
          onSelect={handleSelect}
          isAnalyzing={isDiagnosing}
          error={error}
        />
      ) : (
        <DiagnosisResult
          result={outcome.result}
          isSaving={isAcknowledging}
          onSave={handleSave}
          onRetake={handleRetake}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
