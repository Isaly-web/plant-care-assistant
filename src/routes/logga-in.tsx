import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/logga-in")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Logga in – Plant Care Assistant" }],
  }),
  component: LoginPage,
});

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Fel e-post eller lösenord.";
  if (message.includes("already registered")) return "Det finns redan ett konto med den e-postadressen.";
  if (message.includes("Password should be")) return "Lösenordet måste vara minst 6 tecken.";
  return message;
}

function LoginPage() {
  const navigate = useNavigate();
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = mode === "signin" ? await signInWithPassword(email, password) : await signUp(email, password);
    setLoading(false);
    if (result.error) {
      setError(translateAuthError(result.error));
      return;
    }
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <p className="text-4xl">🌿</p>
          <h1 className="mt-2 font-display text-2xl font-semibold">Plant Care Assistant</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Vet vad dina växter behöver, just nu.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-post</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Lösenord</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-urgent)]">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Ett ögonblick…" : mode === "signin" ? "Logga in" : "Skapa konto"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-[var(--color-ink-muted)]"
        >
          {mode === "signin" ? "Inget konto? Skapa ett" : "Har du redan ett konto? Logga in"}
        </button>
      </Card>
    </div>
  );
}
