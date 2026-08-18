import type {
  PlantWithSpecies,
  WeatherSnapshot,
  RecommendedAction,
  TaskType,
  UrgencyStatus,
  Priority,
} from "@/types/domain";
import { addDays, daysBetween, monthName } from "@/lib/date";

/**
 * The rule engine. Every function here is pure: (plant + weather + history) -> recommendations.
 * No UI, no network calls — this is what makes "AI-funktioner och mer avancerad väderlogik"
 * a drop-in replacement later (swap `evaluateAllRules` for a smarter version with the same shape).
 *
 * Deliberately imprecise language ("kontrollera", "börjar närma sig") — never claim exact
 * certainty the app doesn't have (see spec section 15 / "Viktig produktprincip").
 */

const SOON_WINDOW_DAYS = 3;
const HARVEST_LOOKAHEAD_DAYS = 21;
const FROST_WARNING_BUFFER_C = 3;

function urgencyToPriority(u: UrgencyStatus): Priority {
  if (u === "urgent") return "high";
  if (u === "soon") return "medium";
  return "low";
}

function makeAction(
  plant: PlantWithSpecies,
  taskType: TaskType,
  title: string,
  reason: string,
  urgency: UrgencyStatus,
  dueDate: string,
): RecommendedAction {
  return {
    id: `${plant.id}:${taskType}`,
    plantId: plant.id,
    plantName: plant.name,
    emoji: plant.emoji,
    taskType,
    title,
    reason,
    urgency,
    priority: urgencyToPriority(urgency),
    dueDate,
    existingTaskId: null,
  };
}

/** Frostregel: outdoor + frost-sensitive + forecast below the plant's threshold. */
export function frostRule(
  plant: PlantWithSpecies,
  weather: WeatherSnapshot | null,
  today: string,
): RecommendedAction | null {
  if (plant.indoorOutdoor !== "outdoor") return null;
  if (!plant.effectiveFrostSensitive) return null;
  if (!weather || weather.minimumTemperature === null) return null;

  const threshold = plant.effectiveMinTemperatureC;
  if (threshold === null) return null;

  if (weather.minimumTemperature < threshold) {
    return makeAction(
      plant,
      "winter_protection",
      `Ta in ${plant.name}`,
      `Prognosen visar ${Math.round(weather.minimumTemperature)}°C i natt — under vad ${plant.name.toLowerCase()} tål.`,
      "urgent",
      today,
    );
  }

  if (weather.minimumTemperature < threshold + FROST_WARNING_BUFFER_C) {
    return makeAction(
      plant,
      "winter_protection",
      "Kallt väder väntas",
      `Kontrollera om ${plant.name.toLowerCase()} behöver flyttas till en skyddad plats.`,
      "soon",
      today,
    );
  }

  return null;
}

/** Vattningsregel: dagar sedan senaste vattning jämfört med rekommenderat intervall. */
export function wateringRule(
  plant: PlantWithSpecies,
  lastWateredDate: string | null,
  today: string,
): RecommendedAction | null {
  const interval = plant.effectiveWateringIntervalDays;
  if (interval === null) return null;

  const baseline = lastWateredDate ?? plant.purchaseDate ?? plant.createdAt.slice(0, 10);
  const daysSince = daysBetween(baseline, today);
  const daysLeft = interval - daysSince;

  if (daysLeft <= 0) {
    return makeAction(
      plant,
      "watering",
      "Kontrollera jordfuktigheten",
      lastWateredDate
        ? `Det har gått ${daysSince} dagar sedan senaste vattning.`
        : "Ingen vattning registrerad ännu — kontrollera jorden.",
      "urgent",
      today,
    );
  }

  if (daysLeft <= SOON_WINDOW_DAYS) {
    return makeAction(
      plant,
      "watering",
      "Vattning snart",
      `Cirka ${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"} kvar till nästa vattning.`,
      "soon",
      addDays(today, daysLeft),
    );
  }

  return null;
}

