import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/this-week")({
  head: () => ({
    meta: [
      { title: "This Week — IT PATH" },
      { name: "description", content: "Your weekly study target and logged study sessions." },
      { property: "og:title", content: "This Week — IT PATH" },
      { property: "og:description", content: "Plan and log your weekly IT study sessions." },
    ],
  }),
  component: ThisWeek,
});

const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function startOfWeek(): number {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function ThisWeek() {
  const { user, updateUser } = useAppState();
  const [minutes, setMinutes] = useState(String(user.settings.sessionLengthMinutes));

  const weekStart = startOfWeek();
  const weekSessions = user.studySessions.filter(
    (s) => new Date(s.startedAt).getTime() >= weekStart,
  );
  const loggedMinutes = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
  const targetMinutes = user.settings.studyHoursPerWeek * 60;

  function logSession() {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a session length in minutes.");
      return;
    }
    updateUser((current) => ({
      ...current,
      studySessions: [
        {
          id: crypto.randomUUID(),
          startedAt: new Date().toISOString(),
          minutes: Math.round(value),
        },
        ...current.studySessions,
      ],
    }));
    toast.success(`Logged ${Math.round(value)} minutes.`);
  }

  return (
    <>
      <PageHeader
        title="This Week"
        description="Your plan comes from Settings. Log each session so your progress stays honest."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Weekly target" value={`${user.settings.studyHoursPerWeek}h`} />
        <StatCard label="Logged this week" value={`${Math.round((loggedMinutes / 60) * 10) / 10}h`} />
        <StatCard
          label="Remaining"
          value={`${Math.max(0, Math.round(((targetMinutes - loggedMinutes) / 60) * 10) / 10)}h`}
        />
        <StatCard label="Sessions" value={weekSessions.length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Study days" description="Chosen in Settings.">
          <div className="flex flex-wrap gap-2">
            {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((d) => {
              const active = user.settings.studyDays.includes(d);
              return (
                <span
                  key={d}
                  className={
                    active
                      ? "rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary"
                      : "rounded-md bg-secondary px-3 py-1.5 text-sm text-muted-foreground"
                  }
                >
                  {DAY_LABELS[d]}
                </span>
              );
            })}
          </div>
        </Panel>

        <Panel title="Log a study session" description="Saved instantly to this device.">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grow">
              <Label htmlFor="minutes">Minutes</Label>
              <Input
                id="minutes"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={logSession}>Log session</Button>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Recent sessions">
        {user.studySessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No study sessions logged yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {user.studySessions.slice(0, 10).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  {new Date(s.startedAt).toLocaleString()}
                </span>
                <span className="tabular-nums">{s.minutes} min</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
