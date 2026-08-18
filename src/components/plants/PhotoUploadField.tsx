import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadPhoto } from "@/services/storageService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function PhotoUploadField({
  value,
  onChange,
  folder,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "plants" | "harvests";
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file, user.id, folder);
      onChange(url);
    } catch {
      toast.error("Kunde inte ladda upp bilden. Försök igen.");
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="relative h-32 w-32 overflow-hidden rounded-2xl">
        <img src={value} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white"
          aria-label="Ta bort bild"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="flex h-32 w-32 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-ink-muted)] disabled:opacity-60"
    >
      {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
      <span className="text-xs">{uploading ? "Laddar upp…" : "Lägg till foto"}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </button>
  );
}
