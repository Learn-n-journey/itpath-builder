import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BetaAccessPanel } from "@/components/beta-access-panel";
import { PageHeader, Panel } from "@/components/page-kit";
import { ProfileNamePanel } from "@/components/profile-name-panel";
import { WelcomeSetup } from "@/components/onboarding/welcome-setup";
import { restartTour, setupPending } from "@/lib/onboarding";
import { SiteEngagementPanel } from "@/components/site-engagement-panel";
import { LearningPathsPanel } from "@/components/learning-paths-panel";


import { SystemDiagnostics } from "@/components/system-diagnostics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import {
  clearSyncLock,
  syncNow,
  syncStatus,
  type SyncRunStatus,
} from "@/lib/sheet-sync.functions";
import { setMaintenance } from "@/lib/maintenance.functions";
import { loadMaintenanceState } from "@/lib/maintenance-state";
import { loadOwnerQuestions } from "@/lib/owner-question-store";
import { loadOwnerLessons } from "@/lib/owner-lesson-store";
import { loadOwnerWork } from "@/lib/owner-work-store";
import { formatStudyTime } from "@/lib/study-time";
import { useAuth } from "@/state/auth-state";
import { useAppState } from "@/state/app-state";
import { activeDomainKey, domainOptions, setDomainOverride } from "@/lib/active-domain";
import { ACTIVE_PACKAGE } from "@/domain/registry";
import { useTheme } from "@/state/theme";
import type { ExperienceLevel, WeekDay } from "@/lib/app-data/types";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Settings | IT PATH" },
      { name: "description", content: "Set your study schedule, target role and run system checks." },
      { property: "og:title", content: "Settings | IT PATH" },
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

const ACTIVE_PACKAGE_KEY = ACTIVE_PACKAGE;

const EXPERIENCE: { id: ExperienceLevel; label: string }[] = [
  { id: "none", label: "Complete beginner" },
  { id: "beginner", label: "Some basics" },
  { id: "some", label: "Home lab experience" },
  { id: "intermediate", label: "Working in IT already" },
];


