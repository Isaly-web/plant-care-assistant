import { describe, expect, it } from "vitest";
import type { PlantSpecies, PlantWithSpecies } from "@/types/domain";
import { buildCareAdvice, fertilizingAdvice, lightAdvice, wateringAdvice } from "./careAdviceService";

function makeSpecies(overrides: Partial<PlantSpecies> = {}): PlantSpecies {
  return {
    id: "species-1",
    name: "Monstera",
    category: "indoor",
    emoji: "🪴",
    wateringIntervalDays: 7,
    fertilizingIntervalDays: 30,
    pruningPeriod: null,
    plantingPeriod: null,
    harvestStartMonth: null,
    harvestEndMonth: null,
    minTemperatureC: null,
    frostSensitive: false,
    winterStrategy: null,
    indoorOutdoor: "indoor",
    description: null,
    lightNeeds: "bright_indirect",
    ...overrides,
  };
}

function makePlant(overrides: Partial<PlantWithSpecies> = {}): PlantWithSpecies {
  const species = overrides.speciesDetails !== undefined ? overrides.speciesDetails : makeSpecies();
  return {
    id: "plant-1",
    userId: "user-1",
    speciesId: species?.id ?? null,
    name: "Monstera i vardagsrummet",
    species: species?.name ?? null,
    variety: null,
    photoUrl: null,
    location: "Vardagsrum",
    indoorOutdoor: "indoor",
    containerType: "pot",
    purchaseDate: "2026-01-01",
    approximateAgeYears: null,
    notes: null,
    customWateringIntervalDays: null,
    customFertilizingIntervalDays: null,
    customMinTemperatureC: null,
    isActive: true,
    identificationSource: "manual",
    plantIdentificationId: null,
    identificationConfidence: null,
    identifiedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    speciesDetails: species,
    effectiveWateringIntervalDays: species?.wateringIntervalDays ?? null,
    effectiveFertilizingIntervalDays: species?.fertilizingIntervalDays ?? null,
    effectiveMinTemperatureC: species?.minTemperatureC ?? null,
    effectiveFrostSensitive: species?.frostSensitive ?? false,
    emoji: species?.emoji ?? "🌱",
    ...overrides,
  };
}

describe("wateringAdvice", () => {
  it("mentions the species interval when there is no custom override", () => {
    const plant = makePlant();
    expect(wateringAdvice(plant)).toContain("var 7:e dag");
    expect(wateringAdvice(plant)).not.toContain("själv ställt in");
  });

  it("flags a user-set custom interval", () => {
    const plant = makePlant({ customWateringIntervalDays: 3, effectiveWateringIntervalDays: 3 });
    expect(wateringAdvice(plant)).toContain("själv ställt in vattning");
    expect(wateringAdvice(plant)).toContain("var 3:e dag");
  });

  it("adds a pot-specific note only for potted plants", () => {
    const potted = makePlant({ containerType: "pot" });
    const ground = makePlant({ containerType: "ground" });
    expect(wateringAdvice(potted)).toContain("Krukor torkar ut snabbare");
    expect(wateringAdvice(ground)).not.toContain("Krukor torkar ut snabbare");
  });

  it("falls back to a generic tip when the species has no watering interval", () => {
    const plant = makePlant({ effectiveWateringIntervalDays: null });
    expect(wateringAdvice(plant)).toContain("känn på jorden");
  });
});

describe("lightAdvice", () => {
  it("gives outdoor-oriented full-sun advice", () => {
    const plant = makePlant({
      indoorOutdoor: "outdoor",
      speciesDetails: makeSpecies({ lightNeeds: "full_sun", indoorOutdoor: "outdoor" }),
    });
    expect(lightAdvice(plant)).toContain("fullsol");
  });

  it("gives indoor-oriented full-sun advice for a full-sun plant kept indoors", () => {
    const plant = makePlant({
      indoorOutdoor: "indoor",
      speciesDetails: makeSpecies({ lightNeeds: "full_sun" }),
    });
    expect(lightAdvice(plant)).toContain("söderfönster");
  });

  it("falls back when there is no identified species", () => {
    const plant = makePlant({ speciesDetails: null });
    expect(lightAdvice(plant)).toContain("Ingen artspecifik ljusinformation");
  });

  it.each([
    ["partial_sun", "halvskugga"],
    ["shade", "skugga"],
    ["bright_indirect", "direkt sol"],
    ["low_light", "skuggigare"],
  ] as const)("covers %s", (lightNeeds, expected) => {
    const plant = makePlant({ speciesDetails: makeSpecies({ lightNeeds }) });
    expect(lightAdvice(plant).toLowerCase()).toContain(expected);
  });
});

describe("fertilizingAdvice", () => {
  it("recommends the interval during the growing season", () => {
    const plant = makePlant();
    expect(fertilizingAdvice(plant, "2026-06-15")).toContain("var 30:e dag");
  });

  it("pauses outside the growing season", () => {
    const plant = makePlant();
    expect(fertilizingAdvice(plant, "2026-01-10")).toContain("vilar de flesta växter");
  });

  it("flags a user-set custom interval during the growing season", () => {
    const plant = makePlant({ customFertilizingIntervalDays: 14, effectiveFertilizingIntervalDays: 14 });
    expect(fertilizingAdvice(plant, "2026-06-15")).toContain("själv ställt in gödsling");
  });

  it("says no regular fertilizing is needed when the species has no interval", () => {
    const plant = makePlant({ effectiveFertilizingIntervalDays: null });
    expect(fertilizingAdvice(plant, "2026-06-15")).toContain("ingen regelbunden gödsling");
  });
});

describe("buildCareAdvice", () => {
  it("returns all three pieces of advice", () => {
    const plant = makePlant();
    const advice = buildCareAdvice(plant, "2026-06-15");
    expect(advice.watering).toBeTruthy();
    expect(advice.light).toBeTruthy();
    expect(advice.fertilizing).toBeTruthy();
  });
});
