import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RecommendedAction } from "@/types/domain";

export function TaskRow({
  action,
  onComplete,
  isCompleting,
}: {
  action: RecommendedAction;
  onComplete: (action: RecommendedAction) => void;
  isCompleting: boolean;
}) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <Link to="/vaxter/$id" params={{ id: action.plantId }} className="flex min-w-0 flex-1 items-start gap-3">
        <span className="text-2xl leading-none">{action.emoji}</span>
        <div className="min-w-0">
          <p className="font-medium text-[var(--color-ink)]">
            {action.plantName} – {action.title}
          </p>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{action.reason}</p>
        </div>
      </Link>
      <Button
        variant="secondary"
        size="sm"
        className="shrink-0 gap-1.5"
        disabled={isCompleting}
        onClick={() => onComplete(action)}
      >
        <Check className="h-4 w-4" />
        Klar
      </Button>
    </Card>
  );
}
