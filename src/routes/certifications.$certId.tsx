import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { topics } from "@/data/static-content";
import { useAppState } from "@/state/app-state";
import {
  certificationStatusLabels,
  scoreAllCertifications,
} from "@/lib/certification-engine";
import type { CertificationObjective } from "@/lib/app-data/types";

export const Route = createFileRoute("/certifications/$certId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Certification readiness — IT PATH" },
      { name: "description", content: "Months, topics, objectives and readiness for a single CompTIA certification." },
      { property: "og:title", content: "Certification readiness — IT PATH" },
      { property: "og:description", content: "Month blocks, domain readiness and learner-confirmed exam results." },
    ],
  }),
  component: Certifications,
});

function monthLabel(months: number[]) {
  if (months.length === 0) return "Optional specialisation — no scheduled months";
  if (months.length === 1) return `Month ${months[0]}`;
  return `Months ${months[0]}–${months[months.length - 1]}`;
}

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

function Certifications() {
  const { user, actions } = useAppState();
  const readiness = useMemo(() => scoreAllCertifications(user), [user]);
  const { certId } = Route.useParams();
  const [examNote, setExamNote] = useState("");
  const [confirmPass, setConfirmPass] = useState(false);
  const [draft, setDraft] = useState<CertificationObjective | null>(null);

  const selected = readiness.find((row) => row.certification.id === certId);
  const months = selected?.certification.months ?? [];
  const monthTopics = useMemo(
    () => topics.filter((topic) => months.includes(topic.month)).sort((a, b) => a.month - b.month || a.week - b.week),
    [months],
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
        description={`${monthLabel(months)}. Readiness is calculated from your recorded study, labs, assignments, quizzes and troubleshooting. Your target is ${user.settings.certificationTarget}.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall readiness" value={`${selected.overall}%`} />
        <StatCard label="Status" value={certificationStatusLabels[selected.status]} />
        <StatCard label="Topics in this block" value={monthTopics.length} />
      </div>

      <div className="mt-4 grid gap-4">
        <Panel
          title="Months and topics"
          description={
            months.length > 0
              ? "These curriculum months belong to this certification."
              : "This certification is not scheduled in the 24-month path. Study it as an optional specialisation."
          }
        >
          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled months.</p>
          ) : (
            <div className="space-y-5">
              {months.map((month) => (
                <section key={month}>
                  <div className="mb-2 flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-primary">MONTH {month}</span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {monthTopics
                      .filter((topic) => topic.month === month)
                      .map((topic) => (
                        <li key={topic.id}>
                          <Link
                            to="/topics/$topicId"
                            params={{ topicId: topic.id }}
                            className="block min-w-0 rounded-lg border border-border bg-background/40 p-3 hover:bg-secondary/50"
                          >
                            <span className="block truncate text-sm font-medium">{topic.title}</span>
                            <span className="block text-xs text-muted-foreground">
                              Week {topic.week} · {topic.difficulty}
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
