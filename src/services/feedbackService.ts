import { supabase } from "@/integrations/supabase/client";

// Feedback isn't part of the `plant_care` schema — same architecture as the
// other Isaly apps (Hönskoll, Studieplan, Quick Job Fit, Snap & Savor): the
// client calls a Supabase Edge Function (`feedback-hub`), which authenticates
// the user and forwards to the central Isaly Feedback Hub. No local table.

export type FeedbackCategory = "bug" | "suggestion" | "other";

export interface SubmitFeedbackInput {
  message: string;
  category: FeedbackCategory;
}

export interface FeedbackListItem {
  id: string;
  message: string;
  category: string | null;
  status: string | null;
  createdAt: string;
}

export interface FeedbackReply {
  id: string;
  message: string;
  createdAt: string;
}

export interface FeedbackDetail extends FeedbackListItem {
  replies: FeedbackReply[];
}

function detectOs(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "unknown";
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

async function extractErrorMessage(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : "Feedback Hub-anropet misslyckades.";
}

async function invokeFeedbackHub<T>(op: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("feedback-hub", { body: { op, ...extra } });
  if (error) throw new Error(await extractErrorMessage(error));
  return data as T;
}

function mapListItem(raw: {
  id: string;
  message: string;
  category: string | null;
  status: string | null;
  created_at: string;
}): FeedbackListItem {
  return {
    id: raw.id,
    message: raw.message,
    category: raw.category,
    status: raw.status,
    createdAt: raw.created_at,
  };
}

function mapReply(raw: { id: string; message: string; created_at: string }): FeedbackReply {
  return { id: raw.id, message: raw.message, createdAt: raw.created_at };
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  await invokeFeedbackHub("submit", {
    message: input.message.trim(),
    category: input.category,
    page_url: typeof window !== "undefined" ? window.location.pathname : null,
    os: detectOs(),
    device: detectDevice(),
  });
}

export async function fetchMyFeedback(): Promise<FeedbackListItem[]> {
  const result = await invokeFeedbackHub<{ feedback: Parameters<typeof mapListItem>[0][] }>("list");
  return (result.feedback ?? []).map(mapListItem);
}

export async function fetchFeedbackDetail(id: string): Promise<FeedbackDetail> {
  const result = await invokeFeedbackHub<{
    feedback: Parameters<typeof mapListItem>[0];
    replies: Parameters<typeof mapReply>[0][];
  }>("get", { id });
  return { ...mapListItem(result.feedback), replies: (result.replies ?? []).map(mapReply) };
}
