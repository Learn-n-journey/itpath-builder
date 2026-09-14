import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flame,
  FlaskConical,
  HelpCircle,
  RotateCcw,
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
import { nextActions } from "@/lib/next-action";
import { buildReadinessReport } from "@/lib/readiness-engine";
import { greetingFor } from "@/lib/greeting";
import { useProfile } from "@/hooks/use-profile";
import { useAppState } from "@/state/app-state";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dashboard — IT PATH" },
      {
        name: "description",
        content:
          "Your IT PATH dashboard: overall progress, today's tasks, study time, streak and readiness.",
      },
      { property: "og:title", content: "Dashboard — IT PATH" },
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
    <div className="h-1.5 w-full rounded-full bg-secondary" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
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

  const path = useMemo(() => adaptivePath(user), [user]);
  const actions = useMemo(() => nextActions(user), [user]);
  const readiness = useMemo(() => buildReadinessReport(user, path.certification), [user, path.certification]);
  const missedAnchors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of missedQuestions(user)) {
      if (!map[item.mistake.topicId]) map[item.mistake.topicId] = missedQuestionAnchor(item);
    }
    return map;
  }, [user]);

  return (
    <>
      <div className="flex items-start gap-4">
        <img
          src="/icons/icon-256.png"
          alt="IT PATH logo — a mountain path with circuit traces"
          className="h-14 w-14 shrink-0 rounded-2xl sm:h-16 sm:w-16"
        />
        <div className="min-w-0 flex-1">
          <PageHeader
            title={firstName ? greetingFor(firstName) : "Dashboard"}
            description={`Target role: ${user.settings.targetJob}. Certification focus: ${user.settings.certificationTarget}.`}
            actions={
              <Button asChild>
                <Link to="/study-plan">Open study plan</Link>
              </Button>
            }
          />
        </div>

      </div>

      {!d.hasAnyActivity ? (
        <Panel
          className="mb-4"
          title="Start here"
          description="You have no recorded activity yet, so every figure below reads zero. IT PATH is built for certification students, but it is also a practical way to understand the technology you use every day. Three steps will change that."
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
                  ? `${path.recommendedTopic.title} — ${path.reason}.`
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
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <NextActionCard actions={actions} />
          <ReadinessPanel report={readiness} />
          <StreakPanel />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Overall progress"
          value={`${d.overallProgress}%`}
          icon={Target}
          hint={`Across ${d.topicsTotal} topics`}
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
          title="Skill dimensions"
          description="Averaged over every curriculum topic. Untouched topics count as zero."
        >
          <div className="space-y-3">
            <MeterRow label="Knowledge" value={d.knowledge} />
            <MeterRow label="Practical skills" value={d.practical} />
            <MeterRow label="Troubleshooting" value={d.troubleshooting} />
            <MeterRow label="Retention" value={d.retention} />
          </div>
        </Panel>

        <Panel title="Topics needing review" description="Due reviews, open mistakes and weak scores.">
          {d.topicsNeedingReview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing flagged for review yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.topicsNeedingReview.map((item) => (
                <li
                  key={item.topicId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
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
