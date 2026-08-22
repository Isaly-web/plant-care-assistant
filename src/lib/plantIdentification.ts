// Confidence-tier bucketing for AI plant identification results (see
// PlantIdentificationCandidate in src/types/domain.ts).
//
// `confidence` is the vision model's own qualitative self-assessment,
// normalized to a 0-1 range by the identify-plant edge function's response
// schema — it is NOT a calibrated statistical probability (Gemini does not
// produce one). We treat it purely as an ordinal signal for which of three
// UI tiers to show, never as an exact percentage of "chance of being
// correct".

export type ConfidenceTier = "high" | "medium" | "low";

const HIGH_THRESHOLD = 0.85;
const MEDIUM_THRESHOLD = 0.6;

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= HIGH_THRESHOLD) return "high";
  if (confidence >= MEDIUM_THRESHOLD) return "medium";
  return "low";
}

/** The leading phrase for the identification headline, per confidence tier. */
export function confidenceHeadline(tier: ConfidenceTier): string {
  switch (tier) {
    case "high":
      return "Vi tror att detta är";
    case "medium":
      return "Det här ser ut som";
    case "low":
      return "Vi är inte säkra på vilken växt det är";
  }
}

/** Whether alternatives should be shown alongside the top result. Always
 * shown below "high" confidence, since that's when the user most needs
 * other candidates to pick from. */
export function shouldShowAlternatives(tier: ConfidenceTier): boolean {
  return tier !== "high";
}

export function confidencePercentLabel(confidence: number): string {
  return `${Math.round(confidence * 100)} % säker`;
}
