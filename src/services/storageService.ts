import { supabase } from "@/integrations/supabase/client";

const BUCKET = "plant-care-photos";

/** Uploads to `{userId}/{folder}/{filename}` — RLS on storage.objects keys off that first path segment. */
export async function uploadPhoto(file: File, userId: string, folder: "plants" | "harvests"): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
