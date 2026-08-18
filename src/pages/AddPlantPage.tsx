import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/AppLayout";
import { PlantForm, type PlantFormValues } from "@/components/plants/PlantForm";
import { useSpeciesQuery } from "@/hooks/queries";
import { useCreatePlant } from "@/hooks/mutations";

export default function AddPlantPage() {
  const navigate = useNavigate();
  const { data: species } = useSpeciesQuery();
  const createPlant = useCreatePlant();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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
    });
    navigate(`/vaxter/${plant.id}`);
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-2 -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Tillbaka
      </button>
      <PageHeader title="Lägg till växt" />
      <PlantForm
        species={species ?? []}
        defaultValues={{ name: "", indoorOutdoor: "outdoor", containerType: "" }}
        photoUrl={photoUrl}
        onPhotoChange={setPhotoUrl}
        onSubmit={onSubmit}
        submitting={createPlant.isPending}
        submitLabel="Spara växt"
      />
    </div>
  );
}
