import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { PlantWithSpecies, WeatherSnapshot } from "@/types/domain";
import { fetchLatestWeatherByLocation, refreshWeatherForLocation } from "@/services/weatherSnapshotService";
import { todayDateOnly } from "@/lib/date";

const DEFAULT_OUTDOOR_LOCATION = "Utomhus";

export function weatherLocationForPlant(plant: PlantWithSpecies): string {
  return plant.location?.trim() || DEFAULT_OUTDOOR_LOCATION;
}

/**
 * Ensures every outdoor location among the user's plants has a fresh (today's)
 * mocked weather snapshot cached in the DB, then returns location -> snapshot.
 */
export function useWeatherForPlants(plants: PlantWithSpecies[]) {
  const queryClient = useQueryClient();
  const outdoorLocations = useMemo(
    () =>
      Array.from(
        new Set(plants.filter((p) => p.indoorOutdoor === "outdoor").map((p) => weatherLocationForPlant(p))),
      ).sort(),
    [plants],
  );

  const cachedQuery = useQuery({ queryKey: ["weather"], queryFn: fetchLatestWeatherByLocation });

  const staleLocations = useMemo(() => {
    if (!cachedQuery.data) return outdoorLocations;
    const today = todayDateOnly();
    return outdoorLocations.filter((loc) => {
      const snapshot = cachedQuery.data!.get(loc);
      return !snapshot || snapshot.forecastDate !== today;
    });
  }, [cachedQuery.data, outdoorLocations]);

  useEffect(() => {
    if (staleLocations.length === 0) return;
    let cancelled = false;
    Promise.all(staleLocations.map((loc) => refreshWeatherForLocation(loc))).then(() => {
      if (!cancelled) queryClient.invalidateQueries({ queryKey: ["weather"] });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staleLocations.join(",")]);

  const map: Map<string, WeatherSnapshot> = cachedQuery.data ?? new Map();
  return { weatherByLocation: map, isLoading: cachedQuery.isLoading || staleLocations.length > 0 };
}
