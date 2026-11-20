// The sign-in page moved to /auth (the same address in every Isaly app). Old links and bookmarks
// to /logga-in still work.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/logga-in")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", replace: true });
  },
});
