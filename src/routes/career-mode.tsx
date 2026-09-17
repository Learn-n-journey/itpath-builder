import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw, Save, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { topics } from "@/data/static-content";
import { tickets } from "@/data/static-content";
import type { CareerTrack, Ticket, TicketAttempt } from "@/lib/app-data/types";
import {
  TICKET_PASS_SCORE,
  careerTrackLabels,
  createTicketAttempt,
  scoreTicket,
  ticketMistakeSignals,
  ticketStageLabels,
  ticketStageOrder,
  ticketStatusLabel,
} from "@/lib/career-engine";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/career-mode")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Career Mode, Work Real IT Tickets | IT PATH" },
      {
        name: "description",
        content:
          "Work realistic help desk, technician, network, sysadmin and security analyst tickets: investigate, diagnose, resolve, verify and document, with scored feedback.",
      },
      { property: "og:title", content: "Career Mode, Work Real IT Tickets | IT PATH" },
      {
        property: "og:description",
        content: "Simulated support queue scored on accuracy, troubleshooting, reasoning, communication, documentation and efficiency.",
      },
    ],
  }),
  component: CareerMode,
});

const trackOrder: CareerTrack[] = [
  "help_desk",
  "it_technician",
  "network_technician",
  "junior_sysadmin",
  "junior_security_analyst",
];

