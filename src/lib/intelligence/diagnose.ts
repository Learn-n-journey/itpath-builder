/**
 * Diagnosis layer.
 *
 * Turns the evidence stream and full-scope progress into a named failure type
 * per concept, so teaching can target the cause instead of the score.
 */
import type { LearnerSignal, UserData } from "@/lib/app-data/types";
import type { ConceptProfile } from "@/lib/learner-model";
import type { TopicScopeProgress } from "@/lib/scope-progress";
import type { Diagnosis } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;
/**
 * Speed is only a fallback signal. It says something about how an answer was
 * given, but not much about how sure the learner was, so a fast miss counts as
 * half of a stated one and never decides the diagnosis on its own.
 */
const FAST_ANSWER_MS = 12_000;
const SPEED_WEIGHT = 0.5;

export interface Measures {
  /**
   * Wrong answers the learner was sure about. Counted from what they said when
   * asked, and only estimated from speed where nothing was said.
   */
  confidentErrors: number;
  /** How many of those came from a stated answer rather than an estimate. */
  statedConfidentErrors: number;
  efficiency: number | null;
  recentFailureAfterSuccess: boolean;
}

function graded(signal: LearnerSignal): number | null {
  if (typeof signal.score === "number") return signal.score;
  if (typeof signal.correct === "boolean") return signal.correct ? 1 : 0;
  return null;
}

/**
 * Sure and wrong: a miss on a concept the learner had already answered
 * correctly, where they said they were sure. Where no confidence was given,
 * a very fast miss is counted at half weight as a weaker stand-in.
 */
export function measure(
  signals: LearnerSignal[],
  scope: TopicScopeProgress,
  nowMs: number,
): Measures {
  const ordered = [...signals].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  let seenCorrect = false;
  let confidentErrors = 0;
  let statedConfidentErrors = 0;
  let recentFailureAfterSuccess = false;
  let totalMs = 0;

  for (const signal of ordered) {
    const outcome = graded(signal);
    if (typeof signal.elapsedMs === "number") totalMs += signal.elapsedMs;
    if (outcome === null) continue;
    if (outcome >= 0.8) {
      seenCorrect = true;
      continue;
    }
    if (outcome <= 0.4 && seenCorrect) {
      const ageDays = (nowMs - new Date(signal.at).getTime()) / MS_DAY;
      if (ageDays <= 30) recentFailureAfterSuccess = true;

      if (signal.confidence) {
        // The learner told us. Nothing is inferred from how quick they were.
        if (signal.confidence === "sure") {
          confidentErrors += 1;
          statedConfidentErrors += 1;
        }
      } else if (typeof signal.elapsedMs === "number" && signal.elapsedMs < FAST_ANSWER_MS) {
        confidentErrors += SPEED_WEIGHT;
      }
    }
  }

  const hours = totalMs / (60 * 60 * 1000);
  const efficiency = hours >= 0.1 ? Math.round(scope.overall / hours) : null;

  return {
    confidentErrors: Number(confidentErrors.toFixed(1)),
    statedConfidentErrors,
    efficiency,
    recentFailureAfterSuccess,
  };
}

export interface DiagnoseInput {
  profile: ConceptProfile;
  scope: TopicScopeProgress;
  measures: Measures;
  unresolvedMistakes: number;
  repeatedMisconception: boolean;
  prerequisiteGap: boolean;
  retention: number;
  /**
   * True only when the same item was answered correctly once and then missed on
   * a later attempt at that same item. Without this, saying "you had this right
   * before" would be comparing two different questions.
   */
  itemRegression?: boolean;
}

/**
 * Looks for a real step backwards on one item: an earlier correct answer to a
 * question, then a later wrong answer to that same question.
 */
export function itemRegressionByTopic(user: UserData): Set<string> {
  const firstCorrectAt = new Map<string, number>();
  const regressed = new Set<string>();

  const events: { questionId: string; topicId: string; correct: boolean; at: number }[] = [];
  for (const attempt of user.quizAttempts) {
    if (attempt.status !== "submitted") continue;
    const at = new Date(attempt.submittedAt ?? attempt.updatedAt ?? attempt.createdAt).getTime();
    for (const result of attempt.results) {
      events.push({
        questionId: result.questionId,
        topicId: result.topicId,
        correct: result.correct,
        at,
      });
    }
  }
  for (const response of user.recallResponses ?? []) {
    events.push({
      questionId: response.questionId,
      topicId: response.topicId,
      correct: response.correct,
      at: new Date(response.createdAt ?? new Date().toISOString()).getTime(),
    });
  }

  events.sort((a, b) => a.at - b.at);
  for (const event of events) {
    const seen = firstCorrectAt.get(event.questionId);
    if (event.correct) {
      if (seen === undefined) firstCorrectAt.set(event.questionId, event.at);
      continue;
    }
    if (seen !== undefined && event.at > seen) regressed.add(event.topicId);
  }
  return regressed;
}

export function diagnose(input: DiagnoseInput): Diagnosis {
  const { profile, scope, measures, repeatedMisconception, prerequisiteGap, retention } = input;

  if (profile.attempts === 0 && scope.attempted === 0) return "never_learned";
  if (prerequisiteGap && profile.mastery < 0.6) return "prerequisite_gap";
  if (measures.confidentErrors >= 2) return "confident_but_wrong";
  if (repeatedMisconception) return "misconception";
  if (input.itemRegression && measures.recentFailureAfterSuccess && profile.mastery < 0.75) {
    return "retrieval_failure";
  }

  const knows = (scope.understanding.score + scope.recall.score) / 2;
  if (knows >= 55 && scope.practicalAbility.score < 40) return "application_failure";
  if (knows >= 55 && scope.troubleshooting.score < 35) return "troubleshooting_failure";

  // Fading means something proven has decayed. That needs a record to decay
  // from, so a low recall number on thin evidence is not treated as forgetting.
  if (
    retention < 0.55 &&
    profile.attempts >= 4 &&
    profile.correct >= 2 &&
    profile.daysSinceExposure !== null &&
    profile.daysSinceExposure >= 7
  ) {
    return "fading";
  }
  if (profile.mastery < 0.6) return "application_failure";
  return "solid";
}

/** Everything the learner has recorded on this topic, newest first. */
export function signalsFor(user: UserData, topicId: string, stream: LearnerSignal[]): LearnerSignal[] {
  void user;
  return stream.filter((signal) => signal.topicId === topicId);
}
