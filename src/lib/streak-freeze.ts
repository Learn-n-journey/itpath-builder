/**
 * Streak freezes.
 *
 * A freeze protects the streak on a day life got in the way. Freezes are
 * banked: every complete 7-day run of studied days earns one, and at most two
 * can be held at a time. Everything here is derived from the recorded record,
 * so the numbers stay honest.
 */
import type { UserData } from "@/lib/app-data/types";

export const MAX_FREEZES = 2;
/** How many complete 7-day runs earn one freeze. */
export const DAYS_PER_FREEZE = 7;

/** All date keys with any recorded study, sorted, grouped into maximal runs. */
function studyRunLengths(user: UserData): number[] {
  const keys = new Set<string>();
  for (const session of user.studySessions) {
    const started = new Date(session.startedAt);
    if (Number.isNaN(started.getTime()) || session.minutes <= 0) continue;
    keys.add(
      `${started.getFullYear()}-${`${started.getMonth() + 1}`.padStart(2, "0")}-${`${started.getDate()}`.padStart(2, "0")}`,
    );
  }
  const sorted = [...keys].sort();
  const runs: number[] = [];
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
    runs.push(run);
    previous = key;
  }
  return runs;
}

/** Complete 7-day runs ever recorded; each one has banked a freeze. */
function runsOfSeven(user: UserData): number {
  return studyRunLengths(user)
    .reduce((max, run) => Math.max(max, run), 0);
}

export function freezesEarned(user: UserData): number {
  return Math.floor(runsOfSeven(user) / DAYS_PER_FREEZE);
}

/** Freezes ready to spend right now: two to start, one more per 7-day run, capped. */
export function freezesAvailable(user: UserData): number {
  const spent = (user.settings.freezeDays ?? []).length;
  return Math.max(0, Math.min(MAX_FREEZES, MAX_FREEZES + freezesEarned(user) - spent));
}

/** Local date key for a date, YYYY-MM-DD. */
export function dateKeyOf(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
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

/** Yesterday can be repaired if it ended empty and is not already frozen. */
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

/** Spends one freeze on a day. Returns the settings patch to apply. */
export function spendFreeze(
  user: UserData,
  dayKey: string,
): { streakFreezes: number; freezeDays: string[] } | null {
  if (freezesAvailable(user) <= 0) return null;
  if ((user.settings.freezeDays ?? []).includes(dayKey)) return null;
  const spent = (user.settings.freezeDays ?? []).length + 1;
  return {
    streakFreezes: Math.max(0, freezesAvailable(user) - 1),
    freezeDays: [...(user.settings.freezeDays ?? []), dayKey].sort(),
    // streakFreezes is kept as a plain counter for display; the real check is
    // earned minus spent, computed in freezesAvailable.
    ...{ spent },
  };
}
