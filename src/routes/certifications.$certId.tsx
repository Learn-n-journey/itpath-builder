import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ExternalLink, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { useAppState } from "@/state/app-state";
import {
  certificationStatusLabels,
  scoreAllCertifications,
} from "@/lib/certification-engine";
import {
  certificationQuestionPool,
  certificationStages,
  certificationStudyIndex,
  generateAssignments,
  generateExam,
  newSeed,
} from "@/lib/cert-path";
import type { CertificationObjective, Resource } from "@/lib/app-data/types";

export const Route = createFileRoute("/certifications/$certId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Certification study path — IT PATH" },
      {
        name: "description",
        content:
          "Study, reading and watching material, practice exams and assignments for a single CompTIA certification.",
      },
      { property: "og:title", content: "Certification study path — IT PATH" },
      {
        property: "og:description",
        content: "Topics from beginner to advanced, generated practice exams, domain readiness and exam results.",
      },
    ],
  }),
  component: Certifications,
});

function Meter({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <span className="text-xs font-semibold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1">
        <Meter value={value} />
      </div>
    </div>
  );
}

function MaterialList({ title, items }: { title: string; items: Resource[] }) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs font-medium text-primary">{title.toUpperCase()}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((resource) => (
            <li key={resource.id} className="min-w-0">
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 text-sm text-primary hover:underline"
              >
                <span className="min-w-0 truncate">{resource.title}</span>
                <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
              </a>
              <span className="block text-xs text-muted-foreground">
                {resource.provider} · {resource.kind} · {resource.access}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Certifications() {
  const { user, actions } = useAppState();
  const readiness = useMemo(() => scoreAllCertifications(user), [user]);
  const { certId } = Route.useParams();
  const [examNote, setExamNote] = useState("");
  const [confirmPass, setConfirmPass] = useState(false);
  const [draft, setDraft] = useState<CertificationObjective | null>(null);
  const [examSeed, setExamSeed] = useState(() => newSeed());
  const [assignmentSeed, setAssignmentSeed] = useState(() => newSeed());

  const selected = readiness.find((row) => row.certification.id === certId);
  const stages = useMemo(() => certificationStages(certId), [certId]);
  const index = useMemo(() => certificationStudyIndex(certId), [certId]);
  const poolSize = useMemo(() => certificationQuestionPool(certId).length, [certId]);
  const exam = useMemo(
    () => (selected ? generateExam(selected.certification, examSeed) : null),
    [selected, examSeed],
  );
  const generatedAssignments = useMemo(
    () => generateAssignments(certId, assignmentSeed),
    [certId, assignmentSeed],
  );

  if (!selected) {
    return (
      <>
        <PageHeader title="Certification not found" description="That certification is not part of IT PATH." />
        <Link to="/certifications" className="text-sm text-primary hover:underline">
          Back to all certifications
        </Link>
      </>
    );
  }

  const progress = user.certificationProgress[selected.certification.id];

  const startEdit = (objective: CertificationObjective) => setDraft({ ...objective });
  const startNew = () =>
    setDraft({
      id: `obj-custom-${crypto.randomUUID().slice(0, 8)}`,
      certificationId: selected.certification.id,
      code: "",
      domain: "",
      title: "",
      topicIds: [],
    });

  const saveDraft = () => {
    if (!draft || !draft.title.trim()) return;
    actions.saveCertificationObjective({
      ...draft,
      code: draft.code.trim() || "custom",
      title: draft.title.trim(),
      domain: draft.domain?.trim() || "General",
      certificationId: selected.certification.id,
      custom: !selected.objectives.some((o) => o.id === draft.id && !o.id.startsWith("obj-custom-")),
      updatedAt: new Date().toISOString(),
    });
    setDraft(null);
  };

  const removeObjective = (objective: CertificationObjective) => {
    actions.saveCertificationObjective({
      ...objective,
      removed: true,
      certificationId: selected.certification.id,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <Link to="/certifications" className="text-xs text-muted-foreground hover:underline">
        ← All certifications
      </Link>
      <PageHeader
        title={selected.certification.title}
        description={`${selected.certification.description ?? ""} Work through the topics from the start of the list to the end. Readiness is calculated from your recorded study, labs, assignments, quizzes and troubleshooting.`}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Overall readiness" value={`${selected.overall}%`} />
        <StatCard label="Status" value={certificationStatusLabels[selected.status]} />
        <StatCard label="Topics" value={index.topics.length} />
        <StatCard label="Study hours" value={Math.round(index.totalMinutes / 60)} />
      </div>

      <div className="mt-4 grid gap-4">
        <Panel
          title="Study path"
          description="Start with the groundwork, then core skills, then the advanced material."
        >
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No IT PATH topics are mapped to this certification yet. Use the reading and watching material below.
            </p>
          ) : (
            <div className="space-y-5">
              {stages.map((stage) => (
                <section key={stage.id}>
                  <div className="mb-1 flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-primary">{stage.label.toUpperCase()}</span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">{stage.description}</p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {stage.topics.map((topic) => (
                      <li key={topic.id}>
                        <Link
                          to="/topics/$topicId"
                          params={{ topicId: topic.id }}
                          className="block min-w-0 rounded-lg border border-border bg-background/40 p-3 hover:bg-secondary/50"
                        >
                          <span className="block truncate text-sm font-medium">{topic.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {topic.estimatedMinutes} min · {topic.difficulty}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Reading and watching"
          description="Official material from the vendors themselves. Links open in a new tab."
        >
          {index.read.length === 0 && index.watch.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material is linked to this certification yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <MaterialList title="Watch" items={index.watch} />
              <MaterialList title="Read" items={index.read} />
            </div>
          )}
        </Panel>

        <Panel
          title="Practice exam"
          description={
            exam
              ? `Randomly generated from ${poolSize} questions. Written answers are graded on the idea, not on exact wording.`
              : "No questions are available for this certification yet."
          }
        >
          <Button type="button" variant="outline" onClick={() => setExamSeed(newSeed())}>
            <RefreshCw /> Generate new exam
          </Button>
          {exam ? (
            <div className="mt-4">
              <QuizRunner
                key={exam.quiz.id}
                quiz={exam.quiz}
                questions={exam.questions}
                startLabel="Start practice exam"
              />
            </div>
          ) : null}
        </Panel>

        <Panel title="Assignments" description="A fresh selection of practical work each time you generate.">
          <Button type="button" variant="outline" onClick={() => setAssignmentSeed(newSeed())}>
            <RefreshCw /> Generate new assignments
          </Button>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {generatedAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="min-w-0 rounded-lg border border-border bg-background/40 p-3"
              >
                <span className="block truncate text-sm font-medium">{assignment.title}</span>
                <span className="block text-xs text-muted-foreground">{assignment.type.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
          <Link to="/assignments" className="mt-3 inline-block text-xs text-primary hover:underline">
            Open the assignment workspace
          </Link>
        </Panel>


        <div className="grid gap-4 content-start">
          <Panel
            title={`${selected.certification.title} (${selected.certification.code ?? ""})`}
            description={selected.certification.description ?? ""}
          >
            <p className="text-sm">
              Status: <span className="font-medium">{certificationStatusLabels[selected.status]}</span>
              {selected.hasEvidence ? "" : " — no evidence recorded yet"}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="Knowledge readiness" value={selected.knowledge} />
              <Metric label="Practical readiness" value={selected.practical} />
              <Metric label="Troubleshooting readiness" value={selected.troubleshooting} />
              <Metric label="Retention" value={selected.retention} />
              <Metric label="Quiz performance" value={selected.quizPerformance} />
              <Metric label="Lab completion" value={selected.labCompletion} />
              <Metric label="Assignment completion" value={selected.assignmentCompletion} />
              <Metric label="Overall readiness" value={selected.overall} />
            </div>
          </Panel>

          <Panel title="Domain readiness" description="Weak domains are listed first.">
            <ul className="space-y-3">
              {[...selected.domains]
                .sort((a, b) => a.score - b.score)
                .map((domain) => (
                  <li key={domain.domain}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                      <p className="truncate text-sm">{domain.domain}</p>
                      <span className="text-xs font-semibold tabular-nums">{domain.score}%</span>
                    </div>
                    <div className="mt-1">
                      <Meter value={domain.score} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {domain.objectiveCount} objective{domain.objectiveCount === 1 ? "" : "s"} ·{" "}
                      {domain.hasEvidence ? "evidence recorded" : "no evidence yet"}
                      {domain.score < 60 ? " · weak" : ""}
                    </p>
                  </li>
                ))}
            </ul>
          </Panel>

          <Panel
            title="Exam objectives"
            description="Objectives are editable data. Edit, add or remove them and readiness recalculates."
          >
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={startNew}>
                Add objective
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => actions.resetCertificationObjectives(selected.certification.id)}
              >
                Reset to defaults
              </Button>
            </div>

            {draft ? (
              <div className="mt-4 grid gap-2 rounded-lg border border-border p-3">
                <Input
                  placeholder="Code (e.g. 1.1)"
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
                <Input
                  placeholder="Domain"
                  value={draft.domain ?? ""}
                  onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                />
                <Input
                  placeholder="Objective"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={saveDraft}>
                    Save objective
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <ul className="mt-4 space-y-2 text-sm">
              {selected.objectives.map((objective) => (
                <li key={objective.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <span className="min-w-0">
                    <span className="font-medium">{objective.code}</span> — {objective.title}
                    <span className="block text-xs text-muted-foreground">
                      {objective.domain ?? "General"} ·{" "}
                      {(objective.topicIds ?? []).length > 0
                        ? `${(objective.topicIds ?? []).length} mapped topic(s)`
                        : "no mapped topic yet"}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2 text-xs">
                    <button type="button" className="text-primary hover:underline" onClick={() => startEdit(objective)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:underline"
                      onClick={() => removeObjective(objective)}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Exam result"
            description="IT PATH never marks an exam as passed. You confirm the result yourself."
          >
            <Textarea
              className="min-h-20"
              placeholder="Optional note: test centre, date, score report."
              value={examNote}
              onChange={(e) => setExamNote(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  actions.declareExamOutcome(selected.certification.id, "attempted", examNote.trim());
                  setExamNote("");
                }}
              >
                Record exam attempted
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={confirmPass}
                  onCheckedChange={(checked) => setConfirmPass(checked === true)}
                />
                I confirm I passed this exam
              </label>
              <Button
                type="button"
                disabled={!confirmPass}
                onClick={() => {
                  actions.declareExamOutcome(selected.certification.id, "passed", examNote.trim());
                  setConfirmPass(false);
                  setExamNote("");
                }}
              >
                Confirm exam passed
              </Button>
              {progress?.declaredStatus ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => actions.clearExamDeclaration(selected.certification.id)}
                >
                  Clear declared status
                </button>
              ) : null}
            </div>

            {progress && progress.examRecords.length > 0 ? (
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                {progress.examRecords.map((record) => (
                  <li key={record.id}>
                    {record.outcome === "passed" ? "Passed" : "Attempted"} ·{" "}
                    {new Date(record.recordedAt).toLocaleString()}
                    {record.note ? ` · ${record.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">No exam results recorded.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
