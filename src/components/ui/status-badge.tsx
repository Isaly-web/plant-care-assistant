import type { UrgencyStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

const CONFIG: Record<UrgencyStatus, { label: string; dot: string; text: string; bg: string; emoji: string }> = {
  urgent: { label: "Behöver göras", dot: "bg-[var(--color-urgent)]", text: "text-[var(--color-urgent)]", bg: "bg-[var(--color-urgent-bg)]", emoji: "🔴" },
  soon: { label: "Snart", dot: "bg-[var(--color-soon)]", text: "text-[var(--color-soon)]", bg: "bg-[var(--color-soon-bg)]", emoji: "🟡" },
  ok: { label: "OK", dot: "bg-[var(--color-ok)]", text: "text-[var(--color-ok)]", bg: "bg-[var(--color-ok-bg)]", emoji: "🟢" },
};

export function StatusBadge({ status, className }: { status: UrgencyStatus; className?: string }) {
  const c = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

export function StatusDot({ status }: { status: UrgencyStatus }) {
  return <span aria-hidden>{CONFIG[status].emoji}</span>;
}

export function statusConfig(status: UrgencyStatus) {
  return CONFIG[status];
}
