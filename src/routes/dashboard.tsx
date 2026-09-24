import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, Clock, Flame, Play, SlidersHorizontal, Sparkles, Wrench } from "lucide-react";

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
import { currentJourneyTopic, isMastered, isTopicOpen, journeyTopics } from "@/lib/journey-order";
import { certificationTopics } from "@/lib/cert-path";
import { certifications } from "@/data/static-content";
import { overallMeasures } from "@/lib/mastery-summary";
import { topicScopeProgress } from "@/lib/scope-progress";
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
      <div className="h-full rounded-full bg-progress motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out motion-reduce:transition-none" style={{ width: `${value}%` }} />
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
      className="flex min-h-11 min-w-[10rem] max-w-[15rem] shrink-0 items-center gap-2.5 rounded-md bg-secondary/50 px-3 py-2 motion-safe:transition-all motion-safe:duration-150 hover:bg-secondary active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
    >
       <Icon className="size-4 shrink-0 text-feature-amber" aria-hidden />
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
  // Count sections in journey order, and prefer the topic the learner is
  // actually working on (most recently touched, open and not yet mastered).
  const journeyList = journeyTopics(user);
  const lastTouched = Object.values(user.topicProgress).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const activeTopic = (lastTouched && journeyList.find((topic) => topic.id === lastTouched.topicId && isTopicOpen(user, topic.id) && !isMastered(user, topic.id))) || journeyTopic;
  const journeyCourse = activeTopic && journeyList.some((topic) => topic.id === activeTopic.id) ? journeyList : activeTopic ? certificationTopics(activeTopic.certificationId) : path.topics;
  const journeyCertification = (activeTopic && certifications.find((c) => c.id === activeTopic.certificationId)) || path.certification;
  const courseTopicIndex = activeTopic ? Math.max(0, journeyCourse.findIndex((topic) => topic.id === activeTopic.id)) : 0;
  const currentStage = journeyTopic?.difficulty === "challenging" ? "Advanced" : journeyTopic?.difficulty === "standard" ? "Core" : "Foundation";
  const primary: { to: string; params?: Record<string, string>; search?: unknown; title: string; detail: string } | null =
    resume
      ? { to: resume.to, ...(resume.params ? { params: resume.params as Record<string, string> } : {}), ...(resume.search ? { search: resume.search } : {}), title: resume.label, detail: resume.detail }
      : journeyTopic
        ? { to: "/topics/$topicId", params: { topicId: journeyTopic.id }, title: journeyTopic.title, detail: "Next on your path" }
        : path.recommendedTopic
          ? { to: "/topics/$topicId", params: { topicId: path.recommendedTopic.id }, title: path.recommendedTopic.title, detail: "Recommended next" }
          : null;

  const currentTopicPercent = activeTopic
    ? Math.min(100, Math.round(topicScopeProgress(user, activeTopic.id).overall))
    : 0;
  const currentTopicSummary =
    activeTopic?.summary || primary?.detail || "Continue where you left off";

  const journeyWindow = useMemo(() => {
    if (journeyCourse.length === 0) return [];
    const total = journeyCourse.length;
    let start = Math.max(0, courseTopicIndex - 2);
    const end = Math.min(total, start + 5);
    if (end - start < 5) start = Math.max(0, end - 5);

    return journeyCourse.slice(start, end).map((topic, idx) => {
      const originalIndex = start + idx;
      const isCompleted = isMastered(user, topic.id);
      const isCurrent = originalIndex === courseTopicIndex;
      return {
        topic,
        index: originalIndex + 1,
        isCompleted,
        isCurrent,
        isUpcoming: !isCompleted && !isCurrent,
        isOpen: isTopicOpen(user, topic.id),
      };
    });
  }, [journeyCourse, courseTopicIndex, user]);

  const currentWindowIndex = journeyWindow.findIndex((step) => step.isCurrent);
  const journeyFillPercent =
    currentWindowIndex >= 0 && journeyWindow.length > 1
      ? (currentWindowIndex / (journeyWindow.length - 1)) * 100
      : 0;

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={4} />;

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <header className="mb-5 grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-4 border-b border-border/60 pb-5">
        <div className="min-w-0">
          <Link to="/settings" className="group inline-flex max-w-full items-center gap-1.5 font-display text-base font-semibold tracking-tight text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-lg">
            <span className="truncate">Your learning path</span>
            <ChevronDown className="size-4 shrink-0 text-primary motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-y-0.5 motion-reduce:transition-none" aria-hidden />
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            {currentStage} · {d.masteredTopics} of {d.topicsTotal} topics
          </p>
        </div>
        <div className="relative grid size-[3.75rem] shrink-0 place-items-center rounded-full bg-secondary/30 ring-1 ring-inset ring-border/50" aria-label={`${d.overallProgress}% overall progress`}>
          <span className="font-display text-base font-bold tabular-nums text-foreground">{d.overallProgress}%</span>
        </div>
      </header>

      <nav aria-label="Learning Journey" className="mb-6 rounded-xl border border-border/50 bg-card/40 p-3.5 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your Learning Journey</span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            Step {Math.min(courseTopicIndex + 1, journeyCourse.length)} of {journeyCourse.length}
          </span>
        </div>
        <div className="relative">
          <div className="absolute left-6 right-6 top-4 h-[2px] bg-border/60" aria-hidden />
          <div
            className="absolute left-6 top-4 h-[2px] bg-gradient-to-r from-primary/80 to-primary shadow-sm motion-safe:transition-[width] motion-safe:duration-300 motion-reduce:transition-none"
            style={{ width: `calc((100% - 3rem) * ${journeyFillPercent / 100})` }}
            aria-hidden
          />
          <div className="relative z-10 flex items-start justify-between gap-1 overflow-x-auto pb-1 sm:gap-2">
            {journeyWindow.map((step) => {
              const node = (
                <>
                  <span
                    className={
                      step.isCurrent
                        ? "grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-4 ring-primary/25 shadow-md shadow-primary/20 motion-safe:transition-transform motion-safe:duration-150 group-active:scale-95 motion-reduce:transition-none sm:size-9"
                        : step.isCompleted
                          ? "grid size-7 place-items-center rounded-full border border-primary/40 bg-primary/15 text-xs font-semibold text-primary motion-safe:transition-all motion-safe:duration-150 group-hover:scale-105 group-hover:border-primary/80 motion-reduce:transition-none sm:size-8"
                          : "grid size-7 place-items-center rounded-full border border-border/80 bg-secondary/60 text-xs font-medium text-muted-foreground/60 sm:size-8"
                    }
                    aria-hidden
                  >
                    {step.isCompleted ? <Check className="size-3.5 stroke-[2.5]" /> : <span className="font-display font-bold">{step.index}</span>}
                  </span>
                  {step.isCurrent ? (
                    <span className="mt-1 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-widest text-primary">Here</span>
                  ) : (
                    <span className="mt-1 h-3.5" aria-hidden />
                  )}
                  <span className={`mt-0.5 block max-w-[4.5rem] truncate text-center ${step.isCurrent ? "font-display text-xs font-semibold text-foreground" : "text-[0.6875rem] font-medium text-muted-foreground/70 group-hover:text-foreground"} sm:max-w-[6.5rem]`}>
                    {step.topic.title}
                  </span>
                </>
              );

              return step.isOpen ? (
                <Link
                  key={step.topic.id}
                  to="/topics/$topicId"
                  params={{ topicId: step.topic.id }}
                  aria-current={step.isCurrent ? "step" : undefined}
                  aria-label={step.isCompleted ? `Completed: ${step.topic.title}` : step.isCurrent ? `Current: ${step.topic.title}` : step.topic.title}
                  className="group flex min-h-12 min-w-[4.25rem] flex-1 flex-col items-center rounded-lg py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-[6.5rem]"
                >
                  {node}
                </Link>
              ) : (
                <div
                  key={step.topic.id}
                  aria-current={step.isCurrent ? "step" : undefined}
                  aria-label={step.isCompleted ? `Completed: ${step.topic.title}` : step.isCurrent ? `Current: ${step.topic.title}` : `Locked: ${step.topic.title}`}
                  className="group flex min-h-12 min-w-[4.25rem] flex-1 flex-col items-center rounded-lg py-1 text-center sm:min-w-[6.5rem]"
                >
                  {node}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <section
        aria-labelledby="continue-heading"
        className="relative mb-6 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card/95 to-background p-5 shadow-2xl shadow-black/50 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent sm:rounded-3xl sm:p-7 md:p-9"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden sm:w-3/5 lg:w-[55%]"
          aria-hidden="true"
        >
          <img
            src={courseArtwork.src}
            alt=""
            className="h-full w-full object-cover object-right opacity-80 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.3)_60%,transparent_100%)] sm:opacity-95 sm:[mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.35)_18%,rgba(0,0,0,0.85)_60%,black_100%)]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent sm:bg-gradient-to-r sm:from-card sm:via-card/60 sm:to-transparent" aria-hidden="true" />
        </div>

        {primary ? (
          <>
            <div className="relative z-10 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  {d.hasAnyActivity ? "Continue Learning" : "Start Learning"}
                </span>
              </div>

              <h1
                id="continue-heading"
                className="mt-2.5 max-w-xl font-serif text-3xl font-semibold leading-[1.05] tracking-[-0.025em] text-foreground sm:text-4xl lg:text-5xl"
              >
                {primary.title}
              </h1>

              <p className="mt-2 max-w-lg line-clamp-2 text-xs leading-relaxed text-muted-foreground/90 sm:line-clamp-none sm:text-sm">
                {currentTopicSummary}
              </p>

              <div className="mt-5 max-w-md">
                <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-display font-medium text-foreground/85">
                    Section {Math.min(courseTopicIndex + 1, journeyCourse.length)} of {journeyCourse.length}
                  </span>
                  <span className="font-display font-bold tabular-nums text-foreground">
                    {currentTopicPercent}%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80"
                  role="progressbar"
                  aria-label="Current topic progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={currentTopicPercent}
                >
                  <div
                    className="h-full rounded-full bg-primary shadow-md shadow-primary/25 motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none"
                    style={{ width: `${currentTopicPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full rounded-xl bg-primary px-7 font-semibold text-primary-foreground shadow-lg shadow-primary/25 motion-safe:transition-all motion-safe:duration-150 hover:bg-primary/90 active:translate-y-px active:scale-[0.985] motion-reduce:transition-none sm:w-auto sm:px-8"
                >
                  <Link
                    to={primary.to}
                    className="inline-flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    {...(primary.params ? { params: primary.params as never } : {})}
                    {...(primary.search ? { search: primary.search as never } : {})}
                  >
                    <Play className="size-4 fill-current stroke-none" aria-hidden="true" />
                    <span>Continue Learning</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-xl border-border/60 bg-card/50 px-6 font-semibold text-foreground backdrop-blur-sm motion-safe:transition-all motion-safe:duration-150 hover:bg-secondary/70 active:scale-[0.985] motion-reduce:transition-none sm:w-auto"
                >
                  <Link
                    to="/study-plan"
                    className="inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>Study Plan</span>
                  </Link>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 max-w-md">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
              Start Learning
            </span>
            <h1 id="continue-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Choose a topic
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Select your first topic from the curriculum to begin your path.
            </p>
            <Button asChild className="mt-5 h-12 rounded-xl px-6 font-semibold">
              <Link to="/learn">Choose a topic</Link>
            </Button>
          </div>
        )}

        {d.hasAnyActivity && (actions.length > 0 || todayChips.length > 0) ? (
          <details className="group relative z-10 mt-6 border-t border-border/30 pt-3.5">
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground motion-safe:transition-colors motion-safe:duration-150 hover:text-foreground active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
              Other suggestions ({actions.length + todayChips.length})
              <ChevronRight
                className="size-4 motion-safe:transition-transform motion-safe:duration-150 group-open:rotate-90 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-3 space-y-3">
              <TodayStrip chips={todayChips} />
              <NextActionCard actions={actions} onDismiss={dismissAction} />
            </div>
          </details>
        ) : null}

        {!d.hasAnyActivity ? (
          <div className="relative z-10 mt-5 flex flex-wrap gap-4 border-t border-border/40 pt-3.5 text-sm">
            <Link to="/settings" className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Check my goal
            </Link>
            <Link to="/guide" className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              How IT PATH works
            </Link>
          </div>
        ) : null}
      </section>

      <Link
        to="/meditation"
        className="group mb-6 flex min-h-20 items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/40 p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-feature-violet/15 text-feature-violet">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-sm font-semibold text-foreground">Meditation & Focus</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Breathing, calming sounds, and a quick mental reset.</span>
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>

      <section className="border-b border-border/60 py-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">Your progress</h2>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {d.masteredTopics} of {d.topicsTotal} topics mastered
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Meter value={measures.learningProgress} />
          <span className="font-display text-sm font-bold tabular-nums text-foreground">{measures.learningProgress}%</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border/50">
          <div className="min-w-0 rounded-lg border border-border/40 bg-card/50 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pr-3">
            <SlidersHorizontal className="size-4 text-feature-violet" aria-hidden />
            <p className="mt-1.5 truncate text-[0.6875rem] font-medium text-muted-foreground">Topics mastered</p>
            <p className="mt-0.5 font-display text-xl font-bold tabular-nums text-foreground">{d.masteredTopics}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-border/40 bg-card/50 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-3">
            <BarChart3 className="size-4 text-feature-blue" aria-hidden />
            <p className="mt-1.5 truncate text-[0.6875rem] font-medium text-muted-foreground">Quiz average</p>
            <p className="mt-0.5 font-display text-xl font-bold tabular-nums text-foreground">{quizCount > 0 ? `${d.quizAverage}%` : "—"}</p>
            <p className="text-[0.625rem] text-muted-foreground">{quizCount > 0 ? `${quizCount} completed` : "No quizzes yet"}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-border/40 bg-card/50 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-3">
            <Clock className="size-4 text-feature-cyan" aria-hidden />
            <p className="mt-1.5 truncate text-[0.6875rem] font-medium text-muted-foreground">Study time</p>
            <p className="mt-0.5 font-display text-xl font-bold tabular-nums text-foreground">{d.studyMinutesTotal < 60 ? `${d.studyMinutesTotal} min` : `${d.studyHoursTotal}h`}</p>
            <p className="text-[0.625rem] text-muted-foreground">Recorded in app</p>
          </div>
          <div className="min-w-0 rounded-lg border border-border/40 bg-card/50 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pl-3">
            <Flame className="size-4 text-feature-orange" aria-hidden />
            <p className="mt-1.5 truncate text-[0.6875rem] font-medium text-muted-foreground">Streak</p>
            <p className="mt-0.5 font-display text-xl font-bold tabular-nums text-foreground">{d.streakDays > 0 ? `${d.streakDays}d` : "—"}</p>
            <p className="text-[0.625rem] text-muted-foreground">{d.streakDays > 0 ? `${d.streakDays === 1 ? "day" : "days"} active` : "No streak yet"}</p>
          </div>
        </div>
        <details className="mt-1">
          <summary className="inline-block min-h-11 cursor-pointer list-none py-2.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
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
              <StreakPanel />
            </div>
          ) : null}
        </details>
      </section>

      <div>
        <Panel title="Due for review" className="border-t-0 py-5">
          {reviewTopics.length === 0 ? (
             <div className="flex items-start gap-4 text-muted-foreground"><CalendarDays className="mt-0.5 size-6 shrink-0 text-feature-amber/80" aria-hidden /><div><p className="text-sm text-foreground/85">Nothing due right now.</p><p className="mt-0.5 text-sm">We’ll show topics here as they become due.</p></div></div>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {reviewTopics.map((item) => (
                <li key={item.topicId} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary/40 motion-reduce:transition-none">
                  <Link
                    to="/review"
                    {...(missedAnchors[item.topicId] ? { hash: missedAnchors[item.topicId] as string } : {})}
                    className="min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="block truncate hover:underline">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.reason}</span>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-9 min-w-16 shrink-0 px-2 text-xs motion-safe:transition-transform motion-safe:duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
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
              <Link to="/review" className="rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">Open Review</Link>
            </div>
          ) : null}
        </Panel>

        <Panel title="Today" className="py-5">
          {d.todaysTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {d.todaysTasks.map((task) => (
                <li key={task.id}>
                  <Link to={task.to} params={task.params as never} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2.5 motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
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
          <Link to="/certifications" className="absolute right-0 top-5 rounded-sm text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">View all →</Link>
          <ul className="divide-y divide-border/60">
            {d.certificationReadiness.map((cert) => (
              <li key={cert.id} className="group grid min-h-11 grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-3 rounded-md px-2 py-2.5 motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary/40 active:scale-[0.995] motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                <p className="min-w-0 truncate text-sm">{cert.title}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><Meter value={cert.overall} /><span className="text-sm font-semibold tabular-nums">{cert.overall}%</span></div>
                <ChevronRight className="size-4 text-muted-foreground motion-safe:transition-all motion-safe:duration-150 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none" aria-hidden />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Career readiness" className="relative py-5">
          <Link to="/career-skills" className="absolute right-0 top-5 text-sm text-primary hover:underline">View all →</Link>
          <div className="divide-y divide-border/60">
            {d.careerReadiness.map((track) => (
              <div key={track.track} className="group grid min-h-11 grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-3 rounded-md px-2 py-2.5 motion-safe:transition-colors motion-safe:duration-150 hover:bg-secondary/40 active:scale-[0.995] motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                <p className="truncate text-sm">{track.label}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><Meter value={track.score} /><span className="text-sm font-semibold tabular-nums">{track.score}%</span></div>
                <ChevronRight className="size-4 text-muted-foreground motion-safe:transition-all motion-safe:duration-150 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none" aria-hidden />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        <Link to="/guide" className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">How scores are calculated</Link>
      </p>
    </div>
  );
}
