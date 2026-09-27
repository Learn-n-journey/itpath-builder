import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { certifications } from "@/data/static-content";
import { useProfile } from "@/hooks/use-profile";
import { markSetupDone, markSetupPending, setupPending } from "@/lib/onboarding";
import { learnerContinuity } from "@/lib/learner-continuity";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { useTheme } from "@/state/theme";
import { domain } from "@/domain/active";
import { experienceOptions } from "@/lib/experience-options";


/**
 * Quick setup shown once, straight after the welcome tour: colour mode, name
 * and goal. Every control writes to the same place the full settings do.
 */
export function WelcomeSetup({ onFinished }: { onFinished?: () => void }) {
  const [show, setShow] = useState(false);
  const { user, updateSettings } = useAppState();
  const navigate = useNavigate();
  const continuity = useMemo(() => learnerContinuity(user), [user]);
  const { theme, setTheme } = useTheme();
  const { userId, ready } = useAuth();
  const { firstName, saveFirstName, saving } = useProfile();
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setShow(setupPending());
  }, []);

  useEffect(() => {
    if (!touched) setName(firstName);
  }, [firstName, touched]);

  if (!show) return null;

  const s = user.settings;
  const EXPERIENCE = experienceOptions(domain.id);
  const signedIn = ready && Boolean(userId);

  async function finish() {
    if (signedIn && touched && name.trim() !== firstName) {
      try {
        await saveFirstName(name);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "That name did not save.");
        return;
      }
    }
    markSetupDone();
    setShow(false);
    onFinished?.();
    toast.success("You're all set. Let's start learning.");
    await navigate({
      to: continuity.to as never,
      ...(continuity.params ? { params: continuity.params as never } : {}),
      ...(continuity.search ? { search: continuity.search as never } : {}),
    });
  }

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-primary/30 bg-card shadow-lg duration-500 animate-in fade-in slide-in-from-bottom-4">
      <div className="border-b border-border bg-primary/5 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Quick setup
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
          Just a few things and you're ready to start
        </h2>
      </div>

      <div className="space-y-6 p-5">
        <div className="duration-500 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <Label>Colour mode</Label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[
              { id: "dark" as const, label: "Dark", hint: "Easier at night", icon: Moon },
              { id: "light" as const, label: "Light", hint: "Bright rooms", icon: Sun },
            ].map((option) => {
              const active = theme === option.id || (theme === "system" && option.id === "dark");
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(option.id)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-muted/30 hover:border-primary/40",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-primary transition-transform duration-200 group-hover:scale-110" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                  {active ? <Check className="ml-auto size-4 text-primary" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="duration-500 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
          <Label htmlFor="welcomeName">Your first name</Label>
          {signedIn ? (
            <Input
              id="welcomeName"
              className="mt-2"
              maxLength={40}
              autoComplete="given-name"
              placeholder="e.g. David"
              value={name}
              onChange={(event) => {
                setTouched(true);
                setName(event.target.value);
              }}
            />
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary underline underline-offset-4">
                Sign in
              </Link>{" "}
              to save the name we greet you by.
            </p>
          )}
        </div>

        <div className="duration-500 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
          <Label>Your goal</Label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Select
              value={s.certificationTarget}
              onValueChange={(v) => updateSettings({ certificationTarget: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Certification target" />
              </SelectTrigger>
              <SelectContent>
                {certifications.map((certification) => (
                  <SelectItem key={certification.id} value={certification.title}>
                    {certification.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={s.experienceLevel}
              onValueChange={(v) => updateSettings({ experienceLevel: v as ExperienceLevel })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Experience level" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Your goal shapes what we put in front of you — lessons, practice and your study plan. You can change your mind any time.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              markSetupPending();
              setShow(false);
              onFinished?.();
              void navigate({ to: "/dashboard" });
            }}
          >
            Do this later
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void finish()}>
            {saving ? "Saving…" : "Save & start learning"}
          </Button>
        </div>
      </div>
    </section>
  );
}
