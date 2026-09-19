import { useCallback, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Award,
  Brain,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flame,
  FlaskConical,
  HelpCircle,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  Target,
  Wrench,
} from "lucide-react";

import { NextActionCard } from "@/components/next-action-card";
import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { ReadinessPanel } from "@/components/readiness-panel";
import { StreakPanel } from "@/components/streak-panel";
import { Button } from "@/components/ui/button";
import { computeDashboard } from "@/lib/dashboard-engine";
import { adaptivePath } from "@/lib/adaptive-path";
import { certificationStatusLabels } from "@/lib/certification-engine";
import type { CertificationStatus } from "@/lib/app-data/types";
import { missedQuestionAnchor, missedQuestions } from "@/lib/missed-questions";
import { nextActions, type NextAction } from "@/lib/next-action";
import { dismissNextAction, visibleNextActions } from "@/lib/next-action-dismissals";
import { clearReviewTopic, visibleReviewTopics } from "@/lib/review-dismissals";
import { buildReadinessReport } from "@/lib/readiness-engine";
import { resumeTarget, type ResumeTarget } from "@/lib/resume";
import { greetingFor } from "@/lib/greeting";
import { currentJourneyTopic, journeyIndexFor } from "@/lib/journey-order";
import { masteryGate } from "@/lib/mastery-gate";
import { overallMeasures } from "@/lib/mastery-summary";
import { useProfile } from "@/hooks/use-profile";
import { useAppState } from "@/state/app-state";


export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dashboard | IT PATH" },
      {
        name: "description",
        content:
          "Your IT PATH dashboard: overall progress, today's tasks, study time, streak and readiness.",
      },
      { property: "og:title", content: "Dashboard | IT PATH" },
      {
        property: "og:description",
        content: "Every number is calculated from your own recorded study activity.",
      },
    ],
  }),
  component: Dashboard,
});

function Meter({ value }: { value: number }) {
  return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden>
      <div className="h-full rounded-full bg-progress transition-[width] duration-700 ease-out" style={{ width: `${value}%` }} />
    </div>
  );
}

