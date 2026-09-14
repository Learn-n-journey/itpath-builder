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
/** Answers faster than this are not considered reasoned. */
const FAST_ANSWER_MS = 12_000;

export interface Measures {
  confidentErrors: number;
  efficiency: number | null;
  recentFailureAfterSuccess: boolean;
}

function graded(signal: LearnerSignal): number | null {
  if (typeof signal.score === "number") return signal.score;
  if (typeof signal.correct === "boolean") return signal.correct ? 1 : 0;
  return null;
}

/**
 * Fast, assured, wrong: an answer under the fast threshold that was wrong on a
 * concept the learner had already answered correctly at least once.
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
      if (typeof signal.elapsedMs === "number" && signal.elapsedMs < FAST_ANSWER_MS) {
        confidentErrors += 1;
      }
    }
  }

  const hours = totalMs / (60 * 60 * 1000);
  const efficiency = hours >= 0.1 ? Math.round(scope.overall / hours) : null;

  return { confidentErrors, efficiency, recentFailureAfterSuccess };
}

export interface DiagnoseInput {
  profile: ConceptProfile;
  scope: TopicScopeProgress;
  measures: Measures;
  unresolvedMistakes: number;
  repeatedMisconception: boolean;
  prerequisiteGap: boolean;
  retention: number;
}

export function diagnose(input: DiagnoseInput): Diagnosis {
  const { profile, scope, measures, repeatedMisconception, prerequisiteGap, retention } = input;

  if (profile.attempts === 0 && scope.attempted === 0) return "never_learned";
  if (prerequisiteGap && profile.mastery < 0.6) return "prerequisite_gap";
  if (measures.confidentErrors >= 2) return "confident_but_wrong";
  if (repeatedMisconception) return "misconception";
  if (measures.recentFailureAfterSuccess && profile.mastery < 0.75) return "retrieval_failure";

  const knows = (scope.understanding.score + scope.recall.score) / 2;
  if (knows >= 55 && scope.practicalAbility.score < 40) return "application_failure";
  if (knows >= 55 && scope.troubleshooting.score < 35) return "troubleshooting_failure";

  if (retention < 0.55) return "fading";
  if (profile.mastery < 0.6) return "application_failure";
  return "solid";
}

/** Everything the learner has recorded on this topic, newest first. */
export function signalsFor(user: UserData, topicId: string, stream: LearnerSignal[]): LearnerSignal[] {
  void user;
  return stream.filter((signal) => signal.topicId === topicId);
}
