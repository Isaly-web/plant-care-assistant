import { describe, expect, it } from "vitest";
import { AUTH_ERROR_KEYS, AUTH_MESSAGES, authErrorMessage } from "@isaly/app-foundation/auth";
import { authText, safeRedirectPath } from "./auth-text";

describe("authText", () => {
  it("has a Swedish text for every shared auth key", () => {
    for (const key of [...AUTH_ERROR_KEYS, ...Object.keys(AUTH_MESSAGES.sv)]) {
      expect(authText(key), key).toBe(AUTH_MESSAGES.sv[key as keyof typeof AUTH_MESSAGES.sv]);
    }
  });

  it("never shows a raw provider message or a key", () => {
    expect(authErrorMessage({ message: "Some new GoTrue error" }, authText)).toBe(
      authText("error_generic"),
    );
    expect(authText("auth.unknown")).toBe(authText("error_generic"));
  });

  it("translates a known Supabase error", () => {
    expect(authErrorMessage({ code: "invalid_credentials" }, authText)).toBe(
      "Fel e-post eller lösenord.",
    );
  });
});

describe("safeRedirectPath", () => {
  it("keeps a path inside the app", () => {
    expect(safeRedirectPath("/vaxter/abc?tab=1")).toBe("/vaxter/abc?tab=1");
  });

  it("falls back to the start page for anything else", () => {
    for (const value of [
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "vaxter",
      "/auth",
      "/logga-in",
      42,
    ]) {
      expect(safeRedirectPath(value), String(value)).toBe("/");
    }
  });
});
