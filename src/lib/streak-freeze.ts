/**
 * Streak freezes.
 *
 * A freeze protects the streak on a day life got in the way. Freezes are
 * banked: every complete 7-day run of studied days earns one, and at most two
 * can be held at a time. Spent freezes are recorded as protected date keys,
 * and everything else is derived from the recorded study, so the numbers stay
 * honest.
 */
import type { UserData } from "@/lib/app-data/types";

export const MAX_FREEZES = 2;
/** Days in a row that earn one freeze. */
export const DAYS_PER_FREEZE = 7;
/** Device key holding the last seen streak snapshot for the sign-in screen. */
export const STREAK_SNAPSHOT_KEY = "itpath.streak.snapshot";

/** Local date key for a date, YYYY-MM-DD. */
export function dateKeyOf(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

/** Longest run of consecutive studied days ever recorded. */
function longestStudyRun(user: UserData): number {
  const keys = new Set<string>();
  for (const session of user.studySessions) {
    const started = new Date(session.startedAt);
    if (Number.isNaN(started.getTime()) || session.minutes <= 0) continue;
    keys.add(dateKeyOf(started));
  }
  const sorted = [...keys].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of sorted) {
    if (previous) {
      const gap =
        (new Date(`${key}T00:00:00`).getTime() - new Date(`${previous}T00:00:00`).getTime()) /
        86_400_000;
      run = Math.round(gap) === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = key;
  }
  return longest;
}

/** Freezes earned so far: one for every complete 7-day run. */
export function freezesEarned(user: UserData): number {
  return Math.floor(longestStudyRun(user) / DAYS_PER_FREEZE);
}

export function freezesSpent(user: UserData): number {
  return (user.settings.freezeDays ?? []).length;
}

/** Freezes ready to spend right now: two to start, one more per 7-day run, capped. */
export function freezesAvailable(user: UserData): number {
  return Math.max(0, Math.min(MAX_FREEZES, MAX_FREEZES + freezesEarned(user) - freezesSpent(user)));
}

function hasMinutesOn(user: UserData, key: string): boolean {
  for (const session of user.studySessions) {
    const started = new Date(session.startedAt);
    if (Number.isNaN(started.getTime())) continue;
    if (dateKeyOf(started) === key && session.minutes > 0) return true;
  }
  return false;
}

export interface FreezeOption {
  dayKey: string;
  label: string;
}

/** Today can be protected if nothing is logged yet and it is not already frozen. */
export function protectableToday(user: UserData, now: Date = new Date()): FreezeOption | null {
  const key = dateKeyOf(now);
  if (hasMinutesOn(user, key)) return null;
  if ((user.settings.freezeDays ?? []).includes(key)) return null;
  if (freezesAvailable(user) <= 0) return null;
  return { dayKey: key, label: "today" };
}

/** Yesterday can be repaired if it ended empty, is unfrozen, and a real run is at stake. */
export function repairableYesterday(user: UserData, now: Date = new Date()): FreezeOption | null {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const key = dateKeyOf(yesterday);
  if (hasMinutesOn(user, key)) return null;
  if ((user.settings.freezeDays ?? []).includes(key)) return null;
  if (freezesAvailable(user) <= 0) return null;
  // Only worth repairing if the day before yesterday had study, so a real run
  // is actually at stake.
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);
  if (!hasMinutesOn(user, dateKeyOf(dayBefore))) return null;
  return { dayKey: key, label: "yesterday" };
}

/** Spends one freeze on a day. Returns the settings patch to apply, or null. */
export function spendFreeze(user: UserData, dayKey: string): { freezeDays: string[] } | null {
  if (freezesAvailable(user) <= 0) return null;
  if ((user.settings.freezeDays ?? []).includes(dayKey)) return null;
  return { freezeDays: [...(user.settings.freezeDays ?? []), dayKey].sort() };
}
