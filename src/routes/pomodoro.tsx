import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, Coffee, Pause, Play, RotateCcw, SlidersHorizontal, Square, Target, Timer } from "lucide-react";
import { toast } from "sonner";

import { LearnerPageSkeleton } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pomodoro")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Pomodoro Timer | IT PATH" },
      {
        name: "description",
        content:
          "Run focus and break cycles and log every completed focus block to your study time.",
      },
      { property: "og:title", content: "Pomodoro Timer | IT PATH" },
      {
        property: "og:description",
        content:
          "Focus and break cycles that automatically restart and add tracked minutes to your IT PATH study time.",
      },
    ],
  }),
  component: PomodoroPage,
});

type Phase = "focus" | "break";

function clock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function todayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function PomodoroPage() {
  const { user, actions, hydrated } = useAppState();
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [elapsedFocus, setElapsedFocus] = useState(0);
  const [completedBlocks, setCompletedBlocks] = useState(0);

  const phaseSeconds = (phase === "focus" ? focusMinutes : breakMinutes) * 60;

  const logMinutes = useCallback(
    (seconds: number) => {
      const minutes = Math.round(seconds / 60);
      if (minutes < 1) return 0;
      actions.addStudySession({
        id: crypto.randomUUID(),
        startedAt: new Date(Date.now() - seconds * 1000).toISOString(),
        minutes,
      });
      return minutes;
    },
    [actions],
  );

  const elapsedRef = useRef(elapsedFocus);
  elapsedRef.current = elapsedFocus;

  // Tick, then roll straight into the next phase when the timer runs out.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((current) => {
        if (current > 1) {
          if (phase === "focus") setElapsedFocus((value) => value + 1);
          return current - 1;
        }
        if (phase === "focus") {
          const total = elapsedRef.current + 1;
          const logged = logMinutes(total);
          setElapsedFocus(0);
          setCompletedBlocks((value) => value + 1);
          if (logged > 0) toast.success(`Focus block done. ${logged} minute(s) logged.`);
          setPhase("break");
          return breakMinutes * 60;
        }
        toast.message("Break over. Next focus block started.");
        setPhase("focus");
        return focusMinutes * 60;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, phase, focusMinutes, breakMinutes, logMinutes]);

  // Keep an idle timer in sync with the sliders.
  useEffect(() => {
    if (running) return;
    setRemaining((phase === "focus" ? focusMinutes : breakMinutes) * 60);
  }, [focusMinutes, breakMinutes, phase, running]);

  function stop() {
    const logged = phase === "focus" ? logMinutes(elapsedFocus) : 0;
    setRunning(false);
    setElapsedFocus(0);
    setPhase("focus");
    setRemaining(focusMinutes * 60);
    toast.success(
      logged > 0 ? `Stopped. ${logged} minute(s) added to your study time.` : "Timer stopped.",
    );
  }

  const todayMinutes = useMemo(() => {
    const key = todayKey(new Date());
    return user.studySessions
      .filter((session) => session.startedAt.slice(0, 10) === key)
      .reduce((sum, session) => sum + session.minutes, 0);
  }, [user.studySessions]);

  const progress = phaseSeconds > 0 ? 1 - remaining / phaseSeconds : 0;

  if (!hydrated) return <LearnerPageSkeleton rows={2} metrics={3} />;

  return (
    <div className="relative -mx-4 -my-4 min-h-[calc(100dvh-4rem)] overflow-hidden pb-12 text-white sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8">
      <div className="fixed inset-0 z-0 bg-[url('/images/meditation-background.png')] bg-cover bg-center bg-no-repeat" aria-hidden />
      <div className="absolute inset-0 bg-background/55" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/90" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="text-center drop-shadow-md">
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Pomodoro</h1>
          <p className="mt-2 text-sm text-white/75 sm:text-base">Focus in timed blocks. Get more done.</p>
        </header>

        <section className="mt-8 flex flex-col items-center">
          <div className="relative grid size-72 place-items-center rounded-full border border-white/25 bg-background/65 shadow-2xl backdrop-blur-xl sm:size-80">
            <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
              <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.min(100, Math.max(0, progress * 100))} className="text-primary transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none" />
            </svg>
            <div className="text-center">
              <Target className="mx-auto mb-3 size-5 text-primary" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">{phase === "focus" ? "Focus" : "Break"}</p>
              <p className="mt-2 font-display text-6xl font-semibold tabular-nums sm:text-7xl">{clock(remaining)}</p>
              <p className="mt-2 text-sm text-white/60">{running ? (phase === "focus" ? "Stay with it" : "Take a breather") : "Ready to focus"}</p>
            </div>
          </div>

          <div className="mt-5 flex items-start justify-center gap-5">
            <TimerControl label="Reset" onClick={() => {
              setRunning(false);
              setElapsedFocus(0);
              setPhase("focus");
              setRemaining(focusMinutes * 60);
            }}>
              <RotateCcw aria-hidden />
            </TimerControl>
            <TimerControl label={running ? "Pause" : "Start"} primary onClick={() => setRunning((value) => !value)}>
              {running ? <Pause aria-hidden /> : <Play aria-hidden />}
            </TimerControl>
            <TimerControl label="Stop & Log" onClick={stop}>
              <Square aria-hidden />
            </TimerControl>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-white/20 bg-background/45 py-4 shadow-xl backdrop-blur-xl">
          <FocusStat icon={Timer} value={`${todayMinutes}m`} label="Today" />
          <FocusStat icon={CheckSquare} value={completedBlocks} label="Blocks" />
          <FocusStat icon={Target} value={`${Math.floor(elapsedFocus / 60)}m`} label="Logged" />
        </section>

        <section className="mt-5 rounded-3xl border border-white/20 bg-background/45 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <SlidersHorizontal className="size-5 text-primary" aria-hidden />
            <div>
              <h2 className="font-display text-lg font-semibold">Session Setup</h2>
              <p className="text-xs text-white/55">Adjust your focus and break lengths.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DurationControl
              icon={Target}
              label="Focus Length"
              value={focusMinutes}
              min={5}
              max={90}
              step={5}
              onChange={setFocusMinutes}
            />
            <DurationControl
              icon={Coffee}
              label="Break Length"
              value={breakMinutes}
              min={1}
              max={30}
              step={1}
              onChange={setBreakMinutes}
            />
          </div>
        </section>
      </div>
    </div>
  );
}


function TimerControl({ label, onClick, primary = false, children }: { label: string; onClick: () => void; primary?: boolean; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <Button type="button" variant={primary ? "default" : "outline"} size="icon" onClick={onClick} className={cn("size-14 rounded-full backdrop-blur", !primary && "border-white/30 bg-background/50 text-white hover:bg-background/70 hover:text-white")}>
        {children}
      </Button>
      <p className="mt-1.5 max-w-20 text-xs text-white/70">{label}</p>
    </div>
  );
}

function FocusStat({ icon: Icon, value, label }: { icon: typeof Timer; value: string | number; label: string }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2 px-2">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-white/55">{label}</p>
      </div>
    </div>
  );
}

function DurationControl({ icon: Icon, label, value, min, max, step, onChange }: { icon: typeof Timer; label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" aria-hidden />
          <Label>{label}</Label>
        </div>
        <span className="font-mono text-sm font-semibold">{value} min</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onChange(next ?? value)} />
    </div>
  );
}
