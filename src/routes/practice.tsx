import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { assignments, certifications, topics } from "@/data/static-content";
import type {
  Assignment,
  AssignmentAttempt,
  AssignmentCriterionResult,
  AssignmentRubricCriterion,
} from "@/lib/app-data/types";
import { AiFeedback, useAiMarking } from "@/components/learning/ai-marking";
import { answerMatches, matchesConcept } from "@/lib/fuzzy-match";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";
import { selectedCertification } from "@/lib/adaptive-path";

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
          "Practice tasks for every certification, evaluated against visible criteria and saved as attempts.",
      },
      { property: "og:title", content: "Practice | IT PATH" },
      {
        property: "og:description",
        content: "Applied IT practice grouped by certification, with honest evaluation and review.",
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

const OTHER = "other";

function certificationIdFor(assignment: Assignment): string {
  return topics.find((topic) => topic.id === assignment.topicId)?.certificationId ?? OTHER;
}

function PracticePage() {
  const { user } = useAppState();
  const { assignment: requestedAssignmentId } = Route.useSearch();
  const requested = requestedAssignmentId
    ? assignments.find((item) => item.id === requestedAssignmentId)
    : undefined;
  const [seed, reshuffle] = useShuffleSeed();
  const [selectedId, setSelectedId] = useState(requested?.id ?? "");
  const [group, setGroup] = useState(() =>
    requested ? certificationIdFor(requested) : selectedCertification(user.settings).id,
  );

  useEffect(() => {
    if (!requested) return;
    setSelectedId(requested.id);
    setGroup(certificationIdFor(requested));
  }, [requested]);

  const groups = useMemo(() => {
    const shuffled = shuffleWithSeed(assignments, seed);
    return certifications
      .map((certification) => ({
        id: certification.id,
        title: certification.title,
        items: shuffled.filter((item) => certificationIdFor(item) === certification.id),
      }))
      .concat([
        {
          id: OTHER,
          title: "General practice",
          items: shuffled.filter((item) => certificationIdFor(item) === OTHER),
        },
      ])
      .filter((entry) => entry.items.length > 0);
  }, [seed]);

  const activeGroup = groups.find((entry) => entry.id === group) ?? groups[0];
  const assignment =
    activeGroup?.items.find((item) => item.id === selectedId) ?? activeGroup?.items[0];

  function refresh() {
    reshuffle();
    setSelectedId("");
  }

  const attempts = user.assignmentAttempts;
  const latest = assignment
    ? attempts.find((attempt) => attempt.assignmentId === assignment.id)
    : undefined;

  return (
    <>
      <PageHeader
        title="Practice"
        description="Applied tasks grouped by certification and evaluated against visible criteria. Opening a task never changes your progress."
        actions={
          <Button variant="outline" onClick={refresh}>
            <RefreshCw /> Shuffle
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Available" value={assignments.length} />
        <StatCard label="Started" value={attempts.filter((a) => a.status === "started").length} />
        <StatCard
          label="Submitted"
          value={
            attempts.filter((a) => a.status === "submitted" || a.status === "evaluated").length
          }
        />
        <StatCard
          label="Completed"
          value={attempts.filter((a) => a.status === "completed").length}
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {groups.map((entry) => (
          <Button
            key={entry.id}
            size="sm"
            variant={entry.id === activeGroup?.id ? "secondary" : "outline"}
            onClick={() => {
              setGroup(entry.id);
              setSelectedId("");
            }}
          >
            {entry.title}
            <span className="ml-1 text-xs text-muted-foreground">{entry.items.length}</span>
          </Button>
        ))}
      </div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Panel
          title={activeGroup?.title ?? "Practice library"}
          description="Every task attached to this certification, reshuffled whenever you refresh."
        >
          <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {activeGroup?.items.map((item) => {
              const itemAttempt = attempts.find((attempt) => attempt.assignmentId === item.id);
              return (
                <Button
                  key={item.id}
                  variant={item.id === assignment?.id ? "secondary" : "ghost"}
                  className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-primary">{typeLabels[item.type]}</span>
                    <span className="mt-1 block">{item.title}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {itemAttempt?.status.replace("_", " ") ?? "Not started"}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </Panel>
        {assignment ? (
          <AssignmentWorkspace
            key={assignment.id}
            assignment={assignment}
            {...(latest ? { latestAttempt: latest } : {})}
          />
        ) : null}
      </div>
    </>
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
            : `Incorrect, this idea is missing. Expected: ${criterion.expectedAnswer ?? criterion.description}`),
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
          ? `Correct, you covered ${results.filter((item) => item.earnedPoints > 0).length} of ${results.length} points of the answer.`
          : `Incorrect, you covered ${results.filter((item) => item.earnedPoints > 0).length} of ${results.length} points of the answer. Compare your work with the answer below and retake.`),
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
    if (score >= 70) toast.success(`Correct, scored ${score}/100.`);
    else toast.error(`Incorrect, scored ${score}/100. The answer is shown below.`);
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
          <Panel title="Response" description={assignment.responsePrompt}>
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
            description="An AI examiner reads your whole answer against each point of the correct answer. Wording does not matter, only the idea."
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
                              <Badge variant={result.earnedPoints > 0 ? "default" : "destructive"}>
                                {result.earnedPoints > 0 ? "Correct" : "Incorrect"}
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
