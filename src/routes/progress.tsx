import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { certificationStatusLabels } from "@/lib/certification-engine";
import { computeProgress, type ProgressReport } from "@/lib/progress-engine";
import { overallMeasures } from "@/lib/mastery-summary";
import { evidenceSourceLabels } from "@/lib/skills-engine";
import { useAppState } from "@/state/app-state";
import { AlertTriangle, ArrowRight, Brain, CheckCircle2, Clock3, Target, TrendingUp } from "lucide-react";
import { SectionTabs, PROGRESS_TABS } from "@/components/layout/section-tabs";

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
  const measures = useMemo(() => overallMeasures(user), [user]);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const dimensions = Object.entries(report.dimensions)
    .filter(([key]) => key !== "knowledge")
    .map(([key, score]) => ({ key, score, label: key === "practicalAbility" ? "Practical ability" : key.charAt(0).toUpperCase() + key.slice(1) }));
  const strongestDimension = [...dimensions].sort((a, b) => b.score - a.score)[0];
  const weakestDimension = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const attentionTopic = [...report.byTopic].filter((row) => row.hasActivity && row.status !== "mastered").sort((a, b) => a.score - b.score)[0];

  const startedTopics = report.byTopic.filter((row) => row.hasActivity);
  const topicRows = showAllTopics
    ? [...report.byTopic].sort((a, b) => b.score - a.score)
    : [...startedTopics].sort((a, b) => b.score - a.score).slice(0, 12);

  return (
    <>
      <SectionTabs tabs={PROGRESS_TABS} />
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/70 to-primary/[0.07] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">Learning progress</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">See what is actually sticking.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Progress shows the work you have completed, the evidence behind your mastery, and where your next effort will matter most.</p>
          </div>
          <Button asChild><Link to="/my-path">Continue learning <ArrowRight className="ml-1 size-4" /></Link></Button>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HeadlineStat icon={TrendingUp} label="Learning progress" value={`${measures.learningProgress}%`} detail={`${measures.activitiesCompleted} of ${measures.activitiesTotal} activities`} />
        <HeadlineStat icon={Brain} label="Overall mastery" value={`${measures.overallMastery}%`} detail={`${measures.assessmentsTaken} of ${measures.assessmentsTotal} finals taken`} />
        <HeadlineStat icon={CheckCircle2} label="Topics mastered" value={String(report.masteredTopics.length)} detail={`${startedTopics.length} topics started`} />
        <HeadlineStat icon={Clock3} label="Study time" value={`${Math.round((report.study.totalMinutes / 60) * 10) / 10}h`} detail={`${report.study.sessions} recorded sessions`} />
      </section>

      {report.hasActivity ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-border/70 bg-card/25 p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Capability profile</p><h2 className="mt-1 font-display text-xl font-semibold">How your learning is developing</h2></div>
              <Link to="/learner" className="text-xs font-semibold text-primary hover:underline">Full learner model</Link>
            </div>
            <div className="space-y-4">
              {dimensions.map((dimension) => (
                <div key={dimension.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-sm font-medium">{dimension.label}</span><span className={`text-sm font-semibold tabular-nums ${scoreTone(dimension.score)}`}>{dimension.score}%</span></div>
                  <ProgressBar value={dimension.score} className="h-2" />
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2">
              <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Strongest evidence</p><p className="mt-1 text-sm font-semibold">{strongestDimension?.label ?? "Not enough evidence"}{strongestDimension ? ` · ${strongestDimension.score}%` : ""}</p></div>
              <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Needs more evidence</p><p className="mt-1 text-sm font-semibold">{weakestDimension?.label ?? "Not enough evidence"}{weakestDimension ? ` · ${weakestDimension.score}%` : ""}</p></div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-5">
            <div className="flex items-center gap-2 text-primary"><Target className="size-5" /><p className="text-xs font-bold uppercase tracking-[0.14em]">Best next move</p></div>
            {report.mistakes.open > 0 ? (
              <><h2 className="mt-4 font-display text-xl font-semibold">Clear your open mistakes</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">You have {report.mistakes.open} unresolved mistake{report.mistakes.open === 1 ? "" : "s"}. Correcting known misses is a direct way to strengthen weak evidence.</p><Button asChild className="mt-5" size="sm"><Link to="/review">Start review <ArrowRight className="ml-1 size-4" /></Link></Button></>
            ) : attentionTopic ? (
              <><h2 className="mt-4 font-display text-xl font-semibold">Strengthen {attentionTopic.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">This started topic currently has {attentionTopic.score}% evidence across the measured dimensions. It is a useful place to build next.</p><Button asChild className="mt-5" size="sm"><Link to="/topics/$topicId" params={{ topicId: attentionTopic.topicId }}>Open topic <ArrowRight className="ml-1 size-4" /></Link></Button></>
            ) : (
              <><h2 className="mt-4 font-display text-xl font-semibold">Keep moving through your path</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your recorded work does not show an urgent weak spot right now. Continue with the next available learning milestone.</p><Button asChild className="mt-5" size="sm"><Link to="/my-path">Open My Path <ArrowRight className="ml-1 size-4" /></Link></Button></>
            )}
            <div className="mt-6 border-t border-primary/15 pt-4">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Reviews due</span><span className="font-semibold tabular-nums">{report.review.due}</span></div>
              <div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Open mistakes</span><span className="font-semibold tabular-nums">{report.mistakes.open}</span></div>
              <div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Weak prerequisites</span><span className="font-semibold tabular-nums">{report.weakPrerequisites.length}</span></div>
            </div>
          </div>
        </section>
      ) : null}

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
        title="Evidence summary"
        description="Work you have not done counts as zero, and an assessment you have not taken counts as zero."
      >
        <ul className="divide-y divide-border">
          <li className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Learning progress</p>
                <p className="text-xs text-muted-foreground">
                  {measures.activitiesCompleted} of {measures.activitiesTotal} activities completed
                </p>
              </div>
              <span className={`text-sm tabular-nums ${scoreTone(measures.learningProgress)}`}>
                {measures.learningProgress}%
              </span>
            </div>
            <ProgressBar value={measures.learningProgress} className="mt-2 h-1.5" />
          </li>
          <li className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Overall mastery</p>
                <p className="text-xs text-muted-foreground">
                  Final section quizzes and stage exams · {measures.assessmentsTaken} of{" "}
                  {measures.assessmentsTotal} taken
                </p>
              </div>
              <span className={`text-sm tabular-nums ${scoreTone(measures.overallMastery)}`}>
                {measures.overallMastery}%
              </span>
            </div>
            <ProgressBar value={measures.overallMastery} className="mt-2 h-1.5" />
          </li>
        </ul>
      </Panel>

      <div className="mt-4 border-t border-border/70 pt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Detailed evidence</p><h2 className="mt-1 font-display text-2xl font-semibold">Dig into the numbers</h2><p className="mt-1 text-sm text-muted-foreground">The same recorded data, broken down by activity, certification, skill, and topic.</p></div>\n\n      <div className="mt-4 grid gap-4 lg:grid-cols-2">\n        <Panel title="By activity type" description="Completion uses the full library; averages describe attempted work only.">
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

function HeadlineStat({ icon: Icon, label, value, detail }: { icon: typeof TrendingUp; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-border/70 bg-card/25 p-5"><div className="flex items-center justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span><span className="text-3xl font-semibold tabular-nums">{value}</span></div><p className="mt-4 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
