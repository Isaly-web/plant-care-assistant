import { supabase } from "@/integrations/supabase/client";
import { addDays, todayDateOnly } from "@/lib/date";
import { fetchAllSpecies } from "./speciesService";

/**
 * Seeds a freshly signed-up account with a believable set of plants, care history,
 * a harvest, and forced weather snapshots — so the dashboard immediately shows one
 * of each status (🔴 urgent, 🟡 soon, 🟢 ok) instead of an empty screen.
 * Only ever called from Settings, and only offered while the user has zero plants.
 */
export async function seedDemoData(): Promise<void> {
  const species = await fetchAllSpecies();
  const byName = new Map(species.map((s) => [s.name, s]));
  const today = todayDateOnly();
  const purchaseDate = addDays(today, -30);

  const findSpecies = (name: string) => {
    const s = byName.get(name);
    if (!s) throw new Error(`Demo-data kunde inte hitta växttypen "${name}" i plant_species.`);
    return s;
  };

  // Force tonight's forecast for the two frost-relevant demo locations, so the
  // dashboard's urgent/soon examples don't depend on which season this actually runs in.
  await supabase.from("weather_snapshots").upsert(
    [
      { location: "Altan", minimum_temperature: 1, maximum_temperature: 14, temperature: 8, precipitation: 0, forecast_date: today, source: "mock" },
      { location: "Balkong", minimum_temperature: 4, maximum_temperature: 15, temperature: 9, precipitation: 0.5, forecast_date: today, source: "mock" },
    ],
    { onConflict: "user_id,location,forecast_date" },
  );

  const plantDefs = [
    {
      name: "Citronträd",
      speciesName: "Citronträd",
      location: "Altan",
      indoorOutdoor: "outdoor" as const,
      containerType: "pot" as const,
      wateredDaysAgo: 0,
      fertilizedDaysAgo: 0,
      extraHistory: [{ taskType: "pruning" as const, title: "Beskärning", daysAgo: 29 }],
    },
    {
      name: "Pelargon",
      speciesName: "Pelargon",
      location: "Balkong",
      indoorOutdoor: "outdoor" as const,
      containerType: "pot" as const,
      wateredDaysAgo: 0,
      fertilizedDaysAgo: 0,
    },
    {
      name: "Benjaminfikus",
      speciesName: "Benjaminfikus",
      location: "Vardagsrum",
      indoorOutdoor: "indoor" as const,
      containerType: "pot" as const,
      wateredDaysAgo: 2,
      fertilizedDaysAgo: 0,
    },
    {
      name: "Aroma",
      speciesName: "Aroma",
      location: "Trädgården",
      indoorOutdoor: "outdoor" as const,
      containerType: "ground" as const,
      wateredDaysAgo: 0,
      fertilizedDaysAgo: 0,
    },
    {
      name: "Ingrid Marie",
      speciesName: "Ingrid Marie",
      location: "Trädgården",
      indoorOutdoor: "outdoor" as const,
      containerType: "ground" as const,
      wateredDaysAgo: 0,
      fertilizedDaysAgo: 0,
    },
    {
      name: "Hallon",
      speciesName: "Hallon",
      location: "Bärlandet",
      indoorOutdoor: "outdoor" as const,
      containerType: "ground" as const,
      wateredDaysAgo: 0,
      fertilizedDaysAgo: 0,
      harvest: { cropName: "Hallon", quantity: 0.7, unit: "kg" as const, notes: "Första plockningen i år." },
    },
    {
      name: "Jordgubbar",
      speciesName: "Jordgubbar",
      location: "Bärlandet",
      indoorOutdoor: "outdoor" as const,
      containerType: "ground" as const,
      wateredDaysAgo: 2,
      fertilizedDaysAgo: 0,
    },
  ];

  for (const def of plantDefs) {
    const speciesRow = findSpecies(def.speciesName);

    const { data: plant, error: plantError } = await supabase
      .from("plants")
      .insert({
        name: def.name,
        species_id: speciesRow.id,
        species: speciesRow.name,
        location: def.location,
        indoor_outdoor: def.indoorOutdoor,
        container_type: def.containerType,
        purchase_date: purchaseDate,
      })
      .select("*")
      .single();
    if (plantError) throw plantError;

    const historyRows = [
      {
        plant_id: plant.id,
        task_type: "watering",
        title: "Vattning",
        due_date: addDays(today, -def.wateredDaysAgo),
        completed_at: new Date(addDays(today, -def.wateredDaysAgo)).toISOString(),
        priority: "medium",
        source: "manual",
      },
      {
        plant_id: plant.id,
        task_type: "fertilizing",
        title: "Gödsling",
        due_date: addDays(today, -def.fertilizedDaysAgo),
        completed_at: new Date(addDays(today, -def.fertilizedDaysAgo)).toISOString(),
        priority: "medium",
        source: "manual",
      },
      ...(def.extraHistory ?? []).map((h) => ({
        plant_id: plant.id,
        task_type: h.taskType,
        title: h.title,
        due_date: addDays(today, -h.daysAgo),
        completed_at: new Date(addDays(today, -h.daysAgo)).toISOString(),
        priority: "medium",
        source: "manual",
      })),
    ];

    const { error: taskError } = await supabase.from("care_tasks").insert(historyRows);
    if (taskError) throw taskError;

    if (def.harvest) {
      const { error: harvestError } = await supabase.from("harvests").insert({
        plant_id: plant.id,
        harvest_date: today,
        crop_name: def.harvest.cropName,
        quantity: def.harvest.quantity,
        unit: def.harvest.unit,
        notes: def.harvest.notes,
      });
      if (harvestError) throw harvestError;
    }
  }
}
