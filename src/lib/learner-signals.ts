import { buildIntelligence } from "@/lib/intelligence/engine";
import { learningPolicyForState, type LearningPolicy } from "@/lib/intelligence/states";
/**
 * The evidence stream behind the learner intelligence engine.
 *
 * Most evidence is derived from records the app already keeps (quiz results,
 * recall and practice answers, teach-backs, scenarios, labs, review grades), so
 * a learner's full history counts from the first run. Interactions that leave
 * no graded record of their own, opening a lesson, an AI tutor exchange, an AI
 * marked answer, a troubleshooting incident, a career ticket, are appended to
 * `user.learnerSignals` as they happen.
 *
 * Nothing here invents a result: every field comes from something the learner did.
 */
import type {
  AnswerConfidence,
  LearnerSignal,
  LearnerSignalKind,
  UserData,
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
  confidence?: AnswerConfidence;
  at?: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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
  if (input.confidence) signal.confidence = input.confidence;
  return signal;
}

/** Thinking time between two timestamps. Anything over two hours is a tab left open. */
function elapsedBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0 || ms > 2 * 60 * 60 * 1000) return undefined;
  return ms;
}

function withTiming(input: SignalInput, elapsedMs: number | undefined): LearnerSignal {
  return createSignal(elapsedMs === undefined ? input : { ...input, elapsedMs });
}

/** Every signal that can be reconstructed from stored records. */
export function derivedSignals(user: UserData): LearnerSignal[] {
  const out: LearnerSignal[] = [];

  for (const attempt of user.quizAttempts) {
    if (attempt.status !== "submitted" || attempt.results.length === 0) continue;
    const total = elapsedBetween(attempt.createdAt, attempt.submittedAt ?? attempt.updatedAt);
    const perQuestion = total ? total / attempt.results.length : undefined;
    for (const result of attempt.results) {
      out.push(
        withTiming(
          {
            topicId: result.topicId,
            kind: "quiz",
            correct: result.correct,
            ...(result.confidence ? { confidence: result.confidence } : {}),
            at: attempt.submittedAt ?? attempt.updatedAt,
          },
          perQuestion,
        ),
      );
    }
  }

  for (const response of user.recallResponses) {
    out.push(
      createSignal({
        topicId: response.topicId,
        kind: "recall",
        correct: response.correct,
        at: response.createdAt,
      }),
    );
  }

  for (const response of user.practiceResponses) {
    out.push(
      createSignal({
        topicId: response.topicId,
        kind: "practice",
        correct: response.correct,
        at: response.createdAt,
      }),
    );
  }

  for (const response of Object.values(user.teachBackResponses)) {
    const words = response.body.trim().split(/\s+/).filter(Boolean).length;
    if (words < 20) continue;
    out.push(
      withTiming(
        {
          topicId: response.topicId,
          kind: "teach_back",
          score: Math.min(1, words / 120),
          at: response.updatedAt,
        },
        elapsedBetween(response.createdAt, response.updatedAt),
      ),
    );
  }

  for (const response of Object.values(user.scenarioResponses)) {
    if (response.response.trim().length < 20) continue;
    out.push(
      createSignal({
        topicId: response.topicId,
        kind: "scenario",
        correct: response.meetsCriteria,
        at: response.updatedAt,
      }),
    );
  }

  for (const attempt of user.labAttempts) {
    if (attempt.status === "in_progress" || attempt.maxScore <= 0) continue;
    const score = attempt.score / attempt.maxScore;
    out.push(
      withTiming(
        {
          topicId: attempt.topicId,
          kind: "lab",
          correct: score >= 0.7,
          score,
          at: attempt.completedAt ?? attempt.updatedAt,
        },
        elapsedBetween(attempt.createdAt, attempt.completedAt ?? attempt.updatedAt),
      ),
    );
  }

  for (const attempt of user.reviewAttempts) {
    out.push(
      createSignal({
        topicId: attempt.topicId,
        kind: "review",
        correct: attempt.outcome === "pass",
        at: attempt.createdAt,
      }),
    );
  }

  return out;
}

