import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-28">
      <main className="mx-auto max-w-lg px-4 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
