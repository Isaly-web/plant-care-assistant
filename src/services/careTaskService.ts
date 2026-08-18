import { supabase } from "@/integrations/supabase/client";
import { mapCareTask } from "./mappers";
import type { CareTask, TaskType, Priority, TaskSource } from "@/types/domain";
import { todayDateOnly } from "@/lib/date";

export async function fetchCareTasksForPlant(plantId: string): Promise<CareTask[]> {
  const { data, error } = await supabase
    .from("care_tasks")
    .select("*")
    .eq("plant_id", plantId)
    .order("due_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCareTask);
}

/** All care tasks for the signed-in user, newest first — used to derive "last done" dates cheaply. */
export async function fetchAllCareTasks(): Promise<CareTask[]> {
  const { data, error } = await supabase
    .from("care_tasks")
    .select("*")
    .order("due_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCareTask);
}

export interface LogCompletedTaskInput {
  plantId: string;
  taskType: TaskType;
  title: string;
  description?: string | null;
  priority?: Priority;
  source?: TaskSource;
}

/** Logs a care activity as done right now — this is what the dashboard's "Klar" button calls. */
export async function logCompletedTask(input: LogCompletedTaskInput): Promise<CareTask> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("care_tasks")
    .insert({
      plant_id: input.plantId,
      task_type: input.taskType,
      title: input.title,
      description: input.description ?? null,
      due_date: todayDateOnly(),
      completed_at: now,
      priority: input.priority ?? "medium",
      source: input.source ?? "rule_engine",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapCareTask(data);
}

export interface CreateManualTaskInput {
  plantId: string;
  taskType: TaskType;
  title: string;
  description?: string | null;
  dueDate: string;
  priority?: Priority;
}

export async function createManualTask(input: CreateManualTaskInput): Promise<CareTask> {
  const { data, error } = await supabase
    .from("care_tasks")
    .insert({
      plant_id: input.plantId,
      task_type: input.taskType,
      title: input.title,
      description: input.description ?? null,
      due_date: input.dueDate,
      priority: input.priority ?? "medium",
      source: "manual",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapCareTask(data);
}

export async function completeTask(id: string): Promise<CareTask> {
  const { data, error } = await supabase
    .from("care_tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapCareTask(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("care_tasks").delete().eq("id", id);
  if (error) throw error;
}

/** Latest completed date per task type for a given plant, e.g. { watering: "2026-08-12" }. */
export function latestCompletedByType(tasks: CareTask[]): Partial<Record<TaskType, string>> {
  const out: Partial<Record<TaskType, string>> = {};
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const date = task.completedAt.slice(0, 10);
    const current = out[task.taskType];
    if (!current || date > current) {
      out[task.taskType] = date;
    }
  }
  return out;
}
