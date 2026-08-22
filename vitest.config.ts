import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      // supabase/functions/** is deployed as Deno edge functions and uses
      // Deno's npm: specifier convention (see schema.ts). Aliasing it here
      // lets the exact same source run unmodified under both Deno (which
      // resolves npm: natively) and Vitest (which resolves it to the
      // already-installed npm package) — no source forking for tests.
      "npm:zod@3": "zod",
    },
  },
});
