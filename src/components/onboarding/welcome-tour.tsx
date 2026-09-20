import { useCallback, useEffect, useState, type CSSProperties } from "react";
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
import { activeDomainKey } from "@/domain/active";
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

const IT_STEPS: Step[] = [
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
    title: "One step at a time",
    body: "To keep things focused, each section unlocks naturally as you complete the one before it. No overwhelming menus or guesswork. Step away whenever life calls, and you'll always pick up right where you left off.",
    points: [
      "A linear, focused path so you never get overwhelmed",
      "Unlock as you go by finishing what's in front of you",
      "Always resumes right where you stopped",
    ],
  },
  {
    id: "practice",
    icon: ClipboardCheck,
    eyebrow: "Practice",
    title: "Reinforce what you learn",
    body: "Build lasting confidence through structured reinforcement. Check your understanding with focused quizzes, evaluate your progress at the end of each stage, and rely on smart flashcards to review concepts before they fade. Difficult topics naturally cycle back until you've mastered them.",
    points: [
      "Focused check-ins and milestone exams as you progress",
      "Adaptive flashcards designed to support memory retention",
      "Targeted review for concepts that need extra attention",
    ],
  },
  {
    id: "tutor",
    icon: BrainCircuit,
    eyebrow: "Support",
    title: "Meet GAYL, your study companion",
    body: "When a concept feels unclear, just ask. GAYL breaks things down in plain language, adapting directly to what you are studying and where you need clarity—always patient, supportive, and free of jargon.",
    points: [
      "Easy to understand explanations",
      "Contextual awareness of where you need help",
      "Unwavering patience every step of the way",
    ],
  },
  {
    id: "progress",
    icon: LineChart,
    eyebrow: "Progress",
    title: "Track your actual growth",
    body: "Every milestone reflects genuine effort. Watch your momentum build with clear insights that highlight your progress and point you naturally toward your next focus area.",
    points: [
      "Proactive insights that identify areas for review",
      "Streaks and milestones to celebrate consistency",
      "Pacing that responds directly to your activity",
    ],
  },
  {
    id: "setup",
    icon: Settings2,
    eyebrow: "Last step",
    title: "Make it yours",
    body: "Personalize your experience by choosing your display theme, setting your preferred name, and defining the specific learning goals you want to pursue. It takes less than a minute to set up, and then you are ready to begin.",
    points: [
      "Light or dark theme, tailored to your preference",
      "Your preferred name for a personalized experience",
      "Custom goals to keep your journey focused",
    ],
  },
];

const AUTO_STEPS: Step[] = IT_STEPS.map((step) => ({
  ...step,
  body: step.body
    .replaceAll("IT and cybersecurity", "automotive technology and repair")
    .replaceAll("IT Path", "AUTO PATH"),
}));

export function WelcomeTour() {
  const navigate = useNavigate();
  const steps = activeDomainKey.split("@")[0] === "auto-repair" ? AUTO_STEPS : IT_STEPS;
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

  const step = steps[index]!;
  const last = index === steps.length - 1;

  const next = useCallback(() => {
    setDirection("next");
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  }, [steps.length]);
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
  const percent = Math.round(((index + 1) / steps.length) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-background/80 p-0 backdrop-blur-md duration-300 animate-in fade-in sm:items-center sm:p-6"
    >
      <div className="tour-glow pointer-events-none absolute -bottom-24 left-1/2 h-[34rem] w-[42rem] max-w-[130vw] -translate-x-1/2 sm:bottom-auto" aria-hidden />
      <div className="tour-card relative w-full max-w-lg overflow-hidden rounded-t-2xl border border-border/80 duration-500 animate-in fade-in slide-in-from-bottom-6 sm:rounded-2xl sm:zoom-in-95">
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
              "relative z-10",
              direction === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4",
            )}
          >
            <div className="tour-content-enter flex items-center gap-3 [--tour-delay:40ms]">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="tour-word-fade text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground [--tour-delay:60ms]">
                  {step.eyebrow}
                </p>
                <h2 className="font-display text-xl font-semibold tracking-tight">{step.title}</h2>
              </div>
            </div>

            <p className="tour-content-enter mt-4 text-sm leading-relaxed text-muted-foreground [--tour-delay:130ms]">{step.body}</p>

            <ul className="mt-5 space-y-2">
              {step.points.map((point, i) => (
                <li
                  key={point}
                  className="tour-content-enter flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                  style={{ "--tour-delay": `${220 + i * 80}ms` } as CSSProperties}
                >
                  <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {steps.map((s, i) => (
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
                <Button className="tour-action" variant="ghost" size="sm" onClick={back}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
              ) : (
                <Button className="tour-action" variant="ghost" size="sm" onClick={() => close(false)}>
                  Skip
                </Button>
              )}
              <Button className="tour-action" size="sm" onClick={() => (last ? close(true) : next())}>
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
