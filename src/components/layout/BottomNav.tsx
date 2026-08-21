import { Link } from "@tanstack/react-router";
import { CalendarDays, LayoutGrid, Leaf, Plus, Settings, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Idag", icon: LayoutGrid },
  { to: "/vaxter", label: "Mina växter", icon: Leaf },
  { to: "/skord", label: "Skörd", icon: Sprout },
  { to: "/kalender", label: "Kalender", icon: CalendarDays },
  { to: "/installningar", label: "Inställningar", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur safe-bottom">
      <div className="relative mx-auto flex max-w-lg items-center justify-between px-2 pb-1 pt-2">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <Link
          to="/vaxter/ny"
          aria-label="Lägg till växt"
          className="mx-1 -mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Link>

        {NAV_ITEMS.slice(2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Leaf }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium text-[var(--color-ink-muted)] transition-colors"
      activeProps={{ className: "!text-[var(--color-primary)]" }}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
      <span className={cn("leading-none text-center")}>{label}</span>
    </Link>
  );
}
