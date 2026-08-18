import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ["VITE_SUPABASE_URL"] : []),
    ...(!SUPABASE_PUBLISHABLE_KEY ? ["VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
  ];
  throw new Error(
    `Saknar Supabase-miljövariabler: ${missing.join(", ")}. Se .env.example.`,
  );
}

// Plant Care Assistant lives entirely in the `plant_care` Postgres schema so it
// never collides with other Isaly apps sharing this Supabase project.
export const supabase = createClient<Database, "plant_care">(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: "plant_care" },
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
