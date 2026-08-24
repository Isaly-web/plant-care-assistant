import { Droplet, Sprout, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PlantWithSpecies } from "@/types/domain";
import { buildCareAdvice } from "@/services/careAdviceService";

interface CareAdviceCardProps {
  plant: PlantWithSpecies;
  today: string;
}

/** Personliga skötselråd: vattning, ljus och gödsling — anpassat per art/planta. */
export function CareAdviceCard({ plant, today }: CareAdviceCardProps) {
  const advice = buildCareAdvice(plant, today);

  const rows = [
    { icon: Droplet, label: "Vattning", text: advice.watering },
    { icon: Sun, label: "Ljus", text: advice.light },
    { icon: Sprout, label: "Gödsling", text: advice.fertilizing },
  ];

  return (
    <Card className="p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">Personliga skötselråd</h2>
      <div className="space-y-3">
        {rows.map(({ icon: Icon, label, text }) => (
          <div key={label} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ink-muted)]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</p>
              <p className="text-sm text-[var(--color-ink)]">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
