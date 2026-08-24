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

import { supabase } from "@/integrations/supabase/client";
import { compressImage, validateImageFile } from "@/lib/imageProcessing";
import {
  acknowledgePlantDiagnosis,
  diagnosePlant,
  discardPlantDiagnosis,
  fetchPlantDiagnoses,
} from "./plantDiagnosisService";

const fakeFile = () => new File([new Uint8Array(10)], "photo.jpg", { type: "image/jpeg" });

describe("diagnosePlant", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("rejects an invalid file before touching Storage or the network", async () => {
    vi.mocked(validateImageFile).mockReturnValue("too_large");

    await expect(diagnosePlant("user-1", "plant-1", fakeFile(), null)).rejects.toThrow(/invalid: too_large/);
    expect(compressImage).not.toHaveBeenCalled();
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("uploads, persists a pending row with the plant id and symptom description, and returns the AI result", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 100, height: 100 });

    const upload = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never);

    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert } as never);

    const aiResult = {
      diagnosis: {
        issueType: "pest",
        name: "Bladlöss",
        confidence: 0.9,
        severity: "medium",
        description: "Insekter syns på bladen.",
        recommendedActions: ["Spola av växten."],
      },
      alternatives: [],
      observations: ["Kladdiga blad."],
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: aiResult, error: null } as never);

    const outcome = await diagnosePlant("user-1", "plant-1", fakeFile(), "  Kladdiga blad  ");

    expect(outcome.result).toEqual(aiResult);
    expect(outcome.storagePath).toMatch(/^user-1\//);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        plant_id: "plant-1",
        status: "pending",
        storage_path: outcome.storagePath,
        symptom_description: "Kladdiga blad",
      }),
    );
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "diagnose-plant",
      expect.objectContaining({ body: { diagnosisId: outcome.diagnosisId } }),
    );
  });

  it("stores a null symptom_description when none was given", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 10, height: 10 });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) } as never);
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert } as never);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { diagnosis: {}, alternatives: [], observations: [] },
      error: null,
    } as never);

    await diagnosePlant("user-1", "plant-1", fakeFile(), "   ");

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ symptom_description: null }));
  });

  it("surfaces the edge function's error message for a failed diagnosis", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 10, height: 10 });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) } as never);
    vi.mocked(supabase.from).mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) } as never);

    const response = new Response(JSON.stringify({ error: "Växten hittades inte." }), { status: 404 });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { context: response },
    } as never);

    await expect(diagnosePlant("user-1", "plant-1", fakeFile(), null)).rejects.toThrow("Växten hittades inte.");
  });

  it("propagates a healthy-plant outcome as a normal successful result", async () => {
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockResolvedValue({ blob: new Blob(["x"]), width: 10, height: 10 });
    vi.mocked(supabase.storage.from).mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) } as never);
    vi.mocked(supabase.from).mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) } as never);

    const aiResult = {
      diagnosis: {
        issueType: "healthy",
        name: "Frisk växt",
        confidence: 0.93,
        severity: null,
        description: "Inga tecken på problem.",
        recommendedActions: [],
      },
      alternatives: [],
      observations: [],
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: aiResult, error: null } as never);

    const outcome = await diagnosePlant("user-1", "plant-1", fakeFile(), null);
    expect(outcome.result.diagnosis.issueType).toBe("healthy");
  });

  // Same production regression class as plantIdentificationService's
  // equivalent test: compressImage() runs entirely outside any test and can
  // in principle never settle in a real browser — this guarantees a visible
  // outcome instead of the UI hanging forever.
  it("surfaces a clear error instead of hanging forever when compression never settles", async () => {
    vi.useFakeTimers();
    vi.mocked(validateImageFile).mockReturnValue(null);
    vi.mocked(compressImage).mockReturnValue(new Promise(() => {}));

    const promise = diagnosePlant("user-1", "plant-1", fakeFile(), null);
    const assertion = expect(promise).rejects.toMatchObject({
      message: "Det tog för lång tid att analysera bilden. Försök igen.",
    });
    await vi.advanceTimersByTimeAsync(45_000);
    await assertion;

    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});

describe("acknowledgePlantDiagnosis", () => {
  afterEach(() => vi.resetAllMocks());

  it("marks the diagnosis acknowledged with a timestamp", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ update } as never);

    await acknowledgePlantDiagnosis("diag-1");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "acknowledged", acknowledged_at: expect.any(String) }),
    );
    expect(eq).toHaveBeenCalledWith("id", "diag-1");
  });
});

describe("discardPlantDiagnosis", () => {
  afterEach(() => vi.resetAllMocks());

  it("removes the private photo and deletes the row", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    vi.mocked(supabase.storage.from).mockReturnValue({ remove } as never);
    vi.mocked(supabase.from).mockReturnValue({ delete: del } as never);

    await discardPlantDiagnosis("diag-1", "user-1/diag-1/photo.jpg");

    expect(remove).toHaveBeenCalledWith(["user-1/diag-1/photo.jpg"]);
    expect(del).toHaveBeenCalled();
  });
});

describe("fetchPlantDiagnoses", () => {
  afterEach(() => vi.resetAllMocks());

  it("only fetches acknowledged diagnoses for the given plant, newest first", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "diag-1",
          user_id: "user-1",
          plant_id: "plant-1",
          storage_path: "user-1/diag-1/photo.jpg",
          symptom_description: null,
          status: "acknowledged",
          ai_issue_type: "pest",
          ai_name: "Bladlöss",
          ai_severity: "medium",
          ai_confidence: 0.9,
          ai_description: "Insekter syns på bladen.",
          ai_recommended_actions: ["Spola av växten."],
          ai_alternatives: [],
          ai_observations: [],
          ai_provider: "gemini",
          ai_model: "gemini-3.5-flash",
          ai_raw_response: {},
          diagnosed_at: "2026-08-24T10:00:00.000Z",
          error_message: null,
          acknowledged_at: "2026-08-24T10:05:00.000Z",
          created_at: "2026-08-24T09:59:00.000Z",
        },
      ],
      error: null,
    });
    const eqStatus = vi.fn().mockReturnValue({ order });
    const eqPlant = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqPlant });
    vi.mocked(supabase.from).mockReturnValue({ select } as never);

    const diagnoses = await fetchPlantDiagnoses("plant-1");

    expect(eqPlant).toHaveBeenCalledWith("plant_id", "plant-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "acknowledged");
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].ai?.diagnosis.name).toBe("Bladlöss");
  });
});
