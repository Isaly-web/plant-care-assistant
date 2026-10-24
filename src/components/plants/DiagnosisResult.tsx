import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ISSUE_TYPE_EMOJI,
  ISSUE_TYPE_LABELS,
  SEVERITY_LABELS,
  confidencePercentLabel,
  isActionableIssue,
  severityDot,
} from "@/lib/plantDiagnosis";
import type { PlantDiagnosisCandidate, PlantDiagnosisResult as Result } from "@/types/domain";

export function DiagnosisResult({
  result,
  isSaving,
  onSave,
  onRetake,
  onClose,
}: {
  result: Result;
  isSaving: boolean;
  onSave: () => void;
  onRetake: () => void;
  onClose: () => void;
}) {
  const { diagnosis } = result;
  const hasAlternatives = result.alternatives.length > 0;

  return (
    <div className="space-y-4">
      <Card className="p-5 text-center">
        <span className="text-5xl">{ISSUE_TYPE_EMOJI[diagnosis.issueType]}</span>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{ISSUE_TYPE_LABELS[diagnosis.issueType]}</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[var(--color-ink)]">{diagnosis.name}</h2>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-[var(--color-ink-muted)]">
          {diagnosis.severity && (
            <span>
              {severityDot(diagnosis.severity)} {SEVERITY_LABELS[diagnosis.severity]}
            </span>
          )}
          <span>{confidencePercentLabel(diagnosis.confidence)}</span>
        </div>
        <p className="mt-3 text-sm text-[var(--color-ink)]">{diagnosis.description}</p>
      </Card>

      {diagnosis.recommendedActions.length > 0 && (
        <Card className="p-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Rekommenderade åtgärder
          </p>
          <ul className="space-y-1 text-sm text-[var(--color-ink)]">
            {diagnosis.recommendedActions.map((action, i) => (
              <li key={i}>· {action}</li>
            ))}
          </ul>
        </Card>
      )}

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

      {hasAlternatives && (
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Andra möjliga förklaringar
          </p>
          <div className="space-y-2">
            {result.alternatives.map((alt, i) => (
              <AlternativeRow key={i} candidate={alt} />
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {isActionableIssue(diagnosis.issueType) && (
          <Button type="button" size="lg" className="w-full" onClick={onSave} disabled={isSaving}>
            Spara i växtens historik
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={onRetake}>
          Ta ny bild
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-sm text-[var(--color-ink-muted)] underline underline-offset-2"
        >
          Stäng utan att spara
        </button>
      </div>
    </div>
  );
}

function AlternativeRow({ candidate }: { candidate: PlantDiagnosisCandidate }) {
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-left text-sm">
      <span className="min-w-0 truncate">
        {ISSUE_TYPE_EMOJI[candidate.issueType]} {candidate.name}
      </span>
      <span className="shrink-0 text-xs text-[var(--color-ink-muted)]">
        {confidencePercentLabel(candidate.confidence)}
      </span>
    </div>
  );
}
