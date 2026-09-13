import type { UserData, WeekDay } from "@/lib/app-data/types";

/** One calendar day of recorded study. */
export interface StreakDay {
  /** Local date key, YYYY-MM-DD. */
  date: string;
  /** Short weekday label, e.g. "Mon". */
  label: string;
  minutes: number;
  /** True when the day met the daily goal. */
  met: boolean;
  /** True when the day is one of the user's planned study days. */
  planned: boolean;
}

export interface StreakSummary {
  /** Consecutive days with any logged study, ending today or yesterday. */
  current: number;
  /** Longest run of consecutive study days ever recorded. */
  longest: number;
  todayMinutes: number;
  goalMinutes: number;
  goalMet: boolean;
  /** The last 7 days, oldest first. */
  week: StreakDay[];
  /** Days with any study in the last 28 days. */
  activeDaysLast28: number;
  /** Minutes recorded in the last 7 days. */
  minutesLast7: number;
  /** Minutes the settings imply for a week (planned days x session length). */
  weeklyTargetMinutes: number;
  /** True when today is one of the chosen study days. */
  plannedToday: boolean;
  hasData: boolean;
}

const weekDayKeys: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Daily goal in minutes: the explicit setting, else the session length. */
export function dailyGoalMinutes(user: UserData): number {
  const explicit = user.settings.dailyGoalMinutes;
  if (typeof explicit === "number" && explicit > 0) return explicit;
  return user.settings.sessionLengthMinutes;
}

/** Minutes logged per local calendar day. */
export function minutesByDay(user: UserData): Map<string, number> {
  const map = new Map<string, number>();
  for (const session of user.studySessions) {
    const started = new Date(session.startedAt);
    if (Number.isNaN(started.getTime())) continue;
    const key = dateKey(started);
    map.set(key, (map.get(key) ?? 0) + Math.max(0, session.minutes));
  }
  return map;
}

function shiftDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

export function streakSummary(user: UserData, now: Date = new Date()): StreakSummary {
  const byDay = minutesByDay(user);
  const goalMinutes = dailyGoalMinutes(user);
  const plannedDays = new Set(user.settings.studyDays);
  const todayKey = dateKey(now);
  const todayMinutes = byDay.get(todayKey) ?? 0;

  // Current run: count back from today, allowing today to still be empty.
  let current = 0;
  const start = (byDay.get(todayKey) ?? 0) > 0 ? 0 : -1;
  for (let offset = start; offset > -400; offset -= 1) {
    const key = dateKey(shiftDays(now, offset));
    if ((byDay.get(key) ?? 0) > 0) current += 1;
    else break;
  }

  // Longest run across every recorded day.
  const sortedKeys = [...byDay.entries()]
    .filter(([, minutes]) => minutes > 0)
    .map(([key]) => key)
    .sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of sortedKeys) {
    if (previous) {
      const gap = (new Date(`${key}T00:00:00`).getTime() - new Date(`${previous}T00:00:00`).getTime()) / 86_400_000;
      run = Math.round(gap) === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = key;
  }

  const week: StreakDay[] = [];
  for (let offset = -6; offset <= 0; offset += 1) {
    const date = shiftDays(now, offset);
    const key = dateKey(date);
    const minutes = byDay.get(key) ?? 0;
    week.push({
      date: key,
      label: weekDayLabels[date.getDay()] ?? "",
      minutes,
      met: minutes >= goalMinutes && goalMinutes > 0,
      planned: plannedDays.has(weekDayKeys[date.getDay()] as WeekDay),
    });
  }

  let activeDaysLast28 = 0;
  for (let offset = -27; offset <= 0; offset += 1) {
    if ((byDay.get(dateKey(shiftDays(now, offset))) ?? 0) > 0) activeDaysLast28 += 1;
  }

  const minutesLast7 = week.reduce((sum, day) => sum + day.minutes, 0);

  return {
    current,
    longest: Math.max(longest, current),
    todayMinutes,
    goalMinutes,
    goalMet: goalMinutes > 0 && todayMinutes >= goalMinutes,
    week,
    activeDaysLast28,
    minutesLast7,
    weeklyTargetMinutes: user.settings.studyDays.length * user.settings.sessionLengthMinutes,
    plannedToday: plannedDays.has(weekDayKeys[now.getDay()] as WeekDay),
    hasData: byDay.size > 0,
  };
}
