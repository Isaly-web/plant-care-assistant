// Presentation helpers for AI plant diagnosis results (see
// PlantDiagnosisCandidate in src/types/domain.ts). Deliberately separate
// from src/lib/plantIdentification.ts — same "AI vision -> structured result"
// pattern, but a different, independent analysis per the original spec.

import type { DiagnosisIssueType, DiagnosisSeverity } from "@/types/domain";

export const ISSUE_TYPE_LABELS: Record<DiagnosisIssueType, string> = {
  disease: "Sjukdom",
  pest: "Skadedjur",
  nutrient_deficiency: "Näringsbrist",
  environmental: "Miljöorsak",
  healthy: "Frisk",
  unknown: "Osäkert",
};

export const ISSUE_TYPE_EMOJI: Record<DiagnosisIssueType, string> = {
  disease: "🦠",
  pest: "🐛",
  nutrient_deficiency: "🍂",
  environmental: "🌡️",
  healthy: "✅",
  unknown: "❓",
};

export const SEVERITY_LABELS: Record<DiagnosisSeverity, string> = {
  low: "Lindrig",
  medium: "Måttlig",
  high: "Allvarlig",
};

/** Traffic-light dot per severity, matching the app's existing urgent/soon/ok
 * convention (see UrgencyStatus) rather than inventing a new scale. */
export function severityDot(severity: DiagnosisSeverity | null): string {
  switch (severity) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
    default:
      return "";
  }
}

export function confidencePercentLabel(confidence: number): string {
  return `${Math.round(confidence * 100)} % säker`;
}

/** Whether this candidate represents an actual problem to act on, as opposed
 * to "looks healthy" or "couldn't tell from this photo". */
export function isActionableIssue(issueType: DiagnosisIssueType): boolean {
  return issueType !== "healthy" && issueType !== "unknown";
}
