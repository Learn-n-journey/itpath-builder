import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  Pencil,
  Cpu,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { StudyDurationPicker } from "@/components/study/study-duration-picker";
import { HelpTip } from "@/components/help-tip";
import { LearnerPageSkeleton, PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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
import { streakSummary } from "@/lib/streak-engine";
import type { StudyPlan, StudyTaskKind } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study-plan")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Study Plan | IT PATH" },
      {
        name: "description",
        content: "Build a timed daily study session drawn from due reviews, weak topics, new material and open work.",
      },
      { property: "og:title", content: "Study Plan | IT PATH" },
      {
        property: "og:description",
        content: "Generate a focused study session from your own IT PATH progress and log the time you spend.",
      },
    ],
  }),
  component: StudyPlanPage,
});

/** Deep-links a task to the exact lab, practice task or quiz it refers to. */
function taskSearch(task: StudyPlan["tasks"][number]): Record<string, string> | undefined {
  if (task.labId) return { lab: task.labId };
  if (task.assignmentId) return { assignment: task.assignmentId };
  if (task.quizId) return { quiz: task.quizId };
  return undefined;
}

function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
}

const previewGroups: Array<{
  title: string;
  detail: string;
  kinds: StudyTaskKind[];
  icon: typeof BookOpen;
  tone: string;
  iconTone: string;
  stepTone: string;
}> = [
  { title: "Learn", detail: "New or incomplete topics", kinds: ["new_material", "weak_topic"], icon: BookOpen, tone: "border-feature-blue/35 bg-feature-blue/10", iconTone: "bg-feature-blue/15 text-feature-blue", stepTone: "border-feature-blue/50 text-feature-blue" },
  { title: "Practice", detail: "Hands-on labs or scenarios", kinds: ["lab", "assignment"], icon: Cpu, tone: "border-feature-amber/35 bg-feature-amber/10", iconTone: "bg-feature-amber/15 text-feature-amber", stepTone: "border-feature-amber/50 text-feature-amber" },
  { title: "Review", detail: "Reinforce and check mastery", kinds: ["review", "quiz"], icon: TrendingUp, tone: "border-feature-green/35 bg-feature-green/10", iconTone: "bg-feature-green/15 text-feature-green", stepTone: "border-feature-green/50 text-feature-green" },
];

