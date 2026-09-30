import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  BrainCircuit,
  ClipboardList,
  Code2,
  GitCompareArrows,
  Hammer,
  MessageCircleQuestion,
  Network,
  SearchCheck,
  ShieldAlert,
  Siren,
  FileText,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  Clock3,
  ListChecks,
  PlayCircle,
  Star,
  Target,
  Trophy,
  Save,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { assignments, topics } from "@/data/static-content";
import { journeyPhases } from "@/data/journey-phases";
import type {
  Assignment,
  AssignmentAttempt,
  AssignmentCriterionResult,
  AssignmentRubricCriterion,
} from "@/lib/app-data/types";
import { AiFeedback, useAiMarking } from "@/components/learning/ai-marking";
import { answerMatches, matchesConcept } from "@/lib/fuzzy-match";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";

/**
 * A criterion passes when the written response carries the correct idea.
 * Wording does not have to match; the meaning does.
 */
function criterionPassed(
  response: string,
  criterion: AssignmentRubricCriterion,
  selfCheck?: boolean,
): boolean {
  if (criterion.expectedAnswer && answerMatches(response, criterion.expectedAnswer)) return true;
  if (criterion.acceptedConcepts?.length && matchesConcept(response, criterion.acceptedConcepts))
    return true;
  if (!criterion.expectedAnswer && !criterion.acceptedConcepts?.length) return Boolean(selfCheck);
  return false;
}
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";
import { accentSurface, featureAccent } from "@/lib/visual-accents";
import { LearningBreadcrumbs } from "@/components/learning-breadcrumbs";
import { isStringPreference, useUiPreference } from "@/hooks/use-ui-preference";
import { learnerStatusLabel } from "@/lib/learner-status";
import { nextJourneyTopic } from "@/lib/journey-order";
import type { VisualAccent } from "@/lib/visual-accents";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/practice")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { assignment?: string } =>
    typeof search['assignment'] === "string" ? { assignment: search['assignment'] } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Practice | IT PATH" },
      {
        name: "description",
        content:
          "Applied practice tasks across the curriculum, evaluated against visible criteria and saved as attempts.",
      },
      { property: "og:title", content: "Practice | IT PATH" },
      {
        property: "og:description",
        content: "Applied IT practice grouped by skill area, with honest evaluation and review.",
      },
    ],
  }),
  component: PracticePage,
});

const typeLabels: Record<Assignment["type"], string> = {
  explain: "Explain",
  recall: "Recall",
  configure: "Configure",
  build: "Build",
  compare: "Compare",
  scenario: "Scenario",
  incident: "Incident",
  troubleshoot: "Troubleshoot",
  design: "Design",
  teach_back: "Teach Back",
  command_challenge: "Command Challenge",
  exam_simulation: "Exam Simulation",
  capstone: "Capstone",
};

const typeVisuals: Record<Assignment["type"], { icon: LucideIcon; accent: VisualAccent }> = {
  explain: { icon: MessageCircleQuestion, accent: "amber" },
  recall: { icon: BrainCircuit, accent: "violet" },
  configure: { icon: Code2, accent: "blue" },
  build: { icon: Hammer, accent: "violet" },
  compare: { icon: GitCompareArrows, accent: "cyan" },
  scenario: { icon: Network, accent: "blue" },
  incident: { icon: Siren, accent: "coral" },
  troubleshoot: { icon: SearchCheck, accent: "coral" },
  design: { icon: Network, accent: "green" },
  teach_back: { icon: MessageCircleQuestion, accent: "amber" },
  command_challenge: { icon: Code2, accent: "green" },
  exam_simulation: { icon: ShieldAlert, accent: "orange" },
  capstone: { icon: Hammer, accent: "violet" },
};

