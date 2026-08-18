import { supabase } from "@/integrations/supabase/client";
import { mapPlant } from "./mappers";
import type { Plant, PlantSpecies, PlantWithSpecies } from "@/types/domain";

export interface UpsertPlantInput {
  name: string;
  speciesId: string | null;
  species: string | null;
  variety: string | null;
  photoUrl: string | null;
  location: string | null;
  indoorOutdoor: "indoor" | "outdoor";
  containerType: "pot" | "ground" | null;
  purchaseDate: string | null;
  approximateAgeYears: number | null;
  notes: string | null;
}

export async function fetchPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPlant);
}

export async function fetchPlant(id: string): Promise<Plant | null> {
  const { data, error } = await supabase.from("plants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapPlant(data) : null;
}

export async function createPlant(input: UpsertPlantInput): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .insert({
      name: input.name,
      species_id: input.speciesId,
      species: input.species,
      variety: input.variety,
      photo_url: input.photoUrl,
      location: input.location,
      indoor_outdoor: input.indoorOutdoor,
      container_type: input.containerType,
      purchase_date: input.purchaseDate,
      approximate_age_years: input.approximateAgeYears,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapPlant(data);
}

export async function updatePlant(id: string, input: Partial<UpsertPlantInput>): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.speciesId !== undefined && { species_id: input.speciesId }),
      ...(input.species !== undefined && { species: input.species }),
      ...(input.variety !== undefined && { variety: input.variety }),
      ...(input.photoUrl !== undefined && { photo_url: input.photoUrl }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.indoorOutdoor !== undefined && { indoor_outdoor: input.indoorOutdoor }),
      ...(input.containerType !== undefined && { container_type: input.containerType }),
      ...(input.purchaseDate !== undefined && { purchase_date: input.purchaseDate }),
      ...(input.approximateAgeYears !== undefined && { approximate_age_years: input.approximateAgeYears }),
      ...(input.notes !== undefined && { notes: input.notes }),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapPlant(data);
}

export async function archivePlant(id: string): Promise<void> {
  const { error } = await supabase.from("plants").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

/** Merge a plant with its species defaults into the shape the rule engine and UI actually use. */
export function toPlantWithSpecies(plant: Plant, species: PlantSpecies | null): PlantWithSpecies {
  return {
    ...plant,
    speciesDetails: species,
    effectiveWateringIntervalDays: plant.customWateringIntervalDays ?? species?.wateringIntervalDays ?? null,
    effectiveFertilizingIntervalDays: plant.customFertilizingIntervalDays ?? species?.fertilizingIntervalDays ?? null,
    effectiveMinTemperatureC: plant.customMinTemperatureC ?? species?.minTemperatureC ?? null,
    effectiveFrostSensitive: species?.frostSensitive ?? false,
    emoji: species?.emoji ?? "🌱",
  };
}
