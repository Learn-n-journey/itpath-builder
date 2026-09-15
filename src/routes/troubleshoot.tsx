import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, RotateCcw, Save, Send, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GaylNote } from "@/components/gayl/gayl-note";
import { troubleshootingInsight } from "@/lib/gayl/insights";
import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { incidents } from "@/data/static-content";
import { topics } from "@/data/static-content";
import type { Incident, IncidentAttempt } from "@/lib/app-data/types";
import { adaptivePath } from "@/lib/adaptive-path";
import {
  createIncidentAttempt,
  incidentCategoryLabels,
  incidentMistakeSignals,
  incidentStatusLabel,
  scoreIncident,
} from "@/lib/troubleshoot-engine";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/troubleshoot")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Troubleshoot Real IT Incidents — IT PATH" },
      {
        name: "description",
        content:
          "Work realistic hardware, Windows, networking, DNS, DHCP, Linux, security, cloud and identity incidents with scored diagnosis, fix, verification and documentation.",
      },
      { property: "og:title", content: "Troubleshoot Real IT Incidents — IT PATH" },
      {
        property: "og:description",
        content: "Run diagnostic steps, justify your reasoning and prove the fix worked.",
      },
    ],
  }),
  component: TroubleshootPageGated,
});

function TroubleshootPageGated() {
  return (
    <ProGate feature="The incident simulator">
      <TroubleshootPage />
    </ProGate>
  );
}

const METHOD = [
  "Identify the problem and gather information",
  "Establish a theory of probable cause",
  "Test the theory to determine the cause",
  "Establish a plan of action",
  "Implement the solution or escalate",
  "Verify full functionality",
  "Document findings, actions and outcomes",
];

