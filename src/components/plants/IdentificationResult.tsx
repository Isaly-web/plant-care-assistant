import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  confidenceHeadline,
  confidencePercentLabel,
  confidenceTier,
  shouldShowAlternatives,
} from "@/lib/plantIdentification";
import type { PlantIdentificationCandidate, PlantIdentificationResult as Result } from "@/types/domain";

export function IdentificationResult({
  result,
  onConfirm,
  onRetake,
  onManual,
}: {
  result: Result;
  onConfirm: (candidate: PlantIdentificationCandidate) => void;
  onRetake: () => void;
  onManual: () => void;
}) {
  const tier = confidenceTier(result.identification.confidence);
  const hasAlternatives = result.alternatives.length > 0;
  const showAlternatives = shouldShowAlternatives(tier) && hasAlternatives;
  // A valid "couldn't identify" outcome (section 13 of the spec) — very low
  // confidence and nothing else to suggest either. Shown as a plain message
  // rather than a wrong-looking species name.
  const nothingFound = tier === "low" && result.identification.confidence < 0.1 && !hasAlternatives;

  return (
    <div className="space-y-4">
      <Card className="p-5 text-center">
        <span className="text-5xl">🌿</span>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{confidenceHeadline(tier)}</p>
        {!nothingFound && (
          <>
            <h2 className="mt-1 font-display text-xl font-semibold italic text-[var(--color-ink)]">
              {result.identification.scientificName}
            </h2>
            <p className="text-[var(--color-ink)]">{result.identification.commonName}</p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {confidencePercentLabel(result.identification.confidence)}
            </p>
          </>
        )}
      </Card>

      {result.observations.length > 0 && (
        <Card className="p-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Vad vi såg i bilden
          </p>
          <ul className="space-y-1 text-sm text-[var(--color-ink)]">
            {result.observations.map((o, i) => (
              <li key={i}>· {o}</li>
            ))}
          </ul>
        </Card>
      )}

      {showAlternatives && (
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Alternativ</p>
          <div className="space-y-2">
            {result.alternatives.map((alt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onConfirm(alt)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-left text-sm transition-colors active:scale-[0.99]"
              >
                <span className="min-w-0 truncate">
                  <span className="italic">{alt.scientificName}</span> · {alt.commonName}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-ink-muted)]">
                  {confidencePercentLabel(alt.confidence)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {!nothingFound && (
          <Button type="button" size="lg" className="w-full" onClick={() => onConfirm(result.identification)}>
            Lägg till min växt
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={onRetake}>
          Ta ny bild
        </Button>
        <button
          type="button"
          onClick={onManual}
          className="w-full text-center text-sm text-[var(--color-ink-muted)] underline underline-offset-2"
        >
          {nothingFound ? "Lägg till växten manuellt" : "Det där är inte rätt — fortsätt manuellt"}
        </button>
      </div>
    </div>
  );
}
