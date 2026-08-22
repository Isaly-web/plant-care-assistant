// Client-side validation + resizing for photos before they're uploaded for
// AI plant identification. Mirrors Snap & Savor's (calorie_tracker)
// src/lib/image-processing.ts pattern.

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // raw upload cap, before compression
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
// Enough resolution for vision-model analysis; larger just costs more
// upload time and tokens without improving identification quality.
const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

export type ImageValidationError = "invalid_type" | "too_large";

export function validationErrorMessage(err: ImageValidationError): string {
  switch (err) {
    case "invalid_type":
      return "Filtypen stöds inte. Använd JPEG, PNG, WebP eller HEIC.";
    case "too_large":
      return "Bilden är för stor (max 15 MB). Välj en mindre bildfil.";
  }
}

/** Type/size check. Does not attempt to decode the file — a corrupt image
 * still fails visibly a moment later when compressImage() can't read it. */
export function validateImageFile(file: File): ImageValidationError | null {
  if (!ACCEPTED_TYPES.has(file.type)) return "invalid_type";
  if (file.size > MAX_FILE_SIZE_BYTES) return "too_large";
  return null;
}

export type ProcessedImage = { blob: Blob; width: number; height: number };

/** Downscales to MAX_DIMENSION and re-encodes as JPEG so large phone photos
 * don't blow the AI request size or slow the upload. Throws a user-facing
 * error if the file can't be decoded as an image at all. */
export async function compressImage(file: File): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Filen kunde inte läsas som en bild.");
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Kunde inte bearbeta bilden.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Kunde inte komprimera bilden."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  return { blob, width, height };
}
