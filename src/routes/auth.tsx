// Sign-in page, built to the Isaly App Foundation rules shared by every Isaly app: Sign in / Sign up
// tabs and a forgot-password mode, Google sign-in, the shared error texts, and one Isaly account
// for all apps (an address that already has an account is sent to sign-in, not told to check its
// e-mail). Every link Supabase e-mails or redirects to points back to this app's own address.
import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { toast } from "sonner";
import {
  PASSWORD_MIN_LENGTH,
  authErrorKey,
  authErrorMessage,
  isExistingAccountSignup,
  isNewPasswordLongEnough,
} from "@isaly/app-foundation/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_NAME, SUPPORT_MAILTO } from "@/lib/app-config";
import { authText, safeRedirectPath } from "@/lib/auth-text";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  head: () => ({
    meta: [{ title: `Logga in – ${APP_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = safeRedirectPath(redirect);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Signed in already, or signed in by a link or Google: go to the page the user tried to open.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: target, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  function validateEmail(value: string) {
    if (!value) return "Fyll i din e-postadress.";
    if (!EMAIL_PATTERN.test(value)) return "Ange en giltig e-postadress.";
    return null;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPasswordError(null);
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    const eErr = validateEmail(email);
    setEmailError(eErr);
    if (eErr) return;
    setLoading(true);
    // No length rule here: older Isaly accounts may have a shorter password and must still work.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return void toast.error(authErrorMessage(error, authText));
    navigate({ to: target, replace: true });
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    const eErr = validateEmail(email);
    const pErr = isNewPasswordLongEnough(password)
      ? null
      : authText("auth.validation.password_min");
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    if (!ageOk) return void toast.error("Bekräfta att du är minst 13 år för att skapa konto.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return void toast.error(authErrorMessage(error, authText));
    // One Isaly account for every app: Supabase answers "success" without sending an e-mail when
    // the address already has an account, so send the person to sign-in instead of a dead end.
    if (isExistingAccountSignup(data.user)) {
      setPassword("");
      switchMode("signin");
      toast.info(authText("auth.signup.existing"));
      return;
    }
    // With e-mail confirmation on there is no session yet: show "check your e-mail" and stay here.
    if (data.session) return void navigate({ to: target, replace: true });
    setSignupSent(true);
  }

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    const eErr = validateEmail(email);
    setEmailError(eErr);
    if (eErr) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    // Only a rate limit is reported; otherwise the answer is the same whether or not the account
    // exists, so the form cannot be used to find out who has an account.
    if (error && authErrorKey(error) === "auth.error.rate_limit") {
      return void toast.error(authErrorMessage(error, authText));
    }
    toast.success("Om kontot finns har vi skickat en länk för att välja nytt lösenord.");
    switchMode("signin");
  }

  async function onGoogle() {
    // Google sign-in creates an account for someone new, so the age is confirmed first.
    if (!ageOk) return void toast.error("Bekräfta att du är minst 13 år för att fortsätta.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${target}` },
    });
    // On success the browser has already left for Google.
    if (error) {
      setLoading(false);
      toast.error(
        authErrorKey(error)
          ? authErrorMessage(error, authText)
          : authText("auth.error.google_failed"),
      );
    }
  }

  if (signupSent) {
    return (
      <Centered>
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
            <MailCheck className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold">Kolla din e-post</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Vi har skickat en länk till <strong>{email}</strong>. Klicka på den för att bekräfta
            kontot, så loggas du in.
          </p>
          <Button
            variant="ghost"
            className="mt-6"
            onClick={() => {
              setSignupSent(false);
              setPassword("");
              switchMode("signin");
            }}
          >
            Tillbaka
          </Button>
        </Card>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-4xl" aria-hidden>
            🌿
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold">
            {mode === "forgot" ? "Glömt lösenord" : APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {mode === "forgot"
              ? "Ange din e-postadress så skickar vi en länk för att välja nytt lösenord."
              : "Vet vad dina växter behöver, just nu."}
          </p>
        </div>

        <Card className="p-6">
          {mode !== "forgot" && (
            <>
              <label className="mb-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ageOk}
                  onChange={(e) => setAgeOk(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>Jag är minst 13 år gammal</span>
              </label>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onGoogle}
                disabled={loading}
              >
                Fortsätt med Google
              </Button>
              <div className="my-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-ink-muted)]">eller</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
            </>
          )}

          {mode === "forgot" ? (
            <form onSubmit={onForgot} className="space-y-4" noValidate>
              <EmailField value={email} onChange={setEmail} error={emailError} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Skickar…" : "Skicka länk"}
              </Button>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="block w-full text-center text-sm text-[var(--color-ink-muted)]"
              >
                Tillbaka
              </button>
            </form>
          ) : (
            <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">
                  Logga in
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Skapa konto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="mt-4 space-y-4" noValidate>
                  <EmailField value={email} onChange={setEmail} error={emailError} />
                  <PasswordField
                    id="password"
                    label="Lösenord"
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    setShow={setShowPassword}
                    error={null}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Ett ögonblick…" : "Logga in"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="block w-full text-center text-sm text-[var(--color-ink-muted)]"
                  >
                    Glömt lösenord?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="mt-4 space-y-4" noValidate>
                  <EmailField value={email} onChange={setEmail} error={emailError} />
                  <PasswordField
                    id="password-new"
                    label={`Lösenord (minst ${PASSWORD_MIN_LENGTH} tecken)`}
                    autoComplete="new-password"
                    value={password}
                    onChange={(v) => {
                      setPassword(v);
                      if (passwordError && isNewPasswordLongEnough(v)) setPasswordError(null);
                    }}
                    show={showPassword}
                    setShow={setShowPassword}
                    error={passwordError}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Ett ögonblick…" : "Skapa konto"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-[var(--color-ink-muted)]">
          Ditt Isaly-konto fungerar i alla Isaly-appar. Tjänsten är för personer som fyllt 13 år.
        </p>
        <p className="mt-2 text-center text-xs text-[var(--color-ink-muted)]">
          Genom att fortsätta godkänner du våra{" "}
          <Link to="/terms" className="underline">
            villkor
          </Link>{" "}
          och{" "}
          <Link to="/privacy" className="underline">
            integritetspolicy
          </Link>
          . Behöver du hjälp?{" "}
          <a href={SUPPORT_MAILTO} className="underline">
            Kontakta support
          </a>
          .
        </p>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      {children}
    </main>
  );
}

function EmailField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <div>
      <Label htmlFor="email">E-post</Label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "email-error" : undefined}
      />
      {error && (
        <p id="email-error" role="alert" className="mt-1 text-xs text-[var(--color-urgent)]">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  show,
  setShow,
  error,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  error: string | null;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--color-ink-muted)]"
          aria-label={show ? "Dölj lösenord" : "Visa lösenord"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[var(--color-urgent)]">
          {error}
        </p>
      )}
    </div>
  );
}
