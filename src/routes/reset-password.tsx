// Where the password-reset e-mail leads (Isaly App Foundation). Supabase signs the user in from the
// link (PASSWORD_RECOVERY), then the new password is saved for the shared Isaly account.
import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  PASSWORD_MIN_LENGTH,
  authErrorMessage,
  isNewPasswordLongEnough,
} from "@isaly/app-foundation/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/app-config";
import { authText } from "@/lib/auth-text";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: `Välj nytt lösenord – ${APP_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isNewPasswordLongEnough(password)) {
      setError(authText("auth.validation.password_min"));
      return;
    }
    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return void toast.error(authErrorMessage(updateError, authText));
    toast.success("Lösenordet är bytt.");
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="font-display text-xl font-semibold">Välj nytt lösenord</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {ready
            ? "Lösenordet gäller ditt Isaly-konto i alla Isaly-appar."
            : "Kontrollerar länken…"}
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <Label htmlFor="new-password">{`Nytt lösenord (minst ${PASSWORD_MIN_LENGTH} tecken)`}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready}
              aria-invalid={!!error}
              aria-describedby={error ? "new-password-error" : undefined}
            />
            {error && (
              <p
                id="new-password-error"
                role="alert"
                className="mt-1 text-xs text-[var(--color-urgent)]"
              >
                {error}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!ready || loading}>
            {loading ? "Sparar…" : "Spara lösenord"}
          </Button>
        </form>
        {!ready && (
          <p className="mt-4 text-center text-sm text-[var(--color-ink-muted)]">
            Fungerar inte länken?{" "}
            <Link to="/auth" className="underline">
              Begär en ny
            </Link>
            .
          </p>
        )}
      </Card>
    </main>
  );
}