function TroubleshootPage() {
  const { user } = useAppState();
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const ordered = useMemo(() => {
    const focusIds = new Set(adaptivePath(user).topics.map((topic) => topic.id));
    return [...incidents].sort(
      (a, b) => Number(focusIds.has(b.topicId)) - Number(focusIds.has(a.topicId)),
    );
  }, [user]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    return ordered.filter((item) =>
      [item.title, item.report, incidentCategoryLabels[item.category]]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [ordered, query]);
  const incident = ordered.find((item) => item.id === selectedId) ?? visible[0] ?? ordered[0];
  const attempts = user.incidentAttempts;
  const latest = incident
    ? attempts.find((attempt) => attempt.incidentId === incident.id)
    : undefined;
  const resolved = attempts.filter((attempt) => attempt.status === "submitted");
  const averageScore =
    resolved.length > 0
      ? Math.round(
          resolved.reduce((sum, attempt) => sum + (attempt.totalScore ?? 0), 0) / resolved.length,
        )
      : 0;

  return (
    <>
      <PageHeader
        title="Troubleshoot"
        description="Realistic incidents worked the way a technician works them: gather evidence, diagnose, fix, verify and document. IT PATH simulates the findings; it never touches real equipment."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Incidents" value={incidents.length} />
        <StatCard
          label="In progress"
          value={attempts.filter((attempt) => attempt.status === "in_progress").length}
        />
        <StatCard label="Resolved" value={resolved.length} />
        <StatCard label="Average score" value={resolved.length ? `${averageScore}%` : "—"} />
      </div>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel
            title="Incident queue"
            description={`${visible.length} of ${incidents.length} incidents shown. Ones matching your certification come first.`}
          >
            <Input
              aria-label="Search incidents"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by symptom or category"
              className="mb-3"
            />
            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incident matches that search.</p>
              ) : null}
              {visible.map((item) => {
                const itemAttempt = attempts.find((attempt) => attempt.incidentId === item.id);
                return (
                  <Button
                    key={item.id}
                    variant={item.id === incident?.id ? "secondary" : "ghost"}
                    className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs text-primary">
                        {incidentCategoryLabels[item.category]}
                      </span>
                      <span className="mt-1 block">{item.title}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {incidentStatusLabel(itemAttempt)}
                        {itemAttempt?.status === "submitted" && itemAttempt.totalScore != null
                          ? ` · ${itemAttempt.totalScore}%`
                          : ""}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </Panel>
          <Panel title="The method you use every time">
            <ol className="space-y-2 text-sm text-muted-foreground">
              {METHOD.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="font-mono text-primary">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        {incident ? (
          <IncidentWorkspace
            key={incident.id}
            incident={incident}
            {...(latest ? { latestAttempt: latest } : {})}
          />
        ) : null}
      </div>
    </>
  );
}

function IncidentWorkspace({
  incident,
  latestAttempt,
}: {
  incident: Incident;
  latestAttempt?: IncidentAttempt;
}) {
  const { user, actions } = useAppState();
  const [attemptId, setAttemptId] = useState(latestAttempt?.id ?? "");
  const attempt =
    user.incidentAttempts.find((item) => item.id === attemptId) ??
    (attemptId ? undefined : latestAttempt);

  const [reasoning, setReasoning] = useState(attempt?.reasoning ?? "");
  const [documentation, setDocumentation] = useState(attempt?.documentation ?? "");
  const [causeFeedback, setCauseFeedback] = useState<string | null>(null);
  const [fixFeedback, setFixFeedback] = useState<string | null>(null);

  const topic = topics.find((item) => item.id === incident.topicId);
  const history = useMemo(
    () => user.incidentAttempts.filter((item) => item.incidentId === incident.id),
    [user.incidentAttempts, incident.id],
  );

  const submitted = attempt?.status === "submitted";
  const performed = attempt?.performedActionIds ?? [];

  function start(previousAttemptId?: string) {
    const next = createIncidentAttempt(incident, previousAttemptId);
    actions.addIncidentAttempt(next);
    setAttemptId(next.id);
    setReasoning("");
    setDocumentation("");
    setCauseFeedback(null);
    setFixFeedback(null);
  }

  function patch(changes: Partial<IncidentAttempt>) {
    if (!attempt || attempt.status === "submitted") return;
    actions.updateIncidentAttempt({
      ...attempt,
      ...changes,
      updatedAt: new Date().toISOString(),
    } as IncidentAttempt);
  }

  function runAction(actionId: string) {
    if (!attempt || submitted || performed.includes(actionId)) return;
    patch({ performedActionIds: [...performed, actionId] });
  }

  function chooseCause(causeId: string) {
    if (!attempt || submitted) return;
    const cause = incident.causes.find((item) => item.id === causeId);
    if (!cause) return;
    patch({
      causeGuessIds: [...attempt.causeGuessIds, causeId],
      selectedCauseId: causeId,
    });
    setCauseFeedback(
      cause.correct
        ? "That matches the evidence. Explain your reasoning next."
        : (cause.hint ??
            "That does not fit the evidence you have gathered. Collect more findings and try again."),
    );
  }

  function chooseFix(fixId: string) {
    if (!attempt || submitted) return;
    const fix = incident.fixes.find((item) => item.id === fixId);
    if (!fix) return;
    patch({ selectedFixId: fixId });
    setFixFeedback(
      fix.correct
        ? "A proportionate fix for the cause you identified."
        : (fix.hint ?? "Consider whether this addresses the cause or only the symptom."),
    );
  }

  function toggleVerification(id: string) {
    if (!attempt || submitted) return;
    const current = attempt.verificationIds;
    patch({
      verificationIds: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  }

  function save() {
    if (!attempt) return;
    patch({ reasoning, documentation });
    toast.success("Progress saved");
  }

  function submit() {
    if (!attempt || submitted) return;
    if (!attempt.selectedCauseId || !attempt.selectedFixId) {
      toast.error("Choose a root cause and a fix before submitting.");
      return;
    }
    const finished: IncidentAttempt = {
      ...attempt,
      reasoning,
      documentation,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { scores, total } = scoreIncident(incident, finished);
    actions.updateIncidentAttempt({ ...finished, scores, totalScore: total });

    for (const signal of incidentMistakeSignals(incident, finished, scores)) {
      actions.recordMistake({
        topicId: incident.topicId,
        activity: "troubleshoot",
        category: signal.category,
        severity: signal.severity,
        attemptId: finished.id,
      });
    }
    actions.addLearnerSignal({
      topicId: incident.topicId,
      kind: "troubleshoot",
      correct: total >= 70,
      score: total / 100,
      elapsedMs: new Date(finished.updatedAt).getTime() - new Date(finished.createdAt).getTime(),
    });
    if (total < 70) {
      actions.ensureReview({ topicId: incident.topicId });
    }
    toast.success(`Incident submitted — ${total}%`);
  }

  if (!attempt) {
    return (
      <Panel title={incident.title} description={incidentCategoryLabels[incident.category]}>
        <p className="text-sm text-muted-foreground">{incident.report}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="text-foreground">Environment: </span>
          {incident.environment}
        </p>
        <Button className="mt-5" onClick={() => start()}>
          Start incident
        </Button>
      </Panel>
    );
  }

  const scores = submitted ? attempt.scores : undefined;

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">{incident.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {incidentCategoryLabels[incident.category]}
              {topic ? ` · ${topic.title}` : ""}
            </p>
          </div>
          <Badge variant={submitted ? "default" : "secondary"}>
            {incidentStatusLabel(attempt)}
          </Badge>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{incident.report}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="text-foreground">Environment: </span>
          {incident.environment}
        </p>
      </Panel>

      <Panel
        title="Diagnostic actions"
        description="Each step returns its own finding. Choosing everything costs efficiency; choosing nothing costs accuracy."
      >
        <div className="space-y-3">
          {incident.actions.map((action) => {
            const done = performed.includes(action.id);
            return (
              <div key={action.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    {action.command ? (
                      <p className="mt-1 font-mono text-xs text-primary">{action.command}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant={done ? "ghost" : "secondary"}
                    disabled={done || submitted}
                    onClick={() => runAction(action.id)}
                  >
                    <Terminal className="size-4" aria-hidden />
                    {done ? "Run" : "Run step"}
                  </Button>
                </div>
                {done ? (
                  <p className="mt-3 rounded-md bg-secondary/60 p-3 text-sm text-muted-foreground">
                    {action.finding}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {performed.length} step{performed.length === 1 ? "" : "s"} run.
        </p>
      </Panel>

      <Panel title="Diagnose" description="Name the root cause. A wrong choice narrows the search but never reveals the answer.">
        <div className="space-y-2">
          {incident.causes.map((cause) => (
            <Button
              key={cause.id}
              variant={attempt.selectedCauseId === cause.id ? "secondary" : "ghost"}
              className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
              disabled={submitted}
              onClick={() => chooseCause(cause.id)}
            >
              {cause.label}
            </Button>
          ))}
        </div>
        {causeFeedback ? (
          <p className="mt-3 flex gap-2 rounded-md bg-secondary/60 p-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{causeFeedback}</span>
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          Diagnoses attempted: {attempt.causeGuessIds.length}
        </p>
      </Panel>

      <Panel title="Explain your reasoning" description="Which findings led you here, and which possibilities did they rule out?">
        <Textarea
          value={reasoning}
          onChange={(event) => setReasoning(event.target.value)}
          disabled={submitted}
          rows={5}
          placeholder="The evidence that decided it, and what it ruled out…"
        />
      </Panel>

      <Panel title="Fix" description="Choose the action proportionate to the cause.">
        <div className="space-y-2">
          {incident.fixes.map((fix) => (
            <Button
              key={fix.id}
              variant={attempt.selectedFixId === fix.id ? "secondary" : "ghost"}
              className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
              disabled={submitted}
              onClick={() => chooseFix(fix.id)}
            >
              {fix.label}
            </Button>
          ))}
        </div>
        {fixFeedback ? (
          <p className="mt-3 rounded-md bg-secondary/60 p-3 text-sm text-muted-foreground">
            {fixFeedback}
          </p>
        ) : null}
      </Panel>

      <Panel title="Verify" description="Select every check that proves full functionality is restored.">
        <div className="space-y-3">
          {incident.verifications.map((item) => (
            <label key={item.id} className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={attempt.verificationIds.includes(item.id)}
                disabled={submitted}
                onCheckedChange={() => toggleVerification(item.id)}
              />
              <span className="text-muted-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Document" description="Write the ticket note: symptom, evidence, cause, action taken and verification.">
        <Textarea
          value={documentation}
          onChange={(event) => setDocumentation(event.target.value)}
          disabled={submitted}
          rows={6}
          placeholder="Symptom · Evidence · Root cause · Action taken · Verification · Prevention"
        />
      </Panel>

      {!submitted ? (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={save}>
            <Save className="size-4" aria-hidden />
            Save
          </Button>
          <Button onClick={submit}>
            <Send className="size-4" aria-hidden />
            Submit incident
          </Button>
        </div>
      ) : null}

      {submitted && scores ? (
        <Panel title="Scored review" description="Six dimensions, scored from what you actually did.">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Diagnostic choices", scores.diagnosticChoices],
                ["Technical accuracy", scores.technicalAccuracy],
                ["Reasoning", scores.reasoning],
                ["Efficiency", scores.efficiency],
                ["Verification", scores.verification],
                ["Documentation", scores.documentation],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted-foreground">{value}%</span>
                </div>
                <Progress className="mt-2" value={value} />
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm">
            <span className="font-display text-2xl font-semibold tabular-nums">
              {attempt.totalScore}%
            </span>{" "}
            <span className="text-muted-foreground">overall</span>
          </p>
          <div className="mt-5 rounded-lg border border-border/60 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
              Root cause
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{incident.rootCause}</p>
          </div>
          <GaylNote className="mt-5" {...troubleshootingInsight(scores)} />
          <Button className="mt-5" variant="secondary" onClick={() => start(attempt.id)}>
            <RotateCcw className="size-4" aria-hidden />
            Retake incident
          </Button>
        </Panel>
      ) : null}

      {history.length > 1 ? (
        <Panel title="Attempt history" description="Every attempt is kept; nothing is overwritten.">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2">
                <span>{new Date(item.createdAt).toLocaleString()}</span>
                <span className="tabular-nums">
                  {item.status === "submitted" ? `${item.totalScore ?? 0}%` : "In progress"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
