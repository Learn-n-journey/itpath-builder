/**
 * Helpers that turn a recorded activity into a learner signal.
 *
 * Signals are the raw evidence stream behind the learner intelligence engine:
 * one immutable row per lesson, question, quiz, attempt and AI interaction.
 * Nothing here invents a result — every field comes from what the learner did.
 */
import type {
  IncidentAttempt,
  LabAttempt,
  LearnerSignal,
  LearnerSignalKind,
  PracticeResponse,
  QuizAttempt,
  RecallResponse,
  ReviewAttempt,
  ScenarioResponse,
  TeachBackResponse,
  TicketAttempt,
} from "@/lib/app-data/types";

let counter = 0;

function signalId(): string {
  counter += 1;
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `signal-${Date.now().toString(36)}-${counter}-${random}`;
}

export interface SignalInput {
  topicId: string;
  kind: LearnerSignalKind;
  correct?: boolean;
  score?: number;
  elapsedMs?: number;
  errorTag?: string;
  at?: string;
}

export function createSignal(input: SignalInput): LearnerSignal {
  const signal: LearnerSignal = {
    id: signalId(),
    topicId: input.topicId,
    kind: input.kind,
    at: input.at ?? new Date().toISOString(),
  };
  if (typeof input.correct === "boolean") signal.correct = input.correct;
  if (typeof input.score === "number") signal.score = clamp01(input.score);
  if (typeof input.elapsedMs === "number" && input.elapsedMs > 0) {
    signal.elapsedMs = Math.round(input.elapsedMs);
  }
  if (input.errorTag) signal.errorTag = input.errorTag;
  return signal;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function elapsedBetween(start: string | undefined, end: string | undefined): number | undefined {
  if (!start || !end) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  // Anything over two hours is a tab left open, not thinking time.
  if (!Number.isFinite(ms) || ms <= 0 || ms > 2 * 60 * 60 * 1000) return undefined;
  return ms;
}

/** One signal per graded question, with the attempt's time split across them. */
export function signalsFromQuizAttempt(attempt: QuizAttempt): LearnerSignal[] {
  if (attempt.status !== "submitted" || attempt.results.length === 0) return [];
  const total = elapsedBetween(attempt.createdAt, attempt.submittedAt ?? attempt.updatedAt);
  const perQuestion = total ? total / attempt.results.length : undefined;
  return attempt.results.map((result) =>
    createSignal({
      topicId: result.topicId,
      kind: "quiz",
      correct: result.correct,
      ...(perQuestion === undefined ? {} : { elapsedMs: perQuestion }),
      at: attempt.submittedAt ?? attempt.updatedAt,
    }),
  );
}

export function signalFromRecall(response: RecallResponse): LearnerSignal {
  return createSignal({
    topicId: response.topicId,
    kind: "recall",
    correct: response.correct,
    at: response.createdAt,
  });
}

export function signalFromPractice(response: PracticeResponse): LearnerSignal {
  return createSignal({
    topicId: response.topicId,
    kind: "practice",
    correct: response.correct,
    at: response.createdAt,
  });
}

export function signalFromTeachBack(response: TeachBackResponse): LearnerSignal | null {
  const words = response.body.trim().split(/\s+/).filter(Boolean).length;
  if (words < 20) return null;
  return createSignal({
    topicId: response.topicId,
    kind: "teach_back",
    score: Math.min(1, words / 120),
    ...(elapsedBetween(response.createdAt, response.updatedAt) === undefined
      ? {}
      : { elapsedMs: elapsedBetween(response.createdAt, response.updatedAt) }),
    at: response.updatedAt,
  });
}

export function signalFromScenario(response: ScenarioResponse): LearnerSignal | null {
  if (response.response.trim().length < 20) return null;
  return createSignal({
    topicId: response.topicId,
    kind: "scenario",
    correct: response.meetsCriteria,
    at: response.updatedAt,
  });
}

export function signalFromLab(attempt: LabAttempt): LearnerSignal | null {
  if (attempt.status === "in_progress" || attempt.maxScore <= 0) return null;
  const score = attempt.score / attempt.maxScore;
  return createSignal({
    topicId: attempt.topicId,
    kind: "lab",
    correct: score >= 0.7,
    score,
    ...(elapsedBetween(attempt.createdAt, attempt.completedAt ?? attempt.updatedAt) === undefined
      ? {}
      : { elapsedMs: elapsedBetween(attempt.createdAt, attempt.completedAt ?? attempt.updatedAt) }),
    at: attempt.completedAt ?? attempt.updatedAt,
  });
}

export function signalFromReviewAttempt(attempt: ReviewAttempt): LearnerSignal {
  return createSignal({
    topicId: attempt.topicId,
    kind: "review",
    correct: attempt.outcome === "pass",
    at: new Date().toISOString(),
  });
}

export function signalFromIncident(
  attempt: IncidentAttempt,
  topicId: string,
  correct: boolean,
): LearnerSignal | null {
  if (attempt.status !== "submitted" || !topicId) return null;
  return createSignal({
    topicId,
    kind: "troubleshoot",
    correct,
    ...(elapsedBetween(attempt.createdAt, attempt.updatedAt) === undefined
      ? {}
      : { elapsedMs: elapsedBetween(attempt.createdAt, attempt.updatedAt) }),
    at: attempt.updatedAt,
  });
}

export function signalFromTicket(
  attempt: TicketAttempt,
  topicId: string,
  correct: boolean,
): LearnerSignal | null {
  if (attempt.status !== "submitted" || !topicId) return null;
  return createSignal({
    topicId,
    kind: "career",
    correct,
    at: attempt.updatedAt,
  });
}
