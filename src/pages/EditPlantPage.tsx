import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/AppLayout";
import { PlantForm, type PlantFormValues } from "@/components/plants/PlantForm";
import { Spinner } from "@/components/ui/spinner";
import { useSpeciesQuery, usePlantWithSpecies } from "@/hooks/queries";
import { useUpdatePlant } from "@/hooks/mutations";

export default function EditPlantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: species } = useSpeciesQuery();
  const { plant, isLoading } = usePlantWithSpecies(id);
  const updatePlant = useUpdatePlant();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && plant) {
    setPhotoUrl(plant.photoUrl);
    setInitialized(true);
  }

  if (isLoading || !plant) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  async function onSubmit(values: PlantFormValues) {
    await updatePlant.mutateAsync({
      id: id!,
      input: {
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
      },
    });
    navigate(`/vaxter/${id}`);
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-2 -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[var(--color-ink-muted)]"
      >
        <ChevronLeft className="h-4 w-4" /> Tillbaka
      </button>
      <PageHeader title={`Redigera ${plant.name}`} />
      <PlantForm
        species={species ?? []}
        defaultValues={{
          name: plant.name,
          species: plant.species ?? "",
          variety: plant.variety ?? "",
          speciesId: plant.speciesId ?? "",
          indoorOutdoor: plant.indoorOutdoor,
          location: plant.location ?? "",
          containerType: plant.containerType ?? "",
          purchaseDate: plant.purchaseDate ?? "",
          approximateAgeYears: plant.approximateAgeYears?.toString() ?? "",
          notes: plant.notes ?? "",
        }}
        photoUrl={photoUrl}
        onPhotoChange={setPhotoUrl}
        onSubmit={onSubmit}
        submitting={updatePlant.isPending}
        submitLabel="Spara ändringar"
      />
    </div>
  );
}