/** Gödslingsregel: nästa gödsling passerad eller nära. */
export function fertilizingRule(
  plant: PlantWithSpecies,
  lastFertilizedDate: string | null,
  today: string,
): RecommendedAction | null {
  const interval = plant.effectiveFertilizingIntervalDays;
  if (interval === null) return null;

  const baseline = lastFertilizedDate ?? plant.purchaseDate ?? plant.createdAt.slice(0, 10);
  const daysSince = daysBetween(baseline, today);
  const daysLeft = interval - daysSince;

  if (daysLeft <= 0) {
    return makeAction(
      plant,
      "fertilizing",
      "Dags att gödsla",
      lastFertilizedDate
        ? `Senast gödslad för ${daysSince} dagar sedan.`
        : "Ingen gödsling registrerad ännu.",
      "urgent",
      today,
    );
  }

  if (daysLeft <= SOON_WINDOW_DAYS) {
    return makeAction(
      plant,
      "fertilizing",
      `Gödsling om ${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"}`,
      "Börjar närma sig dags för nästa gödsling.",
      "soon",
      addDays(today, daysLeft),
    );
  }

  return null;
}

/** Skördregel: närmar sig eller är inne i skördeperioden. Aldrig falskt exakt. */
export function harvestRule(plant: PlantWithSpecies, today: string): RecommendedAction | null {
  const species = plant.speciesDetails;
  if (!species || species.harvestStartMonth === null || species.harvestEndMonth === null) return null;

  const todayDate = new Date(today);
  const year = todayDate.getFullYear();
  const startMonth = species.harvestStartMonth;
  const endMonth = species.harvestEndMonth;

  const startOfHarvest = new Date(year, startMonth - 1, 1);
  const endOfHarvest = new Date(year, endMonth, 0); // last day of endMonth
  const lookaheadStart = new Date(startOfHarvest);
  lookaheadStart.setDate(lookaheadStart.getDate() - HARVEST_LOOKAHEAD_DAYS);

  if (todayDate >= startOfHarvest && todayDate <= endOfHarvest) {
    return makeAction(
      plant,
      "harvest_check",
      `Kontrollera ${plant.name.toLowerCase()}`,
      "Flera kan börja bli mogna nu — kolla om det är dags att skörda.",
      "urgent",
      today,
    );
  }

  if (todayDate >= lookaheadStart && todayDate < startOfHarvest) {
    return makeAction(
      plant,
      "harvest_check",
      "Skörd närmar sig",
      `Förväntad skördeperiod: ${monthName(startMonth)}${endMonth !== startMonth ? `–${monthName(endMonth)}` : ""}.`,
      "soon",
      today,
    );
  }

  return null;
}

export interface RuleEngineInput {
  plant: PlantWithSpecies;
  weather: WeatherSnapshot | null;
  lastWateredDate: string | null;
  lastFertilizedDate: string | null;
  today: string;
}

/** Runs every rule for one plant and returns every action that applies (a plant can have several). */
export function evaluateAllRules(input: RuleEngineInput): RecommendedAction[] {
  const { plant, weather, lastWateredDate, lastFertilizedDate, today } = input;
  const results = [
    frostRule(plant, weather, today),
    wateringRule(plant, lastWateredDate, today),
    fertilizingRule(plant, lastFertilizedDate, today),
    harvestRule(plant, today),
  ];
  return results.filter((a): a is RecommendedAction => a !== null);
}

/** Worst-case status for a plant, used on plant cards ("Mina växter"). */
export function overallStatus(actions: RecommendedAction[]): UrgencyStatus {
  if (actions.some((a) => a.urgency === "urgent")) return "urgent";
  if (actions.some((a) => a.urgency === "soon")) return "soon";
  return "ok";
}

/**
 * For plants with no active action ("🟢 Inget att göra"), the spec still wants a
 * forward-looking line ("Nästa skötsel om 5 dagar"). This is informational only —
 * it never becomes a task on its own, so it isn't gated by the soon-window like the rules above.
 */
export function nextUpSummary(
  plant: PlantWithSpecies,
  lastWateredDate: string | null,
  lastFertilizedDate: string | null,
  today: string,
): string | null {
  const candidates: number[] = [];

  if (plant.effectiveWateringIntervalDays !== null) {
    const baseline = lastWateredDate ?? plant.purchaseDate ?? plant.createdAt.slice(0, 10);
    candidates.push(plant.effectiveWateringIntervalDays - daysBetween(baseline, today));
  }
  if (plant.effectiveFertilizingIntervalDays !== null) {
    const baseline = lastFertilizedDate ?? plant.purchaseDate ?? plant.createdAt.slice(0, 10);
    candidates.push(plant.effectiveFertilizingIntervalDays - daysBetween(baseline, today));
  }

  if (candidates.length === 0) return null;
  const daysLeft = Math.min(...candidates);
  if (daysLeft <= 0) return null; // would already be an active action
  return `Nästa skötsel om ${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"}`;
}
