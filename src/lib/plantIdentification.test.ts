import { describe, expect, it } from "vitest";
import {
  confidenceHeadline,
  confidencePercentLabel,
  confidenceTier,
  shouldShowAlternatives,
} from "./plantIdentification";

describe("confidenceTier", () => {
  it("classifies >= 0.85 as high", () => {
    expect(confidenceTier(0.85)).toBe("high");
    expect(confidenceTier(0.95)).toBe("high");
    expect(confidenceTier(1)).toBe("high");
  });

  it("classifies 0.60-0.84 as medium", () => {
    expect(confidenceTier(0.6)).toBe("medium");
    expect(confidenceTier(0.7)).toBe("medium");
    expect(confidenceTier(0.84)).toBe("medium");
  });

  it("classifies < 0.60 as low", () => {
    expect(confidenceTier(0.59)).toBe("low");
    expect(confidenceTier(0.1)).toBe("low");
    expect(confidenceTier(0)).toBe("low");
  });
});

describe("confidenceHeadline", () => {
  it("returns the expected Swedish headline per tier", () => {
    expect(confidenceHeadline("high")).toBe("Vi tror att detta är");
    expect(confidenceHeadline("medium")).toBe("Det här ser ut som");
    expect(confidenceHeadline("low")).toBe("Vi är inte säkra på vilken växt det är");
  });
});

describe("shouldShowAlternatives", () => {
  it("hides alternatives only at high confidence", () => {
    expect(shouldShowAlternatives("high")).toBe(false);
    expect(shouldShowAlternatives("medium")).toBe(true);
    expect(shouldShowAlternatives("low")).toBe(true);
  });
});

describe("confidencePercentLabel", () => {
  it("rounds to the nearest whole percent", () => {
    expect(confidencePercentLabel(0.953)).toBe("95 % säker");
    expect(confidencePercentLabel(0.601)).toBe("60 % säker");
    expect(confidencePercentLabel(0)).toBe("0 % säker");
  });
});