function ProgressOverview({
  progress,
  topicsComplete,
  topicsTotal,
  recommendation,
  hasActivity,
}: {
  progress: number;
  topicsComplete: number;
  topicsTotal: number;
  recommendation: string;
  hasActivity: boolean;
}) {
  const segments = 10;
  const activeSegments = Math.round((progress / 100) * segments);

  return (
    <section className="panel dashboard-summary motion-surface mb-5 p-6 sm:p-8 lg:min-h-64">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emphasis">
            <Activity className="size-3.5" aria-hidden />
            Learning path
          </div>
          <p className="mt-4 font-display text-3xl font-semibold tabular-nums sm:text-4xl">
            {progress === 0 && hasActivity ? "Under 1% complete" : `${progress}% complete`}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Next: {recommendation}</p>
        </div>
        <div className="relative flex size-20 shrink-0 items-center justify-center sm:size-24" aria-label={`${progress}% overall progress`}>
          <svg className="size-20 -rotate-90 sm:size-24" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-secondary)" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="var(--color-progress)"
              strokeWidth="5"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${progress} 100`}
            />
          </svg>
          <span className="absolute font-mono text-sm font-semibold tabular-nums">{progress}%</span>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-10 gap-1.5" aria-hidden>
        {Array.from({ length: segments }, (_, index) => (
          <span
            key={index}
            className={index < activeSegments ? "h-1.5 rounded-sm bg-progress" : "h-1.5 rounded-sm bg-secondary"}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{topicsComplete} of {topicsTotal} topics mastered</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="size-1.5 bg-emphasis" aria-hidden /> Evidence based
        </span>
      </div>
    </section>
  );
}

/** One tappable chip in the today strip. */
function TodayChip({
  to,
  params,
  icon,
  label,
  detail,
}: {
  to: string;
  params?: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
}) {
  const Icon = icon;
  return (
    <Link
      to={to}
      {...(params ? { params: params as never } : {})}
      className="motion-surface pressable flex min-w-[10rem] max-w-[15rem] shrink-0 items-center gap-2.5 rounded-md border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-primary/50"
    >
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </Link>
  );
}

/** What is owed today: due reviews, a delayed check, the next topic, open mistakes. */
function TodayStrip({ chips }: { chips: React.ReactNode[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="What is owed today">
      {chips}
    </div>
  );
}

function MeterRow({ label, value, suffix = "%" }: { label: string; value: number; suffix?: string }) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
        <p className="truncate text-sm">{label}</p>
        <span className="text-xs font-semibold tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-1">
        <Meter value={value} />
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, hydrated } = useAppState();
  const { firstName } = useProfile();
  const d = useMemo(() => computeDashboard(user), [user]);
  const measures = useMemo(() => overallMeasures(user), [user]);

  const path = useMemo(() => adaptivePath(user), [user]);
  const [dismissedVersion, setDismissedVersion] = useState(0);
  const actions = useMemo(
    () => visibleNextActions(nextActions(user)),
    [user, dismissedVersion],
  );
  const dismissAction = useCallback((action: NextAction) => {
    dismissNextAction(action);
    setDismissedVersion((v) => v + 1);
  }, []);
  const reviewTopics = useMemo(
    () => visibleReviewTopics(d.topicsNeedingReview),
    [d.topicsNeedingReview, dismissedVersion],
  );
  const markReviewDone = useCallback((row: { topicId: string; reason: string }) => {
    clearReviewTopic(row);
    setDismissedVersion((v) => v + 1);
  }, []);
  const readiness = useMemo(() => buildReadinessReport(user, path.certification), [user, path.certification]);
  const resume = useMemo(() => (d.hasAnyActivity ? resumeTarget(user) : null), [user, d.hasAnyActivity]);
  const missedAnchors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of missedQuestions(user)) {
      if (!map[item.mistake.topicId]) map[item.mistake.topicId] = missedQuestionAnchor(item);
    }
    return map;
  }, [user]);
  const todayChips = useMemo(() => {
    const chips: React.ReactNode[] = [];
    if (reviewTopics.length > 0) {
      chips.push(
        <TodayChip
          key="review"
          to="/review"
          icon={Clock}
          label={`${reviewTopics.length} ${reviewTopics.length === 1 ? "topic" : "topics"} due for review`}
          detail="Spaced review is scheduled"
        />,
      );
    }
    const journeyTopic = currentJourneyTopic(user);
    if (journeyTopic) {
      const gate = masteryGate(user, journeyTopic.id);
      if (gate.delayed.scheduled && gate.delayed.due) {
        chips.push(
          <TodayChip
            key="delayed"
            to="/mastery-check/$topicId"
            params={{ topicId: journeyTopic.id }}
            icon={ShieldAlert}
            label="Delayed check due"
            detail={journeyTopic.title}
          />,
        );
      } else if (!gate.met) {
        chips.push(
          <TodayChip
            key="next"
            to="/topics/$topicId"
            params={{ topicId: journeyTopic.id }}
            icon={Target}
            label="Next on the path"
            detail={journeyTopic.title}
          />,
        );
      }
    }
    const weakCount = missedQuestions(user).length;
    if (weakCount > 0) {
      chips.push(
        <TodayChip
          key="weak"
          to="/weak-areas"
          icon={Wrench}
          label={`${weakCount} ${weakCount === 1 ? "question" : "questions"} to clean up`}
          detail="Missed answers worth another look"
        />,
      );
    }
    return chips;
  }, [user, reviewTopics]);

  return (
    <>
      <div className="flex items-start gap-4">
        <img
          src="/icons/icon-256.png"
          alt="IT PATH logo, a mountain path with circuit traces"
          className="h-14 w-14 shrink-0 rounded-lg border border-border shadow-lg sm:h-16 sm:w-16"
        />
        <div className="min-w-0 flex-1">
          <PageHeader
            title={firstName ? greetingFor(firstName) : "Dashboard"}
            description={`Certification focus: ${user.settings.certificationTarget}.`}
            actions={
              <Button asChild className="mt-12">
                <Link to="/study-plan">Open study plan</Link>
              </Button>
            }
          />
        </div>

      </div>

      {d.hasAnyActivity ? <TodayStrip chips={todayChips} /> : null}

      {resume ? (
        <Panel className="mb-5" title="Pick up where you left off">
          <Link
            to={resume.to}
            {...(resume.params ? { params: resume.params as never } : {})}
            {...(resume.search ? { search: resume.search as never } : {})}
            className="group flex items-center gap-3 rounded-md border border-border bg-secondary/30 p-4 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/45 active:translate-y-px"
          >
            <PlayCircle className="size-8 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{resume.label}</span>
              <span className="block truncate text-sm text-muted-foreground">{resume.detail}</span>
            </span>
            <span className="hidden shrink-0 text-sm font-medium text-primary sm:block">Resume</span>
          </Link>
        </Panel>
      ) : null}

      <ProgressOverview
        progress={measures.learningProgress}
        hasActivity={d.hasAnyActivity}
        topicsComplete={d.masteredTopics}
        topicsTotal={d.topicsTotal}
        recommendation={path.recommendedTopic?.title ?? "Choose a topic in Learn"}
      />

      {!d.hasAnyActivity ? (
        <Panel
          className="mb-4"
          title="Start here"
          description="Every figure below reads zero until you log some work. Three steps will change that."
        >
          <ol className="space-y-3 text-sm">
            <li>
              <span className="font-medium">1. Confirm your goal.</span>{" "}
              <span className="text-muted-foreground">
                Your certification target, experience level and session length shape everything else.
              </span>
            </li>
            <li>
              <span className="font-medium">2. Study your first topic.</span>{" "}
              <span className="text-muted-foreground">
                {path.recommendedTopic
                  ? `${path.recommendedTopic.title}, ${path.reason}.`
                  : "Pick any topic in Learn."}
              </span>
            </li>
            <li>
              <span className="font-medium">3. Prove it.</span>{" "}
              <span className="text-muted-foreground">
                Run the lab, take a quiz, and your scores start moving.
              </span>
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {path.recommendedTopic ? (
              <Button asChild size="sm">
                <Link to="/topics/$topicId" params={{ topicId: path.recommendedTopic.id }}>
                  Start learning
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="secondary">
              <Link to="/settings">Check my goal</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/guide">How IT PATH works</Link>
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          <NextActionCard className="lg:col-span-2" actions={actions} onDismiss={dismissAction} />
          <ReadinessPanel report={readiness} />
          <StreakPanel />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Learning progress"
          value={`${measures.learningProgress}%`}
          icon={Target}
          hint={`${measures.activitiesCompleted} of ${measures.activitiesTotal} activities done`}
        />
        <StatCard
          label="Current goal"
          value={
            d.certificationReadiness[0] ? `${d.certificationReadiness[0].overall}%` : "0%"
          }
          icon={Award}
          hint={d.certificationReadiness[0]?.title ?? "No certification progress yet"}
        />
        <StatCard
          label="Study time"
          value={`${d.studyHoursTotal}h`}
          icon={Clock}
          hint={`${d.studyMinutesToday} min logged today`}
        />
        <StatCard
          label="Streak"
          value={`${d.streakDays} day${d.streakDays === 1 ? "" : "s"}`}
          icon={Flame}
          hint={d.streakDays === 0 ? "Log a session to start it" : "Consecutive study days"}
        />
        <StatCard
          label="Quiz average"
          value={`${d.quizAverage}%`}
          icon={HelpCircle}
          hint={`${d.quizAttempts} submitted attempt${d.quizAttempts === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Practice"
          value={`${d.assignmentsCompleted}/${d.assignmentsTotal}`}
          icon={ClipboardList}
        />
        <StatCard label="Labs" value={`${d.labsCompleted}/${d.labsTotal}`} icon={FlaskConical} />
        <StatCard
          label="Mastered topics"
          value={`${d.masteredTopics}/${d.topicsTotal}`}
          icon={CheckCircle2}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel
          title="Today's tasks"
          description={
            hydrated
              ? "Built from your open work, due reviews and study target."
              : "Loading your saved data…"
          }
        >
          {d.todaysTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing outstanding today. Your target is met and no reviews are due.
            </p>
          ) : (
            <ul className="space-y-2">
              {d.todaysTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to={task.to}
                    params={task.params as never}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5 hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{task.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {task.detail}
                      </span>
                    </span>
                    <span className="text-xs text-primary">Open</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Where you stand"
          description="Two numbers: how much of the work you have done, and how well the final assessments went."
        >
          <div className="space-y-3">
            <MeterRow label="Learning progress" value={measures.learningProgress} />
            <MeterRow label="Overall mastery" value={measures.overallMastery} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {measures.activitiesCompleted} of {measures.activitiesTotal} activities done ·{" "}
            {measures.assessmentsTaken} of {measures.assessmentsTotal} final assessments taken
          </p>
        </Panel>

        <Panel title="Topics to come back to" description="Each line says why it is here: a review that is due, an open mistake, or a low score.">
          {reviewTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {d.topicsNeedingReview.length === 0
                ? "Nothing flagged for review yet."
                : "All cleared for now. Anything new will show up here."}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {reviewTopics.map((item) => (
                <li
                  key={item.topicId}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3"
                >
                  <Link
                    to="/review"
                    {...(missedAnchors[item.topicId]
                      ? { hash: missedAnchors[item.topicId] as string }
                      : {})}
                    className="truncate hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.reason}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => markReviewDone(item)}
                    aria-label={`Mark ${item.title} as done`}
                  >
                    <Check className="size-3.5" aria-hidden /> Done
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/review">
                <RotateCcw className="size-4" aria-hidden /> Open Review
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/quiz-me">
                <Brain className="size-4" aria-hidden /> Quiz me
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel title="Certification readiness" description="Top four, calculated from your evidence.">
          <ul className="space-y-3">
            {d.certificationReadiness.map((cert) => (
              <li key={cert.id}>
                <MeterRow label={cert.title} value={cert.overall} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {certificationStatusLabels[cert.status as CertificationStatus]}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button asChild variant="secondary" size="sm">
              <Link to="/certifications">
                <Award className="size-4" aria-hidden /> All certifications
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel
          title="Career readiness"
          description="Weighted from recorded skills evidence across all activities."
          className="lg:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.careerReadiness.map((track) => (
              <MeterRow key={track.track} label={track.label} value={track.score} />
            ))}
          </div>
          <div className="mt-4">
            <Button asChild variant="secondary" size="sm">
              <Link to="/career-skills">
                <Wrench className="size-4" aria-hidden /> Career skills detail
              </Link>
            </Button>
          </div>
        </Panel>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Every figure here is calculated from work you have recorded.{" "}
        <Link to="/guide" className="text-primary hover:underline">
          See how the scores are worked out
        </Link>
        .
      </p>
    </>
  );
}
