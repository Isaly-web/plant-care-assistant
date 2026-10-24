import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiPlantDiagnosisProvider } from "./gemini";
import { ProviderError } from "./types";

const image = { mediaType: "image/jpeg", base64: "ZmFrZS1pbWFnZS1ieXRlcw==" };
const context = { plantName: "Min monstera", species: "Monstera deliciosa", indoorOutdoor: "indoor", symptomDescription: null };

function geminiResponse(
  json: unknown,
  usage?: { promptTokenCount: number; candidatesTokenCount: number },
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] }, finishReason: "STOP" }],
      usageMetadata: usage,
    }),
    text: async () => "",
  };
}

describe("GeminiPlantDiagnosisProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns a pest diagnosis for a clear photo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      geminiResponse(
        {
          diagnosis: {
            issue_type: "pest",
            name: "Bladlöss",
            confidence: 0.9,
            severity: "medium",
            description: "Små gröna insekter syns på undersidan av bladen.",
            recommended_actions: ["Spola av växten med vatten.", "Isolera från andra växter."],
          },
          alternatives: [],
          observations: ["Kladdiga blad syns tydligt."],
        },
        { promptTokenCount: 900, candidatesTokenCount: 120 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiPlantDiagnosisProvider("test-key", "gemini-3.5-flash");
    const result = await provider.analyze(image, context);

    expect(result.analysis.diagnosis.issue_type).toBe("pest");
    expect(result.analysis.diagnosis.name).toBe("Bladlöss");
    expect(result.usage).toEqual({ inputTokens: 900, outputTokens: 120 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-3.5-flash");
    // The symptom description and plant context are sent as part of the request body.
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(JSON.stringify(body)).toContain("Min monstera");
  });

  it("passes the user's symptom description through to the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      geminiResponse({
        diagnosis: {
          issue_type: "nutrient_deficiency",
          name: "Kvävebrist",
          confidence: 0.6,
          severity: "low",
          description: "Ljusgröna blad.",
          recommended_actions: ["Ge flytande gödsel."],
        },
        alternatives: [],
        observations: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    await provider.analyze(image, { ...context, symptomDescription: "Bladen har blivit ljusgröna senaste veckan." });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(JSON.stringify(body)).toContain("ljusgröna senaste veckan");
  });

  it("returns a healthy result with null severity and no actions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse({
          diagnosis: {
            issue_type: "healthy",
            name: "Frisk växt",
            confidence: 0.92,
            severity: null,
            description: "Inga tecken på problem.",
            recommended_actions: [],
          },
          alternatives: [],
          observations: ["Friska, gröna blad utan fläckar."],
        }),
      ),
    );

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    const result = await provider.analyze(image, context);
    expect(result.analysis.diagnosis.issue_type).toBe("healthy");
    expect(result.analysis.diagnosis.severity).toBeNull();
  });

  it("returns unknown with low confidence when the photo is inconclusive", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse({
          diagnosis: {
            issue_type: "unknown",
            name: "Oklart",
            confidence: 0.15,
            severity: null,
            description: "Bilden är för suddig för att avgöra vad som är fel.",
            recommended_actions: [],
          },
          alternatives: [],
          observations: ["Bilden är tagen på för långt håll."],
        }),
      ),
    );

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    const result = await provider.analyze(image, context);
    expect(result.analysis.diagnosis.issue_type).toBe("unknown");
    expect(result.analysis.diagnosis.confidence).toBeLessThan(0.5);
  });

  it("throws invalid_response when Gemini's JSON fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse({
          diagnosis: { name: "Något" /* missing required fields */ },
          alternatives: [],
          observations: [],
        }),
      ),
    );

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    await expect(provider.analyze(image, context)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("throws invalid_response when the model text is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "this is not json" }] }, finishReason: "STOP" }],
        }),
        text: async () => "",
      }),
    );

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    await expect(provider.analyze(image, context)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("throws provider_error on a Gemini API failure and never leaks the raw status to message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => "internal error",
      }),
    );

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    const promise = provider.analyze(image, context);
    await expect(promise).rejects.toMatchObject({ code: "provider_error" });
    await expect(promise).rejects.not.toMatchObject({ message: expect.stringContaining("500") });
  });

  it("throws missing_api_key and never calls fetch when no key is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiPlantDiagnosisProvider(undefined);
    const promise = provider.analyze(image, context);
    await expect(promise).rejects.toBeInstanceOf(ProviderError);
    await expect(promise).rejects.toMatchObject({ code: "missing_api_key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an extremely large image before calling Gemini", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const oversizedBase64 = "A".repeat(12 * 1024 * 1024); // ~9MB decoded, over the 8MB cap
    const provider = new GeminiPlantDiagnosisProvider("test-key");

    await expect(
      provider.analyze({ mediaType: "image/jpeg", base64: oversizedBase64 }, context),
    ).rejects.toMatchObject({ code: "invalid_response" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a blocked-content response as invalid_response instead of throwing unhandled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }),
        text: async () => "",
      }),
    );

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    await expect(provider.analyze(image, context)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("times out and reports a friendly message rather than hanging", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      ),
    );

    const provider = new GeminiPlantDiagnosisProvider("test-key");
    const promise = provider.analyze(image, context);
    const assertion = expect(promise).rejects.toMatchObject({
      code: "provider_error",
      message: expect.stringContaining("för lång tid"),
    });
    await vi.advanceTimersByTimeAsync(35_000);
    await assertion;
    vi.useRealTimers();
  });
});
