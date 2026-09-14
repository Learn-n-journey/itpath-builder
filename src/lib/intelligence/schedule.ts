/**
 * Scheduling layer.
 *
 * Estimates when a concept should come back, from its own forgetting curve, and
 * interleaves the queue so consecutive items are never the same certification
 * section back to back. Existing review records stay the source of truth for
 * anything the learner has already scheduled — this only adds an estimate for
 * concepts that have no review record yet.
 */
import type { Review } from "@/lib/app-data/types";
import type { ConceptIntel } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;

export interface Timing {
  nextReviewAt: string;
  daysOverdue: number;
}

/**
 * Half-life grows with mastery and exposure; the next touch is scheduled at the
 * point recall is expected to drop to about 80%.
 */
export function timingFor(
  topicId: string,
  mastery: number,
  attempts: number,
  lastExposureAt: string | null,
  reviews: Review[],
  nowMs: number,
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
