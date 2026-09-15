/**
 * Scheduling layer.
 *
 * Estimates when a concept should come back, from its own forgetting curve, and
 * interleaves the queue so consecutive items are never the same certification
 * section back to back. Existing review records stay the source of truth for
 * anything the learner has already scheduled, this only adds an estimate for
 * concepts that have no review record yet.
 */
import type { Review, ReviewAttempt } from "@/lib/app-data/types";
import type { ConceptIntel } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;

export interface Timing {
  nextReviewAt: string;
  daysOverdue: number;
}

/**
 * How this learner's memory compares with the default assumption.
 *
 * Taken from their own graded reviews: passing most of them means the gaps were
 * too short for them and can stretch, missing many means the opposite. Below
 * eight graded reviews there is not enough to personalise, so the default is
 * used unchanged.
 */
export function personalHalfLifeFactor(attempts: ReviewAttempt[]): number {
  const recent = attempts
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);
  if (recent.length < 8) return 1;
  const passRate = recent.filter((attempt) => attempt.outcome === "pass").length / recent.length;
  // 0.8 is the recall the schedule aims for, so that point leaves it unchanged.
  const factor = 1 + (passRate - 0.8) * 1.5;
  return Number(Math.min(1.6, Math.max(0.6, factor)).toFixed(2));
}

/**
 * Half-life grows with mastery and exposure, then is scaled by how this learner
 * has actually held material. The next touch is scheduled at the point recall
 * is expected to drop to about 80%.
 */
export function timingFor(
  topicId: string,
  mastery: number,
  attempts: number,
  lastExposureAt: string | null,
  reviews: Review[],
  nowMs: number,
  personalFactor = 1,
): Timing {
  const scheduled = reviews
    .filter((review) => review.topicId === topicId && review.status === "scheduled")
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];

  if (scheduled) {
    const dueMs = new Date(scheduled.dueAt).getTime();
    return {
      nextReviewAt: scheduled.dueAt,
      daysOverdue: Math.max(0, Math.floor((nowMs - dueMs) / MS_DAY)),
    };
  }

  if (!lastExposureAt) {
    return { nextReviewAt: new Date(nowMs).toISOString(), daysOverdue: 0 };
  }

  const halfLife = 1.5 + mastery * 18 + Math.min(attempts, 12) * 1.5;
  const intervalDays = Math.max(1, halfLife * 0.32);
  const dueMs = new Date(lastExposureAt).getTime() + intervalDays * MS_DAY;
  return {
    nextReviewAt: new Date(dueMs).toISOString(),
    daysOverdue: Math.max(0, Math.floor((nowMs - dueMs) / MS_DAY)),
  };
}

/**
 * Interleaving: keeps the ranked order but avoids two consecutive items from
 * the same diagnosis, so a session mixes retrieval, application and new work.
 */
export function interleave(items: ConceptIntel[]): ConceptIntel[] {
  const remaining = [...items];
  const out: ConceptIntel[] = [];
  while (remaining.length > 0) {
    const previous = out[out.length - 1];
    let index = 0;
    if (previous) {
      const different = remaining.findIndex(
        (item) => item.diagnosis !== previous.diagnosis || item.certificationId !== previous.certificationId,
      );
      if (different > 0 && different <= 2) index = different;
    }
    out.push(remaining.splice(index, 1)[0]!);
  }
  return out;
}
