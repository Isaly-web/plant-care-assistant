import { useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/AppLayout";
import { IdentifyCapture } from "@/components/plants/IdentifyCapture";
import { IdentificationResult } from "@/components/plants/IdentificationResult";
import { useDiscardPlantIdentification, useIdentifyPlant } from "@/hooks/usePlantIdentification";
import type { IdentifyPlantOutcome } from "@/services/plantIdentificationService";
import type { PlantIdentificationCandidate } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/vaxter/identifiera")({
  head: () => ({ meta: [{ title: "Identifiera växt – Plant Care Assistant" }] }),
  component: IdentifyPlantPage,
});

function IdentifyPlantPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { identifyPlant, isIdentifying, reset } = useIdentifyPlant();
  const { discardIdentification } = useDiscardPlantIdentification();
  const [outcome, setOutcome] = useState<IdentifyPlantOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(file: File) {
    setError(null);
    try {
      const result = await identifyPlant(file);
      setOutcome(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte identifiera växten. Försök igen.");
    }
  }

  function handleRetake() {
    if (outcome) {
      discardIdentification({ identificationId: outcome.identificationId, storagePath: outcome.storagePath });
    }
    setOutcome(null);
    setError(null);
    reset();
  }

  function handleConfirm(candidate: PlantIdentificationCandidate) {
    if (!outcome) return;
    navigate({
      to: "/vaxter/ny",
      search: {
        identificationId: outcome.identificationId,
        storagePath: outcome.storagePath,
        scientificName: candidate.scientificName,
        commonName: candidate.commonName,
        confidence: candidate.confidence,
      },
    });
  }

  function handleManual() {
    if (outcome) {
      discardIdentification({ identificationId: outcome.identificationId, storagePath: outcome.storagePath });
    }
    navigate({ to: "/vaxter/ny" });
  }

  return (
    <div className="pb-8">
      <button
        onClick={() => router.history.back()}
        className="mb-2 -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Tillbaka
      </button>
      <PageHeader title="Identifiera växt" subtitle="Ta eller välj ett foto, så försöker vi känna igen arten." />

      {!outcome ? (
        <IdentifyCapture onSelect={handleSelect} isAnalyzing={isIdentifying} error={error} onManual={handleManual} />
      ) : (
        <IdentificationResult
          result={outcome.result}
          onConfirm={handleConfirm}
          onRetake={handleRetake}
          onManual={handleManual}
        />
      )}
    </div>
  );
}