function StudyPlanPage() {
  const { user, actions, hydrated } = useAppState();
  const [minutes, setMinutes] = useState(String(user.settings.sessionLengthMinutes));
  const [target, setTarget] = useState<number>(user.settings.sessionLengthMinutes);
  const [logOpen, setLogOpen] = useState(false);
  const [finishedOpen, setFinishedOpen] = useState(true);

  const activePlan: StudyPlan | undefined = user.studyPlans.find((plan) => plan.status !== "completed");
  useTicker(activePlan?.status === "active");

  const completedPlans = user.studyPlans.filter((plan) => plan.status === "completed");
  const weekMinutes = streakSummary(user).minutesLast7;
  const previewPlan = useMemo(() => activePlan ?? generateStudyPlan(user, target), [activePlan, target, user]);
  const previewKinds = useMemo(() => new Set(previewPlan.tasks.map((task) => task.kind)), [previewPlan]);

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
    actions.addStudyPlan(startPlan(plan));
    toast.success(`Session started with ${plan.tasks.length} task(s). Time is tracking now.`);
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

  if (!hydrated) return <LearnerPageSkeleton rows={4} metrics={4} />;

  return (
    <div className="relative -mx-3 -my-4 min-h-screen overflow-hidden pb-16 sm:-mx-5 sm:-my-6 lg:-mx-8 lg:-my-8">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/ChatGPT Image Sep 24, 2026, 04_42_52 PM.png')" }}
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-4xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-5 border-b border-border pb-5">
        <PageHeader title="Study Plan" description="Build a focused study session from your own data." />
      </div>

      <div className="glass-surface grid grid-cols-4 divide-x divide-border/40 overflow-hidden rounded-2xl border border-border/70 py-4">
        <StudyStat icon={Clock3} value={`${target}m`} label="Today" />
        <StudyStat icon={CalendarDays} value={formatHours(weekMinutes)} label="This week" />
        <StudyStat icon={BarChart2} value={user.studySessions.length} label="Sessions" />
        <StudyStat icon={Trophy} value={completedPlans.length} label="Finished" />
      </div>

      <section className="glass-surface mt-6 rounded-3xl border border-border/70 p-4 shadow-sm sm:p-6">
        {!activePlan ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Build your session</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <h2 className="font-display text-xl font-semibold text-foreground">How much time do you have?</h2>
                  <HelpTip label="About session length">Scroll to choose how much time you have. The study plan will fill this time with the best mix of lessons, practice, and review based on your progress.</HelpTip>
                </div>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                <Clock3 className="size-5" aria-hidden />
              </span>
            </div>

            <StudyDurationPicker value={target} onChange={setTarget} className="mx-auto max-w-xl" />
            <p className="-mt-1 text-center text-xs text-muted-foreground">Drag or swipe to adjust in 5-minute steps</p>

            <Button className="h-14 w-full rounded-2xl text-sm font-semibold shadow-lg shadow-primary/10 sm:text-base" onClick={generate}>
              <Sparkles className="size-4" aria-hidden />
              <span>Generate {target}-minute session</span>
              <ArrowRight className="size-4" aria-hidden />
            </Button>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Session mix</p><h2 className="font-display text-base font-semibold">What you’ll work on</h2></div>
                <HelpTip label="About session contents">This preview comes from the activities currently selected for your generated session.</HelpTip>
              </div>
              <div className="mx-auto grid w-full max-w-md grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 pb-4 pt-1 sm:gap-2">
                {previewGroups.map((group, index) => {
                  const Icon = group.icon;
                  const included = group.kinds.some((kind) => previewKinds.has(kind));
                  return (
                    <div key={group.title} className="contents">
                      <div
                        className={cn(
                          "relative flex min-h-20 w-full min-w-0 flex-col items-center justify-center rounded-2xl border px-1.5 pb-3 pt-2.5 text-center sm:min-h-24 sm:px-2.5 sm:pb-4 sm:pt-3",
                          included ? cn(group.tone, "shadow-sm") : "border-border/70 bg-card/60 opacity-55",
                        )}
                      >
                        <span className={cn("flex size-6 items-center justify-center rounded-md", included ? group.iconTone : "bg-secondary/50 text-muted-foreground")}>
                          <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
                        </span>
                        <p className="mt-1.5 text-xs font-semibold text-foreground">{group.title}</p>
                        <HelpTip label={`About ${group.title}`}>{group.detail}</HelpTip>
                        <span className={cn("absolute -bottom-2.5 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border bg-background text-[10px] font-bold shadow-sm", included ? group.stepTone : "border-border text-muted-foreground")}>
                          {index + 1}
                        </span>
                      </div>
                      {index < previewGroups.length - 1 ? <ArrowRight className="mx-0 size-3 shrink-0 text-muted-foreground/40 sm:mx-1 sm:size-3.5" aria-hidden /> : null}
                    </div>
                  );
                })}
              </div>
              {previewPlan.tasks.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Open a topic to give the study planner material to schedule.</p>
              ) : null}
            </div>
          </div>
        ) : (
          <ActivePlan plan={activePlan} onUpdate={actions.updateStudyPlan} onFinish={() => finish(activePlan)} />
        )}
      </section>

      <section className="glass-surface mt-5 overflow-hidden rounded-2xl border border-border/70 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          onClick={() => setLogOpen((open) => !open)}
          aria-expanded={logOpen}
        >
          <span className="flex items-center gap-3 font-semibold"><Pencil className="size-5 text-muted-foreground" aria-hidden />Log time manually</span>
          <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", logOpen && "rotate-180")} aria-hidden />
        </button>
        {logOpen ? (
          <div className="border-t border-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grow">
                <Label htmlFor="minutes">Minutes</Label>
                <Input id="minutes" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1.5" />
              </div>
              <Button onClick={logSession}>Log session</Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="glass-surface mt-4 overflow-hidden rounded-2xl border border-border/70 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          onClick={() => setFinishedOpen((open) => !open)}
          aria-expanded={finishedOpen}
        >
          <span className="flex items-center gap-3 font-semibold"><Trophy className="size-5 text-muted-foreground" aria-hidden />Finished sessions</span>
          <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", finishedOpen && "rotate-180")} aria-hidden />
        </button>
        {finishedOpen ? (
          <div className="border-t border-border p-4">
            {completedPlans.length === 0 ? (
              <div className="py-5 text-center">
                <Trophy className="mx-auto size-5 text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm font-semibold">No finished sessions</p>
                <p className="mt-1 text-xs text-muted-foreground">Your completed study plans will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {completedPlans.slice(0, 8).map((plan) => {
                  const done = plan.tasks.filter((task) => task.status === "completed").length;
                  const skipped = plan.tasks.filter((task) => task.status === "skipped").length;
                  return (
                    <li key={plan.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-muted-foreground">{new Date(plan.completedAt ?? plan.createdAt).toLocaleString()}</span>
                      <span className="tabular-nums">{formatDuration(plan.trackedSeconds)} tracked · {done} done · {skipped} skipped</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </section>
      </div>
    </div>  );
}

function StudyStat({ icon: Icon, value, label }: { icon: typeof Clock3; value: string | number; label: string }) {
  return (
    <div className="min-w-0 px-1 text-center sm:px-4">
      <Icon className="mx-auto mb-1.5 size-4 text-primary" aria-hidden />
      <div className="truncate text-xl font-bold tabular-nums text-foreground sm:text-2xl">{value}</div>
      <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</div>
    </div>
  );
}

function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
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
  const remaining = plan.tasks.filter((task) => task.status === "pending" || task.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-secondary px-3 py-1.5 text-sm text-muted-foreground">{plan.tasks.length} tasks planned</span>
        <span className="rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium tabular-nums text-primary">{formatDuration(tracked)} tracked</span>
        <span className="text-sm capitalize text-muted-foreground">{plan.status}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {plan.status === "planned" ? <Button onClick={() => onUpdate(startPlan(plan))} disabled={remaining.length === 0}>Start</Button> : null}
        {plan.status === "active" ? <Button variant="secondary" onClick={() => onUpdate(pausePlan(plan))}>Pause</Button> : null}
        {plan.status === "paused" ? <Button onClick={() => onUpdate(resumePlan(plan))}>Resume</Button> : null}
        <Button variant="secondary" onClick={onFinish}>Finish session</Button>
      </div>

      <ul className="space-y-3">
        {plan.tasks.map((task, index) => {
          const isActive = task.status === "active";
          return (
            <li key={task.id} className={isActive ? "border-l-2 border-primary bg-primary/5 px-3 py-3" : "border-l-2 border-border px-3 py-3"}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{index + 1}. {studyTaskKindLabels[task.kind]}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{formatDuration(task.trackedSeconds)} tracked</span>
                <span className="text-xs capitalize text-muted-foreground">{task.status}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{task.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{task.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">Why: {task.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to={task.to as never} {...(task.params ? { params: task.params as never } : {})} {...(taskSearch(task) ? { search: taskSearch(task) as never } : {})}>Open</Link>
                </Button>
                {task.status === "pending" || task.status === "active" ? (
                  <>
                    <Button size="sm" onClick={() => onUpdate(completeTask(plan, task.id))}>Complete</Button>
                    <Button size="sm" variant="ghost" onClick={() => onUpdate(skipTask(plan, task.id))}>Skip</Button>
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
