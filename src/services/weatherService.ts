/**
 * WeatherService — the only place that knows where weather data comes from.
 * UI and the rule engine never talk to a weather API directly; they go through this
 * interface. Swap `createWeatherService()`'s return value for a real provider
 * (SMHI/OpenWeather/etc.) later without touching rules or components.
 */

export interface WeatherDay {
  date: string; // yyyy-MM-dd
  temperature: number;
  minimumTemperature: number;
  maximumTemperature: number;
  precipitation: number;
}

export interface FrostRisk {
  atRisk: boolean;
  minimumTemperature: number;
  date: string;
}

export interface WeatherService {
  getCurrentTemperature(location: string): Promise<number>;
  getMinimumTemperature(location: string, date?: string): Promise<number>;
  getMaximumTemperature(location: string, date?: string): Promise<number>;
  getPrecipitation(location: string, date?: string): Promise<number>;
  getForecast(location: string, days: number): Promise<WeatherDay[]>;
  getFrostRisk(location: string, date?: string): Promise<FrostRisk>;
}

/** Deterministic per (location, date) hash so the mock is stable across renders/reloads. */
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Rough Swedish seasonal mean temperature by month, used only as a mock baseline. */
const SEASONAL_MEAN_C = [-2, -2, 1, 6, 12, 16, 18, 17, 12, 7, 2, -1];

function seasonalBaseline(date: Date): number {
  return SEASONAL_MEAN_C[date.getMonth()];
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export class MockWeatherService implements WeatherService {
  private dayWeather(location: string, date: Date): WeatherDay {
    const dateStr = toDateOnly(date);
    const seed = seededRandom(`${location}:${dateStr}`);
    const base = seasonalBaseline(date);
    const jitter = (seed - 0.5) * 6; // +/- 3°C
    const mean = base + jitter;

    return {
      date: dateStr,
      temperature: Math.round(mean * 10) / 10,
      minimumTemperature: Math.round((mean - 3 - seed * 2) * 10) / 10,
      maximumTemperature: Math.round((mean + 4 + seed * 2) * 10) / 10,
      precipitation: Math.round(seededRandom(`${location}:${dateStr}:precip`) * 8 * 10) / 10,
    };
  }

  async getForecast(location: string, days: number): Promise<WeatherDay[]> {
    const out: WeatherDay[] = [];
    const start = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      out.push(this.dayWeather(location, d));
    }
    return out;
  }

  async getCurrentTemperature(location: string): Promise<number> {
    return this.dayWeather(location, new Date()).temperature;
  }

  async getMinimumTemperature(location: string, date?: string): Promise<number> {
    const d = date ? new Date(date) : new Date();
    return this.dayWeather(location, d).minimumTemperature;
  }

  async getMaximumTemperature(location: string, date?: string): Promise<number> {
    const d = date ? new Date(date) : new Date();
    return this.dayWeather(location, d).maximumTemperature;
  }

  async getPrecipitation(location: string, date?: string): Promise<number> {
    const d = date ? new Date(date) : new Date();
    return this.dayWeather(location, d).precipitation;
  }

  async getFrostRisk(location: string, date?: string): Promise<FrostRisk> {
    const d = date ? new Date(date) : new Date();
    const day = this.dayWeather(location, d);
    return {
      atRisk: day.minimumTemperature < 2,
      minimumTemperature: day.minimumTemperature,
      date: day.date,
    };
  }
}

/**
 * Real-provider stub. Wire up e.g. SMHI's open API or OpenWeather here once
 * VITE_WEATHER_API_KEY is set — same interface, so nothing else changes.
 */
export class ApiWeatherService implements WeatherService {
  constructor(private apiKey: string) {}

  private notImplemented(): never {
    throw new Error(
      "ApiWeatherService är inte kopplad till en väder-API än. Sätt VITE_WEATHER_API_KEY och implementera anropen här.",
    );
  }

  getCurrentTemperature(): Promise<number> {
    this.notImplemented();
  }
  getMinimumTemperature(): Promise<number> {
    this.notImplemented();
  }
  getMaximumTemperature(): Promise<number> {
    this.notImplemented();
  }
  getPrecipitation(): Promise<number> {
    this.notImplemented();
  }
  getForecast(): Promise<WeatherDay[]> {
    this.notImplemented();
  }
  getFrostRisk(): Promise<FrostRisk> {
    this.notImplemented();
  }
}

let cachedService: WeatherService | null = null;

export function createWeatherService(): WeatherService {
  if (cachedService) return cachedService;
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  cachedService = apiKey ? new ApiWeatherService(apiKey) : new MockWeatherService();
  return cachedService;
}
