import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { certificationStatusLabels } from "@/lib/certification-engine";
import { computeProgress, dimensionLabels, type ProgressReport } from "@/lib/progress-engine";
import { evidenceSourceLabels } from "@/lib/skills-engine";
import { useAppState } from "@/state/app-state";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/progress")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Progress | IT PATH" },
      {
        name: "description",
        content:
          "Detailed IT PATH progress by certification, stage, topic, skill and activity type.",
      },
      { property: "og:title", content: "Progress | IT PATH" },
      { property: "og:description", content: "Every number here comes from your own activity." },
    ],
  }),
  component: ProgressPage,
});

function scoreTone(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-foreground";
  if (score > 0) return "text-warning";
  return "text-muted-foreground";
}

function Row({ label, score, right }: { label: string; score: number; right?: string }) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">{label}</span>
        <span className={`text-sm tabular-nums ${scoreTone(score)}`}>
          {score}%{right ? ` · ${right}` : ""}
        </span>
      </div>
      <ProgressBar value={score} className="mt-2 h-1.5" />
    </li>
  );
}

function ProgressPage() {
  const { user } = useAppState();
  const report = useMemo<ProgressReport>(() => computeProgress(user), [user]);
  const [showAllTopics, setShowAllTopics] = useState(false);

  const startedTopics = report.byTopic.filter((row) => row.hasActivity);
  const topicRows = showAllTopics
    ? [...report.byTopic].sort((a, b) => b.score - a.score)
    : [...startedTopics].sort((a, b) => b.score - a.score).slice(0, 12);

  return (
    <>
      <PageHeader
        title="Progress"
        description="Correct and completed work is measured against everything available. Untouched work counts as zero."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Overall" value={`${report.overall}%`} />
        <StatCard label="Topics started" value={`${startedTopics.length}/${report.byTopic.length}`} />
        <StatCard label="Mastered" value={report.masteredTopics.length} />
        <StatCard label="Study time" value={`${Math.round((report.study.totalMinutes / 60) * 10) / 10}h`} />
        <StatCard label="Quiz average" value={report.quiz.attempts ? `${report.quiz.average}%` : "-"} />
        <StatCard label="Open mistakes" value={report.mistakes.open} />
      </div>

      {!report.hasActivity ? (
        <Panel className="mt-6">
          <EmptyState
            icon={TrendingUp}
            title="No activity recorded yet"
            body="Study a topic, run a lab, take a quiz or clear a review, and this page fills in with your real numbers."
          />
        </Panel>
      ) : null}


      <Panel
        className="mt-6"
        title="Learning dimensions"
        description="Averaged across the whole curriculum, so untouched topics count as zero."
      >
        <ul className="divide-y divide-border">
          {dimensionLabels.map((dimension) => (
            <li key={dimension.key} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{dimension.label}</p>
                  <p className="text-xs text-muted-foreground">{dimension.help}</p>
                </div>
                <span className={`text-sm tabular-nums ${scoreTone(report.dimensions[dimension.key])}`}>
                  {report.dimensions[dimension.key]}%
                </span>
              </div>
              <ProgressBar value={report.dimensions[dimension.key]} className="mt-2 h-1.5" />
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="By activity type" description="Completion uses the full library; averages describe attempted work only.">
          <ul className="divide-y divide-border">
            {report.byActivity.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.detail} · {row.attempts} attempt{row.attempts === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums">
                    {row.completed}
                    {row.total !== null ? ` / ${row.total}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {row.averageScore === null ? "No score yet" : `Avg ${row.averageScore}%`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Performance detail">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Quiz attempts</dt>
              <dd className="mt-1 tabular-nums">{report.quiz.attempts}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Best quiz</dt>
              <dd className="mt-1 tabular-nums">{report.quiz.attempts ? `${report.quiz.best}%` : "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last quiz</dt>
              <dd className="mt-1 tabular-nums">
                {report.quiz.lastScore === null ? "-" : `${report.quiz.lastScore}%`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Practice completed</dt>
              <dd className="mt-1 tabular-nums">
                {report.assignment.completed} / {report.assignment.total}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Practice average</dt>
              <dd className="mt-1 tabular-nums">
                {report.assignment.attempts ? `${report.assignment.average}%` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Labs completed</dt>
              <dd className="mt-1 tabular-nums">
                {report.lab.completed} / {report.lab.total}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Labs mastered</dt>
              <dd className="mt-1 tabular-nums">{report.lab.mastered}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lab average</dt>
              <dd className="mt-1 tabular-nums">
                {report.lab.attempts ? `${report.lab.average}%` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Study sessions</dt>
              <dd className="mt-1 tabular-nums">{report.study.sessions}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Average session</dt>
              <dd className="mt-1 tabular-nums">
                {report.study.sessions ? `${report.study.averageMinutes} min` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active study days</dt>
              <dd className="mt-1 tabular-nums">{report.study.activeDays}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reviews graded</dt>
              <dd className="mt-1 tabular-nums">{report.review.graded}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Review pass rate</dt>
              <dd className="mt-1 tabular-nums">
                {report.review.graded ? `${report.review.passRate}%` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reviews due</dt>
              <dd className="mt-1 tabular-nums">
                {report.review.due} of {report.review.scheduled} scheduled
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="By certification" description="Curriculum coverage next to exam readiness.">
          <ul className="divide-y divide-border">
            {report.byCertification.map((row) => (
              <li key={row.key} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">{row.label}</span>
                  <Badge variant="outline">
                    {certificationStatusLabels[
                      row.status as keyof typeof certificationStatusLabels
                    ] ?? row.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>Curriculum {row.score}% · {row.startedCount}/{row.topicCount} topics started</span>
                  <span>Readiness {row.readiness}%</span>
                </div>
                <ProgressBar value={row.readiness} className="mt-2 h-1.5" />
              </li>
            ))}
          </ul>
        </Panel>

         <Panel title="By skill" description="Correct work divided by every available activity for that skill.">
          <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto pr-1">
            {report.bySkill.map((skill) => (
              <li key={skill.skillId} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">{skill.label}</span>
                  <span className={`text-sm tabular-nums ${scoreTone(skill.score)}`}>
                    {skill.score}%
                  </span>
                </div>
                <ProgressBar value={skill.score} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {skill.hasEvidence
                    ? `${skill.accuracy}% accuracy · ${skill.coveredCount}/${skill.availableCount} activities covered · ${skill.sources
                        .map((source) => evidenceSourceLabels[source])
                        .join(", ")}`
                    : "No evidence yet"}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        className="mt-4"
        title="By topic"
        description="Each topic scored across all six recorded dimensions."
      >
        {topicRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No topic has recorded evidence yet. Open a topic in Learn to start.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {topicRows.map((row) => (
              <li key={row.topicId} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to="/topics/$topicId"
                    params={{ topicId: row.topicId }}
                    className="text-sm hover:underline"
                  >
                    {row.title}
                  </Link>
                  <span className={`text-sm tabular-nums ${scoreTone(row.score)}`}>{row.score}%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                   {row.status.replace(/_/g, " ")}
                </p>
                <ProgressBar value={row.score} className="mt-2 h-1.5" />
              </li>
            ))}
          </ul>
        )}
        <Button
          className="mt-3"
          variant="ghost"
          size="sm"
          onClick={() => setShowAllTopics((value) => !value)}
        >
          {showAllTopics ? "Show started topics only" : `Show all ${report.byTopic.length} topics`}
        </Button>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Mastered topics">
          {report.masteredTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing is mastered yet. Mastery comes from evidence, never from opening a page.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {report.masteredTopics.map((row) => (
                <li key={row.topicId} className="flex justify-between gap-2 py-2 text-sm">
                  <span>{row.title}</span>
                  <span className="tabular-nums text-success">{row.score}%</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Mistakes">
          {report.mistakes.total === 0 ? (
            <p className="text-sm text-muted-foreground">No mistakes recorded yet.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {report.mistakes.open} open of {report.mistakes.total} recorded.
              </p>
              <ul className="mt-3 divide-y divide-border">
                {report.mistakes.byCategory.map((row) => (
                  <li key={row.label} className="flex justify-between gap-2 py-2 text-sm">
                    <span>{row.label}</span>
                    <span className="tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-3" variant="outline" size="sm">
                <Link to="/review">Work through them</Link>
              </Button>
            </>
          )}
        </Panel>

        <Panel title="Weak prerequisites" description="Foundations under the work you are struggling with.">
          {report.weakPrerequisites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No weak prerequisites detected from your current activity.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {report.weakPrerequisites.slice(0, 8).map((row) => (
                <li key={row.topicId} className="py-2">
                  <div className="flex justify-between gap-2 text-sm">
                    <Link
                      to="/topics/$topicId"
                      params={{ topicId: row.topicId }}
                      className="hover:underline"
                    >
                      {row.title}
                    </Link>
                    <span className={`tabular-nums ${scoreTone(row.score)}`}>{row.score}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Holding back: {row.dependents.slice(0, 3).join(", ")}
                    {row.dependents.length > 3 ? ` +${row.dependents.length - 3} more` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-4" title="Account">
        <p className="text-sm text-muted-foreground">
          Path started {new Date(user.createdAt).toLocaleDateString()} · {report.study.sessions}{" "}
          study sessions logged · {report.study.totalMinutes} minutes total.
        </p>
      </Panel>
    </>
  );
}
