import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppLayout";
import { PlantForm, type PlantFormValues } from "@/components/plants/PlantForm";
import { Button } from "@/components/ui/button";
import { useSpeciesQuery } from "@/hooks/queries";
import { useCreatePlant } from "@/hooks/mutations";
import { useAuth } from "@/hooks/useAuth";
import {
  confirmPlantIdentification,
  copyIdentificationPhotoToPlantPhoto,
} from "@/services/plantIdentificationService";

// Carried from vaxter.identifiera.tsx as search params (not router state) so
// the prefill survives a page refresh and stays fully typed/validated —
// TanStack Router's preferred way to pass structured data between routes.
const identificationSearchSchema = z.object({
  identificationId: z.string().optional(),
  storagePath: z.string().optional(),
  scientificName: z.string().optional(),
  commonName: z.string().optional(),
  confidence: z.number().optional(),
});

export const Route = createFileRoute("/_authenticated/vaxter/ny")({
  head: () => ({ meta: [{ title: "Lägg till växt – Plant Care Assistant" }] }),
  validateSearch: identificationSearchSchema,
  component: AddPlantPage,
});

function AddPlantPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { user } = useAuth();
  const { data: species } = useSpeciesQuery();
  const createPlant = useCreatePlant();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const search = Route.useSearch();
  const prefill =
    search.identificationId && search.storagePath && search.scientificName && search.commonName
      ? {
          identificationId: search.identificationId,
          storagePath: search.storagePath,
          scientificName: search.scientificName,
          commonName: search.commonName,
          confidence: search.confidence ?? 0,
        }
      : null;

  // Carries the already-analyzed photo over as the plant's photo, so the
  // user doesn't have to take a second one. Non-fatal on failure — they can
  // still add a photo manually via the form below.
  useEffect(() => {
    if (!prefill || !user || photoUrl) return;
    copyIdentificationPhotoToPlantPhoto(user.id, prefill.storagePath)
      .then(setPhotoUrl)
      .catch(() => toast.error("Kunde inte återanvända fotot från identifieringen. Lägg gärna till ett manuellt."));
    // Only ever run once per prefill, regardless of photoUrl changing after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.storagePath, user?.id]);

  async function onSubmit(values: PlantFormValues) {
    const plant = await createPlant.mutateAsync({
      name: values.name,
      species: values.species || null,
      variety: values.variety || null,
      speciesId: values.speciesId || null,
      photoUrl,
      location: values.location || null,
      indoorOutdoor: values.indoorOutdoor,
      containerType: values.containerType || null,
      purchaseDate: values.purchaseDate || null,
      approximateAgeYears: values.approximateAgeYears ? Number(values.approximateAgeYears) : null,
      notes: values.notes || null,
      ...(prefill && {
        identificationSource: "ai" as const,
        plantIdentificationId: prefill.identificationId,
        identificationConfidence: prefill.confidence,
        identifiedAt: new Date().toISOString(),
      }),
    });

    if (prefill) {
      // The user's final form values are the source of truth — including
      // if they edited the name/species away from the AI's suggestion —
      // never the AI's original guess. Best-effort: the plant is already
      // saved either way.
      try {
        await confirmPlantIdentification(prefill.identificationId, plant.id, {
          scientificName: values.species || null,
          commonName: values.name || null,
        });
      } catch {
        // Non-fatal — see comment above.
      }
    }

    navigate({ to: "/vaxter/$id", params: { id: plant.id } });
  }

  return (
    <div>
      <button
        onClick={() => router.history.back()}
        className="mb-2 -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Tillbaka
      </button>
      <PageHeader
        title="Lägg till växt"
        action={
          !prefill && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate({ to: "/vaxter/identifiera" })}
            >
              <Sparkles className="h-3.5 w-3.5" /> Identifiera med foto
            </Button>
          )
        }
      />
      {prefill && (
        <p className="mb-4 -mt-3 text-sm text-[var(--color-ink-muted)]">
          Föreslaget av AI utifrån ditt foto — ändra gärna om det inte stämmer.
        </p>
      )}
      <PlantForm
        species={species ?? []}
        defaultValues={{
          name: prefill?.commonName ?? "",
          species: prefill?.scientificName ?? "",
          indoorOutdoor: "outdoor",
          containerType: "",
        }}
        photoUrl={photoUrl}
        onPhotoChange={setPhotoUrl}
        onSubmit={onSubmit}
        submitting={createPlant.isPending}
        submitLabel="Spara växt"
      />
    </div>
  );
}
