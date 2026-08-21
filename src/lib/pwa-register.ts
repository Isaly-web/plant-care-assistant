// Registers the hand-written public/sw.js directly — see that file for why
// this doesn't go through vite-plugin-pwa's virtual:pwa-register module.
export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch((error) => console.error("PWA-registrering misslyckades", error));
}