function PracticePage() {
  const { user, hydrated } = useAppState();
  const { assignment: requestedAssignmentId } = Route.useSearch();
  const requested = requestedAssignmentId
    ? assignments.find((item) => item.id === requestedAssignmentId)
    : undefined;
  const [seed, reshuffle] = useShuffleSeed();
  const [selectedId, setSelectedId] = useUiPreference("practice.item", requested?.id ?? "", isStringPreference);
  const requestedPhase = requested ? journeyPhases.find((phase) => phase.topics.some((topic) => topic.id === requested.topicId)) : undefined;
  const [group, setGroup] = useUiPreference("practice.skill-area", requestedPhase?.stage ?? journeyPhases[0]?.stage ?? "", isStringPreference);

  useEffect(() => {
    if (!requested) return;
    setSelectedId(requested.id);
    const phase = journeyPhases.find((entry) => entry.topics.some((topic) => topic.id === requested.topicId));
    if (phase) setGroup(phase.stage);
  }, [requested]);

  const groups = useMemo(() => {
    const shuffled = shuffleWithSeed(assignments, seed);
    return journeyPhases
      .map((phase) => {
        const topicIds = new Set(phase.topics.map((topic) => topic.id));
        return {
          id: phase.stage,
          title: phase.title,
          items: shuffled.filter((item) => topicIds.has(item.topicId)),
        };
      })
      .filter((entry) => entry.items.length > 0);
  }, [seed]);

  const activeGroup = groups.find((entry) => entry.id === group) ?? groups[0];
  const assignment = activeGroup?.items.find((item) => item.id === selectedId);

  function refresh() {
    reshuffle();
    setSelectedId("");
  }

  const attempts = user.assignmentAttempts;
  const latest = assignment
    ? attempts.find((attempt) => attempt.assignmentId === assignment.id)
    : undefined;
  const startedCount = attempts.filter((item) => item.status === "started").length;
  const completedCount = attempts.filter((item) => item.status === "completed").length;
  const reviewCount = attempts.filter((item) => item.status === "submitted" || item.status === "evaluated").length;
  const recommended = activeGroup?.items.find((item) => !attempts.some((attempt) => attempt.assignmentId === item.id && attempt.status === "completed")) ?? activeGroup?.items[0];
  const recommendedTopic = recommended ? topics.find((item) => item.id === recommended.topicId) : undefined;
  const visibleItems = activeGroup?.items.slice(0, 40) ?? [];

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={4} detail />;

  return (
    <div
      className="-mx-3 -my-4 min-h-screen px-3 py-4 sm:-mx-5 sm:-my-6 sm:px-5 sm:py-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8"
    >
      <PageHeader
        title="Practice"
        description="Build skill through applied work."
        actions={<Button variant="outline" onClick={refresh}><RefreshCw /> Shuffle</Button>}
      />

      {recommended ? (
        <section className="relative mt-2 overflow-hidden border-y border-primary/35 bg-card/60 px-1 py-5 sm:px-4">
          
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-medium text-primary"><Star className="size-4 fill-current" aria-hidden />Up next</p>
              <p className="max-w-[55%] truncate text-xs font-medium text-primary">{recommendedTopic?.title ?? activeGroup?.title}</p>
            </div>
            <h2 className="mt-3 max-w-2xl font-display text-xl font-semibold sm:text-2xl">{recommended.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{typeLabels[recommended.type]}</Badge>
              <Badge variant="outline"><Clock3 className="mr-1 size-3" />Practice task</Badge>
            </div>
            <Button className="mt-4 w-full sm:w-auto" onClick={() => setSelectedId(recommended.id)}>Start Practice <ArrowRight /></Button>
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid grid-cols-4 gap-2" aria-label="Practice progress">
        <PracticeStat icon={ListChecks} value={assignments.length} label="Available" />
        <PracticeStat icon={PlayCircle} value={startedCount} label="In Progress" />
        <PracticeStat icon={Trophy} value={completedCount} label="Completed" />
        <PracticeStat icon={RotateCcw} value={reviewCount} label="Needs Review" />
      </section>

      <section className="mt-6">
        <h2 className="font-display text-base font-semibold">Skill area</h2>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {groups.map((entry) => (
            <Button key={entry.id} size="sm" className="shrink-0 rounded-full" variant={entry.id === activeGroup?.id ? "default" : "outline"} onClick={() => { setGroup(entry.id); setSelectedId(""); }}>
              {entry.title}<span className="ml-1 text-xs opacity-70">{entry.items.length}</span>
            </Button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold">Practice Tasks</h2><p className="text-xs text-muted-foreground">{activeGroup?.items.length ?? 0} tasks</p></div>
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="size-4" />Most Relevant</Button>
        </div>
        <div className="mt-3 space-y-2">
          {visibleItems.map((item) => {
            const itemAttempt = attempts.find((attempt) => attempt.assignmentId === item.id);
            const visual = typeVisuals[item.type];
            const Icon = visual.icon;
            const topic = topics.find((entry) => entry.id === item.topicId);
            const selected = item.id === assignment?.id;
            return (
              <div key={item.id} className={cn("overflow-hidden border-b border-border/70 transition-colors", selected && "border-primary/55 bg-card/45")}>
                <button type="button" aria-expanded={selected} onClick={() => setSelectedId(selected ? "" : item.id)} className="group flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", accentSurface[visual.accent])}><Icon className="size-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-muted-foreground">{typeLabels[item.type]}</span>
                    <span className="mt-0.5 block line-clamp-2 font-display text-sm font-semibold sm:text-base">{item.title}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{topic?.title ?? learnerStatusLabel(itemAttempt?.status)}</span>
                  </span>
                  <ArrowRight className={cn("size-4 shrink-0 text-primary transition-transform", selected && "rotate-90")} aria-hidden />
                </button>
                {selected ? (
                  <div className="border-t border-border/70 bg-muted/20 px-4 py-4">
                    <p className="text-xs font-medium text-muted-foreground">What you'll do</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.brief}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{typeLabels[item.type]}</Badge>
                      {topic ? <Badge variant="outline">{topic.title}</Badge> : null}
                      <Badge variant="outline">{learnerStatusLabel(itemAttempt?.status)}</Badge>
                    </div>
                    <Button className="mt-4 w-full sm:w-auto" onClick={(event) => { event.stopPropagation(); document.getElementById("selected-practice-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                      {itemAttempt?.status === "started" ? "Continue Practice" : "Start Practice"} <ArrowRight />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {assignment ? (
        <div id="selected-practice-workspace" className="mt-7 scroll-mt-24 border-t border-border pt-6">
          <AssignmentWorkspace key={assignment.id} assignment={assignment} {...(latest ? { latestAttempt: latest } : {})} />
        </div>
      ) : null}
    </div>
  );
}


function PracticeStat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/70 px-2 py-3 text-center">
      <Icon className="mx-auto size-4 text-primary" aria-hidden />
      <p className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[0.625rem] text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function AssignmentWorkspace({
  assignment,
  latestAttempt,
}: {
  assignment: Assignment;
  latestAttempt?: AssignmentAttempt;
}) {
  const { user, actions } = useAppState();
  const [attemptId, setAttemptId] = useState(latestAttempt?.id ?? "");
  const attempt =
    user.assignmentAttempts.find(
      (item) => item.id === attemptId && item.assignmentId === assignment.id,
    ) ?? latestAttempt;
  const [response, setResponse] = useState(attempt?.responses["main"] ?? "");
  const [selfChecks, setSelfChecks] = useState<Record<string, boolean>>({});
  const [showReview, setShowReview] = useState(false);
  const marking = useAiMarking();
  const latestResponse = latestAttempt?.responses["main"] ?? "";
  const attemptResponse = attempt?.responses["main"] ?? "";
  const topic = topics.find((item) => item.id === assignment.topicId);
  const next = nextJourneyTopic(assignment.topicId, user);
  const history = useMemo(
    () => user.assignmentAttempts.filter((item) => item.assignmentId === assignment.id),
    [assignment.id, user.assignmentAttempts],
  );

  useEffect(() => {
    setAttemptId(latestAttempt?.id ?? "");
    setResponse(latestResponse);
    setSelfChecks({});
    setShowReview(false);
    marking.reset();
  }, [assignment.id, latestAttempt?.id, latestResponse, marking.reset]);
  useEffect(() => {
    setResponse(attemptResponse);
  }, [attempt?.id, attemptResponse]);

  function start(previousAttemptId?: string) {
    const now = new Date().toISOString();
    const next: AssignmentAttempt = {
      id: crypto.randomUUID(),
      assignmentId: assignment.id,
      topicId: assignment.topicId,
      status: "started",
      responses: {},
      criterionResults: [],
      ...(previousAttemptId ? { previousAttemptId } : {}),
      createdAt: now,
      updatedAt: now,
    };
    actions.addAssignmentAttempt(next);
    setAttemptId(next.id);
    setResponse("");
    setSelfChecks({});
    setShowReview(false);
    toast.success(previousAttemptId ? "Retake started." : "Assignment started.");
  }

  function update(patch: Partial<AssignmentAttempt>) {
    if (!attempt) return;
    actions.updateAssignmentAttempt({ ...attempt, ...patch, updatedAt: new Date().toISOString() });
  }

  function save() {
    if (!attempt) return;
    update({ responses: { ...attempt.responses, main: response } });
    toast.success("Draft saved.");
  }
  function submit() {
    if (!attempt || !response.trim()) {
      toast.error("Write a response before submitting.");
      return;
    }
    const now = new Date().toISOString();
    update({
      responses: { ...attempt.responses, main: response.trim() },
      status: "submitted",
      submittedAt: now,
    });
    toast.success("Assignment submitted for evaluation.");
  }

  async function evaluate() {
    if (!attempt || attempt.status !== "submitted") return;
    const written = attempt.responses["main"] ?? "";

    // The AI marker reads the whole answer against the rubric. When it is
    // unreachable, the offline concept matcher still grades the attempt.
    const graded = await marking.mark({
      topic: topic?.title ?? assignment.title,
      task: typeLabels[assignment.type],
      question: `${assignment.brief}\n\n${assignment.responsePrompt}`,
      answer: written,
      ...(assignment.modelAnswer ? { modelAnswer: assignment.modelAnswer } : {}),
      criteria: assignment.rubric.map((criterion) => ({
        id: criterion.id,
        label: criterion.label,
        description: criterion.description,
        ...(criterion.expectedAnswer ? { expected: criterion.expectedAnswer } : {}),
      })),
    }, assignment.topicId);

    const aiCriteria = new Map(graded?.criteria.map((item) => [item.id, item]));
    const results: AssignmentCriterionResult[] = assignment.rubric.map((criterion) => {
      const marked = aiCriteria.get(criterion.id);
      const passed = marked
        ? marked.correct
        : criterionPassed(written, criterion, selfChecks[criterion.id]);
      return {
        criterionId: criterion.id,
        earnedPoints: passed ? criterion.points : 0,
        feedback:
          marked?.feedback ||
          (passed
            ? "Correct, your answer carries this idea."
            : `This idea is not in your answer yet. Here is what I was looking for: ${criterion.expectedAnswer ?? criterion.description}`),
      };
    });
    const score =
      graded?.score ?? Math.round(results.reduce((sum, item) => sum + item.earnedPoints, 0));
    const now = new Date().toISOString();
    update({
      status: "evaluated",
      score,
      maxScore: 100,
      criterionResults: results,
      feedback:
        graded?.verdict ||
        (score >= 70
          ? `Nice work, you covered ${results.filter((item) => item.earnedPoints > 0).length} of ${results.length} points of the answer.`
          : `You covered ${results.filter((item) => item.earnedPoints > 0).length} of ${results.length} points of the answer. Have a look at the answer below, then take another run at it.`),
      evaluationMode: assignment.evaluationMode,
      evaluatedAt: now,
    });
    if (score >= 70) {
      user.mistakes
        .filter((mistake) => mistake.assignmentId === assignment.id && !mistake.resolved)
        .forEach((mistake) => actions.setMistakeResolved(mistake.id, true));
    }
    if (score < 70)
      actions.recordMistake({
        topicId: assignment.topicId,
        activity: "assignment",
        category:
          assignment.type === "command_challenge"
            ? "command_knowledge_gap"
            : assignment.type === "scenario" || assignment.type === "incident"
              ? "scenario_recognition_failure"
              : assignment.type === "troubleshoot"
                ? "reasoning_error"
                : "misunderstood_concept",
        severity: score < 40 ? "high" : "medium",
        assignmentId: assignment.id,
        assignmentAttemptId: attempt.id,
        attemptId: attempt.id,
        createdAt: now,
      });
    if (score >= 70) toast.success(`Nice work, scored ${score}/100.`);
    else toast(`Scored ${score}/100. The answer is below whenever you want another go.`);
  }

  function complete() {
    if (!attempt || attempt.status !== "evaluated") return;
    update({ status: "completed", completedAt: new Date().toISOString() });
    setShowReview(true);
    toast.success("Assignment completed.");
  }
  const canEdit = attempt?.status === "started";
  const resultMap = new Map(attempt?.criterionResults.map((item) => [item.criterionId, item]));
  return (
    <div className="space-y-5">
      <LearningBreadcrumbs items={[{ label: "Practice", to: "/practice" }, ...(topic ? [{ label: topic.title, to: "/topics/$topicId", params: { topicId: topic.id } }] : []), { label: assignment.title }]} />
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>{typeLabels[assignment.type]}</Badge>
              <Badge variant="outline">{topic?.title}</Badge>
              <Badge variant="secondary">
                {assignment.evaluationMode === "automatic"
                  ? "Objective evaluation"
                  : "Learner self-evaluation"}
              </Badge>
            </div>
            <h2 className="mt-3 font-display text-xl font-semibold">{assignment.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{assignment.brief}</p>
          </div>
        </div>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {assignment.instructions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Panel>

      {!attempt ? (
        <Panel
          title="Ready to begin"
          description="Starting creates an attempt. Viewing this assignment has not changed your progress."
        >
          <Button onClick={() => start()}>
            <ClipboardList />
            Start assignment
          </Button>
        </Panel>
      ) : (
        <>
          <Panel title="Response" description={assignment.responsePrompt} descriptionVisibility="visible">
            <Textarea
              aria-label="Assignment response"
              rows={9}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              disabled={!canEdit}
              placeholder="Write your evidence-based response here."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={save} disabled={!canEdit}>
                <Save />
                Save
              </Button>
              <Button onClick={submit} disabled={!canEdit}>
                <Send />
                Submit
              </Button>
              {attempt.status === "submitted" ? (
                <Button onClick={() => void evaluate()} disabled={marking.busy}>
                  <CheckCircle2 />
                  {marking.busy ? "Marking…" : "Evaluate"}
                </Button>
              ) : null}
              {attempt.status === "evaluated" ? (
                <Button onClick={complete}>
                  <CheckCircle2 />
                  Complete
                </Button>
              ) : null}
              {attempt.status === "completed" ? (
                <Button variant="secondary" onClick={() => setShowReview((current) => !current)}>
                  <FileText />
                  Review
                </Button>
              ) : null}
              {attempt.status === "completed" ? (
                <Button variant="outline" onClick={() => start(attempt.id)}>
                  <RotateCcw />
                  Retake
                </Button>
              ) : null}
            </div>
          </Panel>

          <Panel
            title="Evaluation"
            description="GAYL reads your whole answer against each point of the correct answer. Wording does not matter, only the idea."
          >
            <AiFeedback state={marking} showScore={false} />
            <div className="space-y-3">
              {assignment.rubric.map((criterion) => {
                const result = resultMap.get(criterion.id);
                return (
                  <div key={criterion.id} className="rounded-md border border-border p-4">
                    <div className="flex items-start gap-3">
                      {assignment.evaluationMode === "self_rubric" &&
                      attempt.status === "submitted" ? (
                        <Checkbox
                          aria-label={`${criterion.label}: ${criterion.description}`}
                          checked={selfChecks[criterion.id] ?? false}
                          onCheckedChange={(checked) =>
                            setSelfChecks((current) => ({
                              ...current,
                              [criterion.id]: checked === true,
                            }))
                          }
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-medium">{criterion.label}</p>
                          <div className="flex items-center gap-2">
                            {result ? (
                              <Badge variant={result.earnedPoints > 0 ? "default" : "secondary"}>
                                {result.earnedPoints > 0 ? "Correct" : "Not yet"}
                              </Badge>
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                              {Math.round(criterion.points)} pts
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {criterion.description}
                        </p>
                        {result ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {Math.round(result.earnedPoints)} points, {result.feedback}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {attempt.score !== undefined ? (
              <div className="mt-5">
                <div className="flex justify-between text-sm">
                  <span>Score</span>
                  <strong>{attempt.score}/100</strong>
                </div>
                <Progress className="mt-2" value={attempt.score} />
                <p className="mt-2 text-sm text-muted-foreground">{attempt.feedback}</p>
              </div>
            ) : null}
          </Panel>

          {attempt.score !== undefined && assignment.modelAnswer ? (
            <Panel
              title="The answer"
              description="What a full answer covers. Compare it with your own wording."
            >
              <p className="whitespace-pre-wrap rounded-md border border-border p-4 text-sm text-muted-foreground">
                {assignment.modelAnswer}
              </p>
            </Panel>
          ) : null}
        </>
      )}

      <AnnotationPanel
        target={{
          kind: "assignment",
          id: assignment.id,
          label: assignment.title,
          href: "/practice",
        }}
        title="Assignment notes and bookmark"
        description="Private context for this assignment, saved with your other notes and bookmarks."
      />

      {showReview && attempt ? (
        <Panel title="Review" description="Saved work, evaluation, and lifecycle history.">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 capitalize">{attempt.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Evaluation</dt>
              <dd className="mt-1">
                {attempt.evaluationMode === "self_rubric"
                  ? "Learner self-evaluation"
                  : "Objective evidence check"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Score</dt>
              <dd className="mt-1">{attempt.score ?? 0}/100</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Attempts</dt>
              <dd className="mt-1">{history.length}</dd>
            </div>
          </dl>
          <h3 className="mt-5 text-sm font-medium">Submitted response</h3>
          <p className="mt-2 whitespace-pre-wrap rounded-md border border-border p-4 text-sm text-muted-foreground">
            {attempt.responses["main"]}
          </p>
        </Panel>
      ) : null}

      {attempt?.status === "completed" ? (
        <Panel title="Practice complete" description={`${assignment.title} is recorded.`}>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/topics/$topicId" params={{ topicId: assignment.topicId }}>Return to topic</Link></Button>
            {next ? <Button asChild size="sm" variant="secondary"><Link to="/topics/$topicId" params={{ topicId: next.id }}>Next topic</Link></Button> : <Button asChild size="sm" variant="secondary"><Link to="/my-path">Continue path</Link></Button>}
          </div>
        </Panel>
      ) : null}

      {history.length > 0 ? (
        <Panel title="Attempt history">
          <div className="space-y-2">
            {history.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setAttemptId(item.id);
                  setShowReview(item.status === "completed");
                }}
              >
                <span>Attempt {history.length - index}</span>
                <span className="capitalize text-muted-foreground">
                  {item.status} {item.score !== undefined ? `· ${item.score}/100` : ""}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