/** Derived records plus the appended live stream, newest first. */
export function evidenceStream(user: UserData): LearnerSignal[] {
  const appended = user.learnerSignals.filter(
    (signal) =>
      signal.kind === "lesson" ||
      signal.kind === "ai_tutor" ||
      signal.kind === "ai_grading" ||
      signal.kind === "lab" ||
      signal.kind === "troubleshoot" ||
      signal.kind === "career" ||
      signal.kind === "assignment" ||
      signal.kind === "knowledge" ||
      signal.kind === "terminal",
  );
  return [...derivedSignals(user), ...appended].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}


/** Best verified assistance level for an activity. Lower means more independent. */
export function bestSimulatorHelpLevel(user: UserData, kind: "lab"|"troubleshoot"|"career", activityId: string): number | null {
  const prefix=`simulator:${activityId}:help-`;
  const levels=user.learnerSignals
    .filter(signal=>signal.kind===kind && signal.correct===true && signal.errorTag?.startsWith(prefix))
    .map(signal=>Number(signal.errorTag?.slice(prefix.length)))
    .filter(Number.isFinite);
  return levels.length ? Math.min(...levels) : null;
}

/**
 * Record a simulator success only when it adds stronger independence evidence.
 * Legacy unsuffixed credit does not block a new assistance-tagged result.
 */
export function shouldRecordSimulatorOutcome(user: UserData, kind: "lab"|"troubleshoot"|"career", activityId: string, helpLevel: number): boolean {
  const best=bestSimulatorHelpLevel(user,kind,activityId);
  return best===null || Math.max(0,helpLevel)<best;
}

/** Compatibility helper for callers that only need to know whether any success exists. */
export function hasSimulatorCredit(user: UserData, kind: "lab"|"troubleshoot"|"career", activityId: string): boolean {
  return user.learnerSignals.some(signal=>signal.kind===kind && (signal.errorTag===`simulator:${activityId}` || signal.errorTag?.startsWith(`simulator:${activityId}:`)) && signal.correct===true);
}

export function assistanceAdjustedScore(helpLevel: number): number {
  if(helpLevel<=0) return 1;
  if(helpLevel===1) return 0.9;
  if(helpLevel===2) return 0.8;
  return 0.7;
}

export function simulatorOutcomeSignal(topicId: string, kind: "lab"|"troubleshoot"|"career", activityId: string, score=1, helpLevel=0): SignalInput {
  const adjusted=Math.min(score,assistanceAdjustedScore(helpLevel));
  return {topicId,kind,correct:adjusted>=0.7,score:adjusted,errorTag:`simulator:${activityId}:help-${Math.max(0,helpLevel)}`};
}


export interface TopicLearningPolicy {
  state: import("@/lib/intelligence/states").LearningState;
  policy: LearningPolicy;
}

export function topicLearningPolicy(user: UserData, topicId: string): TopicLearningPolicy | null {
  const concept=buildIntelligence(user).concepts.find(item=>item.topicId===topicId);
  return concept ? {state:concept.state,policy:learningPolicyForState(concept.state)} : null;
}

export interface ScaffoldingProfile {
  priorSuccesses: number;
  bestHelpLevel: number | null;
  independentSuccess: boolean;
  openingHintStyle: "socratic"|"guided"|"structured";
}

/** Read prior verified simulator outcomes without asking AI to judge mastery. Lower help level means greater demonstrated independence. */
export function simulatorScaffoldingProfile(user: UserData, activityId: string): ScaffoldingProfile {
  const prefix=`simulator:${activityId}:help-`;
  const successes=user.learnerSignals.filter(signal=>signal.correct===true && signal.errorTag?.startsWith(prefix));
  const levels=successes.map(signal=>Number(signal.errorTag?.slice(prefix.length))).filter(Number.isFinite);
  const bestHelpLevel=levels.length ? Math.min(...levels) : null;
  return {
    priorSuccesses: successes.length,
    bestHelpLevel,
    independentSuccess: bestHelpLevel===0,
    openingHintStyle: bestHelpLevel===0 ? "socratic" : bestHelpLevel===null || bestHelpLevel>=2 ? "structured" : "guided",
  };
}
