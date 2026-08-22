import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto } from "./storageService";
import { validateImageFile, validationErrorMessage, compressImage } from "@/lib/imageProcessing";
import type { PlantIdentificationResult } from "@/types/domain";

const IDENTIFICATION_BUCKET = "plant-identification-photos";
const GENERIC_ERROR = "Vi kunde inte identifiera växten. Försök igen.";
// Bounds the whole client-side pipeline (compress -> upload -> insert ->
// invoke). Without this, a browser-API step that never settles (observed in
// production: compressImage()'s createImageBitmap()/canvas.toBlob(), which —
// unlike every other step here — runs entirely outside any test, since the
// suite mocks it away and vitest's "node" environment can't exercise the
// real Canvas/ImageBitmap APIs) leaves the UI stuck on "Analyserar bilden…"
// forever with no result and no error. This guarantees a visible outcome
// either way, regardless of exactly which step stalls.
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

/** Reads the identify-plant edge function's structured `{ error }` body off
 * a failed invoke — supabase-js only exposes it via the raw Response on
 * FunctionsHttpError, so this has to be read out by hand rather than off
 * the thrown error's `message`. */
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

export type IdentifyPlantOutcome = {
  identificationId: string;
  storagePath: string;
  result: PlantIdentificationResult;
};

/** Plant Care's domain entry point for AI plant identification —
 * `identifyPlant(image)` from the spec. Provider details (which vision
 * model, prompt, response schema) live entirely server-side in the
 * identify-plant edge function; this only knows "give me a photo, get back
 * a structured result". Uploads to a private, user-scoped bucket first
 * (never public — see the 20260821170000 migration), then invokes the
 * server-side AI call. Throws with a user-facing Swedish message on any
 * failure; never returns a fabricated result — an AI response that says
 * "I can't tell what this is" is a valid, successful outcome and is
 * returned normally, not thrown. */
export async function identifyPlant(userId: string, file: File): Promise<IdentifyPlantOutcome> {
  return withTimeout(
    identifyPlantUnbounded(userId, file),
    CLIENT_TIMEOUT_MS,
    "Det tog för lång tid att analysera bilden. Försök igen.",
  );
}

async function identifyPlantUnbounded(userId: string, file: File): Promise<IdentifyPlantOutcome> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationErrorMessage(validationError));

  const { blob } = await compressImage(file);
  const identificationId = crypto.randomUUID();
  const path = `${userId}/${identificationId}/photo.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(IDENTIFICATION_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw new Error("Kunde inte ladda upp bilden. Försök igen.");

  const { error: insertError } = await supabase
    .from("plant_identifications")
    .insert({ id: identificationId, storage_path: path, status: "pending" });
  if (insertError) throw new Error("Kunde inte spara bilden. Försök igen.");

  const result = await invokeIdentifyPlant(identificationId);
  return { identificationId, storagePath: path, result };
}

async function invokeIdentifyPlant(identificationId: string): Promise<PlantIdentificationResult> {
  const { data, error } = await supabase.functions.invoke<PlantIdentificationResult>("identify-plant", {
    body: { identificationId },
  });
  if (error) throw new Error(await extractErrorMessage(error));
  if (!data) throw new Error(GENERIC_ERROR);
  return data;
}

/** Links the confirmed identification to the newly-created plant and
 * records what the user actually confirmed — which may differ from the
 * AI's top suggestion (a chosen alternative, or a manually typed
 * correction). The AI's own observation (ai_* columns) is left untouched,
 * so what the AI said and what the user confirmed both stay visible. */
export async function confirmPlantIdentification(
  identificationId: string,
  plantId: string,
  confirmed: { scientificName: string | null; commonName: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("plant_identifications")
    .update({
      plant_id: plantId,
      confirmed_scientific_name: confirmed.scientificName,
      confirmed_common_name: confirmed.commonName,
      confirmed_at: new Date().toISOString(),
      status: "confirmed",
    })
    .eq("id", identificationId);
  if (error) throw error;
}

/** Abandons an identification the user chose not to keep (bad photo, or
 * they navigated away without confirming) — removes the private photo and
 * the row so it doesn't linger as an orphaned attempt. */
export async function discardPlantIdentification(identificationId: string, storagePath: string): Promise<void> {
  await supabase.storage.from(IDENTIFICATION_BUCKET).remove([storagePath]);
  await supabase.from("plant_identifications").delete().eq("id", identificationId);
}

/** Re-uploads the already-analyzed photo to the existing public
 * `plant-care-photos` bucket (via the established storageService.uploadPhoto)
 * so the confirmed plant gets a photo without asking the user to pick one
 * again. The private identification bucket itself is never made public —
 * this makes one explicit, separate public copy. */
export async function copyIdentificationPhotoToPlantPhoto(userId: string, storagePath: string): Promise<string> {
  const { data: signed, error: signError } = await supabase.storage
    .from(IDENTIFICATION_BUCKET)
    .createSignedUrl(storagePath, 300);
  if (signError || !signed) throw new Error("Kunde inte hämta bilden.");

  const response = await fetch(signed.signedUrl);
  if (!response.ok) throw new Error("Kunde inte hämta bilden.");
  const blob = await response.blob();
  const file = new File([blob], "identifierad-vaxt.jpg", { type: blob.type || "image/jpeg" });
  return uploadPhoto(file, userId, "plants");
}
