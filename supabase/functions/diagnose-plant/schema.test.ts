import { describe, expect, it } from "vitest";
import { PlantDiagnosisSchema } from "./schema";

const valid = {
  diagnosis: {
    issue_type: "pest",
    name: "Bladlöss",
    confidence: 0.88,
    severity: "medium",
    description: "Små gröna insekter syns på undersidan av bladen.",
    recommended_actions: ["Spola av växten med vatten.", "Isolera från andra växter."],
  },
  alternatives: [
    {
      issue_type: "nutrient_deficiency",
      name: "Kvävebrist",
      confidence: 0.2,
      severity: "low",
      description: "Bladen är något ljusgröna.",
      recommended_actions: ["Ge flytande gödsel."],
    },
  ],
  observations: ["Kladdiga blad kan tyda på honungsdagg från bladlöss."],
};

describe("PlantDiagnosisSchema", () => {
  it("accepts a well-formed response", () => {
    expect(PlantDiagnosisSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts zero alternatives and zero observations", () => {
    const result = PlantDiagnosisSchema.safeParse({ ...valid, alternatives: [], observations: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a null severity (e.g. for a healthy plant)", () => {
    const result = PlantDiagnosisSchema.safeParse({
      ...valid,
      diagnosis: {
        issue_type: "healthy",
        name: "Frisk växt",
        confidence: 0.95,
        severity: null,
        description: "Inga tecken på sjukdom, skadedjur eller näringsbrist.",
        recommended_actions: [],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing severity key (must be explicitly null, not omitted)", () => {
    const { severity: _severity, ...withoutSeverity } = valid.diagnosis;
    const result = PlantDiagnosisSchema.safeParse({ ...valid, diagnosis: withoutSeverity });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid issue_type", () => {
    const result = PlantDiagnosisSchema.safeParse({
      ...valid,
      diagnosis: { ...valid.diagnosis, issue_type: "aliens" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid severity value", () => {
    const result = PlantDiagnosisSchema.safeParse({
      ...valid,
      diagnosis: { ...valid.diagnosis, severity: "extreme" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a confidence above 1", () => {
    const result = PlantDiagnosisSchema.safeParse({
      ...valid,
      diagnosis: { ...valid.diagnosis, confidence: 1.2 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative confidence", () => {
    const result = PlantDiagnosisSchema.safeParse({
      ...valid,
      diagnosis: { ...valid.diagnosis, confidence: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing name", () => {
    const { name: _name, ...withoutName } = valid.diagnosis;
    const result = PlantDiagnosisSchema.safeParse({ ...valid, diagnosis: withoutName });
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 alternatives", () => {
    const tooMany = Array.from({ length: 4 }, (_, i) => ({
      issue_type: "unknown",
      name: `Alternativ ${i}`,
      confidence: 0.1,
      severity: null,
      description: "Osäker bedömning.",
      recommended_actions: [],
    }));
    const result = PlantDiagnosisSchema.safeParse({ ...valid, alternatives: tooMany });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 recommended_actions", () => {
    const result = PlantDiagnosisSchema.safeParse({
      ...valid,
      diagnosis: { ...valid.diagnosis, recommended_actions: Array.from({ length: 6 }, (_, i) => `Åtgärd ${i}`) },
    });
    expect(result.success).toBe(false);
  });

  it("rejects completely malformed input (free text instead of JSON structure)", () => {
    const result = PlantDiagnosisSchema.safeParse("Det här ser ut som bladlöss.");
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    expect(PlantDiagnosisSchema.safeParse(null).success).toBe(false);
  });

  it("rejects an empty object", () => {
    expect(PlantDiagnosisSchema.safeParse({}).success).toBe(false);
  });
});
