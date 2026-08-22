import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiPlantIdentificationProvider } from "./gemini";
import { ProviderError } from "./types";

const image = { mediaType: "image/jpeg", base64: "ZmFrZS1pbWFnZS1ieXRlcw==" };

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

describe("GeminiPlantIdentificationProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns a high-confidence identification for a clear photo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      geminiResponse(
        {
          identification: { scientific_name: "Monstera deliciosa", common_name: "Monstera", confidence: 0.95 },
          alternatives: [],
          observations: ["Karakteristiska flikiga blad och luftrötter syns tydligt."],
        },
        { promptTokenCount: 800, candidatesTokenCount: 90 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiPlantIdentificationProvider("test-key", "gemini-3.5-flash");
    const result = await provider.analyze(image);

    expect(result.analysis.identification.scientific_name).toBe("Monstera deliciosa");
    expect(result.analysis.identification.confidence).toBe(0.95);
    expect(result.usage).toEqual({ inputTokens: 800, outputTokens: 90 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-3.5-flash");
  });

  it("returns alternatives for an uncertain photo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse({
          identification: { scientific_name: "Philodendron hederaceum", common_name: "Philodendron", confidence: 0.55 },
          alternatives: [
            { scientific_name: "Epipremnum aureum", common_name: "Golden pothos", confidence: 0.4 },
            { scientific_name: "Monstera deliciosa", common_name: "Monstera", confidence: 0.2 },
          ],
          observations: ["Bladformen liknar flera vanliga krukväxter.", "Bilden är tagen på håll."],
        }),
      ),
    );

    const provider = new GeminiPlantIdentificationProvider("test-key");
    const result = await provider.analyze(image);

    expect(result.analysis.alternatives).toHaveLength(2);
    expect(result.analysis.identification.confidence).toBeLessThan(0.6);
  });

  it("returns a near-zero confidence when no plant is visible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse({
          identification: { scientific_name: "Okänd", common_name: "Okänd", confidence: 0.02 },
          alternatives: [],
          observations: ["Ingen växt kunde identifieras i bilden."],
        }),
      ),
    );

    const provider = new GeminiPlantIdentificationProvider("test-key");
    const result = await provider.analyze(image);
    expect(result.analysis.identification.confidence).toBeLessThan(0.1);
    expect(result.analysis.alternatives).toEqual([]);
  });

  it("throws invalid_response when Gemini's JSON fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse({
          identification: { scientific_name: "Något" /* missing common_name/confidence */ },
          alternatives: [],
          observations: [],
        }),
      ),
    );

    const provider = new GeminiPlantIdentificationProvider("test-key");
    await expect(provider.analyze(image)).rejects.toMatchObject({ code: "invalid_response" });
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

    const provider = new GeminiPlantIdentificationProvider("test-key");
    await expect(provider.analyze(image)).rejects.toMatchObject({ code: "invalid_response" });
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

    const provider = new GeminiPlantIdentificationProvider("test-key");
    const promise = provider.analyze(image);
    await expect(promise).rejects.toMatchObject({ code: "provider_error" });
    await expect(promise).rejects.not.toMatchObject({ message: expect.stringContaining("500") });
  });

  it("throws missing_api_key and never calls fetch when no key is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiPlantIdentificationProvider(undefined);
    const promise = provider.analyze(image);
    await expect(promise).rejects.toBeInstanceOf(ProviderError);
    await expect(promise).rejects.toMatchObject({ code: "missing_api_key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an extremely large image before calling Gemini", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const oversizedBase64 = "A".repeat(12 * 1024 * 1024); // ~9MB decoded, over the 8MB cap
    const provider = new GeminiPlantIdentificationProvider("test-key");

    await expect(
      provider.analyze({ mediaType: "image/jpeg", base64: oversizedBase64 }),
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

    const provider = new GeminiPlantIdentificationProvider("test-key");
    await expect(provider.analyze(image)).rejects.toMatchObject({ code: "invalid_response" });
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

    const provider = new GeminiPlantIdentificationProvider("test-key");
    const promise = provider.analyze(image);
    const assertion = expect(promise).rejects.toMatchObject({
      code: "provider_error",
      message: expect.stringContaining("för lång tid"),
    });
    await vi.advanceTimersByTimeAsync(35_000);
    await assertion;
    vi.useRealTimers();
  });
});