const priorityLabels: Record<Ticket["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function CareerMode() {
  const { user } = useAppState();
  const [selectedId, setSelectedId] = useState(tickets[0]?.id ?? "");
  const ticket = tickets.find((item) => item.id === selectedId) ?? tickets[0];
  const attempts = user.ticketAttempts;
  const latest = ticket ? attempts.find((attempt) => attempt.ticketId === ticket.id) : undefined;
  const closed = attempts.filter((attempt) => attempt.passed);
  const submitted = attempts.filter((attempt) => attempt.status === "submitted");
  const average =
    submitted.length > 0
      ? Math.round(
          submitted.reduce((sum, attempt) => sum + (attempt.totalScore ?? 0), 0) / submitted.length,
        )
      : 0;

  return (
    <>
      <PageHeader
        title="Career Mode"
        description="A simulated support queue across five career tracks. Each ticket is worked the way the job works it: investigate, diagnose, resolve, verify, document. IT PATH simulates the findings; it never touches real systems."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tickets in queue" value={tickets.length} />
        <StatCard
          label="In progress"
          value={attempts.filter((attempt) => attempt.status === "in_progress").length}
        />
        <StatCard label="Closed" value={closed.length} />
        <StatCard label="Average score" value={submitted.length ? `${average}%` : "-"} />
      </div>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="space-y-5">
          {trackOrder.map((track) => {
            const trackTickets = tickets.filter((item) => item.track === track);
            if (trackTickets.length === 0) return null;
            return (
              <Panel key={track} title={careerTrackLabels[track]}>
                <div className="space-y-2">
                  {trackTickets.map((item) => {
                    const itemAttempt = attempts.find((attempt) => attempt.ticketId === item.id);
                    return (
                      <Button
                        key={item.id}
                        variant={item.id === ticket?.id ? "secondary" : "ghost"}
                        className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs text-primary">
                            {priorityLabels[item.priority]} priority
                          </span>
                          <span className="mt-1 block">{item.title}</span>
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            {ticketStatusLabel(itemAttempt)}
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
            );
          })}
        </div>

        {ticket ? (
          <TicketWorkspace
            key={ticket.id}
            ticket={ticket}
            {...(latest ? { latestAttempt: latest } : {})}
          />
        ) : null}
      </div>
    </>
  );
}

function TicketWorkspace({
  ticket,
  latestAttempt,
}: {
  ticket: Ticket;
  latestAttempt?: TicketAttempt;
}) {
  const { user, actions, updateUser } = useAppState();
  const [attemptId, setAttemptId] = useState(latestAttempt?.id ?? "");
  const attempt =
    user.ticketAttempts.find((item) => item.id === attemptId) ??
    (attemptId ? undefined : latestAttempt);

  const [reasoning, setReasoning] = useState(attempt?.reasoning ?? "");
  const [communication, setCommunication] = useState(attempt?.communication ?? "");
  const [documentation, setDocumentation] = useState(attempt?.documentation ?? "");
  const [diagnosisFeedback, setDiagnosisFeedback] = useState<string | null>(null);

  const topic = topics.find((item) => item.id === ticket.topicId);
  const history = useMemo(
    () => user.ticketAttempts.filter((item) => item.ticketId === ticket.id),
    [user.ticketAttempts, ticket.id],
  );

  const submitted = attempt?.status === "submitted";
  const performed = attempt?.performedActionIds ?? [];

  function start(previousAttemptId?: string) {
    const next = createTicketAttempt(ticket, previousAttemptId);
    actions.addTicketAttempt(next);
    setAttemptId(next.id);
    setReasoning("");
    setCommunication("");
    setDocumentation("");
    setDiagnosisFeedback(null);
  }

  function patch(changes: Partial<TicketAttempt>) {
    if (!attempt || attempt.status === "submitted") return;
    actions.updateTicketAttempt({
      ...attempt,
      ...changes,
      updatedAt: new Date().toISOString(),
    } as TicketAttempt);
  }

  function runAction(actionId: string) {
    if (!attempt || submitted || performed.includes(actionId)) return;
    patch({ performedActionIds: [...performed, actionId] });
  }

  function chooseDiagnosis(id: string) {
    if (!attempt || submitted) return;
    const option = ticket.diagnoses.find((item) => item.id === id);
    if (!option) return;
    patch({ diagnosisGuessIds: [...attempt.diagnosisGuessIds, id], selectedDiagnosisId: id });
    setDiagnosisFeedback(
      option.correct
        ? "That fits the evidence. Now write your reasoning and choose every resolution step the ticket needs."
        : (option.hint ??
            "The evidence you have does not support that. Gather more findings and reconsider."),
    );
  }

  function toggle(key: "resolutionIds" | "verificationIds", id: string) {
    if (!attempt || submitted) return;
    const current = attempt[key];
    patch({
      [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    } as Partial<TicketAttempt>);
  }

  function save() {
    if (!attempt) return;
    patch({ reasoning, communication, documentation });
    toast.success("Ticket saved");
  }

  function submit() {
    if (!attempt || submitted) return;
    if (!attempt.selectedDiagnosisId) {
      toast.error("Record a diagnosis before submitting.");
      return;
    }
    if (attempt.resolutionIds.length === 0 || attempt.verificationIds.length === 0) {
      toast.error("Choose your resolution steps and how you verified them.");
      return;
    }
    const finished: TicketAttempt = {
      ...attempt,
      reasoning,
      communication,
      documentation,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { scores, total, passed } = scoreTicket(ticket, finished);
    actions.updateTicketAttempt({ ...finished, scores, totalScore: total, passed });

    for (const signal of ticketMistakeSignals(ticket, finished, scores)) {
      actions.recordMistake({
        topicId: ticket.topicId,
        activity: "career",
        category: signal.category,
        severity: signal.severity,
        attemptId: finished.id,
      });
    }

    actions.addLearnerSignal({
      topicId: ticket.topicId,
      kind: "career",
      correct: passed,
      score: total / 100,
      elapsedMs: new Date(finished.updatedAt).getTime() - new Date(finished.createdAt).getTime(),
    });

    if (passed) {
      updateUser((current) => {
        const passedAttempts = current.ticketAttempts.filter(
          (item) => item.passed || item.id === finished.id,
        );
        const count = passedAttempts.length;
        const avg = (pick: (a: TicketAttempt) => number) =>
          Math.round(
            passedAttempts.reduce(
              (sum, item) => sum + (item.id === finished.id ? pick({ ...finished, scores }) : pick(item)),
              0,
            ) / Math.max(1, count),
          );
        return {
          ...current,
          careerScores: {
            ticketsCompleted: count,
            troubleshooting: avg((a) => a.scores?.troubleshooting ?? 0),
            communication: avg((a) => a.scores?.communication ?? 0),
            documentation: avg((a) => a.scores?.documentation ?? 0),
          },
        };
      });
      toast.success(`Ticket closed at ${total}%, nicely handled.`);
    } else {
      actions.ensureReview({ topicId: ticket.topicId });
      toast.error(`Ticket needs rework, ${total}%`);
    }
  }

  if (!attempt) {
    return (
      <Panel title={ticket.title} description={careerTrackLabels[ticket.track]}>
        <p className="text-sm text-muted-foreground">{ticket.report}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="text-foreground">Requester: </span>
          {ticket.requester}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="text-foreground">Environment: </span>
          {ticket.environment}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{ticket.slaNote}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ticketStageOrder.map((stage) => (
            <Badge key={stage} variant="outline">
              {ticketStageLabels[stage]}
            </Badge>
          ))}
        </div>
        <Button className="mt-5" onClick={() => start()}>
          Accept ticket
        </Button>
      </Panel>
    );
  }

  const scores = attempt.scores;

  return (
    <div className="space-y-5">
      <Panel title={ticket.title} description={`${careerTrackLabels[ticket.track]} · ${priorityLabels[ticket.priority]} priority`}>
        <p className="text-sm text-muted-foreground">{ticket.report}</p>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground">Requester: </span>
            {ticket.requester}
          </p>
          <p>
            <span className="text-foreground">Environment: </span>
            {ticket.environment}
          </p>
          <p>{ticket.slaNote}</p>
          {topic ? (
            <p>
              <span className="text-foreground">Related topic: </span>
              {topic.title}
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="1. Investigate"
        description="Run the steps you would actually run. Each returns its own finding, and unnecessary steps cost efficiency."
      >
        <div className="space-y-3">
          {ticket.actions.map((action) => {
            const done = performed.includes(action.id);
            return (
              <div key={action.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-sm">{action.label}</p>
                  <Button
                    size="sm"
                    variant={done ? "ghost" : "secondary"}
                    disabled={done || submitted}
                    onClick={() => runAction(action.id)}
                  >
                    {done ? "Run" : "Run step"}
                  </Button>
                </div>
                {action.command ? (
                  <p className="mt-2 font-mono text-xs text-primary">{action.command}</p>
                ) : null}
                {done ? (
                  <p className="mt-2 text-sm text-muted-foreground">{action.finding}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="2. Diagnose" description="State the cause the evidence supports, then explain your reasoning.">
        <div className="space-y-2">
          {ticket.diagnoses.map((option) => (
            <Button
              key={option.id}
              variant={attempt.selectedDiagnosisId === option.id ? "secondary" : "ghost"}
              className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
              disabled={submitted}
              onClick={() => chooseDiagnosis(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {diagnosisFeedback ? (
          <p className="mt-3 text-sm text-muted-foreground">{diagnosisFeedback}</p>
        ) : null}
        <label className="mt-4 block text-sm font-medium" htmlFor="ticket-reasoning">
          Your reasoning
        </label>
        <Textarea
          id="ticket-reasoning"
          className="mt-2"
          rows={4}
          placeholder="Which findings led you here, and which theories did they rule out?"
          value={reasoning}
          disabled={submitted}
          onChange={(event) => setReasoning(event.target.value)}
        />
      </Panel>

      <Panel title="3. Resolve" description="Select every step the resolution needs. One correct click does not close a ticket.">
        <div className="space-y-2">
          {ticket.resolutions.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-sm"
            >
              <Checkbox
                checked={attempt.resolutionIds.includes(option.id)}
                disabled={submitted}
                onCheckedChange={() => toggle("resolutionIds", option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="4. Verify" description="Prove the fix worked before you close anything.">
        <div className="space-y-2">
          {ticket.verifications.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-sm"
            >
              <Checkbox
                checked={attempt.verificationIds.includes(option.id)}
                disabled={submitted}
                onCheckedChange={() => toggle("verificationIds", option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="5. Communicate and document" description="One update for the requester, one record for your colleagues.">
        <label className="block text-sm font-medium" htmlFor="ticket-communication">
          Update to the requester
        </label>
        <Textarea
          id="ticket-communication"
          className="mt-2"
          rows={4}
          placeholder="Plain language: what happened, what you did, what they should expect next."
          value={communication}
          disabled={submitted}
          onChange={(event) => setCommunication(event.target.value)}
        />
        <label className="mt-4 block text-sm font-medium" htmlFor="ticket-documentation">
          Ticket notes
        </label>
        <Textarea
          id="ticket-documentation"
          className="mt-2"
          rows={5}
          placeholder="Evidence gathered, cause, actions taken, verification, follow-up."
          value={documentation}
          disabled={submitted}
          onChange={(event) => setDocumentation(event.target.value)}
        />

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={save} disabled={submitted}>
            <Save className="size-4" aria-hidden /> Save
          </Button>
          <Button onClick={submit} disabled={submitted}>
            <Send className="size-4" aria-hidden /> Submit ticket
          </Button>
          {submitted ? (
            <Button variant="ghost" onClick={() => start(attempt.id)}>
              <RotateCcw className="size-4" aria-hidden /> Retake
            </Button>
          ) : null}
        </div>
      </Panel>

      {submitted && scores ? (
        <Panel
          title={`Review, ${attempt.totalScore ?? 0}%`}
          description={
            attempt.passed
              ? "Ticket closed. The diagnosis, full resolution, verification and written work all held up."
              : `Needs rework. A ticket closes at ${TICKET_PASS_SCORE}% with the correct diagnosis, every required resolution and verification step, and usable written work.`
          }
        >
          <div className="space-y-3">
            {(
              [
                ["Technical accuracy", scores.technicalAccuracy],
                ["Troubleshooting", scores.troubleshooting],
                ["Reasoning", scores.reasoning],
                ["Communication", scores.communication],
                ["Documentation", scores.documentation],
                ["Efficiency", scores.efficiency],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted-foreground">{value}%</span>
                </div>
                <Progress className="mt-1" value={value} />
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-border/60 p-4">
            <h3 className="font-display text-sm font-semibold">What was actually happening</h3>
            <p className="mt-2 text-sm text-muted-foreground">{ticket.rootCause}</p>
          </div>
          {attempt.passed ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="size-4" aria-hidden /> Recorded in your career scores.
            </p>
          ) : null}
        </Panel>
      ) : null}

      {history.length > 1 ? (
        <Panel title="Attempt history" description="Every attempt is kept. Nothing is overwritten.">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{new Date(item.createdAt).toLocaleString()}</span>
                <span>
                  {ticketStatusLabel(item)}
                  {item.totalScore != null ? ` · ${item.totalScore}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
