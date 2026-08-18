// Hand-written to match supabase/migrations/0001_plant_care_schema.sql.
// Regenerate with `supabase gen types typescript --schema plant_care` once the
// Supabase CLI is wired into this repo's tooling.

export interface Database {
  plant_care: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      plant_species: {
        Row: {
          id: string;
          name: string;
          category: string;
          emoji: string;
          watering_interval_days: number;
          fertilizing_interval_days: number | null;
          pruning_period: string | null;
          planting_period: string | null;
          harvest_start_month: number | null;
          harvest_end_month: number | null;
          min_temperature_c: number | null;
          frost_sensitive: boolean;
          winter_strategy: string | null;
          indoor_outdoor: string;
          description: string | null;
          created_at: string;
        };
        Insert: Partial<Database["plant_care"]["Tables"]["plant_species"]["Row"]> & { name: string; category: string };
        Update: Partial<Database["plant_care"]["Tables"]["plant_species"]["Row"]>;
        Relationships: [];
      };
      plants: {
        Row: {
          id: string;
          user_id: string;
          species_id: string | null;
          name: string;
          species: string | null;
          variety: string | null;
          photo_url: string | null;
          location: string | null;
          indoor_outdoor: string;
          container_type: string | null;
          purchase_date: string | null;
          approximate_age_years: number | null;
          notes: string | null;
          custom_watering_interval_days: number | null;
          custom_fertilizing_interval_days: number | null;
          custom_min_temperature_c: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["plant_care"]["Tables"]["plants"]["Row"]> & { name: string };
        Update: Partial<Database["plant_care"]["Tables"]["plants"]["Row"]>;
        Relationships: [];
      };
      care_tasks: {
        Row: {
          id: string;
          user_id: string;
          plant_id: string;
          task_type: string;
          title: string;
          description: string | null;
          due_date: string;
          completed_at: string | null;
          priority: string;
          source: string;
          created_at: string;
        };
        Insert: Partial<Database["plant_care"]["Tables"]["care_tasks"]["Row"]> & {
          plant_id: string;
          task_type: string;
          title: string;
          due_date: string;
        };
        Update: Partial<Database["plant_care"]["Tables"]["care_tasks"]["Row"]>;
        Relationships: [];
      };
      harvests: {
        Row: {
          id: string;
          user_id: string;
          plant_id: string;
          harvest_date: string;
          crop_name: string | null;
          quantity: number | null;
          unit: string | null;
          notes: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["plant_care"]["Tables"]["harvests"]["Row"]> & { plant_id: string };
        Update: Partial<Database["plant_care"]["Tables"]["harvests"]["Row"]>;
        Relationships: [];
      };
      weather_snapshots: {
        Row: {
          id: string;
          user_id: string;
          location: string;
          temperature: number | null;
          minimum_temperature: number | null;
          maximum_temperature: number | null;
          precipitation: number | null;
          forecast_date: string;
          source: string;
          created_at: string;
        };
        Insert: Partial<Database["plant_care"]["Tables"]["weather_snapshots"]["Row"]> & {
          location: string;
          forecast_date: string;
        };
        Update: Partial<Database["plant_care"]["Tables"]["weather_snapshots"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          plant_id: string | null;
          task_id: string | null;
          title: string;
          message: string;
          priority: string;
          type: string;
          status: string;
          scheduled_at: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["plant_care"]["Tables"]["notifications"]["Row"]> & {
          title: string;
          message: string;
        };
        Update: Partial<Database["plant_care"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
    };
  };
}
