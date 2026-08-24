import { GeminiPlantDiagnosisProvider } from "./gemini.ts";
import type { PlantDiagnosisProvider } from "./types.ts";

export type { DiagnosisContext, ImageInput, PlantDiagnosisProvider, ProviderAnalyzeResult } from "./types.ts";
export { ProviderError } from "./types.ts";

/** Single place that decides which provider handles plant diagnosis. To
 * switch providers, implement PlantDiagnosisProvider in a new file in this
 * folder and return it here instead — index.ts (the edge function entry
 * point) never needs to change. No automatic fallback between providers: if
 * the configured one fails, diagnosis fails visibly rather than silently
 * calling a different (potentially paid) provider. */
export function getPlantDiagnosisProvider(): PlantDiagnosisProvider {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL");
  return new GeminiPlantDiagnosisProvider(apiKey, model);
}
