import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, PlayCircle, Wrench } from "lucide-react";

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
import { resumeTarget} from "@/lib/resume";
import { greetingFor } from "@/lib/greeting";
import { currentJourneyTopic } from "@/lib/journey-order";
import { overallMeasures } from "@/lib/mastery-summary";
import { useProfile } from "@/hooks/use-profile";
import { useAppState } from "@/state/app-state";
import autopathLogo from "@/assets/autopath-logo.png.asset.json";
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
  const { firstName } = useProfile();

  // The subject choice lives in browser storage, so the matching course logo
  // is selected as soon as the dashboard hydrates.
  const [logo, setLogo] = useState({ src: "/icons/icon-256.png", alt: "IT PATH logo, a mountain path with circuit traces" });
  useEffect(() => {
    if (activeDomainKey.split("@")[0] === "auto-repair") {
      setLogo({
        src: autopathLogo.url,
        alt: "AUTO PATH logo, a dark navy app icon with a chrome piston, blue wrench and circuit traces",
      });
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
  const primary: { to: string; params?: Record<string, string>; search?: unknown; title: string; detail: string } | null =
    resume
      ? { to: resume.to, ...(resume.params ? { params: resume.params as Record<string, string> } : {}), ...(resume.search ? { search: resume.search } : {}), title: resume.label, detail: resume.detail }
      : journeyTopic
        ? { to: "/topics/$topicId", params: { topicId: journeyTopic.id }, title: journeyTopic.title, detail: "Next on your path" }
        : path.recommendedTopic
          ? { to: "/topics/$topicId", params: { topicId: path.recommendedTopic.id }, title: path.recommendedTopic.title, detail: "Recommended next" }
          : null;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center gap-3">
        <img src={logo.src} alt={logo.alt} className="size-10 shrink-0 rounded-md" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl">
            {firstName ? greetingFor(firstName) : "Dashboard"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user.settings.certificationTarget}</p>
        </div>
      </header>

      <section aria-labelledby="continue-heading" className="rounded-lg bg-card p-5 sm:p-6">
        <h2 id="continue-heading" className="text-sm text-muted-foreground">
          {d.hasAnyActivity ? "Continue learning" : "Start learning"}
        </h2>
        {primary ? (
          <>
            <p className="mt-1 font-display text-xl font-semibold leading-snug sm:text-2xl">{primary.title}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{primary.detail}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link
                  to={primary.to}
                  {...(primary.params ? { params: primary.params as never } : {})}
                  {...(primary.search ? { search: primary.search as never } : {})}
                >
                  <PlayCircle className="size-4" aria-hidden /> Continue
                </Link>
              </Button>
              <Link to="/study-plan" className="text-sm text-muted-foreground hover:text-foreground">
                Study plan
              </Link>
            </div>
          </>
        ) : (
          <Button asChild className="mt-3">
            <Link to="/learn">Choose a topic</Link>
          </Button>
        )}
        {d.hasAnyActivity && (actions.length > 0 || todayChips.length > 0) ? (
          <details className="group mt-4 border-t border-border/60 pt-3">
            <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground">
              Other suggestions ({actions.length + todayChips.length})
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

      <section className="mt-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h2 className="font-display text-lg font-semibold">Progress</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {d.masteredTopics} of {d.topicsTotal} topics mastered
          </span>
        </div>
        <div className="mt-3 space-y-3">
          <MeterRow label="Learning progress" value={measures.learningProgress} />
          <MeterRow label="Overall mastery" value={measures.overallMastery} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 divide-border/60 sm:grid-cols-4">
          <StatCard label="Current goal" value={d.certificationReadiness[0] ? `${d.certificationReadiness[0].overall}%` : "0%"} />
          <StatCard label="Quiz average" value={`${d.quizAverage}%`} />
          <StatCard label="Study time" value={`${d.studyHoursTotal}h`} />
          <StatCard label="Streak" value={`${d.streakDays}d`} />
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer list-none py-2 text-sm text-muted-foreground hover:text-foreground">
            All measures
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

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Panel title="Due for review">
          {reviewTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due.</p>
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
          <div className="mt-3 flex gap-4 text-sm">
            <Link to="/review" className="text-primary hover:underline">Open Review</Link>
            <Link to="/quiz-me" className="text-primary hover:underline">Quiz me</Link>
          </div>
        </Panel>

        <Panel title="Today">
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

        <Panel title="Certifications">
          <ul className="space-y-3">
            {d.certificationReadiness.map((cert) => (
              <li key={cert.id}>
                <MeterRow label={cert.title} value={cert.overall} />
                <p className="mt-1 text-xs text-muted-foreground">{certificationStatusLabels[cert.status as CertificationStatus]}</p>
              </li>
            ))}
          </ul>
          <Link to="/certifications" className="mt-3 inline-block text-sm text-primary hover:underline">All certifications</Link>
        </Panel>

        <Panel title="Career readiness">
          <div className="space-y-3">
            {d.careerReadiness.map((track) => (
              <MeterRow key={track.track} label={track.label} value={track.score} />
            ))}
          </div>
          <Link to="/career-skills" className="mt-3 inline-block text-sm text-primary hover:underline">Career skills</Link>
        </Panel>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        <Link to="/guide" className="hover:text-foreground hover:underline">How scores are calculated</Link>
      </p>
    </div>
  );
}
