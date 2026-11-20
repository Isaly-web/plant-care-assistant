// Swedish texts for the sign-in pages (Isaly App Foundation). The shared auth keys and their wording
// come from @isaly/app-foundation, so every Isaly app says the same thing for the same Supabase
// error; this app has no i18n system, so it uses the package's Swedish texts directly.
import { AUTH_MESSAGES } from "@isaly/app-foundation/auth";

const TEXTS: Record<string, string> = {
  ...AUTH_MESSAGES.sv,
  error_generic: "Något gick fel. Försök igen.",
  "auth.error.google_failed": "Inloggningen med Google kunde inte startas. Försök igen.",
};

/** The Swedish text for an auth key; an unknown key gets the generic message, never the key. */
export function authText(key: string): string {
  return TEXTS[key] ?? TEXTS.error_generic;
}

/**
 * The path to go to after signing in: the page the user tried to open, when it is a path inside
 * this app. Anything else (missing, another site, "//evil.example") falls back to "/", so the
 * parameter cannot be used to send someone off-site after they sign in.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value === "/auth" || value.startsWith("/auth?") || value.startsWith("/logga-in")) return "/";
  return value;
}
