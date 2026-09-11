import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  STUDY_DURATIONS,
  completeTask,
  finishPlan,
  formatDuration,
  generateStudyPlan,
  liveTrackedSeconds,
  pausePlan,
  resumePlan,
  skipTask,
  startPlan,
  studyTaskKindLabels,
} from "@/lib/study-engine";
import {
  WEEK_ASSESSMENT_PASS,
  WEEK_QUIZ_PASS,
  buildWeekBundle,
  getWeeks,
  type WeekBundle,
} from "@/lib/week-engine";
import type { StudyPlan } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/this-week")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "This Week — IT PATH" },
      {
        name: "description",
        content: "Work the weekly curriculum: reading, practice, lab, assignment, quiz, review and assessment.",
      },
      { property: "og:title", content: "This Week — IT PATH" },
      {
        property: "og:description",
        content: "A full study week built from your own IT PATH curriculum, plus a timed daily study session.",
      },
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

function durationLabel(minutes: number): string {
  return minutes >= 120 ? "2 hours" : `${minutes} min`;
}

function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
}

function ThisWeek() {
  const { user, actions } = useAppState();
  const [minutes, setMinutes] = useState(String(user.settings.sessionLengthMinutes));
  const [target, setTarget] = useState<number>(60);

  const weeks = getWeeks();
  const bundles = useMemo(() => weeks.map((week) => buildWeekBundle(user, week)), [user, weeks]);
  const firstOpen = bundles.find((bundle) => !bundle.complete) ?? bundles[0];
  const [weekId, setWeekId] = useState<string>(firstOpen?.week.id ?? "");
  const bundle = bundles.find((item) => item.week.id === weekId) ?? firstOpen;

  const activePlan: StudyPlan | undefined = user.studyPlans.find((plan) => plan.status !== "completed");
  useTicker(activePlan?.status === "active");

  const weekStart = startOfWeek();
  const weekSessions = user.studySessions.filter((s) => new Date(s.startedAt).getTime() >= weekStart);
  const loggedMinutes = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
  const targetMinutes = user.settings.studyHoursPerWeek * 60;

  function logSession() {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a session length in minutes.");
      return;
    }
    actions.addStudySession({
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      minutes: Math.round(value),
    });
    toast.success(`Logged ${Math.round(value)} minutes.`);
  }

  function generate() {
    const plan = generateStudyPlan(user, target);
    if (plan.tasks.length === 0) {
      toast.error("There is nothing to schedule yet. Open a topic first.");
      return;
    }
    actions.addStudyPlan(plan);
    toast.success(`Session built with ${plan.tasks.length} task(s).`);
  }

  function finish(plan: StudyPlan) {
    const { plan: done, session } = finishPlan(plan);
    actions.updateStudyPlan(done);
    if (session) {
      actions.addStudySession(session);
      toast.success(`Session finished. ${session.minutes} minute(s) logged.`);
    } else {
      toast.success("Session finished. No tracked time to log.");
    }
  }

  const completedPlans = user.studyPlans.filter((plan) => plan.status === "completed");

  return (
    <>
      <PageHeader
        title="This Week"
        description="Every week has objectives, reading, videos, official references, practice, a lab, an assignment, a quiz, spaced review and a graded assessment."
      />

      <div className="flex flex-wrap gap-2">
        {bundles.map((item) => (
          <Button
            key={item.week.id}
            type="button"
            variant={item.week.id === bundle?.week.id ? "default" : "secondary"}
            onClick={() => setWeekId(item.week.id)}
          >
            Week {item.week.week}
            {item.complete ? <CheckCircle2 className="size-4" /> : null}
          </Button>
        ))}
      </div>

      {bundle ? <WeekView bundle={bundle} /> : <EmptyState title="No curriculum weeks are defined yet." />}

      <PageHeader
        className="mt-10"
        title="Daily study session"
        description="Build a session from your own data, work it, and log the time you actually spend."
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

      <Panel
        className="mt-6"
        title="Today's study session"
        description="Tasks are chosen from due reviews, weak topics, prerequisites, your current week, open work and recent mistakes."
      >
        {!activePlan ? (
          <div className="space-y-4">
            <div>
              <Label>Session length</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {STUDY_DURATIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={target === option ? "default" : "secondary"}
                    onClick={() => setTarget(option)}
                  >
                    {durationLabel(option)}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={generate}>Generate session</Button>
          </div>
        ) : (
          <ActivePlan plan={activePlan} onUpdate={actions.updateStudyPlan} onFinish={() => finish(activePlan)} />
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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

      <Panel className="mt-4" title="Finished sessions">
        {completedPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No generated sessions finished yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {completedPlans.slice(0, 8).map((plan) => {
              const done = plan.tasks.filter((t) => t.status === "completed").length;
              const skipped = plan.tasks.filter((t) => t.status === "skipped").length;
              return (
                <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-muted-foreground">
                    {new Date(plan.completedAt ?? plan.createdAt).toLocaleString()} ·{" "}
                    {durationLabel(plan.targetMinutes)} plan
                  </span>
                  <span className="tabular-nums">
                    {formatDuration(plan.trackedSeconds)} tracked · {done} done · {skipped} skipped
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel className="mt-4" title="Recent logged time">
        {user.studySessions.length === 0 ? (
          <EmptyState title="No study sessions logged yet." body="Finish a session or log minutes manually." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {user.studySessions.slice(0, 10).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  {new Date(s.startedAt).toLocaleString()}
                  {s.studyPlanId ? " · generated session" : ""}
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

function CheckRow({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function WeekView({ bundle }: { bundle: WeekBundle }) {
  const { week } = bundle;
  return (
    <div className="mt-6 space-y-4">
      <Panel
        title={`Year ${week.year} · Month ${week.month} · Week ${week.week}: ${week.title}`}
        description={week.summary}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Requirements met"
            value={`${bundle.completedRequirements}/${bundle.requirements.length}`}
          />
          <StatCard label="Week status" value={bundle.complete ? "Complete" : "In progress"} />
          <StatCard label="Performance" value={bundle.overall === null ? "—" : `${bundle.overall}%`} />
          <StatCard label="Reviews due" value={bundle.reviewDue} />
        </div>
        <Progress
          className="mt-4"
          value={(bundle.completedRequirements / Math.max(1, bundle.requirements.length)) * 100}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          A week is complete only when its actual required activities are complete. Nothing is marked from opening a
          page.
        </p>
      </Panel>

      <Panel title="Learning objectives">
        <div className="space-y-4">
          {bundle.objectives.map(({ topic, objectives }) => (
            <div key={topic.id}>
              <p className="text-sm font-medium">{topic.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Reading" description="The full lesson for each topic in this week.">
          <div className="space-y-3">
            {bundle.reading.map((item) => (
              <CheckRow key={item.id} done={Boolean(item.done)}>
                <Link
                  to="/topics/$topicId"
                  params={item.params as { topicId: string }}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </CheckRow>
            ))}
          </div>
        </Panel>

        <Panel title="Practice" description="Recall and the topic practice activity.">
          <div className="space-y-3">
            {bundle.practice.map((item) => (
              <CheckRow key={item.id} done={Boolean(item.done)}>
                <Link
                  to="/topics/$topicId"
                  params={item.params as { topicId: string }}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </CheckRow>
            ))}
          </div>
        </Panel>

        <Panel title="Videos" description="Verified free video training from the Resources library.">
          <ul className="space-y-3 text-sm">
            {bundle.videos.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                >
                  {resource.title} <ExternalLink className="size-3.5" />
                </a>
                <p className="text-muted-foreground">{resource.provider}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Official references">
          <ul className="space-y-3 text-sm">
            {bundle.references.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                >
                  {resource.title} <ExternalLink className="size-3.5" />
                </a>
                <p className="text-muted-foreground">
                  {resource.provider} · {resource.access === "free" ? "Free" : "Paid"}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Lab" description="Guided practical work for this week.">
          {bundle.labs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab is attached to this week's topics.</p>
          ) : (
            <div className="space-y-3">
              {bundle.labs.map((lab) => (
                <div key={lab.id}>
                  <p className="text-sm font-medium">{lab.title}</p>
                  <p className="text-sm text-muted-foreground">{lab.objective}</p>
                </div>
              ))}
              <Button asChild size="sm" variant="secondary">
                <Link to="/labs">Open Labs</Link>
              </Button>
            </div>
          )}
        </Panel>

        <Panel title="Assignment" description="Written and applied work for this week.">
          {bundle.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignment is attached to this week's topics.</p>
          ) : (
            <div className="space-y-3">
              {bundle.assignments.map((assignment) => (
                <div key={assignment.id}>
                  <p className="text-sm font-medium">{assignment.title}</p>
                  <p className="text-sm text-muted-foreground">{assignment.prompt}</p>
                </div>
              ))}
              <Button asChild size="sm" variant="secondary">
                <Link to="/assignments">Open Assignments</Link>
              </Button>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Spaced review"
        description="Reviews scheduled for this week's topics by the review engine."
      >
        <p className="text-sm text-muted-foreground">
          {bundle.reviewScheduled === 0
            ? "Nothing is scheduled yet. Reviews appear once mistakes or weak topics are recorded."
            : `${bundle.reviewDue} due now of ${bundle.reviewScheduled} scheduled.`}
        </p>
        <Button asChild className="mt-4" size="sm" variant="secondary">
          <Link to="/review">Open Review</Link>
        </Button>
      </Panel>

      {bundle.quiz ? (
        <Panel
          title={`Weekly quiz (${bundle.questionCount} questions)`}
          description={`Practice quiz across this week's topics. ${WEEK_QUIZ_PASS}% or higher counts towards week completion.`}
        >
          <QuizRunner quiz={bundle.quiz} startLabel="Start week quiz" passScore={WEEK_QUIZ_PASS} />
        </Panel>
      ) : null}

      {bundle.assessment ? (
        <Panel
          title="Weekly assessment"
          description={`The graded assessment for the week, run by the same quiz engine. Pass mark ${WEEK_ASSESSMENT_PASS}%.`}
        >
          <QuizRunner quiz={bundle.assessment} startLabel="Start assessment" passScore={WEEK_ASSESSMENT_PASS} />
        </Panel>
      ) : null}

      <Panel title="Week completion" description="Each requirement is measured from your recorded activity.">
        <div className="space-y-3">
          {bundle.requirements.map((requirement) => (
            <CheckRow key={requirement.id} done={requirement.done}>
              <p className="text-sm font-medium">{requirement.label}</p>
              <p className="text-sm text-muted-foreground">{requirement.detail}</p>
              <Badge className="mt-1" variant="outline">
                {requirement.evidence}
              </Badge>
            </CheckRow>
          ))}
        </div>
      </Panel>

      <Panel title="Weekly performance" description="Calculated from real attempts only.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {bundle.performance.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value === null ? "—" : `${item.value}%`} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ActivePlan({
  plan,
  onUpdate,
  onFinish,
}: {
  plan: StudyPlan;
  onUpdate: (plan: StudyPlan) => void;
  onFinish: () => void;
}) {
  const tracked = liveTrackedSeconds(plan);
  const plannedMinutes = plan.tasks.reduce((sum, task) => sum + task.plannedMinutes, 0);
  const remaining = plan.tasks.filter((task) => task.status === "pending" || task.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-secondary px-3 py-1.5 text-sm text-muted-foreground">
          {durationLabel(plan.targetMinutes)} plan · {plannedMinutes} min scheduled
        </span>
        <span className="rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium tabular-nums text-primary">
          {formatDuration(tracked)} tracked
        </span>
        <span className="text-sm capitalize text-muted-foreground">{plan.status}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {plan.status === "planned" ? (
          <Button onClick={() => onUpdate(startPlan(plan))} disabled={remaining.length === 0}>
            Start
          </Button>
        ) : null}
        {plan.status === "active" ? (
          <Button variant="secondary" onClick={() => onUpdate(pausePlan(plan))}>
            Pause
          </Button>
        ) : null}
        {plan.status === "paused" ? <Button onClick={() => onUpdate(resumePlan(plan))}>Resume</Button> : null}
        <Button variant="secondary" onClick={onFinish}>
          Finish session
        </Button>
      </div>

      <ul className="space-y-3">
        {plan.tasks.map((task, index) => {
          const isActive = task.status === "active";
          return (
            <li
              key={task.id}
              className={
                isActive
                  ? "rounded-lg border border-primary/40 bg-primary/5 p-4"
                  : "rounded-lg border border-border bg-card p-4"
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {index + 1}. {studyTaskKindLabels[task.kind]}
                </span>
                <span className="text-xs text-muted-foreground">{task.plannedMinutes} min</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatDuration(task.trackedSeconds)} tracked
                </span>
                <span className="text-xs capitalize text-muted-foreground">{task.status}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{task.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">Why: {task.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to={task.to as never} {...(task.params ? { params: task.params as never } : {})}>
                    Open
                  </Link>
                </Button>
                {task.status === "pending" || task.status === "active" ? (
                  <>
                    <Button size="sm" onClick={() => onUpdate(completeTask(plan, task.id))}>
                      Complete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onUpdate(skipTask(plan, task.id))}>
                      Skip
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
