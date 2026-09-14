import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { BetaAccessPanel } from "@/components/beta-access-panel";
import { PageHeader, Panel } from "@/components/page-kit";
import { ProfileNamePanel } from "@/components/profile-name-panel";

import { SystemDiagnostics } from "@/components/system-diagnostics";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { certifications } from "@/data/static-content";
import { formatStudyTime } from "@/lib/study-time";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/state/theme";
import type { ExperienceLevel, WeekDay } from "@/lib/app-data/types";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Settings — IT PATH" },
      { name: "description", content: "Set your study schedule, target role and run system checks." },
      { property: "og:title", content: "Settings — IT PATH" },
      { property: "og:description", content: "Configure your study plan and verify the app health." },
    ],
  }),
  component: SettingsPage,
});

const DAYS: { id: WeekDay; label: string }[] = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const EXPERIENCE: { id: ExperienceLevel; label: string }[] = [
  { id: "none", label: "Complete beginner" },
  { id: "beginner", label: "Some basics" },
  { id: "some", label: "Home lab experience" },
  { id: "intermediate", label: "Working in IT already" },
];

const JOBS = [
  "IT Support Specialist",
  "Helpdesk Technician",
  "Network Administrator",
  "Systems Administrator",
  "SOC Analyst",
  "Cybersecurity Analyst",
];

function SettingsPage() {
  const { user, updateSettings, resetAll, lastSavedAt, storageAvailable } = useAppState();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const s = user.settings;

  // Weekly study time is always derived: selected days x daily study time.
  function weeklyMinutes(dayCount: number, dailyMinutes: number): number {
    return Math.max(0, Math.round(dayCount * dailyMinutes));
  }
  const weeklyMins = weeklyMinutes(s.studyDays.length, s.sessionLengthMinutes);
  const weeklyHours = weeklyMins / 60;

  function toggleDay(day: WeekDay) {
    const next = s.studyDays.includes(day)
      ? s.studyDays.filter((d) => d !== day)
      : [...s.studyDays, day];
    updateSettings({
      studyDays: next,
      studyHoursPerWeek: weeklyMinutes(next.length, s.sessionLengthMinutes) / 60,
    });
  }

  function setDailyMinutes(minutes: number) {
    updateSettings({
      sessionLengthMinutes: minutes,
      studyHoursPerWeek: weeklyMinutes(s.studyDays.length, minutes) / 60,
    });
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your study plan. Changes save to this device the moment you make them."
      />

      <div className="mb-4">
        <ProfileNamePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">

        <Panel
          title="Appearance"
          description="Choose how IT PATH looks. Your choice is remembered on this device."
        >
          <div className="space-y-3">
            <Label htmlFor="theme-select">Theme</Label>
            <Select
              value={theme}
              onValueChange={(v) => setTheme(v as "dark" | "light" | "system")}
            >
              <SelectTrigger id="theme-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {theme === "system"
              ? `Following your system setting (${resolvedTheme === "light" ? "light" : "dark"} mode right now).`
              : `Currently using ${theme === "light" ? "light" : "dark"} mode.`}
          </p>
        </Panel>


        <Panel title="Study schedule">
          <div className="space-y-6">
            <div>
              <Label>Study days each week</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const active = s.studyDays.includes(d.id);
                  return (
                    <Button
                      key={d.id}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "secondary"}
                      aria-pressed={active}
                      onClick={() => toggleDay(d.id)}
                    >
                      {d.label}
                    </Button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {s.studyDays.length} {s.studyDays.length === 1 ? "day" : "days"} a week selected.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Daily study time</Label>
                <span className="text-sm tabular-nums text-primary">
                  {formatStudyTime(s.sessionLengthMinutes)}
                </span>
              </div>
              <Slider
                className="mt-3"
                min={15}
                max={480}
                step={15}
                value={[Math.min(480, Math.max(15, s.sessionLengthMinutes || 15))]}
                onValueChange={([v]) => setDailyMinutes(v ?? s.sessionLengthMinutes)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                From 15 minutes to 8 hours. This is the time your daily tasks aim for.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label>Your weekly study time</Label>
                <span className="text-sm tabular-nums text-primary">
                  {formatStudyTime(weeklyMins)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Calculated from {s.studyDays.length}{" "}
                {s.studyDays.length === 1 ? "day" : "days"} ×{" "}
                {formatStudyTime(s.sessionLengthMinutes)} a day.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {weeklyHours < 8
                  ? `Most IT certification guidance recommends 8–10 hours a week — you are ${formatStudyTime(Math.round((8 - weeklyHours) * 60))} below that. Add a day or extend your daily time to reach it.`
                  : weeklyHours <= 10
                    ? "This sits inside the recommended 8–10 hours a week for steady certification progress."
                    : "This is above the recommended 8–10 hours a week — ambitious, but watch out for burnout and keep your review sessions."}
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Daily reminder"
          description="One nudge a day, only if you have not met your daily study time yet."
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="reminder-toggle">Remind me to study</Label>
              <Switch
                id="reminder-toggle"
                checked={s.reminderEnabled === true}
                onCheckedChange={(checked) => {
                  updateSettings({ reminderEnabled: checked });
                  if (checked) {
                    try {
                      if (typeof Notification !== "undefined" && Notification.permission === "default") {
                        void Notification.requestPermission();
                      }
                    } catch {
                      /* notifications unavailable in this browser */
                    }
                    toast.success("Reminder on.");
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="reminder-time">Reminder time</Label>
              <Input
                id="reminder-time"
                type="time"
                className="mt-2 w-40"
                value={s.reminderTime ?? "18:00"}
                onChange={(event) => updateSettings({ reminderTime: event.target.value })}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Shown inside the app, and as a desktop notification if you allow them. It appears
                once a day at most.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Goals">
          <div className="space-y-5">
            <div>
              <Label>Experience level</Label>
              <Select
                value={s.experienceLevel}
                onValueChange={(v) => updateSettings({ experienceLevel: v as ExperienceLevel })}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target job</Label>
              <Select value={s.targetJob} onValueChange={(v) => updateSettings({ targetJob: v })}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOBS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Certification target</Label>
              <Select
                value={s.certificationTarget}
                onValueChange={(v) => updateSettings({ certificationTarget: v })}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {certifications.map((certification) => (
                    <SelectItem key={certification.id} value={certification.title}>
                      {certification.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                This becomes the main course shown across Learn, Practice, Labs, quizzes, and your study plan.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        className="mt-4"
        title="System diagnostics"
        description="Runs live checks against this browser session. Results are measured, not assumed."
      >
        <SystemDiagnostics />
      </Panel>

      <Panel className="mt-4" title="Your data">
        <p className="text-sm text-muted-foreground">
          Storage: {storageAvailable ? "available" : "unavailable in this browser"}
          {lastSavedAt ? ` · last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ""}
        </p>
        <Button
          className="mt-3"
          variant="destructive"
          onClick={() => {
            resetAll();
            toast.success("All local data reset.");
          }}
        >
          Reset all local data
        </Button>
      </Panel>

      <BetaAccessPanel />
    </>
  );
}
