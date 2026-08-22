import { describe, expect, it } from "vitest";
import { validateImageFile, validationErrorMessage } from "./imageProcessing";

function makeFile(type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], "photo", { type });
}

describe("validateImageFile", () => {
  it("accepts a normal JPEG", () => {
    expect(validateImageFile(makeFile("image/jpeg", 1024))).toBeNull();
  });

  it("accepts PNG, WebP and HEIC", () => {
    expect(validateImageFile(makeFile("image/png", 1024))).toBeNull();
    expect(validateImageFile(makeFile("image/webp", 1024))).toBeNull();
    expect(validateImageFile(makeFile("image/heic", 1024))).toBeNull();
  });

  it("rejects an unsupported MIME type", () => {
    expect(validateImageFile(makeFile("application/pdf", 1024))).toBe("invalid_type");
    expect(validateImageFile(makeFile("text/plain", 1024))).toBe("invalid_type");
  });

  it("rejects a file over the size cap", () => {
    expect(validateImageFile(makeFile("image/jpeg", 16 * 1024 * 1024))).toBe("too_large");
  });

  it("accepts a file right at the size cap", () => {
    expect(validateImageFile(makeFile("image/jpeg", 15 * 1024 * 1024))).toBeNull();
  });
});

describe("validationErrorMessage", () => {
  it("returns a distinct, user-facing message per error", () => {
    expect(validationErrorMessage("invalid_type")).toMatch(/JPEG/);
    expect(validationErrorMessage("too_large")).toMatch(/15 MB/);
  });
});
