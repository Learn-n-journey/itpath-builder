import { Link } from "@tanstack/react-router";
import { Flame, Snowflake } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import {
  DAYS_PER_FREEZE,
  MAX_FREEZES,
  freezesAvailable,
  freezesEarned,
  protectableToday,
  repairableYesterday,
  spendFreeze,
} from "@/lib/streak-freeze";
import { streakSummary } from "@/lib/streak-engine";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";

const SNAPSHOT_KEY = "itpath.streak.snapshot";

/** Daily goal, current run and the last seven days, all from logged sessions. */
export function StreakPanel() {
  const { user, updateSettings } = useAppState();
  const summary = useMemo(() => streakSummary(user), [user]);
  const available = freezesAvailable(user);
  const protect = useMemo(() => protectableToday(user), [user]);
  const repair = useMemo(() => repairableYesterday(user), [user]);
  const percent = summary.goalMinutes > 0
    ? Math.min(100, Math.round((summary.todayMinutes / summary.goalMinutes) * 100))
    : 0;

  // Keep a small honest snapshot on the device so the sign-in screen can show
  // the streak after signing out, without pretending anyone is signed in.
  useEffect(() => {
    if (summary.current <= 0) return;
    try {
      const now = new Date();
      window.localStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({
          current: summary.current,
          longest: summary.longest,
          savedAt: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`,
        }),
      );
    } catch {
      /* storage is optional here */
    }
  }, [summary.current, summary.longest]);

  function useFreeze(dayKey: string, label: string) {
    const patch = spendFreeze(user, dayKey);
    if (!patch) return;
    updateSettings(patch);
    toast.success(`Streak protected with a freeze for ${label}.`);
  }

  return (
    <Panel
      title="Study streak"
      description={
        summary.hasData
          ? `${summary.activeDaysLast28} of the last 28 days had recorded study.`
          : "Log a focus session and your streak starts today."
      }
    >
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-xl",
              summary.current > 0 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
            )}
          >
            <Flame className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold tabular-nums">{summary.current}</p>
            <p className="text-xs text-muted-foreground">
              day{summary.current === 1 ? "" : "s"} in a row · best {summary.longest}
            </p>
          </div>
        </div>
        <div className="min-w-[9rem] flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm">Today's goal</p>
            <span className="text-xs font-semibold tabular-nums">
              {summary.todayMinutes}/{summary.goalMinutes} min
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-secondary" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.goalMet
              ? "Goal met for today."
              : summary.plannedToday
                ? "Today is one of your planned study days."
                : "Not a planned study day, anything you log still counts."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {summary.week.map((day) => (
          <div key={day.date} className="text-center">
            <div
              className={cn(
                "flex h-9 items-center justify-center rounded-lg border text-[11px] font-semibold tabular-nums",
                day.met
                  ? "border-primary/40 bg-primary/20 text-primary"
                  : day.minutes > 0
                    ? "border-border bg-secondary text-foreground"
                    : "border-dashed border-border text-muted-foreground",
              )}
              title={`${day.date}: ${day.frozen ? "protected by a freeze" : `${day.minutes} min`}`}
            >
              {day.frozen ? <Snowflake className="size-3.5" aria-hidden /> : day.minutes > 0 ? day.minutes : "-"}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{day.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Snowflake className="size-4 text-primary" aria-hidden />
            {available} of {MAX_FREEZES} freezes banked
          </p>
          <p className="text-xs text-muted-foreground">
            A freeze keeps the streak alive on a day you could not study. Every {DAYS_PER_FREEZE} days in a row
            banks one{freezesEarned(user) > 0 ? ` (${freezesEarned(user)} earned so far)` : ""}.
          </p>
        </div>
        {protect || repair ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {protect ? (
              <Button size="sm" variant="secondary" onClick={() => useFreeze(protect.dayKey, protect.label)}>
                <Snowflake /> Protect today
              </Button>
            ) : null}
            {repair ? (
              <Button size="sm" variant="ghost" onClick={() => useFreeze(repair.dayKey, repair.label)}>
                <Snowflake /> Repair yesterday
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link to="/pomodoro">Start a focus session</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/settings">Change daily goal</Link>
        </Button>
      </div>
    </Panel>
  );
}
