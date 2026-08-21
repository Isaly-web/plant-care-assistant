import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles/index.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { registerPwa } from "@/lib/pwa-register";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Sidan hittades inte</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Sidan du letar efter finns inte, eller har flyttats.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Till Idag
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-xl font-semibold text-[var(--color-ink)]">Sidan kunde inte laddas</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Något gick fel. Prova att ladda om, eller gå tillbaka till start.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Till start
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#2f6b4f" },
      { name: "description", content: "Plant Care Assistant – vet vad dina växter behöver, just nu." },
      { title: "Plant Care Assistant" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/icons/icon-192.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerPwa();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Krävs: barnrutter renderas här. Ta inte bort <Outlet />. */}
        <Outlet />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
