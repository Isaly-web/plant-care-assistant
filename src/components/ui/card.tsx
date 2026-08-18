import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border border-[var(--color-border)]/60",
        className,
      )}
      {...props}
    />
  );
}
