import type { PlantDiagnosis } from "../schema.ts";

export type ImageInput = {
  /** e.g. "image/jpeg" */
  mediaType: string;
  base64: string;
};

/** Context about the plant and its symptoms passed alongside the photo — the
 * "identified plant + symptom + environment data" the spec asks for. Kept
 * intentionally small: whatever's already known about the plant (species,
 * indoor/outdoor) plus what the user typed, not a duplicate weather
 * integration. */
export type DiagnosisContext = {
  plantName: string;
  species: string | null;
  indoorOutdoor: string;
  symptomDescription: string | null;
};

export type AnalyzeUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type ProviderAnalyzeResult = {
  analysis: PlantDiagnosis;
  usage: AnalyzeUsage;
};

export type ProviderErrorCode = "missing_api_key" | "invalid_response" | "provider_error";

/** Thrown by providers on any failure. `message` is safe to show users;
 * `technicalDetail` is for server-side logs only — never send it to the
 * client (no API keys, no raw provider payloads). */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly technicalDetail?: unknown;

  constructor(code: ProviderErrorCode, message: string, technicalDetail?: unknown) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.technicalDetail = technicalDetail;
  }
}

/** The abstraction diagnose-plant/index.ts depends on. Swap providers by
 * changing what getPlantDiagnosisProvider() (./index.ts in this folder)
 * returns — nothing else in the edge function needs to change. To add a
 * provider, implement this interface in a new file here using the same
 * PlantDiagnosis contract from ../schema.ts, which is already
 * provider-neutral. */
export interface PlantDiagnosisProvider {
  readonly name: string;
  readonly model: string;
  analyze(image: ImageInput, context: DiagnosisContext): Promise<ProviderAnalyzeResult>;
}
