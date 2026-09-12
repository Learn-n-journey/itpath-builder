/** Study pace helpers. The plan is month by month; the learner only sets study days. */

/** Average target study time on a study day. */
export const HOURS_PER_STUDY_DAY = 2;

/** Recommended weekly hours from the number of days the learner studies. */
export function recommendedWeeklyHours(studyDayCount: number): number {
  return Math.max(0, Math.round(studyDayCount * HOURS_PER_STUDY_DAY));
}

/** Recommended hours in a calendar month (~4.3 weeks). */
export function recommendedMonthlyHours(studyDayCount: number): number {
  return Math.round(recommendedWeeklyHours(studyDayCount) * 4.3);
}
