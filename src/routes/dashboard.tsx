import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Bell, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, Clock, Compass, Flame, Heart, MessageCircle, Play, Search, SlidersHorizontal, Sparkles, Users, Wrench } from "lucide-react";

import { NextActionCard } from "@/components/next-action-card";
import { LearnerPageSkeleton, Panel, StatCard } from "@/components/page-kit";
import { StreakPanel } from "@/components/streak-panel";
import { Button } from "@/components/ui/button";
import { computeDashboard } from "@/lib/dashboard-engine";
import { adaptivePath } from "@/lib/adaptive-path";
import { missedQuestionAnchor, missedQuestions } from "@/lib/missed-questions";
import { nextActions, type NextAction } from "@/lib/next-action";
import { dismissNextAction, visibleNextActions } from "@/lib/next-action-dismissals";
import { clearReviewTopic, visibleReviewTopics } from "@/lib/review-dismissals";
import { learnerContinuity } from "@/lib/learner-continuity";
import { currentJourneyTopic, isMastered, isTopicOpen, journeyTopics } from "@/lib/journey-order";
import { certificationTopics } from "@/lib/cert-path";
import { certifications } from "@/data/static-content";
import { overallMeasures } from "@/lib/mastery-summary";
import { topicScopeProgress } from "@/lib/scope-progress";
import { useAppState } from "@/state/app-state";
import itPathArtwork from "@/assets/path-it.jpg";
import autoPathArtwork from "@/assets/path-auto.jpg";
import { activeDomainKey } from "@/domain/active";
import { useCommunityPreview } from "@/hooks/use-community-preview";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/state/auth-state";
import { useCommunityNotifications } from "@/hooks/use-social-messaging";


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
  const { posts: communityPosts } = useCommunityPreview(4);
  const { userId } = useAuth();
  const { profile } = useProfile();
  const { notifications, unreadCount, markNotificationRead, markAllEventNotificationsRead } = useCommunityNotifications(8);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isAutoPath = activeDomainKey.split("@")[0] === "auto-repair";

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
  const continuity = useMemo(() => learnerContinuity(user), [user]);
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
  const primary = {
    to: continuity.to,
    ...(continuity.params ? { params: continuity.params } : {}),
    ...(continuity.search ? { search: continuity.search } : {}),
    title: continuity.label,
    detail: continuity.reason,
    minutes: continuity.minutes,
    kind: continuity.kind,
  };

  const currentTopicPercent = activeTopic
    ? Math.min(100, Math.round(topicScopeProgress(user, activeTopic.id).overall))
    : 0;
  const currentTopicSummary = primary.detail || activeTopic?.summary || "Continue where you left off";

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
    <div className="relative -mx-3 -my-4 min-h-screen overflow-hidden pb-12 sm:-mx-5 sm:-my-6 lg:-mx-8 lg:-my-8">
      <div className="relative mx-auto max-w-4xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <header className="mb-5 flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{isAutoPath ? "Your training shop" : "Your learning home"}</p><h1 className="font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{isAutoPath ? "Learn. Diagnose. Repair." : "Learn. Connect."}</h1></div>
        <div className="flex items-center gap-1">{userId?<Link to="/profile/$userId" params={{userId}} aria-label="Your profile" className="mr-1 flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">{profile.avatarUrl?<img src={profile.avatarUrl} alt="" className="h-full w-full object-cover"/>:(profile.displayName||profile.firstName||"?")[0]?.toUpperCase()}</Link>:null}<Link to="/learn" aria-label="Explore learning" className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Search className="size-5"/></Link><div className="relative"><button type="button" aria-label={unreadCount ? `${unreadCount} unread community notifications` : "Community notifications"} aria-expanded={notificationsOpen} onClick={()=>setNotificationsOpen(v=>!v)} className="relative rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Bell className="size-5"/>{unreadCount>0?<span className="absolute right-2 top-2 size-2 rounded-full bg-primary"/>:null}</button>{notificationsOpen?<div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-xl"><div className="flex items-center justify-between border-b border-border/60 px-4 py-3"><p className="text-sm font-semibold">Notifications</p><div className="flex items-center gap-3"><button type="button" onClick={()=>void markAllEventNotificationsRead()} className="text-xs font-medium text-muted-foreground hover:text-foreground">Mark read</button><Link to="/notifications" onClick={()=>setNotificationsOpen(false)} className="text-xs font-medium text-primary hover:underline">View all</Link></div></div>{notifications.length?<div className="divide-y divide-border/50">{notifications.map(item=><Link key={item.kind+"-"+item.id} to={item.kind==="message"||item.kind==="friend-request"?"/messages":"/community"} {...(item.kind==="message"?{search:{user:item.userId}}:{})} onClick={()=>{if(item.readAt===null&&item.kind!=="message"&&item.kind!=="friend-request")void markNotificationRead(item.id);setNotificationsOpen(false)}} className="flex gap-3 px-4 py-3 hover:bg-secondary/50"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{item.displayName[0]?.toUpperCase()||"?"}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{item.displayName}</p><p className="truncate text-xs text-muted-foreground">{item.preview}</p></div></Link>)}</div>:<div className="px-4 py-6 text-center"><p className="text-sm font-medium">You’re caught up</p><p className="mt-1 text-xs text-muted-foreground">New messages and friend requests will appear here.</p></div>}</div>:null}</div></div>
      </header>


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
            <div className="relative z-10 min-w-0 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  {primary.kind === "study_plan" ? (isAutoPath ? "Continue Shop Session" : "Continue Your Session") : d.hasAnyActivity ? (isAutoPath ? "Continue Training" : "Continue Learning") : (isAutoPath ? "Start Training" : "Start Learning")}
                </span>
              </div>

              <h1
                id="continue-heading"
                className="mt-2.5 max-w-xl break-words font-serif text-[clamp(2rem,9vw,3rem)] font-semibold leading-[1.06] tracking-[-0.025em] text-foreground sm:text-4xl lg:text-5xl"
              >
                {primary.title}
              </h1>

              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground/90">
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
                    <span>{d.hasAnyActivity ? (isAutoPath ? "Continue Training" : "Continue Learning") : (isAutoPath ? "Start Training" : "Start Learning")}</span>
                  </Link>
                </Button>


              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 max-w-md">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary">
              {isAutoPath ? "Start Training" : "Start Learning"}
            </span>
            <h1 id="continue-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Choose a topic
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAutoPath ? "Choose the first system you want to train on and begin building diagnostic skill." : "Select your first topic from the curriculum to begin your path."}
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
              {isAutoPath ? "How AUTO PATH works" : "How IT PATH works"}
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mb-7" aria-labelledby="today-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Today</p>
            <h2 id="today-heading" className="font-display text-xl font-semibold">${isAutoPath ? "Your shop plan" : "Your learning plan"}</h2>
          </div>
          <Link to="/study-plan" className="text-xs font-semibold text-primary hover:underline">Study plan</Link>
        </div>
        ${d.todaysTasks.length === 0 && reviewTopics.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-4">
            <p className="text-sm font-medium">You’re caught up.</p>
            <p className="mt-1 text-xs text-muted-foreground">Continue your current topic when you’re ready.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/50 bg-card/40 px-3">
            ${reviewTopics.length > 0 ? (
              <Link to="/review" className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 hover:bg-secondary/30">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">${reviewTopics.length} ${reviewTopics.length === 1 ? "topic" : "topics"} due for review</span>
                  <span className="block text-xs text-muted-foreground">Strengthen material before it fades.</span>
                </span>
                <span className="text-xs font-semibold text-primary">Review</span>
              </Link>
            ) : null}"}
            ${d.todaysTasks.slice(0, 3).map((task) => (
              <Link key={task.id} to={task.to} params={task.params as never} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 hover:bg-secondary/30">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">${task.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">${task.detail}</span>
                </span>
                <span className="text-xs font-semibold text-primary">Open</span>
              </Link>
            ))}"}
          </div>
        )}"}
      </section>

      ${d.hasAnyActivity ? (
        <section className="mb-8" aria-labelledby="progress-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Progress</p>
              <h2 id="progress-heading" className="font-display text-xl font-semibold">${isAutoPath ? "Your training progress" : "Your learning progress"}</h2>
            </div>
            <Link to="/progress" className="text-xs font-semibold text-primary hover:underline">View full progress</Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border/50 rounded-xl border border-border/50 bg-card/40 py-4">
            <div className="px-3 text-center"><p className="text-xl font-bold tabular-nums">${d.masteredTopics}</p><p className="mt-0.5 text-[10px] text-muted-foreground">${isAutoPath ? "Systems mastered" : "Topics mastered"}</p></div>
            <div className="px-3 text-center"><p className="text-xl font-bold tabular-nums">${reviewTopics.length}</p><p className="mt-0.5 text-[10px] text-muted-foreground">${isAutoPath ? "Due checks" : "Due review"}</p></div>
            <div className="px-3 text-center"><p className="text-xl font-bold tabular-nums">${d.streakDays > 0 ? `${d.streakDays}d` : "—"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Streak</p></div>
          </div>
        </section>
      ) : null}"}

      <section className="mb-8" aria-labelledby="practice-heading">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">${isAutoPath ? "Train" : "Practice"}</p>
          <h2 id="practice-heading" className="font-display text-xl font-semibold">Choose another way to learn</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/practice" className="rounded-2xl border border-border/50 bg-card/45 p-4 hover:border-primary/30"><BookOpen className="size-5 text-feature-blue"/><p className="mt-3 text-sm font-semibold">${isAutoPath ? "Skill practice" : "Practice"}</p><p className="mt-1 text-xs text-muted-foreground">Apply what you know.</p></Link>
          <Link to="/labs" className="rounded-2xl border border-border/50 bg-card/45 p-4 hover:border-primary/30"><Wrench className="size-5 text-feature-orange"/><p className="mt-3 text-sm font-semibold">${isAutoPath ? "Shop practice" : "Labs"}</p><p className="mt-1 text-xs text-muted-foreground">Learn by doing.</p></Link>
          <Link to="/review" className="rounded-2xl border border-border/50 bg-card/45 p-4 hover:border-primary/30"><Sparkles className="size-5 text-feature-cyan"/><p className="mt-3 text-sm font-semibold">${isAutoPath ? "Recheck" : "Review"}</p><p className="mt-1 text-xs text-muted-foreground">${reviewTopics.length ? `${reviewTopics.length} ready now.` : "Keep knowledge fresh."}</p></Link>
          <Link to="/quiz-me" className="rounded-2xl border border-border/50 bg-card/45 p-4 hover:border-primary/30"><Compass className="size-5 text-feature-violet"/><p className="mt-3 text-sm font-semibold">Quiz Me</p><p className="mt-1 text-xs text-muted-foreground">Challenge yourself.</p></Link>
        </div>
      </section>

      <section className="mb-8" aria-labelledby="community-heading">
        <div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Community</p><h2 id="community-heading" className="font-display text-xl font-semibold">${isAutoPath ? "Talk shop" : "Learning together"}</h2></div><Link to="/community" className="text-xs font-semibold text-primary hover:underline">Open community</Link></div>
        <div className="divide-y divide-border/60 border-y border-border/60">
          ${communityPosts.length===0?<Link to="/community" className="flex items-center gap-3 py-5 text-sm text-muted-foreground"><Users className="size-5"/>Be the first to start a conversation.</Link>:communityPosts.slice(0,2).map(post=><Link key={post.id} to="/community" search={{room:post.room}} className="block py-4 hover:bg-secondary/20"><div className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">{post.displayName.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{post.displayName}</span><span className="truncate text-[11px] text-muted-foreground">{post.room==="general"?"General":post.room}</span></div>{post.body.trim()?<p className="mt-1 line-clamp-2 text-sm leading-relaxed text-foreground/90">{post.body}</p>:null}<div className="mt-2 flex gap-4 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Heart className="size-3.5"/>{post.likeCount}</span><span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5"/>{post.commentCount}</span></div></div></div></Link>)}
        </div>
      </section>

      <section className="mb-4" aria-labelledby="discover-heading">
        <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Discover</p><h2 id="discover-heading" className="font-display text-lg font-semibold">More when you want it</h2></div>
        <div className="flex flex-wrap gap-2">
          <Link to="/learn" className="rounded-full border border-border/60 bg-card/40 px-3 py-2 text-xs font-medium hover:border-primary/30">Explore topics</Link>
          <Link to="/pomodoro" className="rounded-full border border-border/60 bg-card/40 px-3 py-2 text-xs font-medium hover:border-primary/30">Focus timer</Link>
          ${!isAutoPath ? <Link to="/virus" className="rounded-full border border-border/60 bg-card/40 px-3 py-2 text-xs font-medium hover:border-primary/30">Games</Link> : <Link to="/garage-match" className="rounded-full border border-border/60 bg-card/40 px-3 py-2 text-xs font-medium hover:border-primary/30">Games</Link>}
          <Link to="/meditation" className="rounded-full border border-border/60 bg-card/40 px-3 py-2 text-xs font-medium hover:border-primary/30">Meditation & Focus</Link>
        </div>
      </section>

      <p className="mt-12 text-xs text-muted-foreground">
        <Link to="/guide" className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">How scores are calculated</Link>
      </p>
      </div>
    </div>
  );
}
