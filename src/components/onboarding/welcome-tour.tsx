import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ClipboardCheck,
  Compass,
  MessageCircle,
  Settings2,
  Users,
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
  image?: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
};

const IT_STEPS: Step[] = [
  {
    id: "welcome",
    icon: BookOpen,
    eyebrow: "Welcome",
    title: "Learn with a path. Grow with people.",
    body: "IT PATH brings structured learning and a real learning community into one place. Build skills step by step, then ask questions, share what you discover, and learn alongside people working toward their own goals.",
    points: [
      "Follow a clear path instead of wondering what to learn next",
      "Turn lessons into understanding with practice and hands-on work",
      "Connect with other learners without leaving your learning space",
    ],
  },
  {
    id: "path",
    icon: Compass,
    image: "/ChatGPT%20Image%20Sep%2027%2C%202026%2C%2010_33_20%20AM.png",
    eyebrow: "Learn",
    title: "A path that keeps you moving",
    body: "You do not need to assemble your own curriculum. IT PATH organizes the journey so concepts build on one another, remembers where you stopped, and brings important material back when it needs more work.",
    points: [
      "Learn complex subjects in a logical order",
      "Practice, labs, quizzes, and review reinforce each lesson",
      "Leave and return without losing your place",
    ],
  },
  {
    id: "community",
    icon: Users,
    eyebrow: "Community",
    title: "You are learning with other people",
    body: "Learning does not have to be solitary. Community is built into IT PATH so you can ask questions, compare experiences, share progress, help someone else, or simply see what other learners are working on.",
    points: [
      "Post questions, ideas, progress, and useful discoveries",
      "Join conversations around the things you are learning",
      "Meet people who are working toward similar skills",
    ],
  },
  {
    id: "practice",
    icon: ClipboardCheck,
    eyebrow: "Understand",
    title: "Do more than finish lessons",
    body: "Reading is only the beginning. Practice, labs, recall, troubleshooting, and review help turn information into knowledge you can actually use. Difficult material comes back instead of quietly disappearing behind a completion checkmark.",
    points: [
      "Apply ideas instead of only memorizing definitions",
      "Revisit weak areas before they become knowledge gaps",
      "Build evidence of what you can actually do",
    ],
  },
  {
    id: "support",
    icon: MessageCircle,
    eyebrow: "Get help",
    title: "Ask AI. Ask people. Keep learning.",
    body: "When something does not click, you have more than one way forward. Use GAYL for immediate explanations and practice, or bring the question to the community for human experience, different perspectives, and discussion.",
    points: [
      "Get plain-language help from GAYL while you study",
      "Ask the community when human experience can help",
      "Share what you learn and reinforce it by helping others",
    ],
  },
  {
    id: "setup",
    icon: Settings2,
    eyebrow: "Make it yours",
    title: "Start with what matters to you",
    body: "Choose your learning goal and a few preferences, then start exploring. Your path gives you structure, while Home and Community give you room to discover new subjects and people as your interests grow.",
    points: [
      "Set a goal without locking yourself into one interest",
      "Continue your path or explore something new",
      "Make learning part of a community, not just a checklist",
    ],
  },
];
function autoStep(index: number, changes: Partial<Step>): Step {
  const base = IT_STEPS[index];
  if (!base) throw new Error(`Missing onboarding step ${index}.`);
  return { ...base, ...changes };
}

const AUTO_STEPS: Step[] = [
  autoStep(0, {
    body: "Stepping into automotive technology and repair can feel overwhelming, but you don't have to figure it out alone. AUTO PATH breaks vehicle systems and diagnostic skills into bite-sized, meaningful steps so you can build real confidence from day one.",
  }),
  autoStep(1, {
    eyebrow: "Your repair path",
    body: "AUTO PATH keeps each system focused, from fundamentals through diagnosis and repair. Complete the work in front of you, step away when needed, and return to the same point in your training.",
    points: [
      "A focused path through vehicle systems and repair skills",
      "Unlock the next system by proving what you understand",
      "Resume from the exact place you stopped",
    ],
  }),
  autoStep(2, {
    body: "Turn automotive knowledge into workshop decisions. Use focused quizzes, diagnostic scenarios, flashcards, and practical checks to separate symptoms from causes and revisit systems that need more work.",
    points: [
      "Diagnostic decisions grounded in realistic vehicle symptoms",
      "Recall practice for components, tests, and procedures",
      "Targeted review for systems that need extra attention",
    ],
  }),
  autoStep(3, {
    body: "When a vehicle system or diagnostic step feels unclear, ask GAYL. Your study companion explains the idea in plain language and keeps the answer connected to the automotive material you are learning.",
    points: [
      "Plain-language explanations of vehicle systems",
      "Help connected to the repair topic in front of you",
      "Patient support as you build diagnostic confidence",
    ],
  }),
  autoStep(4, {
    body: "Every AUTO PATH milestone reflects work you actually completed. Your records show which systems you have practised, where evidence is still thin, and what repair skill deserves attention next.",
    points: [
      "Review signals based on your real answers and activity",
      "Milestones that reflect completed automotive work",
      "A next step shaped by your own learning evidence",
    ],
  }),
  autoStep(5, {
    body: "Set up AUTO PATH around the way you want to learn. Choose your display theme, preferred name, automotive qualification goal, and current experience so the course starts in the right place.",
    points: [
      "Light or dark workshop theme",
      "Your preferred name throughout AUTO PATH",
      "An automotive goal matched to your experience",
    ],
  }),
];

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
      markSetupPending();
      if (goToSettings) {
        void navigate({ to: "/dashboard" });
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
                {step.image ? (
                  <img src={step.image} alt="" className="size-8 object-contain" aria-hidden />
                ) : (
                  <Icon className="size-5" aria-hidden />
                )}
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
                {last ? "Quick setup" : "Next"}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
