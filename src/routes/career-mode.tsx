import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Clock3, RotateCcw, Save, Send } from "lucide-react";
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
import { troubleshootingAvailability } from "@/lib/lab-environments";

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
  const attempts = user.ticketAttempts;
  const readyTickets = tickets.filter(item=>troubleshootingAvailability(user,item.topicId).available || attempts.some(a=>a.ticketId===item.id));
  const [selectedId, setSelectedId] = useState("");
  const ticket = tickets.find((item) => item.id === selectedId);
  const latest = ticket ? attempts.find((attempt) => attempt.ticketId === ticket.id) : undefined;
  const closed = attempts.filter((attempt) => attempt.passed);
  const submitted = attempts.filter((attempt) => attempt.status === "submitted");
  const average =
    submitted.length > 0
      ? Math.round(
          submitted.reduce((sum, attempt) => sum + (attempt.totalScore ?? 0), 0) / submitted.length,
        )
      : 0;

  const activeCount = attempts.filter((attempt) => attempt.status === "in_progress").length;

  return (
    <>
      <PageHeader
        title="Career Mode"
        description="Work realistic IT tickets from intake to resolution. Choose a case, investigate the evidence, make the call, and document the fix."
      />

      <div className="border-y border-border/70">
        <div className="grid grid-cols-4 divide-x divide-border/70">
          <CareerStat label="Ready" value={readyTickets.length} />
          <CareerStat label="Active" value={activeCount} />
          <CareerStat label="Closed" value={closed.length} />
          <CareerStat label="Average" value={submitted.length ? `${average}%` : "—"} />
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Ticket queue</h2>
              <p className="text-xs text-muted-foreground">Choose a ticket to open its workspace.</p>
            </div>
            <Badge variant="outline">{readyTickets.length} ready</Badge>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
            {trackOrder.map((track) => {
              const trackTickets = tickets.filter((item) => item.track === track);
              if (trackTickets.length === 0) return null;
              return (
                <section key={track} className="border-b border-border/70 last:border-b-0">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{careerTrackLabels[track]}</p>
                    <span className="text-[11px] tabular-nums text-muted-foreground">{trackTickets.length}</span>
                  </div>
                  {trackTickets.map((item) => {
                    const itemAttempt = attempts.find((attempt) => attempt.ticketId === item.id);
                    const selected = item.id === ticket?.id;
                    const availability=troubleshootingAvailability(user,item.topicId);
                    const accessible=availability.available || Boolean(itemAttempt);
                    return (
                      <button key={item.id} type="button" onClick={() => setSelectedId(item.id)}
                        className={`flex w-full items-center gap-3 border-t border-border/50 px-3 py-3 text-left transition-colors hover:bg-secondary/50 ${selected ? "bg-secondary/70" : ""}`}>
                        <span className={`size-2 shrink-0 rounded-full ${item.priority === "urgent" || item.priority === "high" ? "bg-destructive" : item.priority === "medium" ? "bg-primary" : "bg-muted-foreground/50"}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-sm font-medium leading-snug">{item.title}</span>
                          <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{priorityLabels[item.priority]}</span><span aria-hidden>·</span><span>{accessible ? ticketStatusLabel(itemAttempt) : "Upcoming"}</span>
                            {itemAttempt?.status === "submitted" && itemAttempt.totalScore != null ? <><span aria-hidden>·</span><span>{itemAttempt.totalScore}%</span></> : null}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </aside>
        <main className="min-w-0">
          {ticket ? (troubleshootingAvailability(user,ticket.topicId).available || latest ? <TicketWorkspace key={ticket.id} ticket={ticket} {...(latest ? { latestAttempt: latest } : {})} /> : <Panel title="Upcoming ticket" description="This case stays visible so you can see what is ahead."><p className="text-sm text-muted-foreground">{troubleshootingAvailability(user,ticket.topicId).reason}</p></Panel>) : <Panel title="Ticket queue" description="Choose a ready ticket, or preview an upcoming case."><p className="text-sm text-muted-foreground">{readyTickets.length ? "Ready tickets are available based on the skills you have already demonstrated." : "As you prove topics and complete applied practice, support tickets will become ready here."}</p></Panel>}
        </main>
      </div>
    </>
  );
}

function CareerStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 px-2 py-3 text-center sm:px-4 sm:py-4">
      <p className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">{label}</p>
    </div>
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
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
        <div className="border-b border-border/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{careerTrackLabels[ticket.track]}</Badge>
            <Badge variant="outline">{priorityLabels[ticket.priority]} priority</Badge>
          </div>
          <h2 className="mt-4 max-w-3xl font-display text-2xl font-semibold leading-tight sm:text-3xl">{ticket.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{ticket.report}</p>
        </div>
        <div className="grid border-b border-border/70 sm:grid-cols-2">
          <div className="p-5 sm:p-6"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Requester</p><p className="mt-1 text-sm">{ticket.requester}</p></div>
          <div className="border-t border-border/70 p-5 sm:border-l sm:border-t-0 sm:p-6"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Environment</p><p className="mt-1 text-sm leading-6">{ticket.environment}</p></div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><p className="text-sm text-muted-foreground">{ticket.slaNote}</p></div>
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ticket workflow</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {ticketStageOrder.map((stage, index) => <div key={stage} className="flex items-center gap-2"><Badge variant="outline">{index + 1}. {ticketStageLabels[stage]}</Badge>{index < ticketStageOrder.length - 1 ? <ChevronRight className="size-3 text-muted-foreground" aria-hidden /> : null}</div>)}
            </div>
          </div>
          <Button className="mt-6" onClick={() => start()}>Accept ticket <ChevronRight className="size-4" aria-hidden /></Button>
        </div>
      </div>
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
