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
  createdAt: string;
  updatedAt: string;
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
