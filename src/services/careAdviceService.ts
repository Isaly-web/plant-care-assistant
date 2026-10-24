import type { PlantWithSpecies, LightNeeds } from "@/types/domain";
import { monthName } from "@/lib/date";

/**
 * Personliga skötselråd: rule-based watering/light/fertilizing guidance per plant,
 * built on top of the species already identified (manually or via AI) for that plant.
 *
 * Same philosophy as ruleEngine.ts — pure functions, deliberately imprecise language,
 * so a smarter (AI-generated) version can later replace these with the same shape.
 */

export interface CareAdvice {
  watering: string;
  light: string;
  fertilizing: string;
}

const GROWING_SEASON_START_MONTH = 4; // april
const GROWING_SEASON_END_MONTH = 9; // september

function monthOf(dateStr: string): number {
  return Number(dateStr.slice(5, 7));
}

function isGrowingSeasonMonth(month: number): boolean {
  return month >= GROWING_SEASON_START_MONTH && month <= GROWING_SEASON_END_MONTH;
}

/** Vattningsråd: intervall (artens eller ett eget) plus en krukspecifik notis. */
export function wateringAdvice(plant: PlantWithSpecies): string {
  const interval = plant.effectiveWateringIntervalDays;
  if (interval === null) {
    return "Ingen artspecifik vattningsrekommendation ännu — känn på jorden ett par cm ner och vattna när den känns torr.";
  }

  const base =
    plant.customWateringIntervalDays !== null
      ? `Du har själv ställt in vattning ungefär var ${interval}:e dag för ${plant.name.toLowerCase()}.`
      : `Vattna ${plant.name.toLowerCase()} ungefär var ${interval}:e dag.`;

  const potNote =
    plant.containerType === "pot"
      ? " Krukor torkar ut snabbare än öppen mark — känn efter i jorden extra ofta när det är varmt."
      : "";

  return `${base}${potNote}`;
}

const LIGHT_ADVICE_BY_NEEDS: Record<LightNeeds, (plant: PlantWithSpecies) => string> = {
  full_sun: (plant) =>
    plant.indoorOutdoor === "indoor"
      ? "Behöver en riktigt ljus plats inomhus, gärna i ett söderfönster med flera timmars direkt sol."
      : "Trivs bäst i fullsol — minst 5–6 timmars direkt sol per dag.",
  partial_sun: () => "Trivs bäst i sol till halvskugga, gärna med lite skugga under den hetaste delen av dagen.",
  shade: () => "Klarar sig bra i skugga eller halvskugga.",
  bright_indirect: () => "Vill ha ljust men inte stark, direkt sol — undvik fönster i rakt söderläge mitt på dagen.",
  low_light: () => "Klarar även skuggigare platser inomhus, men växer finare med lite dagsljus.",
};

/** Ljusråd: baseras på artens lightNeeds, anpassat efter om växten står inne eller ute. */
export function lightAdvice(plant: PlantWithSpecies): string {
  const needs = plant.speciesDetails?.lightNeeds ?? null;
  if (!needs) {
    return "Ingen artspecifik ljusinformation ännu — identifiera eller välj en art för personliga råd.";
  }
  return LIGHT_ADVICE_BY_NEEDS[needs](plant);
}

/** Gödslingsråd: intervall (artens eller ett eget), pausat utanför växtsäsongen. */
export function fertilizingAdvice(plant: PlantWithSpecies, today: string): string {
  const interval = plant.effectiveFertilizingIntervalDays;
  if (interval === null) {
    return "Den här arten behöver normalt ingen regelbunden gödsling.";
  }

  const month = monthOf(today);
  if (!isGrowingSeasonMonth(month)) {
    return `Just nu (${monthName(month)}) vilar de flesta växter — vänta med gödsling till växtsäsongen börjar i ${monthName(GROWING_SEASON_START_MONTH)}.`;
  }

  return plant.customFertilizingIntervalDays !== null
    ? `Du har själv ställt in gödsling ungefär var ${interval}:e dag under växtsäsongen.`
    : `Gödsla ungefär var ${interval}:e dag under växtsäsongen (${monthName(GROWING_SEASON_START_MONTH)}–${monthName(GROWING_SEASON_END_MONTH)}).`;
}

/** Alla tre råden för en växt, samlade för visning i UI:t. */
export function buildCareAdvice(plant: PlantWithSpecies, today: string): CareAdvice {
  return {
    watering: wateringAdvice(plant),
    light: lightAdvice(plant),
    fertilizing: fertilizingAdvice(plant, today),
  };
}
