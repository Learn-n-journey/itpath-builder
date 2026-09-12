import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { SystemDiagnostics } from "@/components/system-diagnostics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { HOURS_PER_STUDY_DAY, recommendedWeeklyHours } from "@/lib/study-pace";
import { useAppState } from "@/state/app-state";
import type { Difficulty, ExperienceLevel, WeekDay } from "@/lib/app-data/types";

export const Route = createFileRoute("/settings")({
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

const DIFFICULTY: { id: Difficulty; label: string }[] = [
  { id: "gentle", label: "Gentle" },
  { id: "standard", label: "Standard" },
  { id: "challenging", label: "Challenging" },
];

const CERTS = [
  "CompTIA ITF+",
  "CompTIA A+",
  "CompTIA Network+",
  "CompTIA Security+",
  "CompTIA CySA+",
  "Cisco CCNA",
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
  const s = user.settings;

  const recommendedHours = recommendedWeeklyHours(s.studyDays.length);

  function toggleDay(day: WeekDay) {
    const next = s.studyDays.includes(day)
      ? s.studyDays.filter((d) => d !== day)
      : [...s.studyDays, day];
    // Keep hours following the recommendation unless the learner set their own number.
    const following = s.studyHoursPerWeek === recommendedWeeklyHours(s.studyDays.length);
    updateSettings({
      studyDays: next,
      ...(following ? { studyHoursPerWeek: recommendedWeeklyHours(next.length) } : {}),
    });
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your study plan. Changes save to this device the moment you make them."
      />

      <div className="grid gap-4 lg:grid-cols-2">
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
                {s.studyDays.length} days a week · recommended{" "}
                <span className="text-primary">{recommendedHours}h a week</span> ({HOURS_PER_STUDY_DAY}h a
                day on average).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Study hours per week</Label>
                <span className="text-sm tabular-nums text-primary">{s.studyHoursPerWeek}h</span>
              </div>
              <Slider
                className="mt-3"
                min={1}
                max={40}
                step={1}
                value={[s.studyHoursPerWeek]}
                onValueChange={([v]) => updateSettings({ studyHoursPerWeek: v ?? s.studyHoursPerWeek })}
              />
              {s.studyHoursPerWeek !== recommendedHours ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => updateSettings({ studyHoursPerWeek: recommendedHours })}
                >
                  Use recommended {recommendedHours}h
                </Button>
              ) : null}
            </div>


            <div>
              <Label htmlFor="session-length">Session length (minutes)</Label>
              <Input
                id="session-length"
                className="mt-1.5"
                inputMode="numeric"
                value={String(s.sessionLengthMinutes)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  updateSettings({
                    sessionLengthMinutes: Number.isFinite(v) && v > 0 ? Math.round(v) : 0,
                  });
                }}
              />
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
                  {CERTS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIFFICULTY.map((d) => (
                  <Button
                    key={d.id}
                    type="button"
                    size="sm"
                    variant={s.difficulty === d.id ? "default" : "secondary"}
                    aria-pressed={s.difficulty === d.id}
                    onClick={() => updateSettings({ difficulty: d.id })}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
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
    </>
  );
}
