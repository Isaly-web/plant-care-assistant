import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/lib/imageProcessing", () => ({
  validateImageFile: vi.fn(),
  validationErrorMessage: vi.fn((err: string) => `invalid: ${err}`),
  compressImage: vi.fn(),
}));

vi.mock("./storageService", () => ({
  uploadPhoto: vi.fn(),
}));

import { supabase } from "@/integrations/supabase/client";
import { compressImage, validateImageFile } from "@/lib/imageProcessing";
import { uploadPhoto } from "./storageService";
import {
  confirmPlantIdentification,
  copyIdentificationPhotoToPlantPhoto,
  discardPlantIdentification,
  identifyPlant,
} from "./plantIdentificationService";

const fakeFile = () => new File([new Uint8Array(10)], "photo.jpg", { type: "image/jpeg" });

describe("identifyPlant", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("rejects an invalid file before touching Storage or the network", async () => {
    vi.mocked(validateImageFile).mockReturnValue("too_large");

    await expect(identifyPlant("user-1", fakeFile())).rejects.toThrow(/invalid: too_large/);
    expect(compressImage).not.toHaveBeenCalled();
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("uploads, persists a pending row, and returns the structured AI result for an authenticated user", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 100, height: 100 });

    const upload = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never);

    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert } as never);

    const aiResult = {
      identification: { scientificName: "Monstera deliciosa", commonName: "Monstera", confidence: 0.92 },
      alternatives: [],
      observations: ["Tydliga flikiga blad."],
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: aiResult, error: null } as never);

    const outcome = await identifyPlant("user-1", fakeFile());

    expect(outcome.result).toEqual(aiResult);
    expect(outcome.storagePath).toMatch(/^user-1\//);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", storage_path: outcome.storagePath }),
    );
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "identify-plant",
      expect.objectContaining({ body: { identificationId: outcome.identificationId } }),
    );
  });

  it("surfaces the edge function's 401 message for an unauthenticated caller", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 10, height: 10 });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) } as never);
    vi.mocked(supabase.from).mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) } as never);

    const response = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { context: response },
    } as never);

    await expect(identifyPlant("user-1", fakeFile())).rejects.toThrow("Unauthorized");
  });

  it("falls back to a generic message when the AI response is malformed (non-JSON error body)", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 10, height: 10 });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) } as never);
    vi.mocked(supabase.from).mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) } as never);

    const response = new Response("not json", { status: 422 });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { context: response },
    } as never);

    await expect(identifyPlant("user-1", fakeFile())).rejects.toThrow(
      "Vi kunde inte identifiera växten. Försök igen.",
    );
  });

  it("propagates the low-confidence 'could not identify' outcome as a normal successful result", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 10, height: 10 });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) } as never);
    vi.mocked(supabase.from).mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) } as never);

    const aiResult = {
      identification: { scientificName: "Okänd", commonName: "Okänd", confidence: 0.02 },
      alternatives: [],
      observations: ["Ingen växt kunde identifieras i bilden."],
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: aiResult, error: null } as never);

    const outcome = await identifyPlant("user-1", fakeFile());
    expect(outcome.result.identification.confidence).toBeLessThan(0.1);
  });

  // Regression test for the production bug: a photo is selected, nothing
  // ever appears (no result, no error), and no request ever reaches
  // Supabase. Root cause: compressImage() runs entirely outside any test
  // (mocked away here, unreachable in vitest's "node" environment) and, per
  // Supabase's own logs, production traffic never got past it — meaning
  // whatever it does in a real browser, it never settled. Before the fix,
  // a mock that never resolves (matching that observed behavior) meant
  // identifyPlant() also never resolved or rejected — this test would hang
  // and eventually time out the test runner itself. After the fix, it must
  // reject with a clear, user-facing message within the configured window.
  it("surfaces a clear error instead of hanging forever when compression never settles", async () => {
    vi.useFakeTimers();
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockReturnValue(new Promise(() => {}));

    const promise = identifyPlant("user-1", fakeFile());
    const assertion = expect(promise).rejects.toMatchObject({
      message: "Det tog för lång tid att analysera bilden. Försök igen.",
    });
    await vi.advanceTimersByTimeAsync(45_000);
    await assertion;

    // And crucially: it never got anywhere near Storage/the network.
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("still resolves normally well within the timeout window", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 10, height: 10 });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) } as never);
    vi.mocked(supabase.from).mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) } as never);
    const aiResult = {
      identification: { scientificName: "Monstera deliciosa", commonName: "Monstera", confidence: 0.9 },
      alternatives: [],
      observations: [],
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: aiResult, error: null } as never);

    const outcome = await identifyPlant("user-1", fakeFile());
    expect(outcome.result).toEqual(aiResult);
  });
});

describe("confirmPlantIdentification", () => {
  afterEach(() => vi.resetAllMocks());

  it("links the identification to the created plant and records the user's confirmed identity", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ update } as never);

    await confirmPlantIdentification("ident-1", "plant-1", {
      scientificName: "Monstera deliciosa",
      commonName: "Monstera",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        plant_id: "plant-1",
        confirmed_scientific_name: "Monstera deliciosa",
        confirmed_common_name: "Monstera",
        status: "confirmed",
      }),
    );
    expect(eq).toHaveBeenCalledWith("id", "ident-1");
  });
});

describe("discardPlantIdentification", () => {
  afterEach(() => vi.resetAllMocks());

  it("removes the private photo and deletes the row", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    vi.mocked(supabase.storage.from).mockReturnValue({ remove } as never);
    vi.mocked(supabase.from).mockReturnValue({ delete: del } as never);

    await discardPlantIdentification("ident-1", "user-1/ident-1/photo.jpg");

    expect(remove).toHaveBeenCalledWith(["user-1/ident-1/photo.jpg"]);
    expect(del).toHaveBeenCalled();
  });
});

describe("copyIdentificationPhotoToPlantPhoto", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("signs, downloads, and re-uploads the identification photo as the public plant photo", async () => {
    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: "https://example.test/signed" }, error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({ createSignedUrl } as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["x"], { type: "image/jpeg" }) }),
    );
    vi.mocked(uploadPhoto).mockResolvedValue("https://example.test/public/photo.jpg");

    const url = await copyIdentificationPhotoToPlantPhoto("user-1", "user-1/ident-1/photo.jpg");

    expect(url).toBe("https://example.test/public/photo.jpg");
    expect(uploadPhoto).toHaveBeenCalledWith(expect.any(File), "user-1", "plants");
  });
});
