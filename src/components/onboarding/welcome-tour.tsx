import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ClipboardCheck,
  Compass,
  LineChart,
  Settings2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { markSetupPending, markTourSeen, tourSeen } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
};

const STEPS: Step[] = [
  {
    id: "welcome",
    icon: ShieldCheck,
    eyebrow: "Welcome",
    title: "Your journey starts here",
    body: "Stepping into IT and cybersecurity can feel overwhelming, but you don't have to figure it out alone. IT Path breaks down complex skills into bite-sized, meaningful steps so you can build real confidence from day one.",
    points: [
      "Zero guesswork: a guided roadmap for your learning goals",
      "Learn on your terms: go at whatever speed fits your life",
      "Always accessible: works right on your device, anytime",
    ],
  },
  {
    id: "path",
    icon: Compass,
    eyebrow: "Your journey",
    title: "My Path knows what's next",
    body: "You'll work through sections in order, and each one opens up when you've genuinely got it — not just because you tapped through. Come back whenever you like; you'll pick up exactly where you left off.",
    points: ["Sections open in a sensible order", "You move on when the material sticks", "Always resumes right where you stopped"],
  },
  {
    id: "practice",
    icon: ClipboardCheck,
    eyebrow: "Practice",
    title: "Quizzes, exams and flashcards",
    body: "Test yourself as you go with short quizzes, sit an exam at the end of each stage, and let flashcards quietly bring back the things you're starting to forget. The stuff you miss comes around again until it doesn't trip you up.",
    points: ["Short quizzes as you go, exams at each stage", "Flashcards resurface what's slipping", "Missed questions return until they stick"],
  },
  {
    id: "tutor",
    icon: BrainCircuit,
    eyebrow: "Support",
    title: "GAYL, your study companion",
    body: "When something doesn't click, just ask. GAYL explains things in plain language, drawing on what you've been studying and where you're actually stuck — no jargon, and never a harsh word.",
    points: ["Explains things like a person would", "Knows exactly where you're stuck", "Patient, always — even when you're not"],
  },
  {
    id: "progress",
    icon: LineChart,
    eyebrow: "Progress",
    title: "See how far you've come",
    body: "Everything you see here comes from your own studying — no padding, no filler. So when it says you're getting somewhere, you can believe it, and it'll point you straight at what to work on next.",
    points: ["Spots weak areas before they bite", "Streaks and milestones to keep you going", "Moves only when you do"],
  },
  {
    id: "setup",
    icon: Settings2,
    eyebrow: "Last step",
    title: "Make it yours",
    body: "Pick light or dark, tell us your name, and choose the goal you're working towards. Takes less than a minute — then you're off.",
    points: ["Light or dark, your call", "The name we greet you by", "The goal you're aiming for"],
  },
];

export function WelcomeTour() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "back">("next");

  useEffect(() => {
    if (!tourSeen()) setOpen(true);
  }, []);

  const close = useCallback(
    (goToSettings: boolean) => {
      markTourSeen();
      setOpen(false);
      if (goToSettings) {
        markSetupPending();
        void navigate({ to: "/settings" });
      }
    },
    [navigate],
  );

  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;

  const next = useCallback(() => {
    setDirection("next");
    setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }, []);
  const back = useCallback(() => {
    setDirection("back");
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") back();
      if (event.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, close]);

  if (!open) return null;

  const Icon = step.icon;
  const percent = Math.round(((index + 1) / STEPS.length) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-md duration-300 animate-in fade-in sm:items-center sm:p-6"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl duration-500 animate-in fade-in slide-in-from-bottom-6 sm:rounded-2xl sm:zoom-in-95">
        <div className="h-1 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          <div
            key={step.id}
            className={cn(
              "duration-300 animate-in fade-in",
              direction === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {step.eyebrow}
                </p>
                <h2 className="font-display text-xl font-semibold tracking-tight">{step.title}</h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

            <ul className="mt-5 space-y-2">
              {step.points.map((point, i) => (
                <li
                  key={point}
                  className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm duration-500 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${120 + i * 90}ms`, animationFillMode: "both" }}
                >
                  <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === index ? "w-6 bg-primary" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {index > 0 ? (
                <Button variant="ghost" size="sm" onClick={back}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => close(false)}>
                  Skip
                </Button>
              )}
              <Button size="sm" onClick={() => (last ? close(true) : next())}>
                {last ? "Set up my preferences" : "Next"}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
