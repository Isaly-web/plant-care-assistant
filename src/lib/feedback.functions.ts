import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/supabase/server-auth";

// Same architecture as the other Isaly apps (Hönskoll, Studieplan, Quick Job
// Fit, Snap & Savor): a TanStack Start server function authenticates the
// caller, then forwards to the central Isaly Feedback Hub (isaly-platform,
// https://feedback.isaly.se). No local feedback table — everything is stored
// in the hub. FEEDBACK_HUB_API_KEY is a server-only env var (Vercel project
// setting, never VITE_-prefixed) so it never reaches the client bundle.

const HUB_BASE = process.env["FEEDBACK_HUB_URL"] || "https://feedback.isaly.se";

function getHubKey(): string {
  const key = process.env["FEEDBACK_HUB_API_KEY"];
  if (!key) throw new Error("Feedback Hub saknar API-nyckel.");
  return key;
}

async function getUserEmail(supabase: {
  auth: { getUser: () => Promise<{ data: { user: { email?: string | null } | null } }> };
}): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) throw new Error("Din e-post kunde inte hittas.");
  return email;
}

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        message: z.string().trim().min(1).max(4000),
        category: z.enum(["bug", "suggestion", "other"]),
        page_url: z.string().trim().max(500).optional().nullable(),
        os: z.string().trim().max(120).optional().nullable(),
        device: z.string().trim().max(120).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = await getUserEmail(context.supabase);
    const res = await fetch(`${HUB_BASE}/api/public/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: getHubKey(),
        message: data.message,
        category: data.category,
        user_identifier: email,
        page_url: data.page_url ?? null,
        os: data.os ?? null,
        device: data.device ?? null,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[feedback] Feedback Hub svarade ${res.status}: ${body}`);
      throw new Error("Kunde inte skicka feedback just nu. Försök igen om en stund.");
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true as const, id: body.id ?? null };
  });

export type FeedbackListItem = {
  id: string;
  message: string;
  category: string | null;
  status: string | null;
  created_at: string;
};

export const listMyFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedbackListItem[]> => {
    const email = await getUserEmail(context.supabase);
    const url = new URL(`${HUB_BASE}/api/public/feedback/mine`);
    url.searchParams.set("api_key", getHubKey());
    url.searchParams.set("user_identifier", email);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Kunde inte hämta din feedback just nu.");
    const body = (await res.json()) as { feedback?: FeedbackListItem[] };
    return body.feedback ?? [];
  });

export type FeedbackReply = {
  id: string;
  message: string;
  created_at: string;
};

export type FeedbackDetail = FeedbackListItem & {
  replies: FeedbackReply[];
};

export const getMyFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }): Promise<FeedbackDetail> => {
    const email = await getUserEmail(context.supabase);
    const url = new URL(`${HUB_BASE}/api/public/feedback/mine/${encodeURIComponent(data.id)}`);
    url.searchParams.set("api_key", getHubKey());
    url.searchParams.set("user_identifier", email);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Kunde inte hämta ärendet just nu.");
    const body = (await res.json()) as {
      feedback?: FeedbackListItem;
      replies?: FeedbackReply[];
    };
    if (!body.feedback) throw new Error("Ärendet hittades inte.");
    return { ...body.feedback, replies: body.replies ?? [] };
  });
