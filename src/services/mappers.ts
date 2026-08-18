import type { Database } from "@/integrations/supabase/types";
import type {
  Plant,
  PlantSpecies,
  CareTask,
  Harvest,
  WeatherSnapshot,
  AppNotification,
  PlantCategory,
  IndoorOutdoor,
  IndoorOutdoorBoth,
  ContainerType,
  TaskType,
  TaskSource,
  Priority,
  HarvestUnit,
  NotificationType,
  NotificationStatus,
} from "@/types/domain";

type Tables = Database["plant_care"]["Tables"];

export function mapSpecies(row: Tables["plant_species"]["Row"]): PlantSpecies {
  return {
    id: row.id,
    name: row.name,
    category: row.category as PlantCategory,
    emoji: row.emoji,
    wateringIntervalDays: row.watering_interval_days,
    fertilizingIntervalDays: row.fertilizing_interval_days,
    pruningPeriod: row.pruning_period,
    plantingPeriod: row.planting_period,
    harvestStartMonth: row.harvest_start_month,
    harvestEndMonth: row.harvest_end_month,
    minTemperatureC: row.min_temperature_c,
    frostSensitive: row.frost_sensitive,
    winterStrategy: row.winter_strategy,
    indoorOutdoor: row.indoor_outdoor as IndoorOutdoorBoth,
    description: row.description,
  };
}

export function mapPlant(row: Tables["plants"]["Row"]): Plant {
  return {
    id: row.id,
    userId: row.user_id,
    speciesId: row.species_id,
    name: row.name,
    species: row.species,
    variety: row.variety,
    photoUrl: row.photo_url,
    location: row.location,
    indoorOutdoor: row.indoor_outdoor as IndoorOutdoor,
    containerType: row.container_type as ContainerType | null,
    purchaseDate: row.purchase_date,
    approximateAgeYears: row.approximate_age_years,
    notes: row.notes,
    customWateringIntervalDays: row.custom_watering_interval_days,
    customFertilizingIntervalDays: row.custom_fertilizing_interval_days,
    customMinTemperatureC: row.custom_min_temperature_c,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCareTask(row: Tables["care_tasks"]["Row"]): CareTask {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    taskType: row.task_type as TaskType,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    priority: row.priority as Priority,
    source: row.source as TaskSource,
    createdAt: row.created_at,
  };
}

export function mapHarvest(row: Tables["harvests"]["Row"]): Harvest {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    harvestDate: row.harvest_date,
    cropName: row.crop_name,
    quantity: row.quantity,
    unit: row.unit as HarvestUnit | null,
    notes: row.notes,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}

export function mapWeather(row: Tables["weather_snapshots"]["Row"]): WeatherSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    location: row.location,
    temperature: row.temperature,
    minimumTemperature: row.minimum_temperature,
    maximumTemperature: row.maximum_temperature,
    precipitation: row.precipitation,
    forecastDate: row.forecast_date,
    source: row.source as "mock" | "api",
    createdAt: row.created_at,
  };
}

export function mapNotification(row: Tables["notifications"]["Row"]): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    plantId: row.plant_id,
    taskId: row.task_id,
    title: row.title,
    message: row.message,
    priority: row.priority as Priority,
    type: row.type as NotificationType,
    status: row.status as NotificationStatus,
    scheduledAt: row.scheduled_at,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
