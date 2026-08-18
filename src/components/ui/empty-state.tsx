import type { ReactNode } from "react";

export function EmptyState({ emoji, title, description, action }: { emoji: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="font-display text-lg text-[var(--color-ink)]">{title}</p>
      {description && <p className="max-w-xs text-sm text-[var(--color-ink-muted)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
