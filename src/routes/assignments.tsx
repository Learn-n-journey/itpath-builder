import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
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
import { assignments, topics } from "@/data/static-content";
import type {
  Assignment,
  AssignmentAttempt,
  AssignmentCriterionResult,
} from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/assignments")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Assignments — IT PATH" },
      {
        name: "description",
        content: "Complete rubric-based IT assignments through a saved evaluation lifecycle.",
      },
      { property: "og:title", content: "Assignments — IT PATH" },
      {
        property: "og:description",
        content: "Applied IT assignments with honest evaluation, saved attempts, and review.",
      },
    ],
  }),
  component: AssignmentsPage,
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

function AssignmentsPage() {
  const { user } = useAppState();
  const [seed, setSeed] = useState(() => newSeed());
  const [selectedId, setSelectedId] = useState("");
  const shuffled = useMemo(() => shuffleWithSeed(assignments, seed), [seed]);
  const assignment = shuffled.find((item) => item.id === selectedId) ?? shuffled[0];

  function refresh() {
    const next = newSeed();
    setSeed(next);
    setSelectedId("");
  }

  const attempts = user.assignmentAttempts;
  const latest = assignment
    ? attempts.find((attempt) => attempt.assignmentId === assignment.id)
    : undefined;

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Applied work evaluated against visible criteria, shown in a random order. Opening a task never changes your progress."
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
      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Panel
          title="Assignment library"
          description="All assignment formats are available for lifecycle testing."
        >
          <div className="space-y-2">
            {assignments.map((item) => {
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
  }, [assignment.id, latestAttempt?.id, latestResponse]);
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

  function evaluate() {
    if (!attempt || attempt.status !== "submitted") return;
    const normalized = (attempt.responses["main"] ?? "").toLowerCase();
    const results: AssignmentCriterionResult[] = assignment.rubric.map((criterion) => {
      const passed =
        assignment.evaluationMode === "automatic"
          ? (criterion.acceptedConcepts ?? []).every((concept) =>
              normalized.includes(concept.toLowerCase()),
            )
          : Boolean(selfChecks[criterion.id]);
      return {
        criterionId: criterion.id,
        earnedPoints: passed ? criterion.points : 0,
        feedback: passed
          ? "Criterion met with evidence in the response."
          : assignment.evaluationMode === "automatic"
            ? "Required technical evidence was not found."
            : "You marked this criterion as not yet met.",
      };
    });
    const score = Math.round(results.reduce((sum, item) => sum + item.earnedPoints, 0));
    const now = new Date().toISOString();
    update({
      status: "evaluated",
      score,
      maxScore: 100,
      criterionResults: results,
      feedback:
        score >= 70
          ? "The response meets the completion threshold."
          : "Review unmet criteria and retake after revising your work.",
      evaluationMode: assignment.evaluationMode,
      evaluatedAt: now,
    });
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
    toast.success(
      assignment.evaluationMode === "automatic"
        ? "Objective evaluation complete."
        : "Self-evaluation saved.",
    );
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
                <Button onClick={evaluate}>
                  <CheckCircle2 />
                  Evaluate
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
            title="Evaluation rubric"
            description={
              assignment.evaluationMode === "self_rubric"
                ? "This work cannot be judged reliably by an automatic checker. Assess your own evidence honestly against every criterion."
                : "Submission text is checked only for the explicit technical evidence below."
            }
          >
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
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-medium">{criterion.label}</p>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(criterion.points)} pts
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {criterion.description}
                        </p>
                        {result ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {Math.round(result.earnedPoints)} points — {result.feedback}
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
        </>
      )}

      <AnnotationPanel
        target={{
          kind: "assignment",
          id: assignment.id,
          label: assignment.title,
          href: "/assignments",
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
