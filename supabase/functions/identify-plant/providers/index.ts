import { GeminiPlantIdentificationProvider } from "./gemini.ts";
import type { PlantIdentificationProvider } from "./types.ts";

export type { ImageInput, PlantIdentificationProvider, ProviderAnalyzeResult } from "./types.ts";
export { ProviderError } from "./types.ts";

/** Single place that decides which provider handles plant identification. To
 * switch providers, implement PlantIdentificationProvider in a new file in
 * this folder and return it here instead — index.ts (the edge function entry
 * point) never needs to change. No automatic fallback between providers: if
 * the configured one fails, identification fails visibly rather than
 * silently calling a different (potentially paid) provider. */
export function getPlantIdentificationProvider(): PlantIdentificationProvider {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL");
  return new GeminiPlantIdentificationProvider(apiKey, model);
}
