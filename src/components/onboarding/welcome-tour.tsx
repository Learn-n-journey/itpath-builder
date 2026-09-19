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
    title: "This is IT PATH",
    body: "A structured route from complete beginner to working in IT and cybersecurity. Everything you see is measured from what you actually do.",
    points: ["Every number is earned", "Learn at your own pace", "Works offline on this device"],
  },
  {
    id: "path",
    icon: Compass,
    eyebrow: "Your journey",
    title: "My Path shows the next thing to study",
    body: "Sections unlock in order. You move forward once you have shown command of the material, not because you clicked through it.",
    points: ["Ordered sections", "Locks open as you prove skill", "Always resumes where you stopped"],
  },
  {
    id: "practice",
    icon: ClipboardCheck,
    eyebrow: "Practice",
    title: "Quizzes, exams and flashcards",
    body: "Every section has a quiz, every stage has an exam, and review cards bring back what you are starting to forget.",
    points: ["Section quizzes and stage exams", "Spaced review cards", "Missed questions come back"],
  },
  {
    id: "tutor",
    icon: BrainCircuit,
    eyebrow: "Support",
    title: "GAYL, your study companion",
    body: "Ask for an explanation any time. GAYL answers from your own records and the material you are studying, in plain language.",
    points: ["Explains in plain words", "Knows where you are stuck", "Never grades you harshly"],
  },
  {
    id: "progress",
    icon: LineChart,
    eyebrow: "Honest numbers",
    title: "Progress you can trust",
    body: "Learning progress and overall mastery are the only two numbers. Both come straight from your answers and study time.",
    points: ["Weak areas surfaced early", "Streaks and milestones", "Only real activity counts"],
  },
  {
    id: "setup",
    icon: Settings2,
    eyebrow: "Last step",
    title: "Make it yours",
    body: "Pick your colour mode, tell us your name, and choose the goal you are working towards. It takes under a minute.",
    points: ["Light or dark", "The name we greet you by", "Your certification goal"],
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
