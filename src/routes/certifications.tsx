import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";
import {
  EXAM_READY_SCORE,
  certificationStatusLabels,
  scoreAllCertifications,
} from "@/lib/certification-engine";
import type { CertificationObjective } from "@/lib/app-data/types";

export const Route = createFileRoute("/certifications")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Certifications — IT PATH" },
      { name: "description", content: "Readiness for nine CompTIA certifications, calculated from your recorded work." },
      { property: "og:title", content: "Certifications — IT PATH" },
      { property: "og:description", content: "Objective maps, domain readiness and learner-confirmed exam results." },
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

function Certifications() {
  const { user, actions } = useAppState();
  const readiness = useMemo(() => scoreAllCertifications(user), [user]);
  const [selectedId, setSelectedId] = useState(readiness[0]?.certification.id ?? "");
  const [examNote, setExamNote] = useState("");
  const [confirmPass, setConfirmPass] = useState(false);
  const [draft, setDraft] = useState<CertificationObjective | null>(null);

  const selected = readiness.find((row) => row.certification.id === selectedId) ?? readiness[0]!;
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
      <PageHeader
        title="Certifications"
        description={`Readiness is calculated from your recorded study, labs, assignments, quizzes and troubleshooting. Your target is ${user.settings.certificationTarget}.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Certifications tracked" value={readiness.length} />
        <StatCard
          label="Exam ready"
          value={readiness.filter((r) => r.status === "exam_ready").length}
          hint={`Needs curriculum complete and ${EXAM_READY_SCORE}% overall`}
        />
        <StatCard
          label="Passed (confirmed by you)"
          value={readiness.filter((r) => r.status === "exam_passed").length}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="Certifications">
          <ul className="space-y-1">
            {readiness.map((row) => {
              const active = row.certification.id === selected.certification.id;
              return (
                <li key={row.certification.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(row.certification.id);
                      setDraft(null);
                      setConfirmPass(false);
                      setExamNote("");
                    }}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                      active ? "bg-secondary text-foreground" : "hover:bg-secondary/60"
                    }`}
                    aria-current={active}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.certification.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {certificationStatusLabels[row.status]}
                      </span>
                    </span>
                    <span className="text-xs font-semibold tabular-nums">{row.overall}%</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="grid gap-4 content-start">
          <Panel
            title={`${selected.certification.title} (${selected.certification.code ?? ""})`}
            description={selected.certification.description}
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
              <button type="button" className="btn-secondary" onClick={startNew}>
                Add objective
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => actions.resetCertificationObjectives(selected.certification.id)}
              >
                Reset to defaults
              </button>
            </div>

            {draft ? (
              <div className="mt-4 grid gap-2 rounded-lg border border-border p-3">
                <input
                  className="input"
                  placeholder="Code (e.g. 1.1)"
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Domain"
                  value={draft.domain ?? ""}
                  onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Objective"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
                <div className="flex gap-2">
                  <button type="button" className="btn-primary" onClick={saveDraft}>
                    Save objective
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>
                    Cancel
                  </button>
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
            <textarea
              className="input min-h-20"
              placeholder="Optional note: test centre, date, score report."
              value={examNote}
              onChange={(e) => setExamNote(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  actions.declareExamOutcome(selected.certification.id, "attempted", examNote.trim());
                  setExamNote("");
                }}
              >
                Record exam attempted
              </button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.checked)}
                />
                I confirm I passed this exam
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={!confirmPass}
                onClick={() => {
                  actions.declareExamOutcome(selected.certification.id, "passed", examNote.trim());
                  setConfirmPass(false);
                  setExamNote("");
                }}
              >
                Confirm exam passed
              </button>
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
