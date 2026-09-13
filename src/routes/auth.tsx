import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — IT PATH" },
      {
        name: "description",
        content:
          "Sign in to IT PATH to save your certification study progress to your account and pick up on any device.",
      },
      { property: "og:title", content: "Sign in — IT PATH" },
      {
        property: "og:description",
        content: "Save your IT and cybersecurity study progress to your IT PATH account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { userId, ready } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    if (ready && userId) void navigate({ to: "/", replace: true });
  }, [ready, userId, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Check your email to confirm your account.");
          return;
        }
        toast.success("Account created. Your progress is now saved to it.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      if (data.url) window.location.assign(data.url);
    } catch {
      toast.error("Google sign-in did not complete.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset email sent.");
  }

  return (
    <div className="mx-auto w-full max-w-md py-6">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to IT PATH" : "Create your IT PATH account"}
        </h1>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        An account saves your progress off this device, so you can study on another computer or
        phone and never lose your work.
      </p>

      {sentConfirmation ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm">
          <p className="font-medium text-foreground">Confirm your email</p>
          <p className="mt-2 text-muted-foreground">
            We sent a confirmation link to {email}. Open it, and your progress in this browser will
            be uploaded to your account automatically.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setSentConfirmation(false)}>
            Back
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5">
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "I already have an account"}
            </button>
            {mode === "signin" ? (
              <button type="button" className="text-muted-foreground hover:underline" onClick={handleReset}>
                Forgot password
              </button>
            ) : null}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        You can keep studying without an account —{" "}
        <Link to="/" className="text-primary hover:underline">
          continue on this device
        </Link>
        . Your work stays in this browser until you sign in.
      </p>
    </div>
  );
}
