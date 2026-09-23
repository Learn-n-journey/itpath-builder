import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, Clock, Flame, PlayCircle, SlidersHorizontal, Wrench } from "lucide-react";

import { NextActionCard } from "@/components/next-action-card";
import { LearnerPageSkeleton, Panel, StatCard } from "@/components/page-kit";
import { ReadinessPanel } from "@/components/readiness-panel";
import { StreakPanel } from "@/components/streak-panel";
import { Button } from "@/components/ui/button";
import { computeDashboard } from "@/lib/dashboard-engine";
import { adaptivePath } from "@/lib/adaptive-path";
import { missedQuestionAnchor, missedQuestions } from "@/lib/missed-questions";
import { nextActions, type NextAction } from "@/lib/next-action";
import { dismissNextAction, visibleNextActions } from "@/lib/next-action-dismissals";
import { clearReviewTopic, visibleReviewTopics } from "@/lib/review-dismissals";
import { buildReadinessReport } from "@/lib/readiness-engine";
import { resumeTarget} from "@/lib/resume";
import { currentJourneyTopic } from "@/lib/journey-order";
import { overallMeasures } from "@/lib/mastery-summary";
import { useAppState } from "@/state/app-state";
import itPathArtwork from "@/assets/path-it.jpg";
import autoPathArtwork from "@/assets/path-auto.jpg";
import { activeDomainKey } from "@/domain/active";


