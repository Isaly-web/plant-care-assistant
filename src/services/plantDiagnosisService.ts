import { supabase } from "@/integrations/supabase/client";
import { validateImageFile, validationErrorMessage, compressImage } from "@/lib/imageProcessing";
import { mapPlantDiagnosis } from "./mappers";
import type { PlantDiagnosis, PlantDiagnosisResult } from "@/types/domain";

const DIAGNOSIS_BUCKET = "plant-diagnosis-photos";
const GENERIC_ERROR = "Vi kunde inte diagnostisera växten. Försök igen.";
// Same class of failure mode identify-plant's client timeout guards against
// (see plantIdentificationService.ts) — compressImage() runs entirely
// outside any test and can in principle never settle in a real browser. This
// guarantees a visible outcome either way.
const CLIENT_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Reads the diagnose-plant edge function's structured `{ error }` body off a
 * failed invoke — supabase-js only exposes it via the raw Response on
 * FunctionsHttpError, so this has to be read out by hand rather than off the
 * thrown error's `message`. */
async function extractErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // not JSON — fall through to the generic message
    }
  }
  return GENERIC_ERROR;
}

export type DiagnosePlantOutcome = {
  diagnosisId: string;
  storagePath: string;
  result: PlantDiagnosisResult;
};

/** Plant Care's domain entry point for AI plant diagnosis — takes a photo of
 * an *already-saved* plant plus an optional symptom description, and returns
 * a structured health finding (disease/pest/nutrient deficiency/environmental/
 * healthy/unknown). Provider details (which vision model, prompt, response
 * schema) live entirely server-side in the diagnose-plant edge function; this
 * only knows "give me a plant, a photo and maybe a symptom note, get back a
 * structured diagnosis". Deliberately separate from identifyPlant
 * (plantIdentificationService.ts) — a diagnosis never determines species and
 * never creates a plant. Throws with a user-facing Swedish message on any
 * failure; an AI response that says "looks healthy" or "can't tell from this
 * photo" is a valid, successful outcome and is returned normally, not
 * thrown. */
export async function diagnosePlant(
  userId: string,
  plantId: string,
  file: File,
  symptomDescription: string | null,
): Promise<DiagnosePlantOutcome> {
  return withTimeout(
    diagnosePlantUnbounded(userId, plantId, file, symptomDescription),
    CLIENT_TIMEOUT_MS,
    "Det tog för lång tid att analysera bilden. Försök igen.",
  );
}

async function diagnosePlantUnbounded(
  userId: string,
  plantId: string,
  file: File,
  symptomDescription: string | null,
): Promise<DiagnosePlantOutcome> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationErrorMessage(validationError));

  const { blob } = await compressImage(file);
  const diagnosisId = crypto.randomUUID();
  const path = `${userId}/${diagnosisId}/photo.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(DIAGNOSIS_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw new Error("Kunde inte ladda upp bilden. Försök igen.");

  const { error: insertError } = await supabase.from("plant_diagnoses").insert({
    id: diagnosisId,
    plant_id: plantId,
    storage_path: path,
    symptom_description: symptomDescription?.trim() || null,
    status: "pending",
  });
  if (insertError) throw new Error("Kunde inte spara bilden. Försök igen.");

  const result = await invokeDiagnosePlant(diagnosisId);
  return { diagnosisId, storagePath: path, result };
}

async function invokeDiagnosePlant(diagnosisId: string): Promise<PlantDiagnosisResult> {
  const { data, error } = await supabase.functions.invoke<PlantDiagnosisResult>("diagnose-plant", {
    body: { diagnosisId },
  });
  if (error) throw new Error(await extractErrorMessage(error));
  if (!data) throw new Error(GENERIC_ERROR);
  return data;
}

/** Keeps a completed diagnosis as part of the plant's history. */
export async function acknowledgePlantDiagnosis(diagnosisId: string): Promise<void> {
  const { error } = await supabase
    .from("plant_diagnoses")
    .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
    .eq("id", diagnosisId);
  if (error) throw error;
}

/** Discards a diagnosis attempt the user didn't want to keep (bad photo, or
 * they navigated away without acknowledging) — removes the private photo and
 * the row so it doesn't linger as an orphaned attempt. */
export async function discardPlantDiagnosis(diagnosisId: string, storagePath: string): Promise<void> {
  await supabase.storage.from(DIAGNOSIS_BUCKET).remove([storagePath]);
  await supabase.from("plant_diagnoses").delete().eq("id", diagnosisId);
}

/** Past diagnoses for one plant, newest first — shown in the plant's
 * "Diagnos" history tab. Only acknowledged (kept) diagnoses are meant to be
 * shown there; pending/failed/discarded rows are transient. */
export async function fetchPlantDiagnoses(plantId: string): Promise<PlantDiagnosis[]> {
  const { data, error } = await supabase
    .from("plant_diagnoses")
    .select("*")
    .eq("plant_id", plantId)
    .eq("status", "acknowledged")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPlantDiagnosis);
}
