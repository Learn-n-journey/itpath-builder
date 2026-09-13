import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/pomodoro")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Pomodoro Timer — IT PATH" },
      {
        name: "description",
        content:
          "Run focus and break cycles and log every completed focus block to your study time.",
      },
      { property: "og:title", content: "Pomodoro Timer — IT PATH" },
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
  const { user, actions } = useAppState();
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

  return (
    <>
      <PageHeader
        title="Pomodoro timer"
        description="Focus in timed blocks. Finished focus time is added to your study time, and the next block starts on its own."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Today" value={`${todayMinutes} min`} hint="Logged study time" icon={Timer} />
        <StatCard label="Blocks this session" value={completedBlocks} hint="Completed focus blocks" />
        <StatCard
          label="Current block"
          value={`${Math.floor(elapsedFocus / 60)} min`}
          hint="Unlogged focus time"
        />
      </div>

      <Panel className="mb-6">
        <div className="flex flex-col items-center gap-5 py-4">
          <span className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {phase === "focus" ? "Focus" : "Break"}
          </span>
          <span className="font-display text-6xl font-semibold tabular-nums sm:text-7xl">
            {clock(remaining)}
          </span>
          <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => setRunning((value) => !value)}>
              {running ? "Pause" : "Start"}
            </Button>
            <Button variant="outline" onClick={stop}>
              Stop and log
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Block lengths" description="Adjust between blocks. Changes apply to the next timer.">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label className="mb-3 block">Focus: {focusMinutes} min</Label>
            <Slider
              value={[focusMinutes]}
              min={5}
              max={90}
              step={5}
              onValueChange={([value]) => setFocusMinutes(value ?? 25)}
            />
          </div>
          <div>
            <Label className="mb-3 block">Break: {breakMinutes} min</Label>
            <Slider
              value={[breakMinutes]}
              min={1}
              max={30}
              step={1}
              onValueChange={([value]) => setBreakMinutes(value ?? 5)}
            />
          </div>
        </div>
      </Panel>
    </>
  );
}
