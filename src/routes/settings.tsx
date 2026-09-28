import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { ProfileNamePanel } from "@/components/profile-name-panel";
import { WelcomeSetup } from "@/components/onboarding/welcome-setup";
import { restartTour, setupPending } from "@/lib/onboarding";
import { formatStudyTime } from "@/lib/study-time";
import { useProfile } from "@/hooks/use-profile";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/state/theme";
import type { ExperienceLevel, WeekDay } from "@/lib/app-data/types";
import { certifications } from "@/data/static-content";
import { domain } from "@/domain/active";
import { experienceOptions } from "@/lib/experience-options";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Settings | IT PATH" },
      { name: "description", content: "Manage your profile, learning preferences, reminders and appearance." },
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


const LEARNING_FOCUS_NAMES: Record<string, string> = {
  "cert-comptia-tech-plus": "Technology Foundations",
  "cert-comptia-a-plus": "Computer Systems & Support",
  "cert-comptia-network-plus": "Networking & Infrastructure",
  "cert-comptia-security-plus": "Cybersecurity Foundations",
  "cert-comptia-linux-plus": "Linux Systems Administration",
  "cert-comptia-server-plus": "Server Administration",
  "cert-comptia-cloud-plus": "Cloud Infrastructure",
  "cert-comptia-cysa-plus": "Security Analysis & Defense",
  "cert-comptia-pentest-plus": "Offensive Security",
  "cert-comptia-security-x": "Advanced Security Engineering",
  "cert-cisco-ccna": "Network Engineering",
  "cert-isc2-cissp": "Security Architecture & Leadership",
};

function learningFocusName(id: string, fallback: string): string {
  return LEARNING_FOCUS_NAMES[id] ?? fallback
    .replace(/^CompTIA\s+/i, "")
    .replace(/^Cisco\s+/i, "")
    .replace(/^ISC2\s+/i, "");
}

function SettingsPage() {
  const { user, updateSettings } = useAppState();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { profile, uploadAvatar, uploading, isOwn } = useProfile();
  const s = user.settings;
  const EXPERIENCE = experienceOptions(domain.id);
  const [setupOnly, setSetupOnly] = useState(false);

  useEffect(() => setSetupOnly(setupPending()), []);

  const weeklyMins = Math.max(0, Math.round(s.studyDays.length * s.sessionLengthMinutes));

  function toggleDay(day: WeekDay) {
    const next = s.studyDays.includes(day)
      ? s.studyDays.filter((value) => value !== day)
      : [...s.studyDays, day];
    updateSettings({
      studyDays: next,
      studyHoursPerWeek: (next.length * s.sessionLengthMinutes) / 60,
    });
  }

  function setDailyMinutes(minutes: number) {
    updateSettings({
      sessionLengthMinutes: minutes,
      studyHoursPerWeek: (s.studyDays.length * minutes) / 60,
    });
  }

  if (setupOnly) {
    return (
      <>
        <PageHeader title="Quick setup" description="A few preferences before you begin." />
        <WelcomeSetup onFinished={() => setSetupOnly(false)} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your profile and learning preferences." />

      <div className="space-y-4">
        <Panel title="Profile">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="size-20 rounded-full object-cover" />
              ) : (
                <div className="grid size-20 place-items-center rounded-full bg-secondary text-2xl font-bold">
                  {(profile.displayName || profile.firstName || "?")[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <ProfileNamePanel />
              {isOwn ? (
                <div className="mt-3">
                  <Label htmlFor="profile-picture" className="sr-only">Profile picture</Label>
                  <Input
                    id="profile-picture"
                    className="max-w-sm"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        await uploadAvatar(file);
                        toast.success("Profile picture updated.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Picture did not save.");
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB</p>
                </div>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel title="Learning">
          <div className="space-y-6">
            <div>
              <Label htmlFor="learning-focus-select">Learning focus</Label>
              <Select
                value={s.certificationTarget}
                onValueChange={(value) => updateSettings({ certificationTarget: value })}
              >
                <SelectTrigger id="learning-focus-select" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {certifications.map((certification) => (
                    <SelectItem key={certification.id} value={certification.title}>
                      {learningFocusName(certification.id, certification.title)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Experience level</Label>
              <Select
                value={s.experienceLevel}
                onValueChange={(value) => updateSettings({ experienceLevel: value as ExperienceLevel })}
              >
                <SelectTrigger className="mt-2 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE.map((level) => (
                    <SelectItem key={level.id} value={level.id}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Study days</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const active = s.studyDays.includes(day.id);
                  return (
                    <Button
                      key={day.id}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "secondary"}
                      aria-pressed={active}
                      onClick={() => toggleDay(day.id)}
                    >
                      {day.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4">
                <Label>Daily study time</Label>
                <span className="text-sm tabular-nums text-primary">{formatStudyTime(s.sessionLengthMinutes)}</span>
              </div>
              <Slider
                className="mt-3"
                min={15}
                max={480}
                step={15}
                value={[Math.min(480, Math.max(15, s.sessionLengthMinutes || 15))]}
                onValueChange={([value]) => setDailyMinutes(value ?? s.sessionLengthMinutes)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                About {formatStudyTime(weeklyMins)} per week with your current schedule.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Reminders">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="reminder-toggle">Study reminder</Label>
              <p className="mt-1 text-xs text-muted-foreground">A daily nudge when you have not reached your study goal.</p>
            </div>
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
                    // Notifications are not available in every browser.
                  }
                }
              }}
            />
          </div>
          {s.reminderEnabled ? (
            <div className="mt-4 border-t border-border/60 pt-4">
              <Label htmlFor="reminder-time">Time</Label>
              <Input
                id="reminder-time"
                type="time"
                className="mt-2 w-40"
                value={s.reminderTime ?? "18:00"}
                onChange={(event) => updateSettings({ reminderTime: event.target.value })}
              />
            </div>
          ) : null}
        </Panel>

        <Panel title="Appearance">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="theme-select">Theme</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Currently using {resolvedTheme === "light" ? "light" : "dark"} mode.
              </p>
            </div>
            <Select value={theme} onValueChange={(value) => setTheme(value as "dark" | "light" | "system")}>
              <SelectTrigger id="theme-select" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Panel>

        <Panel title="Floating shortcuts">
          <div className="divide-y divide-border/60">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <Label htmlFor="gayl-bubble-toggle">GAYL bubble</Label>
                <p className="mt-1 text-xs text-muted-foreground">Show GAYL's floating companion button while you use the app.</p>
              </div>
              <Switch
                id="gayl-bubble-toggle"
                checked={s.showGaylBubble !== false}
                onCheckedChange={(checked) => updateSettings({ showGaylBubble: checked })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 pt-4">
              <div>
                <Label htmlFor="brain-bubble-toggle">Second Brain bubble</Label>
                <p className="mt-1 text-xs text-muted-foreground">Show the floating shortcut to your saved notes and material.</p>
              </div>
              <Switch
                id="brain-bubble-toggle"
                checked={s.showBrainBubble !== false}
                onCheckedChange={(checked) => updateSettings({ showBrainBubble: checked })}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Help">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                restartTour();
                toast.success("Tour restarted.");
                window.location.assign("/");
              }}
            >
              Replay guided tour
            </Button>
            {isOwn && profile.userId ? (
              <Button variant="outline" asChild>
                <Link to="/profile/$userId" params={{ userId: profile.userId }}>View my profile</Link>
              </Button>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
