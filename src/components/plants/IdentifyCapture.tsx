import { useRef, type ChangeEvent } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function IdentifyCapture({
  onSelect,
  isAnalyzing,
  error,
  onManual,
}: {
  onSelect: (file: File) => void;
  isAnalyzing: boolean;
  error: string | null;
  onManual: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (file) onSelect(file);
  }

  if (isAnalyzing) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p className="font-medium text-[var(--color-ink)]">Analyserar bilden…</p>
        <p className="text-sm text-[var(--color-ink-muted)]">Det tar bara någon sekund.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="text-5xl">🌿</span>
        <div className="w-full space-y-2">
          <Button type="button" size="lg" className="w-full gap-2" onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-5 w-5" /> Ta foto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" /> Välj bild
          </Button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleChange}
        />
      </Card>

      {error && (
        <Card className="border-[var(--color-urgent)]/40 p-4 text-sm text-[var(--color-urgent)]">{error}</Card>
      )}

      <button
        type="button"
        onClick={onManual}
        className="w-full text-center text-sm text-[var(--color-ink-muted)] underline underline-offset-2"
      >
        Lägg till växten manuellt istället
      </button>
    </div>
  );
}
