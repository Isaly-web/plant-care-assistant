import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  detectInstallPlatform,
  dismissInstallPrompt,
  isInstallPromptDismissed,
  isMarkedInstalled,
  isRunningInstalled,
  markInstalled,
  type BeforeInstallPromptEvent,
  type InstallPlatform,
} from "@/lib/pwa-install";

// Swedish only: this app has no i18n layer, all UI copy is inline Swedish.
const TEXT = {
  title: "Installera Plant Care Assistant på mobilen",
  description: "Lägg till appen på hemskärmen för snabb åtkomst.",
  installButton: "Installera appen",
  dismiss: "Stäng",
  iosSteps: "Tryck på Dela i Safari och välj ”Lägg till på hemskärmen”.",
  androidSteps: "Öppna webbläsarens meny och välj ”Installera app” eller ”Lägg till på startskärmen”.",
};

/**
 * Isaly App Foundation: dismissible "install the app" banner (reference:
 * happy-hen-history). Native prompt where the browser offers one, short manual
 * steps on iOS/Android otherwise, nothing on desktop browsers without a prompt.
 * Hidden once installed or dismissed.
 */
export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isRunningInstalled() || isMarkedInstalled() || isInstallPromptDismissed()) return;
    setPlatform(detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints));
    setVisible(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      markInstalled();
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || (!deferred && platform === "desktop")) return null;

  const dismiss = () => {
    dismissInstallPrompt();
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    const prompt = deferred;
    setDeferred(null);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") markInstalled();
    setVisible(false);
  };

  return (
    <section
      aria-label={TEXT.title}
      className="relative mb-5 flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 pr-10 shadow-sm"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white">
        <Smartphone className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-semibold text-[var(--color-ink)]">{TEXT.title}</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {deferred ? TEXT.description : platform === "ios" ? TEXT.iosSteps : TEXT.androidSteps}
          {!deferred && platform === "ios" && (
            <Share className="ml-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
          )}
        </p>
        {deferred && (
          <Button size="sm" className="mt-3" onClick={install}>
            {TEXT.installButton}
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={TEXT.dismiss}
        className="absolute right-2 top-2 rounded-full p-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}
