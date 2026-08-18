import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input, Textarea, Select } from "@/components/ui/input";
import { PhotoUploadField } from "@/components/plants/PhotoUploadField";
import { useCreateHarvest } from "@/hooks/mutations";
import type { PlantWithSpecies, HarvestUnit } from "@/types/domain";
import { todayDateOnly } from "@/lib/date";
import { Plus } from "lucide-react";

interface FormValues {
  plantId: string;
  harvestDate: string;
  cropName: string;
  quantity: string;
  unit: HarvestUnit;
  notes: string;
}

export function HarvestFormDialog({
  plants,
  fixedPlantId,
  trigger,
}: {
  plants: PlantWithSpecies[];
  fixedPlantId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const createHarvest = useCreateHarvest();

  const fixedPlant = fixedPlantId ? plants.find((p) => p.id === fixedPlantId) : undefined;

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: {
      plantId: fixedPlantId ?? "",
      harvestDate: todayDateOnly(),
      cropName: fixedPlant?.name ?? "",
      quantity: "",
      unit: "kg",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!values.plantId) return;
    await createHarvest.mutateAsync({
      plantId: values.plantId,
      harvestDate: values.harvestDate,
      cropName: values.cropName || null,
      quantity: values.quantity ? Number(values.quantity) : null,
      unit: values.unit,
      notes: values.notes || null,
      photoUrl,
    });
    setOpen(false);
    setPhotoUrl(null);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Registrera skörd
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Registrera skörd</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!fixedPlantId && (
            <div>
              <Label htmlFor="plantId">Växt</Label>
              <Controller
                control={control}
                name="plantId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select id="plantId" {...field}>
                    <option value="">Välj växt…</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          )}

          <div className="flex justify-center">
            <PhotoUploadField value={photoUrl} onChange={setPhotoUrl} folder="harvests" />
          </div>

          <div>
            <Label htmlFor="cropName">Vad skördades</Label>
            <Input id="cropName" placeholder="t.ex. Hallon" {...register("cropName")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="harvestDate">Datum</Label>
              <Input id="harvestDate" type="date" {...register("harvestDate")} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="quantity">Mängd</Label>
                <Input id="quantity" type="number" step="0.01" min="0" {...register("quantity")} />
              </div>
              <div>
                <Label htmlFor="unit">Enhet</Label>
                <Select id="unit" {...register("unit")}>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="st">st</option>
                  <option value="liter">liter</option>
                  <option value="other">annat</option>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Kommentar</Label>
            <Textarea id="notes" placeholder="t.ex. första skörden i år" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={createHarvest.isPending}>
            {createHarvest.isPending ? "Sparar…" : "Spara skörd"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
