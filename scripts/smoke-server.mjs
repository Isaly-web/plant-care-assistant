// Starts the built server function (the same files Vercel runs) and requests a few public pages.
// Tests and typecheck run on the source, so a bundle that fails when the function starts (for
// example "__exportAll is not a function", which took production down in November 2026) only shows
// up here. Run after `npm run build`; the build needs VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY (any value: no request reaches Supabase while rendering these).
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const PAGES = ["/auth", "/logga-in", "/reset-password", "/privacy", "/terms"];
const entry = resolve(".vercel/output/functions/__server.func/index.mjs");

const { default: server } = await import(pathToFileURL(entry).href);
const handle = typeof server?.fetch === "function" ? server.fetch.bind(server) : server;

let failed = false;
for (const path of PAGES) {
  const response = await handle(new Request(`http://localhost${path}`));
  const ok = response.status < 500;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${response.status} ${path}`);
  await response.body?.cancel();
}

if (failed) {
  console.error("The built server answers with an error. See the log above.");
  process.exit(1);
}
