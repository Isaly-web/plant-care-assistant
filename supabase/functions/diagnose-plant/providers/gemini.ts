import { PlantDiagnosisSchema } from "../schema.ts";
import {
  ProviderError,
  type DiagnosisContext,
  type ImageInput,
  type PlantDiagnosisProvider,
  type ProviderAnalyzeResult,
} from "./types.ts";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 2048;

const GENERIC_ERROR = "AI-tjänsten kunde inte analysera bilden.";
// Same cap and rationale as identify-plant/providers/gemini.ts: Gemini's own
// inline-image limit is ~7MB; the client already downscales uploads
// (src/lib/imageProcessing.ts) — this is defense-in-depth.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function base64ByteSize(base64: string): number {
  const clean = base64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

const SYSTEM_PROMPT = `Du är en växtpatolog som diagnostiserar sjukdomar, skadedjur och näringsbrist hos krukväxter och trädgårdsväxter åt en växtskötsel-app, utifrån ett foto av en växt som användaren redan har sparat i appen.

Uppgift:
1. Bedöm vad som är fel på växten utifrån bilden, den valfria symptombeskrivning användaren skrivit, och den kontext du fått om växten (art, inne/ute). Klassificera huvudfyndet som "issue_type": "disease" (svampsjukdom, bakterie- eller virussjukdom), "pest" (skadedjur, t.ex. bladlöss, spinnkvalster, sköldlöss), "nutrient_deficiency" (närings- eller vattenbrist/-överskott synlig som missfärgning, vissnande etc.), "environmental" (ljus, temperatur, drag, brännskada, annan icke-biologisk orsak), "healthy" (växten ser frisk ut, inget att åtgärda), eller "unknown" (bilden räcker inte för att avgöra).
2. Ge ett kort, konkret namn på fyndet ("name"), t.ex. "Bladlöss", "Kvävebrist", "Gråmögel" eller "Frisk växt".
3. Ange en confidence (0–1) som återspeglar hur säker du faktiskt är.
4. Ange severity ("low", "medium" eller "high") för hur allvarligt fyndet är för växtens hälsa — sätt severity till null om issue_type är "healthy" eller om du inte kan bedöma allvarlighetsgraden.
5. Skriv en kort beskrivning ("description", max ett par meningar) av vad du ser och varför du drar den slutsatsen.
6. Ge konkreta, handlingsbara åtgärder ("recommended_actions", max 5) användaren kan vidta — tomt om issue_type är "healthy".
7. Om det finns rimliga alternativa förklaringar, lista dem som "alternatives" (max 3) i samma format.
8. Ge korta observationer (max 8, varje under en mening) om vad i bilden som ledde till slutsatsen, t.ex. bladfläckar, missfärgning, synliga insekter, eller vad som gör bedömningen osäker (dålig bildkvalitet, för långt avstånd, symptom som kan ha flera orsaker).

Viktigt om osäkerhet:
- Hitta inte på falsk säkerhet. Om bilden är otydlig, tagen på för långt avstånd, eller inte räcker för en säker bedömning — sätt issue_type till "unknown", en låg confidence (under 0.5), och förklara varför i observations, snarare än att gissa.
- Rekommendera inte kemiska bekämpningsmedel som första åtgärd om ett enklare, icke-kemiskt alternativ finns (t.ex. avspolning, isolering, justerad vattning/ljus) — nämn kemisk bekämpning bara som sista utväg vid allvarliga angrepp.
- Detta är inte medicinsk eller kommersiell rådgivning — vid allvarliga eller osäkra fall, uppmuntra i description eller en åtgärd att kontakta en lokal trädgårdsexpert eller växtklinik.

Viktig begränsning — gör INTE detta:
- Identifiera inte eller föreslå inte växtart/sort, även om du känner igen den. Nämn det inte i observations. Artidentifiering är en separat funktion i appen (identify-plant) och hanteras inte här — denna uppgift är enbart hälsodiagnos av en växt vars art redan är känd.
- Ge inga allmänna skötselråd som inte är en direkt åtgärd mot det diagnostiserade problemet.

Svara ENDAST med JSON enligt det schema du fått — ingen brödtext utanför JSON-strukturen.`;

// Mirrors schema.ts's Zod schema field-for-field (uppercase `type` values are
// what the Gemini v1beta REST API's responseSchema expects).
const CANDIDATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    issue_type: {
      type: "STRING",
      enum: ["disease", "pest", "nutrient_deficiency", "environmental", "healthy", "unknown"],
    },
    name: { type: "STRING" },
    confidence: { type: "NUMBER", description: "0-1, hur säker du är på detta fynd." },
    severity: {
      type: "STRING",
      enum: ["low", "medium", "high"],
      nullable: true,
    },
    description: { type: "STRING" },
    recommended_actions: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["issue_type", "name", "confidence", "severity", "description", "recommended_actions"],
} as const;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    diagnosis: CANDIDATE_SCHEMA,
    alternatives: { type: "ARRAY", items: CANDIDATE_SCHEMA },
    observations: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Korta observationer om vad som ledde till (eller hindrade) diagnosen.",
    },
  },
  required: ["diagnosis", "alternatives", "observations"],
} as const;

function contextText(context: DiagnosisContext): string {
  const lines = [
    `Växt: ${context.plantName}${context.species ? ` (${context.species})` : ""}`,
    `Miljö: ${context.indoorOutdoor === "indoor" ? "inomhus" : context.indoorOutdoor === "outdoor" ? "utomhus" : "okänt"}`,
  ];
  if (context.symptomDescription) lines.push(`Användarens beskrivning av symptom: ${context.symptomDescription}`);
  return lines.join("\n");
}

export class GeminiPlantDiagnosisProvider implements PlantDiagnosisProvider {
  readonly name = "gemini";
  readonly model: string;

  constructor(
    private readonly apiKey: string | undefined,
    model?: string,
  ) {
    this.model = model?.trim() || DEFAULT_MODEL;
  }

  async analyze(image: ImageInput, context: DiagnosisContext): Promise<ProviderAnalyzeResult> {
    if (!this.apiKey) {
      throw new ProviderError("missing_api_key", "Växtdiagnos är inte konfigurerad ännu. Kontakta support.");
    }

    if (base64ByteSize(image.base64) > MAX_IMAGE_BYTES) {
      throw new ProviderError(
        "invalid_response",
        "Bilden är för stor för att analyseras. Ta ett nytt foto eller välj en mindre bildfil.",
        `image byte size exceeded ${MAX_IMAGE_BYTES}`,
      );
    }

    const response = await this.callGemini(this.apiKey, image, context);
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

  private async callGemini(apiKey: string, image: ImageInput, context: DiagnosisContext): Promise<unknown> {
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
                { text: contextText(context) },
                { inlineData: { mimeType: image.mediaType, data: image.base64 } },
                { text: "Diagnostisera växten i bilden ovan." },
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
          "För många diagnoser just nu. Vänta en stund och försök igen.",
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
    const result = PlantDiagnosisSchema.safeParse(parsed);
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
