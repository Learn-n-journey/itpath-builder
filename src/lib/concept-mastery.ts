/**
 * Mastery per concept, worked out from real answers only.
 *
 * Each concept keeps a running picture: how often it has been asked, how often
 * it was right, how many in a row are right now, and when it is worth asking
 * again. A concept answered right several times in a row comes back far less
 * often, and a shaky one comes back soon.
 */

import type { QuizAttempt } from "./app-data/types";

export interface ConceptStat {
  conceptId: string;
  attempts: number;
  correct: number;
  /** Consecutive correct answers at the end of the history. */
  streak: number;
  /** 0 to 1, recent answers count for more. */
  mastery: number;
  lastSeenAt?: string;
  /** When this concept is worth asking again. */
  dueAt?: string;
}

/** Spacing in days after 1, 2, 3, 4, 5 or more correct answers in a row. */
export const CONCEPT_REVIEW_DAYS = [1, 3, 7, 16, 35];

export const MASTERED_AT = 0.8;
export const WEAK_BELOW = 0.55;

const DAY_MS = 24 * 60 * 60 * 1000;

function intervalDays(streak: number): number {
  if (streak <= 0) return 0;
  const index = Math.min(streak, CONCEPT_REVIEW_DAYS.length) - 1;
  return CONCEPT_REVIEW_DAYS[index] as number;
}

/**
 * Builds the picture for every concept the learner has answered.
 *
 * @param attempts submitted quiz attempts, any order
 * @param conceptOf maps a question id to the concept it tests
 */
export function conceptStats(
  attempts: QuizAttempt[],
  conceptOf: (questionId: string) => string | undefined,
): Map<string, ConceptStat> {
  const stats = new Map<string, ConceptStat>();
  const ordered = attempts
    .filter((attempt) => attempt.status === "submitted")
    .slice()
    .sort((a, b) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt));

  for (const attempt of ordered) {
    const at = attempt.submittedAt ?? attempt.updatedAt ?? attempt.createdAt;
    for (const result of attempt.results ?? []) {
      const conceptId = conceptOf(result.questionId);
      if (!conceptId) continue;
      const current = stats.get(conceptId) ?? {
        conceptId,
        attempts: 0,
        correct: 0,
        streak: 0,
        mastery: 0,
      };
      const target = result.correct ? 1 : 0;
      current.mastery =
        current.attempts === 0
          ? result.correct
            ? 0.7
            : 0.15
          : current.mastery + (target - current.mastery) * 0.45;
      current.attempts += 1;
      if (result.correct) {
        current.correct += 1;
        current.streak += 1;
      } else {
        current.streak = 0;
      }
      current.lastSeenAt = at;
      const days = intervalDays(current.streak);
      current.dueAt = new Date(new Date(at).getTime() + days * DAY_MS).toISOString();
      stats.set(conceptId, current);
    }
  }

  return stats;
}

export function isMasteredConcept(stat: ConceptStat | undefined): boolean {
  return Boolean(stat && stat.mastery >= MASTERED_AT && stat.streak >= 2);
}

export function isWeakConcept(stat: ConceptStat | undefined): boolean {
  return Boolean(stat && stat.attempts > 0 && stat.mastery < WEAK_BELOW);
}

export function isDueConcept(stat: ConceptStat | undefined, now = new Date()): boolean {
  if (!stat?.dueAt) return true;
  return new Date(stat.dueAt).getTime() <= now.getTime();
}

/**
 * How much a concept deserves a place in the next quiz. Higher comes first.
 *
 * Never seen sits above settled work, shaky work sits above everything, and a
 * concept that is both mastered and not yet due drops close to the bottom so
 * it only appears when there is nothing better to ask.
 */
export function conceptPriority(stat: ConceptStat | undefined, now = new Date()): number {
  if (!stat || stat.attempts === 0) return 1;
  if (isWeakConcept(stat)) return 1.8;
  if (isMasteredConcept(stat)) return isDueConcept(stat, now) ? 0.6 : 0.12;
  return isDueConcept(stat, now) ? 1.2 : 0.45;
}
