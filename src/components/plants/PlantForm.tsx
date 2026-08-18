import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhotoUploadField } from "@/components/plants/PhotoUploadField";
import type { PlantSpecies } from "@/types/domain";
import { CATEGORY_LABELS } from "@/types/domain";

export const plantFormSchema = z.object({
  name: z.string().min(1, "Namn krävs"),
  species: z.string().optional(),
  variety: z.string().optional(),
  speciesId: z.string().optional(),
  indoorOutdoor: z.enum(["indoor", "outdoor"]),
  location: z.string().optional(),
  containerType: z.enum(["pot", "ground", ""]).optional(),
  purchaseDate: z.string().optional(),
  approximateAgeYears: z.string().optional(),
  notes: z.string().optional(),
});

export type PlantFormValues = z.infer<typeof plantFormSchema>;

export function PlantForm({
  species,
  defaultValues,
  photoUrl,
  onPhotoChange,
  onSubmit,
  submitting,
  submitLabel,
}: {
  species: PlantSpecies[];
  defaultValues: PlantFormValues;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  onSubmit: (values: PlantFormValues) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PlantFormValues>({ resolver: zodResolver(plantFormSchema), defaultValues });

  const grouped = (species ?? []).reduce<Record<string, PlantSpecies[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-8">
      <div className="flex justify-center">
        <PhotoUploadField value={photoUrl} onChange={onPhotoChange} folder="plants" />
      </div>

      <div>
        <Label htmlFor="name">Växtens namn</Label>
        <Input id="name" placeholder="t.ex. Citronträd" {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-[var(--color-urgent)]">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="species">Art</Label>
          <Input id="species" placeholder="t.ex. Citrus" {...register("species")} />
        </div>
        <div>
          <Label htmlFor="variety">Sort</Label>
          <Input id="variety" placeholder="t.ex. Meyer" {...register("variety")} />
        </div>
      </div>

      <div>
        <Label htmlFor="speciesId">Växttyp i databasen (valfritt)</Label>
        <Controller
          control={control}
          name="speciesId"
          render={({ field }) => (
            <Select id="speciesId" {...field}>
              <option value="">Ingen — hantera skötsel manuellt</option>
              {Object.entries(grouped).map(([category, list]) => (
                <optgroup key={category} label={CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        />
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Ger automatiska rekommendationer för vattning, gödsling, frost och skörd.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="indoorOutdoor">Inne / ute</Label>
          <Select id="indoorOutdoor" {...register("indoorOutdoor")}>
            <option value="outdoor">Utomhus</option>
            <option value="indoor">Inomhus</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="containerType">Kruka / mark</Label>
          <Select id="containerType" {...register("containerType")}>
            <option value="">Ej angivet</option>
            <option value="pot">Kruka</option>
            <option value="ground">Mark</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="location">Placering</Label>
        <Input id="location" placeholder="t.ex. Altan, Vardagsrum" {...register("location")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="purchaseDate">Inköpsdatum</Label>
          <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
        </div>
        <div>
          <Label htmlFor="approximateAgeYears">Ungefärlig ålder (år)</Label>
          <Input id="approximateAgeYears" type="number" min="0" step="0.5" {...register("approximateAgeYears")} />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Kommentar</Label>
        <Textarea id="notes" placeholder="Egna anteckningar…" {...register("notes")} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Sparar…" : submitLabel}
      </Button>
    </form>
  );
}
