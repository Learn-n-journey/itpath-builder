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

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { computeDashboard } from "@/lib/dashboard-engine";
import { certificationStatusLabels } from "@/lib/certification-engine";
import type { CertificationStatus } from "@/lib/app-data/types";
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
  const d = useMemo(() => computeDashboard(user), [user]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Target role: ${user.settings.targetJob}. Certification focus: ${user.settings.certificationTarget}.`}
        actions={
          <Button asChild>
            <Link to="/study-plan">Open study plan</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Overall progress"
          value={`${d.overallProgress}%`}
          icon={Target}
          hint={`Across ${d.topicsTotal} topics`}
        />
        <StatCard
          label="Top certification"
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
          hint={`${Math.round((d.studyMinutesThisWeek / 60) * 10) / 10}h this week`}
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
          label="Assignments"
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
                    to="/topics/$topicId"
                    params={{ topicId: item.topicId }}
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

      {!d.hasAnyActivity ? (
        <p className="mt-6 text-sm text-muted-foreground">
          You have no recorded activity yet, so every number above is zero. Start a topic in Learn or
          log a session in your study plan and these figures will move.
        </p>
      ) : null}
    </>
  );
}
