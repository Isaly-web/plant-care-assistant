// Core domain types for Plant Care Assistant.
// These mirror the `plant_care` Postgres schema but stay hand-written (not generated)
// so the rule engine / services can depend on a stable, documented shape.

export type PlantCategory = "indoor" | "mediterranean" | "flower" | "fruit_tree" | "berry" | "other";
export type IndoorOutdoor = "indoor" | "outdoor";
export type IndoorOutdoorBoth = IndoorOutdoor | "both";
export type ContainerType = "pot" | "ground";
export type Priority = "high" | "medium" | "low";
export type TaskType = "watering" | "fertilizing" | "pruning" | "repotting" | "winter_protection" | "harvest_check" | "other";
export type TaskSource = "rule_engine" | "manual" | "weather";
export type HarvestUnit = "kg" | "g" | "st" | "liter" | "other";
export type NotificationType = "frost" | "watering" | "fertilizing" | "pruning" | "harvest" | "general";
export type NotificationStatus = "pending" | "sent" | "read";
export type IdentificationSource = "manual" | "ai";
export type PlantIdentificationStatus = "pending" | "completed" | "failed" | "confirmed" | "discarded";
export type DiagnosisIssueType = "disease" | "pest" | "nutrient_deficiency" | "environmental" | "healthy" | "unknown";
export type DiagnosisSeverity = "low" | "medium" | "high";
export type PlantDiagnosisStatus = "pending" | "completed" | "failed" | "acknowledged" | "discarded";

/** Traffic-light status shown throughout the UI. Never derived by guessing — always from the rule engine. */
export type UrgencyStatus = "urgent" | "soon" | "ok";

export interface PlantSpecies {
  id: string;
  name: string;
  category: PlantCategory;
  emoji: string;
  wateringIntervalDays: number;
  fertilizingIntervalDays: number | null;
  pruningPeriod: string | null;
  plantingPeriod: string | null;
  harvestStartMonth: number | null;
  harvestEndMonth: number | null;
  minTemperatureC: number | null;
  frostSensitive: boolean;
  winterStrategy: string | null;
  indoorOutdoor: IndoorOutdoorBoth;
  description: string | null;
}

export interface Plant {
  id: string;
  userId: string;
  speciesId: string | null;
  name: string;
  species: string | null;
  variety: string | null;
  photoUrl: string | null;
  location: string | null;
  indoorOutdoor: IndoorOutdoor;
  containerType: ContainerType | null;
  purchaseDate: string | null;
  approximateAgeYears: number | null;
  notes: string | null;
  customWateringIntervalDays: number | null;
  customFertilizingIntervalDays: number | null;
  customMinTemperatureC: number | null;
  isActive: boolean;
  identificationSource: IdentificationSource;
  plantIdentificationId: string | null;
  identificationConfidence: number | null;
  identifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One candidate species — either the AI's top pick or one of its alternatives. */
export interface PlantIdentificationCandidate {
  scientificName: string;
  commonName: string;
  /** The model's own qualitative self-assessment, normalized to 0-1 — not a
   * calibrated statistical probability. See src/lib/plantIdentification.ts
   * for how this is bucketed into the three user-facing confidence tiers. */
  confidence: number;
}

/** The structured result returned by the identify-plant edge function for a
 * single photo — the AI's observation, before any user confirmation. */
export interface PlantIdentificationResult {
  identification: PlantIdentificationCandidate;
  alternatives: PlantIdentificationCandidate[];
  observations: string[];
}

export interface PlantIdentification {
  id: string;
  userId: string;
  plantId: string | null;
  storagePath: string;
  status: PlantIdentificationStatus;
  ai: PlantIdentificationResult | null;
  identifiedAt: string | null;
  errorMessage: string | null;
  confirmedScientificName: string | null;
  confirmedCommonName: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

/** One candidate health finding for an existing plant — a disease, pest,
 * nutrient deficiency, environmental issue, or "looks healthy"/"can't tell".
 * Deliberately separate from PlantIdentificationCandidate (species identity)
 * per the original spec: this is diagnosis of a plant whose species is
 * already known, never a species guess. */
export interface PlantDiagnosisCandidate {
  issueType: DiagnosisIssueType;
  name: string;
  /** The model's own qualitative self-assessment, normalized to 0-1 — not a
   * calibrated statistical probability. */
  confidence: number;
  /** null when issueType is "healthy" (nothing to grade) or the model
   * couldn't judge severity. */
  severity: DiagnosisSeverity | null;
  description: string;
  recommendedActions: string[];
}

/** The structured result returned by the diagnose-plant edge function for a
 * single photo — the AI's observation, before the user acknowledges it. */
export interface PlantDiagnosisResult {
  diagnosis: PlantDiagnosisCandidate;
  alternatives: PlantDiagnosisCandidate[];
  observations: string[];
}

export interface PlantDiagnosis {
  id: string;
  userId: string;
  plantId: string;
  storagePath: string;
  symptomDescription: string | null;
  status: PlantDiagnosisStatus;
  ai: PlantDiagnosisResult | null;
  diagnosedAt: string | null;
  errorMessage: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

/** A plant joined with its species defaults, resolved to the values that actually apply. */
export interface PlantWithSpecies extends Plant {
  speciesDetails: PlantSpecies | null;
  effectiveWateringIntervalDays: number | null;
  effectiveFertilizingIntervalDays: number | null;
  effectiveMinTemperatureC: number | null;
  effectiveFrostSensitive: boolean;
  emoji: string;
}

export interface CareTask {
  id: string;
  userId: string;
  plantId: string;
  taskType: TaskType;
  title: string;
  description: string | null;
  dueDate: string;
  completedAt: string | null;
  priority: Priority;
  source: TaskSource;
  createdAt: string;
}

export interface Harvest {
  id: string;
  userId: string;
  plantId: string;
  harvestDate: string;
  cropName: string | null;
  quantity: number | null;
  unit: HarvestUnit | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface WeatherSnapshot {
  id: string;
  userId: string;
  location: string;
  temperature: number | null;
  minimumTemperature: number | null;
  maximumTemperature: number | null;
  precipitation: number | null;
  forecastDate: string;
  source: "mock" | "api";
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  plantId: string | null;
  taskId: string | null;
  title: string;
  message: string;
  priority: Priority;
  type: NotificationType;
  status: NotificationStatus;
  scheduledAt: string;
  readAt: string | null;
  createdAt: string;
}

/** One line the rule engine produces: "what to do, for which plant, how urgent, and why." */
export interface RecommendedAction {
  id: string;
  plantId: string;
  plantName: string;
  emoji: string;
  taskType: TaskType;
  title: string;
  reason: string;
  urgency: UrgencyStatus;
  priority: Priority;
  dueDate: string;
  existingTaskId: string | null;
}

export const CATEGORY_LABELS: Record<PlantCategory, string> = {
  indoor: "Inomhus",
  mediterranean: "Medelhavsväxt",
  flower: "Blomma",
  fruit_tree: "Fruktträd",
  berry: "Bär",
  other: "Övrigt",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  watering: "Vattning",
  fertilizing: "Gödsling",
  pruning: "Beskärning",
  repotting: "Omplantering",
  winter_protection: "Vinterförvaring",
  harvest_check: "Skördekontroll",
  other: "Övrigt",
};
