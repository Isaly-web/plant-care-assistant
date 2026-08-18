import { supabase } from "@/integrations/supabase/client";
import { mapSpecies } from "./mappers";
import type { PlantSpecies } from "@/types/domain";

export async function fetchAllSpecies(): Promise<PlantSpecies[]> {
  const { data, error } = await supabase.from("plant_species").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSpecies);
}