export const Route = createFileRoute("/dashboard")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dashboard | Your Learning Path" },
      {
        name: "description",
        content:
          "Your learning dashboard: overall progress, today's tasks, study time, streak and readiness.",
      },
      { property: "og:title", content: "Dashboard | Your Learning Path" },
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
      className="flex min-w-[10rem] max-w-[15rem] shrink-0 items-center gap-2.5 rounded-md bg-secondary/50 px-3 py-2 hover:bg-secondary"
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

  // The subject choice lives in browser storage, so the matching course art
  // is selected as soon as the dashboard hydrates.
  const [courseArtwork, setCourseArtwork] = useState({ src: itPathArtwork, alt: "A blue-lit desktop computer" });
  useEffect(() => {
    if (activeDomainKey.split("@")[0] === "auto-repair") {
      setCourseArtwork({ src: autoPathArtwork, alt: "A detailed automotive engine" });
    }
  }, []);

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
  const quizCount = user.quizAttempts.filter((a) => a.status === "submitted").length;
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
          detail="Missed questions and weak topics"
        />,
      );
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

  const journeyTopic = currentJourneyTopic(user);
  const courseTopicIndex = journeyTopic ? Math.max(0, path.topics.findIndex((topic) => topic.id === journeyTopic.id)) : 0;
  const currentStage = journeyTopic?.difficulty === "challenging" ? "Advanced" : journeyTopic?.difficulty === "standard" ? "Core" : "Foundation";
  const primary: { to: string; params?: Record<string, string>; search?: unknown; title: string; detail: string } | null =
    resume
      ? { to: resume.to, ...(resume.params ? { params: resume.params as Record<string, string> } : {}), ...(resume.search ? { search: resume.search } : {}), title: resume.label, detail: resume.detail }
      : journeyTopic
        ? { to: "/topics/$topicId", params: { topicId: journeyTopic.id }, title: journeyTopic.title, detail: "Next on your path" }
        : path.recommendedTopic
          ? { to: "/topics/$topicId", params: { topicId: path.recommendedTopic.id }, title: path.recommendedTopic.title, detail: "Recommended next" }
          : null;

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={4} />;

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <header className="mb-5 grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <Link to="/settings" className="inline-flex max-w-full items-center gap-1 font-display text-lg font-semibold hover:text-primary">
            <span className="truncate">{path.certification.title}</span>
            <ChevronDown className="size-4 shrink-0 text-primary" aria-hidden />
          </Link>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {currentStage} · {d.masteredTopics} of {d.topicsTotal} topics
          </p>
        </div>
        <div className="relative grid size-[3.75rem] place-items-center rounded-full border-4 border-secondary" aria-label={`${d.overallProgress}% overall progress`}>
          <span className="font-display text-base font-semibold tabular-nums">{d.overallProgress}%</span>
        </div>
      </header>

      <section aria-labelledby="continue-heading" className="relative overflow-hidden border-b border-border pb-6">
        <div className="relative z-10 max-w-[72%] sm:max-w-[68%]">
          <h1 className="text-base font-medium">
            {d.hasAnyActivity ? "Continue learning" : "Start learning"}
          </h1>
        </div>
        {primary ? (
          <>
            <div className="relative z-10 mt-3 max-w-[72%] sm:max-w-[68%]">
              <p className="text-sm text-muted-foreground">{primary.detail}</p>
              <h2 id="continue-heading" className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">{primary.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {path.certification.title} · Section {Math.min(courseTopicIndex + 1, path.topics.length)} of {path.topics.length}
              </p>
            </div>
            <img
              src={courseArtwork.src}
              alt={courseArtwork.alt}
              className="pointer-events-none absolute -right-10 top-6 h-44 w-48 object-cover object-right opacity-90 [mask-image:linear-gradient(to_right,transparent,black_35%)] sm:right-0 sm:h-48 sm:w-64"
            />
            <div className="relative z-10 mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:max-w-xl">
              <Button asChild size="lg" className="w-full">
                <Link
                  to={primary.to}
                  {...(primary.params ? { params: primary.params as never } : {})}
                  {...(primary.search ? { search: primary.search as never } : {})}
                >
                  <PlayCircle className="size-4" aria-hidden /> Continue
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-4">
                <Link to="/study-plan"><BookOpen className="size-4 text-primary" aria-hidden /><span className="hidden xs:inline">Study plan</span></Link>
              </Button>
            </div>
          </>
        ) : (
          <Button asChild className="mt-3">
            <Link to="/learn">Choose a topic</Link>
          </Button>
        )}
        {d.hasAnyActivity && (actions.length > 0 || todayChips.length > 0) ? (
          <details className="group relative z-10 mt-3">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              Other suggestions ({actions.length + todayChips.length})
              <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="mt-3 space-y-3">
              <TodayStrip chips={todayChips} />
              <NextActionCard actions={actions} onDismiss={dismissAction} />
            </div>
          </details>
        ) : null}
        {!d.hasAnyActivity ? (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-border/60 pt-3 text-sm">
            <Link to="/settings" className="text-muted-foreground hover:text-foreground">Check my goal</Link>
            <Link to="/guide" className="text-muted-foreground hover:text-foreground">How IT PATH works</Link>
          </div>
        ) : null}
      </section>

      <section className="border-b border-border py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h2 className="font-display text-xl font-semibold">Your progress</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {d.masteredTopics} of {d.topicsTotal} topics mastered
          </span>
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Meter value={measures.learningProgress} />
          <span className="text-sm font-semibold tabular-nums">{measures.learningProgress}%</span>
        </div>
        <div className="mt-5 grid grid-cols-4 divide-x divide-border">
          {d.certificationReadiness[0] ? (
            <div className="min-w-0 pr-2"><SlidersHorizontal className="mb-2 size-5 text-primary" aria-hidden /><p className="text-xs text-muted-foreground">{d.certificationReadiness[0].title} readiness</p><p className="mt-1 font-display text-lg font-semibold tabular-nums">{d.certificationReadiness[0].overall}%</p></div>
          ) : null}
          <div className="min-w-0 px-2"><BarChart3 className="mb-2 size-5 text-primary" aria-hidden /><p className="text-xs text-muted-foreground">Quiz average</p><p className="mt-1 font-display text-lg font-semibold tabular-nums">{quizCount > 0 ? `${d.quizAverage}%` : "—"}</p><p className="text-[0.625rem] leading-tight text-muted-foreground sm:text-[0.6875rem]">{quizCount > 0 ? `${quizCount} completed` : "No quizzes yet"}</p></div>
          <div className="min-w-0 px-2"><Clock className="mb-2 size-5 text-primary" aria-hidden /><p className="text-xs text-muted-foreground">Study time</p><p className="mt-1 font-display text-lg font-semibold tabular-nums">{d.studyMinutesTotal < 60 ? `${d.studyMinutesTotal} min` : `${d.studyHoursTotal}h`}</p></div>
          <div className="min-w-0 pl-2"><Flame className="mb-2 size-5 text-primary" aria-hidden /><p className="text-xs text-muted-foreground">Streak</p><p className="mt-1 font-display text-lg font-semibold">{d.streakDays > 0 ? `${d.streakDays}d` : "—"}</p><p className="text-[0.625rem] leading-tight text-muted-foreground sm:text-[0.6875rem]">{d.streakDays > 0 ? `${d.streakDays === 1 ? "day" : "days"} active` : "No streak yet"}</p></div>
        </div>
        <details className="mt-1">
          <summary className="cursor-pointer list-none py-2 text-sm text-primary hover:underline [&::-webkit-details-marker]:hidden">
            View progress details →
          </summary>
          <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
            <StatCard label="Practice" value={`${d.assignmentsCompleted}/${d.assignmentsTotal}`} />
            <StatCard label="Labs" value={`${d.labsCompleted}/${d.labsTotal}`} />
            <StatCard label="Activities" value={`${measures.activitiesCompleted}/${measures.activitiesTotal}`} />
            <StatCard label="Final assessments" value={`${measures.assessmentsTaken}/${measures.assessmentsTotal}`} />
          </div>
          {d.hasAnyActivity ? (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <ReadinessPanel report={readiness} />
              <StreakPanel />
            </div>
          ) : null}
        </details>
      </section>

      <div>
        <Panel title="Due for review" className="border-t-0 py-5">
          {reviewTopics.length === 0 ? (
            <div className="flex items-start gap-4 text-muted-foreground"><CalendarDays className="mt-0.5 size-6 shrink-0" aria-hidden /><div><p className="text-sm text-foreground/85">Nothing due right now.</p><p className="mt-0.5 text-sm">We’ll show topics here as they become due.</p></div></div>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {reviewTopics.map((item) => (
                <li key={item.topicId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                  <Link
                    to="/review"
                    {...(missedAnchors[item.topicId] ? { hash: missedAnchors[item.topicId] as string } : {})}
                    className="min-w-0"
                  >
                    <span className="block truncate hover:underline">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.reason}</span>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 px-2 text-xs"
                    onClick={() => markReviewDone(item)}
                    aria-label={`Mark ${item.title} as done`}
                  >
                    <Check className="size-3.5" aria-hidden /> Done
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {reviewTopics.length > 0 ? (
            <div className="mt-3 text-sm">
              <Link to="/review" className="text-primary hover:underline">Open Review</Link>
            </div>
          ) : null}
        </Panel>

        <Panel title="Today" className="py-5">
          {!hydrated ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : d.todaysTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {d.todaysTasks.map((task) => (
                <li key={task.id}>
                  <Link to={task.to} params={task.params as never} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{task.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{task.detail}</span>
                    </span>
                    <span className="text-xs text-primary">Open</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Certifications" className="relative py-5">
          <Link to="/certifications" className="absolute right-0 top-5 text-sm text-primary hover:underline">View all →</Link>
          <ul className="divide-y divide-border/60">
            {d.certificationReadiness.map((cert) => (
              <li key={cert.id} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-3 py-2.5">
                <p className="min-w-0 truncate text-sm">{cert.title}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><Meter value={cert.overall} /><span className="text-sm font-semibold tabular-nums">{cert.overall}%</span></div>
                <ChevronRight className="size-4 text-primary" aria-hidden />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Career readiness" className="relative py-5">
          <Link to="/career-skills" className="absolute right-0 top-5 text-sm text-primary hover:underline">View all →</Link>
          <div className="divide-y divide-border/60">
            {d.careerReadiness.map((track) => (
              <div key={track.track} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-3 py-2.5">
                <p className="truncate text-sm">{track.label}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><Meter value={track.score} /><span className="text-sm font-semibold tabular-nums">{track.score}%</span></div>
                <ChevronRight className="size-4 text-primary" aria-hidden />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        <Link to="/guide" className="hover:text-foreground hover:underline">How scores are calculated</Link>
      </p>
    </div>
  );
}
