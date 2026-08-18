import { supabase } from "@/integrations/supabase/client";
import { mapNotification } from "./mappers";
import type { AppNotification, RecommendedAction } from "@/types/domain";

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("scheduled_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

const ACTION_TYPE_TO_NOTIFICATION_TYPE: Record<RecommendedAction["taskType"], AppNotification["type"]> = {
  watering: "watering",
  fertilizing: "fertilizing",
  pruning: "pruning",
  repotting: "general",
  winter_protection: "frost",
  harvest_check: "harvest",
  other: "general",
};

/**
 * Structure ready for real push notifications later: this only writes rows to
 * `notifications`. Wiring an actual push transport means adding a sender that
 * reads `status = 'pending'` rows here and flips them to `sent` — nothing else changes.
 */
export async function createNotificationFromAction(action: RecommendedAction, plantId: string): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    plant_id: plantId,
    title: action.title,
    message: action.reason,
    priority: action.priority,
    type: ACTION_TYPE_TO_NOTIFICATION_TYPE[action.taskType],
    status: "pending",
  });
  if (error) throw error;
}
