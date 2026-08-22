import { PlantIdentificationSchema } from "../schema.ts";
import {
  ProviderError,
  type ImageInput,
  type PlantIdentificationProvider,
  type ProviderAnalyzeResult,
} from "./types.ts";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 2048;

const GENERIC_ERROR = "AI-tjänsten kunde inte analysera bilden.";
// Individual image cap. Gemini's own inline-image limit is ~7MB; this leaves
// headroom and gives a clear, fast error instead of a slow provider
// round-trip that fails anyway. The client already downscales uploads
// (src/lib/imageProcessing.ts) — this is a defense-in-depth check against
// whatever actually reaches Storage.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function base64ByteSize(base64: string): number {
  const clean = base64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

const SYSTEM_PROMPT = `Du är en botanisk expert som identifierar växtarter från foton åt en trädgårds- och växtskötsel-app.

Uppgift:
1. Identifiera den mest sannolika växtarten i bilden. Prioritera det vetenskapliga namnet (släkte + art), och ange även ett vanligt svenskt namn.
2. Ange en confidence (0–1) som återspeglar hur säker du faktiskt är på identifieringen.
3. Om det finns rimliga alternativa arter bilden också skulle kunna föreställa, lista dem som "alternatives" (max 5) — särskilt viktigt när confidence är under 0.85.
4. Ge korta observationer (max 8, varje under en mening) om vad i bilden som ledde till slutsatsen, t.ex. bladform, växtsätt, blomma, eller vad som gör identifieringen osäker (dålig bildkvalitet, flera växter i bild, för långt avstånd, ingen växt synlig).

Viktigt om osäkerhet:
- Hitta inte på falsk säkerhet. Om bilden är otydlig, visar flera växter, är tagen på för långt avstånd, eller inte räcker för en säker identifiering — sätt en låg confidence (under 0.60) och förklara varför i observations, snarare än att gissa med falsk trygghet.
- Om bilden inte visar någon växt alls, sätt confidence nära 0 för identification, lämna alternatives tom, och förklara i observations att ingen växt kunde identifieras.
- Gissa aldrig på ett specifikt sortnamn (cultivar) om du bara kan se släkte/art.

Viktig begränsning — gör INTE detta:
- Diagnostisera inte sjukdomar, skadedjur, näringsbrist eller andra hälsoproblem hos växten, även om du ser tecken på det i bilden. Nämn det inte i observations. Växtdiagnos är en separat funktion i appen och hanteras inte här — denna uppgift är enbart artidentifiering.
- Ge inga skötselråd (vattning, gödsling, ljus, etc.).

Svara ENDAST med JSON enligt det schema du fått — ingen brödtext utanför JSON-strukturen.`;

// Mirrors schema.ts's Zod schema field-for-field (uppercase `type` values are
// what the Gemini v1beta REST API's responseSchema expects).
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    identification: {
      type: "OBJECT",
      properties: {
        scientific_name: { type: "STRING", description: "Vetenskapligt namn (släkte + art)." },
        common_name: { type: "STRING", description: "Vanligt namn på svenska." },
        confidence: { type: "NUMBER", description: "0-1, hur säker du är på denna identifiering." },
      },
      required: ["scientific_name", "common_name", "confidence"],
    },
    alternatives: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          scientific_name: { type: "STRING" },
          common_name: { type: "STRING" },
          confidence: { type: "NUMBER" },
        },
        required: ["scientific_name", "common_name", "confidence"],
      },
    },
    observations: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Korta observationer om vad som ledde till (eller hindrade) identifieringen.",
    },
  },
  required: ["identification", "alternatives", "observations"],
} as const;

export class GeminiPlantIdentificationProvider implements PlantIdentificationProvider {
  readonly name = "gemini";
  readonly model: string;

  constructor(
    private readonly apiKey: string | undefined,
    model?: string,
  ) {
    this.model = model?.trim() || DEFAULT_MODEL;
  }

  async analyze(image: ImageInput): Promise<ProviderAnalyzeResult> {
    if (!this.apiKey) {
      throw new ProviderError(
        "missing_api_key",
        "Växtidentifiering är inte konfigurerad ännu. Kontakta support.",
      );
    }

    if (base64ByteSize(image.base64) > MAX_IMAGE_BYTES) {
      throw new ProviderError(
        "invalid_response",
        "Bilden är för stor för att analyseras. Ta ett nytt foto eller välj en mindre bildfil.",
        `image byte size exceeded ${MAX_IMAGE_BYTES}`,
      );
    }

    const response = await this.callGemini(this.apiKey, image);
    const text = this.extractText(response);
    const parsed = this.parseJson(text);
    const analysis = this.validate(parsed);

    const usageMetadata = (
      response as {
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      }
    ).usageMetadata;

    return {
      analysis,
      usage: {
        inputTokens: usageMetadata?.promptTokenCount,
        outputTokens: usageMetadata?.candidatesTokenCount,
      },
    };
  }

  private async callGemini(apiKey: string, image: ImageInput): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE}/${this.model}:generateContent`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: SYSTEM_PROMPT },
                { inlineData: { mimeType: image.mediaType, data: image.base64 } },
                { text: "Identifiera växten i bilden ovan." },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.2,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
      });

      if (res.status === 429) {
        throw new ProviderError(
          "provider_error",
          "För många identifieringar just nu. Vänta en stund och försök igen.",
          "gemini_429",
        );
      }
      if (res.status === 503) {
        throw new ProviderError(
          "provider_error",
          "AI-tjänsten är överbelastad just nu. Försök igen om en liten stund.",
          "gemini_503_overloaded",
        );
      }
      if (!res.ok) {
        const bodySnippet = await res.text().catch(() => "");
        throw new ProviderError(
          "provider_error",
          GENERIC_ERROR,
          `Gemini HTTP ${res.status}: ${bodySnippet.slice(0, 500)}`,
        );
      }

      return await res.json();
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      const timedOut = error instanceof Error && error.name === "AbortError";
      throw new ProviderError(
        "provider_error",
        timedOut
          ? "Det tog för lång tid att analysera bilden. Försök igen."
          : "Kunde inte nå AI-tjänsten.",
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractText(response: unknown): string {
    const candidate = (
      response as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
      }
    ).candidates?.[0];

    const blockReason = (response as { promptFeedback?: { blockReason?: string } }).promptFeedback
      ?.blockReason;
    if (blockReason) {
      throw new ProviderError(
        "invalid_response",
        "Bilden kunde inte analyseras av säkerhetsskäl. Försök med en annan bild.",
        `Gemini blockReason: ${blockReason}`,
      );
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new ProviderError(
        "invalid_response",
        "Kunde inte tolka AI-svaret.",
        `Gemini response had no text part (finishReason: ${candidate?.finishReason ?? "unknown"})`,
      );
    }
    return text;
  }

  private parseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new ProviderError(
        "invalid_response",
        "Kunde inte tolka AI-svaret.",
        `non-JSON text: ${String(error)}`,
      );
    }
  }

  private validate(parsed: unknown) {
    const result = PlantIdentificationSchema.safeParse(parsed);
    if (!result.success) {
      throw new ProviderError(
        "invalid_response",
        "Kunde inte tolka AI-svaret.",
        `validation: ${result.error.message.slice(0, 500)}`,
      );
    }
    return result.data;
  }
}
