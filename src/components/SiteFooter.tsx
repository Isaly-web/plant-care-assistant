import { Link } from "@tanstack/react-router";
import { APP_NAME, SUPPORT_MAILTO } from "@/lib/app-config";

// Foundation footer: the same three links in every Isaly app (privacy, terms, support).
// App-specific links should not be added here. The bottom padding keeps the links clear of the
// fixed bottom navigation and the feedback button.
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto flex max-w-lg flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-32 pt-6 text-xs text-[var(--color-ink-muted)]">
        <span>
          © {new Date().getFullYear()} Isaly · {APP_NAME}
        </span>
        <nav aria-label="Juridik och support" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/privacy" className="hover:text-[var(--color-ink)] hover:underline">
            Integritet
          </Link>
          <Link to="/terms" className="hover:text-[var(--color-ink)] hover:underline">
            Villkor
          </Link>
          <a href={SUPPORT_MAILTO} className="hover:text-[var(--color-ink)] hover:underline">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}
