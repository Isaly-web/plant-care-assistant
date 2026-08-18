import { supabase } from "@/integrations/supabase/client";
import { mapHarvest } from "./mappers";
import type { Harvest, HarvestUnit } from "@/types/domain";

export async function fetchHarvestsForPlant(plantId: string): Promise<Harvest[]> {
  const { data, error } = await supabase
    .from("harvests")
    .select("*")
    .eq("plant_id", plantId)
    .order("harvest_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapHarvest);
}

export async function fetchAllHarvests(): Promise<Harvest[]> {
  const { data, error } = await supabase.from("harvests").select("*").order("harvest_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapHarvest);
}

export interface CreateHarvestInput {
  plantId: string;
  harvestDate: string;
  cropName?: string | null;
  quantity?: number | null;
  unit?: HarvestUnit | null;
  notes?: string | null;
  photoUrl?: string | null;
}

export async function createHarvest(input: CreateHarvestInput): Promise<Harvest> {
  const { data, error } = await supabase
    .from("harvests")
    .insert({
      plant_id: input.plantId,
      harvest_date: input.harvestDate,
      crop_name: input.cropName ?? null,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      notes: input.notes ?? null,
      photo_url: input.photoUrl ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapHarvest(data);
}

export async function deleteHarvest(id: string): Promise<void> {
  const { error } = await supabase.from("harvests").delete().eq("id", id);
  if (error) throw error;
}
