import type {
  CareerTrack,
  MistakeCause,
  Ticket,
  TicketAttempt,
  TicketScores,
} from "@/lib/app-data/types";

export const careerTrackLabels: Record<CareerTrack, string> = {
  help_desk: "Help Desk",
  it_technician: "IT Technician",
  network_technician: "Network Technician",
  junior_sysadmin: "Junior Sysadmin",
  junior_security_analyst: "Junior Security Analyst",
};

export const ticketStageOrder = [
  "investigate",
  "diagnose",
  "resolve",
  "verify",
  "document",
] as const;

export type TicketStage = (typeof ticketStageOrder)[number];

export const ticketStageLabels: Record<TicketStage, string> = {
  investigate: "Investigate",
  diagnose: "Diagnose",
  resolve: "Resolve",
  verify: "Verify",
  document: "Document",
};

/** A ticket only closes when the whole workflow holds up. */
export const TICKET_PASS_SCORE = 75;

export function createTicketAttempt(ticket: Ticket, previousAttemptId?: string): TicketAttempt {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ticketId: ticket.id,
    track: ticket.track,
    topicId: ticket.topicId,
    status: "in_progress",
    performedActionIds: [],
    diagnosisGuessIds: [],
    reasoning: "",
    resolutionIds: [],
    verificationIds: [],
    communication: "",
    documentation: "",
    ...(previousAttemptId ? { previousAttemptId } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function keywordCoverage(text: string, keywords: string[]) {
  if (keywords.length === 0) return 0;
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length / keywords.length;
}

function writtenScore(text: string, keywords: string[], targetLength: number) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  if (trimmed.length < 40) return 20;
  return clamp(
    keywordCoverage(trimmed, keywords) * 65 + Math.min(1, trimmed.length / targetLength) * 35,
  );
}

/** Wrong diagnoses cost accuracy but never end the attempt or reveal the answer. */
function diagnosisAccuracy(ticket: Ticket, attempt: TicketAttempt) {
  const correctId = ticket.diagnoses.find((item) => item.correct)?.id;
  if (!correctId || attempt.selectedDiagnosisId !== correctId) return 0;
  const firstCorrect = attempt.diagnosisGuessIds.indexOf(correctId);
  const misses = firstCorrect < 0 ? attempt.diagnosisGuessIds.length : firstCorrect;
  if (misses === 0) return 100;
  if (misses === 1) return 70;
  if (misses === 2) return 45;
  return 25;
}

function setAccuracy(chosen: string[], options: { id: string; correct: boolean }[]) {
  const required = options.filter((option) => option.correct);
  if (required.length === 0) return 0;
  const hits = required.filter((option) => chosen.includes(option.id)).length;
  const wrong = chosen.filter((id) => !options.find((option) => option.id === id)?.correct).length;
  return clamp((hits / required.length) * 100 - wrong * 30);
}

export function scoreTicket(
  ticket: Ticket,
  attempt: TicketAttempt,
): { scores: TicketScores; total: number; passed: boolean } {
  const performed = attempt.performedActionIds;
  const keyRun = ticket.keyActionIds.filter((id) => performed.includes(id)).length;
  const noise = performed.filter(
    (id) => !ticket.actions.find((action) => action.id === id)?.informative,
  ).length;

  const investigation = clamp((keyRun / ticket.keyActionIds.length) * 100 - noise * 12);
  const resolutionAccuracy = setAccuracy(attempt.resolutionIds, ticket.resolutions);
  const verificationAccuracy = setAccuracy(attempt.verificationIds, ticket.verifications);

  const technicalAccuracy = clamp(
    diagnosisAccuracy(ticket, attempt) * 0.5 + resolutionAccuracy * 0.5,
  );
  const troubleshooting = clamp(investigation * 0.6 + verificationAccuracy * 0.4);
  const reasoning = writtenScore(attempt.reasoning, ticket.reasoningKeywords, 180);
  const communication = writtenScore(attempt.communication, ticket.communicationKeywords, 160);
  const documentation = writtenScore(attempt.documentation, ticket.documentationKeywords, 220);

  const efficiency = clamp(
    performed.length === 0
      ? 0
      : keyRun < ticket.keyActionIds.length
        ? (keyRun / ticket.keyActionIds.length) * 60
        : (ticket.efficientActionCount / performed.length) * 100,
  );

  const scores: TicketScores = {
    technicalAccuracy,
    troubleshooting,
    reasoning,
    communication,
    documentation,
    efficiency,
  };

  const total = Math.round(
    (technicalAccuracy + troubleshooting + reasoning + communication + documentation + efficiency) /
      6,
  );

  const correctDiagnosisId = ticket.diagnoses.find((item) => item.correct)?.id;
  const passed =
    attempt.selectedDiagnosisId === correctDiagnosisId &&
    resolutionAccuracy >= 100 &&
    verificationAccuracy >= 100 &&
    reasoning >= 60 &&
    communication >= 60 &&
    documentation >= 60 &&
    total >= TICKET_PASS_SCORE;

  return { scores, total, passed };
}

export interface TicketMistakeSignal {
  category: MistakeCause;
  severity: "low" | "medium" | "high";
  detail: string;
}

/** Ticket errors feed the same central mistake system as quizzes, labs and incidents. */
export function ticketMistakeSignals(
  ticket: Ticket,
  attempt: TicketAttempt,
  scores: TicketScores,
): TicketMistakeSignal[] {
  const signals: TicketMistakeSignal[] = [];
  const correctId = ticket.diagnoses.find((item) => item.correct)?.id;
  const wrongGuesses = attempt.diagnosisGuessIds.filter((id) => id !== correctId).length;

  if (attempt.selectedDiagnosisId !== correctId) {
    signals.push({
      category: "scenario_recognition_failure",
      severity: "high",
      detail: "Submitted a diagnosis the ticket evidence does not support.",
    });
  } else if (wrongGuesses > 0) {
    signals.push({
      category: "scenario_recognition_failure",
      severity: wrongGuesses > 1 ? "medium" : "low",
      detail: `Reached the correct diagnosis after ${wrongGuesses} incorrect attempt${wrongGuesses > 1 ? "s" : ""}.`,
    });
  }

  const missedResolutions = ticket.resolutions.filter(
    (option) => option.correct && !attempt.resolutionIds.includes(option.id),
  ).length;
  const wrongResolutions = attempt.resolutionIds.filter(
    (id) => !ticket.resolutions.find((option) => option.id === id)?.correct,
  ).length;

  if (wrongResolutions > 0) {
    signals.push({
      category: "reasoning_error",
      severity: "high",
      detail: "Selected a resolution step that treats the symptom or weakens a control.",
    });
  }
  if (missedResolutions > 0) {
    signals.push({
      category: "misunderstood_concept",
      severity: "medium",
      detail: "Left part of the required resolution undone, so the cause can return.",
    });
  }
  if (scores.troubleshooting < 60) {
    signals.push({
      category: "prerequisite_gap",
      severity: "medium",
      detail: "Diagnosed before gathering the evidence a technician needs on this ticket.",
    });
  }
  if (scores.efficiency < 50 && attempt.performedActionIds.length > 0) {
    signals.push({
      category: "rushed",
      severity: "low",
      detail: "Investigation wandered through steps that could not change the outcome.",
    });
  }
  if (scores.communication < 60) {
    signals.push({
      category: "misread_question",
      severity: "medium",
      detail: "The requester update would not tell the user what happened or what to expect.",
    });
  }
  if (scores.documentation < 60) {
    signals.push({
      category: "didnt_know_fact",
      severity: "low",
      detail: "Ticket notes would not let a colleague repeat the work.",
    });
  }

  return signals;
}

export function ticketStatusLabel(attempt: TicketAttempt | undefined) {
  if (!attempt) return "Not Started";
  if (attempt.status === "in_progress") return "In Progress";
  return attempt.passed ? "Closed" : "Needs Rework";
}
