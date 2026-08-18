import { supabase } from "@/integrations/supabase/client";
import { mapWeather } from "./mappers";
import type { WeatherSnapshot } from "@/types/domain";
import { createWeatherService } from "./weatherService";

/** Latest cached snapshot per location for the signed-in user. */
export async function fetchLatestWeatherByLocation(): Promise<Map<string, WeatherSnapshot>> {
  const { data, error } = await supabase
    .from("weather_snapshots")
    .select("*")
    .order("forecast_date", { ascending: true });
  if (error) throw error;

  const map = new Map<string, WeatherSnapshot>();
  for (const row of data ?? []) {
    map.set(row.location, mapWeather(row));
  }
  return map;
}

/**
 * Pulls a fresh forecast from WeatherService for a location and upserts today's snapshot.
 * Called on dashboard load so recommendations use current data without re-fetching per plant.
 */
export async function refreshWeatherForLocation(location: string): Promise<WeatherSnapshot> {
  const weatherService = createWeatherService();
  const [today] = await weatherService.getForecast(location, 1);

  const { data, error } = await supabase
    .from("weather_snapshots")
    .upsert(
      {
        location,
        temperature: today.temperature,
        minimum_temperature: today.minimumTemperature,
        maximum_temperature: today.maximumTemperature,
        precipitation: today.precipitation,
        forecast_date: today.date,
        source: "mock",
      },
      { onConflict: "user_id,location,forecast_date" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return mapWeather(data);
}
