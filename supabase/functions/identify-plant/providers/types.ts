import type { PlantIdentification } from "../schema.ts";

export type ImageInput = {
  /** e.g. "image/jpeg" */
  mediaType: string;
  base64: string;
};

export type AnalyzeUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type ProviderAnalyzeResult = {
  analysis: PlantIdentification;
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

/** The abstraction identify-plant/index.ts depends on. Swap providers by
 * changing what getPlantIdentificationProvider() (./index.ts in this folder)
 * returns — nothing else in the edge function needs to change. To add a
 * provider, implement this interface in a new file here using the same
 * PlantIdentification contract from ../schema.ts, which is already
 * provider-neutral. */
export interface PlantIdentificationProvider {
  readonly name: string;
  readonly model: string;
  analyze(image: ImageInput): Promise<ProviderAnalyzeResult>;
}
