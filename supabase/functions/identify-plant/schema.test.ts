import { describe, expect, it } from "vitest";
import { PlantIdentificationSchema } from "./schema";

const valid = {
  identification: { scientific_name: "Monstera deliciosa", common_name: "Monstera", confidence: 0.92 },
  alternatives: [{ scientific_name: "Monstera adansonii", common_name: "Monsteralite", confidence: 0.3 }],
  observations: ["Flikiga blad och luftrötter."],
};

describe("PlantIdentificationSchema", () => {
  it("accepts a well-formed response", () => {
    expect(PlantIdentificationSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts zero alternatives and zero observations", () => {
    const result = PlantIdentificationSchema.safeParse({ ...valid, alternatives: [], observations: [] });
    expect(result.success).toBe(true);
  });

  it("rejects a confidence above 1", () => {
    const result = PlantIdentificationSchema.safeParse({
      ...valid,
      identification: { ...valid.identification, confidence: 1.4 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative confidence", () => {
    const result = PlantIdentificationSchema.safeParse({
      ...valid,
      identification: { ...valid.identification, confidence: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing scientific_name", () => {
    const result = PlantIdentificationSchema.safeParse({
      ...valid,
      identification: { common_name: "Monstera", confidence: 0.9 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric confidence", () => {
    const result = PlantIdentificationSchema.safeParse({
      ...valid,
      identification: { ...valid.identification, confidence: "high" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 alternatives", () => {
    const tooMany = Array.from({ length: 6 }, (_, i) => ({
      scientific_name: `Species ${i}`,
      common_name: `Namn ${i}`,
      confidence: 0.1,
    }));
    const result = PlantIdentificationSchema.safeParse({ ...valid, alternatives: tooMany });
    expect(result.success).toBe(false);
  });

  it("rejects completely malformed input (free text instead of JSON structure)", () => {
    const result = PlantIdentificationSchema.safeParse("Det här är nog en Monstera.");
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    expect(PlantIdentificationSchema.safeParse(null).success).toBe(false);
  });

  it("rejects an empty object", () => {
    expect(PlantIdentificationSchema.safeParse({}).success).toBe(false);
  });
});
