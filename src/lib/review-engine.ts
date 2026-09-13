import type {
  Review,
  ReviewAttempt,
  ReviewOutcome,
  UserData,
} from "@/lib/app-data/types";

/** The fixed spacing ladder, in days. */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 90] as const;

/** How many steps a failed review drops back down the ladder. */
const FAILURE_STEP_BACK = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(from: Date, days: number): string {
  return new Date(from.getTime() + days * DAY_MS).toISOString();
}

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function intervalForIndex(index: number): number {
  const clamped = Math.min(Math.max(index, 0), REVIEW_INTERVALS.length - 1);
  return REVIEW_INTERVALS[clamped]!;
}

export interface CreateReviewInput {
  topicId: string;
  skillId?: string;
  sourceMistakeId?: string;
  /** Start further up the ladder when the learner already showed strength. */
  intervalIndex?: number;
  /** Due immediately (default) or after the first interval. */
  dueImmediately?: boolean;
  now?: Date;
}

export function createReview(input: CreateReviewInput): Review {
  const now = input.now ?? new Date();
  const index = Math.min(Math.max(input.intervalIndex ?? 0, 0), REVIEW_INTERVALS.length - 1);
  const interval = intervalForIndex(index);
  const iso = now.toISOString();
  return {
    id: crypto.randomUUID(),
    topicId: input.topicId,
    ...(input.skillId ? { skillId: input.skillId } : {}),
    ...(input.sourceMistakeId ? { sourceMistakeId: input.sourceMistakeId } : {}),
    dueAt: input.dueImmediately === false ? addDays(now, interval) : iso,
    interval,
    intervalIndex: index,
    status: "scheduled",
    successStreak: 0,
    lapses: 0,
    totalReviews: 0,
    createdAt: iso,
    updatedAt: iso,
  };
}

export interface GradeResult {
  review: Review;
  attempt: ReviewAttempt;
}

/**
 * Grades one review. Passing advances one step up the ladder; a pass at the top
 * marks the item mastered. Failing drops it back down and shortens the interval.
 */
export function gradeReview(review: Review, outcome: ReviewOutcome, nowInput?: Date): GradeResult {
  const now = nowInput ?? new Date();
  const iso = now.toISOString();
  const lastIndex = REVIEW_INTERVALS.length - 1;
  const passed = outcome === "pass";
  const atTop = review.intervalIndex >= lastIndex;

  const nextIndex = passed
    ? Math.min(review.intervalIndex + 1, lastIndex)
    : Math.max(review.intervalIndex - FAILURE_STEP_BACK, 0);
  const nextInterval = intervalForIndex(nextIndex);
  const dueAt = addDays(now, nextInterval);

  const next: Review = {
    ...review,
    intervalIndex: nextIndex,
    interval: nextInterval,
    dueAt,
    status: passed && atTop ? "mastered" : "scheduled",
    successStreak: passed ? review.successStreak + 1 : 0,
    lapses: passed ? review.lapses : review.lapses + 1,
    totalReviews: review.totalReviews + 1,
    lastReviewedAt: iso,
    updatedAt: iso,
  };

  const attempt: ReviewAttempt = {
    id: crypto.randomUUID(),
    reviewId: review.id,
    topicId: review.topicId,
    outcome,
    intervalBefore: review.interval,
    intervalAfter: nextInterval,
    dueBefore: review.dueAt,
    dueAfter: dueAt,
    wasOverdue: new Date(review.dueAt).getTime() < startOfDay(now),
    createdAt: iso,
  };

  return { review: next, attempt };
}

/** Manual reschedule. Never changes the interval or counts as a graded review. */
export function rescheduleReview(review: Review, days: number, nowInput?: Date): Review {
  const now = nowInput ?? new Date();
  return {
    ...review,
    dueAt: addDays(now, Math.max(days, 0)),
    updatedAt: now.toISOString(),
  };
}

export interface ReviewBuckets {
  overdue: Review[];
  dueToday: Review[];
  upcoming: Review[];
  mastered: Review[];
}

export function bucketReviews(reviews: Review[], nowInput?: Date): ReviewBuckets {
  const now = nowInput ?? new Date();
  const today = startOfDay(now);
  const tomorrow = today + DAY_MS;
  const buckets: ReviewBuckets = { overdue: [], dueToday: [], upcoming: [], mastered: [] };
  for (const review of reviews) {
    if (review.status === "mastered") {
      buckets.mastered.push(review);
      continue;
    }
    const due = new Date(review.dueAt).getTime();
    if (due < today) buckets.overdue.push(review);
    else if (due < tomorrow) buckets.dueToday.push(review);
    else buckets.upcoming.push(review);
  }
  const byDue = (a: Review, b: Review) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  buckets.overdue.sort(byDue);
  buckets.dueToday.sort(byDue);
  buckets.upcoming.sort(byDue);
  return buckets;
}

/** Reviews graded "fail" most recently, newest first. */
export function recentlyFailed(user: UserData, limit = 8): ReviewAttempt[] {
  return user.reviewAttempts
    .filter((attempt) => attempt.outcome === "fail")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/** Finds an existing scheduled review for a topic so schedules never duplicate. */
export function findScheduledReview(user: UserData, topicId: string): Review | undefined {
  return user.reviews.find(
    (review) => review.topicId === topicId && review.status === "scheduled",
  );
}

export function describeSchedule(review: Review): string {
  return review.status === "mastered"
    ? `Mastered at the ${review.interval}-day interval`
    : `${review.interval}-day interval`;
}