function SpreadsheetSyncPanel() {
  const runSyncNow = useServerFn(syncNow);
  const runClearLock = useServerFn(clearSyncLock);
  const readStatus = useServerFn(syncStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [live, setLive] = useState<SyncRunStatus | null>(null);
  const finishedRef = useRef<string | null>(null);

  const describe = useCallback((run: SyncRunStatus): string => {
    const summary = run.result;
    if (run.status === "queued") return "Waiting to start — it runs on the server, so you can close the app.";
    if (run.status === "running") return "Running on the server now. You can close the app; it keeps going.";
    if (run.status === "failed") return `Failed: ${run.error ?? "the sync did not finish."}`;
    if (!summary) return "Finished.";
    if (summary.skipped) return `Skipped: ${summary.skipped}`;
    const held = (summary.lessonIssues ?? [])
      .map((item) => `${item.file} (${item.topic}): ${item.reasons.join("; ")}`)
      .join("\n");
    return (
      `Finished ${run.finishedAt ? new Date(run.finishedAt).toLocaleTimeString() : ""} — ` +
      `${summary.topics} topic${summary.topics === 1 ? "" : "s"} · ` +
      `${summary.approved} questions in, ${summary.rejected} rejected · ` +
      `${summary.lessonsApproved} lesson${summary.lessonsApproved === 1 ? "" : "s"} published, ` +
      `${summary.lessonsRejected} with notes · ` +
      `${summary.workTopics} try-it/lab topic${summary.workTopics === 1 ? "" : "s"}` +
      (summary.unchangedFiles
        ? ` · ${summary.unchangedFiles} unchanged workbook${summary.unchangedFiles === 1 ? "" : "s"} skipped`
        : "") +
      (held ? `\nPublished with notes:\n${held}` : "")
    );
  }, []);

  const refresh = useCallback(async () => {
    try {
      const status = await readStatus({});
      const run = status.runs[0];
      if (!run) return;
      setLive(run);
      setLastRun(describe(run));
      const settled = run.status === "done" || run.status === "failed";
      if (settled && finishedRef.current !== run.id) {
        finishedRef.current = run.id;
        await Promise.all([loadOwnerQuestions(), loadOwnerLessons(), loadOwnerWork()]);
      }
    } catch {
      /* status is only informational */
    }
  }, [describe, readStatus]);

  // Picks the run back up whenever the page is opened again, and keeps the
  // line fresh while one is in flight.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (live?.status !== "queued" && live?.status !== "running") return;
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [live?.status, refresh]);

  async function handleClearLock() {
    setBusy("clear");
    try {
      const result = await runClearLock({});
      if (!result.ok) {
        toast.error(result.error ?? "Could not clear it.");
        return;
      }
      toast.success("Cleared. You can start a sync again now.");
      setLive(null);
      setLastRun("Stuck sync cleared — try syncing again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear it.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSync(
    scope: "it-cybersecurity" | "auto-repair" | "all",
    label: string,
    force = false,
  ) {
    setBusy(force ? `${scope}-force` : scope);
    try {
      const result = await runSyncNow({ data: { scope, force } });
      if (!result.ok) {
        toast.error(result.error ?? "The sync could not be started.");
        setLastRun(`Failed: ${result.error ?? "The sync could not be started."}`);
        return;
      }
      toast.success(`${label} sync started — it runs on the server, so you can close the app.`);
      setLastRun("Waiting to start — it runs on the server, so you can close the app.");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The sync could not be started.";
      toast.error(message);
      setLastRun(`Failed: ${message}`);
    } finally {
      setBusy(null);
    }
  }

  const inFlight = live?.status === "queued" || live?.status === "running";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => handleSync("it-cybersecurity", "IT PATH")} disabled={busy !== null || inFlight}>
          Sync IT PATH
        </Button>
        <Button onClick={() => handleSync("auto-repair", "AUTO PATH")} disabled={busy !== null || inFlight}>
          Sync AUTO PATH
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSync("all", "Both courses")}
          disabled={busy !== null || inFlight}
        >
          Sync everything
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSync("all", "Full re-read", true)}
          disabled={busy !== null || inFlight}
        >
          Re-read everything
        </Button>
        <Button variant="outline" onClick={handleClearLock} disabled={busy === "clear"}>
          {busy === "clear" ? "Clearing…" : "Clear stuck sync"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        A sync runs on the server, so it finishes even if you close the app or your screen turns off. It only opens
        workbooks that changed since last time, so it is much quicker; use “Re-read everything” to pull every
        workbook again. It may take a minute to start. If one seems stuck, use “Clear stuck sync”, then start it again.
      </p>
      <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
        {lastRun ??
          "Reads the “it path” and “auto path” folders in OneDrive, each with its lessons, try it, quiz and labs sub-folders. The nightly pull happens on its own."}
      </p>
    </div>
  );
}

function MaintenancePanel() {
  const toggle = useServerFn(setMaintenance);
  const [state, setState] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void loadMaintenanceState().then(setState);
  }, []);

  async function flip(domainId: "it-cybersecurity" | "auto-repair", label: string) {
    const next = !state[domainId];
    setBusy(domainId);
    try {
      const result = await toggle({ data: { domain: domainId, enabled: next } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setState(result.state);
      toast.success(next ? `${label} is now under maintenance.` : `${label} is open again.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not save.");
    } finally {
      setBusy(null);
    }
  }

  const courses: { id: "it-cybersecurity" | "auto-repair"; label: string }[] = [
    { id: "it-cybersecurity", label: "IT PATH" },
    { id: "auto-repair", label: "AUTO PATH" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {courses.map((course) => (
        <Button
          key={course.id}
          variant={state[course.id] ? "destructive" : "secondary"}
          disabled={busy !== null}
          onClick={() => flip(course.id, course.label)}
        >
          {state[course.id]
            ? `${course.label}: maintenance on`
            : `${course.label}: maintenance off`}
        </Button>
      ))}
    </div>
  );
}

function SettingsPage() {
  const { user, updateSettings, resetAll, lastSavedAt, storageAvailable } = useAppState();
  const [subjectKey, setSubjectKey] = useState<string>(ACTIVE_PACKAGE_KEY);
  const [subjectReady, setSubjectReady] = useState(false);
  useEffect(() => {
    setSubjectKey(activeDomainKey());
    setSubjectReady(true);
  }, []);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { email } = useAuth();
  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
  const s = user.settings;

  // While onboarding setup is pending, show only the quick setup screen.
  const [setupOnly, setSetupOnly] = useState(false);
  useEffect(() => {
    setSetupOnly(setupPending());
  }, []);

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

  if (setupOnly) {
    return (
      <>
        <PageHeader
          title="Quick setup"
          description="A few preferences before you begin. Everything can be changed here later."
        />
        <WelcomeSetup onFinished={() => setSetupOnly(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your study plan. Changes save to this device the moment you make them."
      />

      <WelcomeSetup />

      <div className="mb-4">
        <ProfileNamePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">

        {isOwner ? (
        <Panel
          title="Subject"
          description="Choose what you are learning. The app reloads to switch courses. Your progress in each subject is kept separately."
        >
          <Label htmlFor="subject-select">Course</Label>
          <Select value={subjectKey} onValueChange={setSubjectKey}>
            <SelectTrigger id="subject-select" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domainOptions().map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subjectReady && subjectKey !== activeDomainKey() ? (
            <Button
              className="mt-3"
              onClick={() => {
                setDomainOverride(subjectKey);
                toast.success("Subject switched.");
                window.location.assign("/");
              }}
            >
              Switch course
            </Button>
          ) : null}
        </Panel>
        ) : null}

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
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {`Currently using ${resolvedTheme === "light" ? "light" : "dark"} mode. IT PATH opens in dark mode everywhere unless you pick light here.`}
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
                Learn at your own pace. There is no schedule to keep up with, this only shapes how your daily plan is built.
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

      {isOwner ? (
        <Panel
          className="mt-4"
          title="Spreadsheet content"
          description="Your numbered question and lesson spreadsheets are pulled in automatically every night. Use these to bring in changes right away."
        >
          <SpreadsheetSyncPanel />
        </Panel>
      ) : null}

      {isOwner ? <LearningPathsPanel /> : null}

      {isOwner ? (
        <Panel
          className="mt-4"
          title="Maintenance screen"
          description="Close a course while you work on it. Visitors see a short maintenance notice instead; you always keep full access."
        >
          <MaintenancePanel />
        </Panel>
      ) : null}

      {isOwner ? (
        <Panel
          className="mt-4"
          title="System diagnostics"
          description="Runs live checks against this browser session. Results are measured, not assumed."
        >
          <SystemDiagnostics />
        </Panel>
      ) : null}

      <Panel className="mt-4" title="Your data">
        <p className="text-sm text-muted-foreground">
          Storage: {storageAvailable ? "available" : "unavailable in this browser"}
          {lastSavedAt ? ` · last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : ""}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="mt-3" variant="destructive">
              Reset all local data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset everything?</AlertDialogTitle>
              <AlertDialogDescription>
                This would reset everything: your progress, quiz results, recall answers,
                notes, Second Brain entries, streaks and all saved activity in this
                browser. It cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my data</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetAll();
                  toast.success("All local data reset.");
                }}
              >
                Yes, reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Panel>

      <Panel
        className="mt-4"
        title="Guided tour"
        description="Replay the short walkthrough of the main features."
      >
        <Button
          variant="secondary"
          onClick={() => {
            restartTour();
            toast.success("Tour restarted.");
            window.location.assign("/");
          }}
        >
          Replay the tour
        </Button>
      </Panel>

      <SiteEngagementPanel />

      <BetaAccessPanel />
    </>
  );
}
