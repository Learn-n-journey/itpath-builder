/**
 * Study insights.
 *
 * Trends over time, derived entirely from recorded sessions, attempts and
 * mistakes. When there is no data, every figure reads zero and the observations
 * say so rather than inventing a trend.
 */
import { topics } from "@/data/static-content";
import { mistakeCauseLabels } from "@/lib/mistake-engine";
import type { EntityId, MistakeCause, UserData } from "@/lib/app-data/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function startOfDay(input: Date | string | number): number {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function round(value: number): number {
  return Math.round(value);
}

export interface DayPoint {
  dayStart: number;
  label: string;
  minutes: number;
}

export interface QuizPoint {
  id: EntityId;
  at: string;
  score: number;
}

export interface TopicAccuracy {
  topicId: EntityId;
  title: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface CauseCount {
  cause: MistakeCause;
  label: string;
  open: number;
  resolved: number;
  total: number;
}

export interface StudyInsights {
  hasData: boolean;
  /** Trailing 28 days of logged minutes, oldest first. */
  days: DayPoint[];
  minutesLast7: number;
  minutesPrevious7: number;
  momentum: number;
  daysStudiedLast28: number;
  averageMinutesPerActiveDay: number;
  bestWeekday: { name: string; minutes: number } | undefined;
  longestSessionMinutes: number;
  /** Most recent submitted quizzes, oldest first. */
  quizTrend: QuizPoint[];
  quizAverageRecent: number;
  quizAverageEarlier: number;
  /** Topics with at least three answered questions. */
  topicAccuracy: TopicAccuracy[];
  weakestTopics: TopicAccuracy[];
  strongestTopics: TopicAccuracy[];
  causes: CauseCount[];
  mistakesOpen: number;
  mistakesResolved: number;
  resolutionRate: number;
  evidence: { label: string; count: number }[];
  observations: string[];
}

export function computeInsights(user: UserData, now: Date = new Date()): StudyInsights {
  const todayStart = startOfDay(now);

  // Daily minutes over the trailing 28 days.
  const byDay = new Map<number, number>();
  let longestSessionMinutes = 0;
  for (const session of user.studySessions) {
    const key = startOfDay(session.startedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + (session.minutes || 0));
    longestSessionMinutes = Math.max(longestSessionMinutes, session.minutes || 0);
  }
  const days: DayPoint[] = [];
  for (let i = 27; i >= 0; i -= 1) {
    const dayStart = todayStart - i * DAY_MS;
    days.push({
      dayStart,
      label: new Date(dayStart).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      minutes: byDay.get(dayStart) ?? 0,
    });
  }
  const minutesLast7 = days.slice(-7).reduce((sum, day) => sum + day.minutes, 0);
  const minutesPrevious7 = days.slice(-14, -7).reduce((sum, day) => sum + day.minutes, 0);
  const activeDays = days.filter((day) => day.minutes > 0);
  const daysStudiedLast28 = activeDays.length;
  const averageMinutesPerActiveDay =
    daysStudiedLast28 === 0
      ? 0
      : round(activeDays.reduce((sum, day) => sum + day.minutes, 0) / daysStudiedLast28);

  // Best weekday across all recorded sessions.
  const weekdayTotals = new Array(7).fill(0) as number[];
  for (const session of user.studySessions) {
    const index = new Date(session.startedAt).getDay();
    weekdayTotals[index] = (weekdayTotals[index] ?? 0) + (session.minutes || 0);
  }
  const bestIndex = weekdayTotals.reduce(
    (best, value, index) => (value > (weekdayTotals[best] ?? 0) ? index : best),
    0,
  );
  const bestWeekday =
    (weekdayTotals[bestIndex] ?? 0) > 0
      ? { name: weekdayNames[bestIndex] as string, minutes: weekdayTotals[bestIndex] as number }
      : undefined;

  // Quiz trend.
  const submitted = user.quizAttempts
    .filter((attempt) => attempt.status === "submitted")
    .sort(
      (a, b) =>
        new Date(a.submittedAt ?? a.updatedAt).getTime() -
        new Date(b.submittedAt ?? b.updatedAt).getTime(),
    );
  const quizTrend: QuizPoint[] = submitted.slice(-12).map((attempt) => ({
    id: attempt.id,
    at: attempt.submittedAt ?? attempt.updatedAt,
    score: attempt.score,
  }));
  const avg = (list: number[]) =>
    list.length === 0 ? 0 : round(list.reduce((a, b) => a + b, 0) / list.length);
  const half = Math.floor(submitted.length / 2);
  const quizAverageEarlier = avg(submitted.slice(0, half).map((a) => a.score));
  const quizAverageRecent = avg(submitted.slice(half).map((a) => a.score));

  // Accuracy per topic across every submitted quiz.
  const perTopic = new Map<EntityId, { correct: number; total: number }>();
  for (const attempt of submitted) {
    for (const result of attempt.results) {
      const row = perTopic.get(result.topicId) ?? { correct: 0, total: 0 };
      row.total += 1;
      if (result.correct) row.correct += 1;
      perTopic.set(result.topicId, row);
    }
  }
  const topicAccuracy: TopicAccuracy[] = [...perTopic.entries()]
    .filter(([, row]) => row.total >= 3)
    .map(([topicId, row]) => ({
      topicId,
      title: topics.find((topic) => topic.id === topicId)?.title ?? topicId,
      correct: row.correct,
      total: row.total,
      accuracy: round((row.correct / row.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // Mistake causes.
  const causeMap = new Map<MistakeCause, { open: number; resolved: number }>();
  for (const mistake of user.mistakes) {
    const row = causeMap.get(mistake.category) ?? { open: 0, resolved: 0 };
    if (mistake.resolved) row.resolved += 1;
    else row.open += 1;
    causeMap.set(mistake.category, row);
  }
  const causes: CauseCount[] = [...causeMap.entries()]
    .map(([cause, row]) => ({
      cause,
      label: mistakeCauseLabels[cause] ?? cause,
      open: row.open,
      resolved: row.resolved,
      total: row.open + row.resolved,
    }))
    .sort((a, b) => b.total - a.total);
  const mistakesOpen = user.mistakes.filter((mistake) => !mistake.resolved).length;
  const mistakesResolved = user.mistakes.length - mistakesOpen;
  const resolutionRate =
    user.mistakes.length === 0 ? 0 : round((mistakesResolved / user.mistakes.length) * 100);

  const evidence = [
    { label: "Study sessions", count: user.studySessions.length },
    { label: "Quizzes submitted", count: submitted.length },
    { label: "Labs attempted", count: user.labAttempts.length },
    { label: "Practice tasks", count: user.assignmentAttempts.length },
    { label: "Incidents worked", count: user.incidentAttempts.length },
    { label: "Career tickets", count: user.ticketAttempts.length },
    { label: "Reviews graded", count: user.reviewAttempts?.length ?? 0 },
  ];

  const hasData =
    user.studySessions.length > 0 || submitted.length > 0 || user.mistakes.length > 0;

  const observations: string[] = [];
  if (!hasData) {
    observations.push(
      "Nothing is recorded yet. Insights appear once you log study time or submit a quiz.",
    );
  } else {
    if (minutesPrevious7 > 0) {
      const change = minutesLast7 - minutesPrevious7;
      observations.push(
        change >= 0
          ? `You studied ${change} minutes more this week than last week.`
          : `You studied ${Math.abs(change)} minutes less this week than last week.`,
      );
    } else if (minutesLast7 > 0) {
      observations.push(`${minutesLast7} minutes logged in the last seven days.`);
    }
    if (daysStudiedLast28 > 0) {
      observations.push(
        `You have studied on ${daysStudiedLast28} of the last 28 days, averaging ${averageMinutesPerActiveDay} minutes on the days you show up.`,
      );
    }
    if (bestWeekday) {
      observations.push(`${bestWeekday.name} is consistently your strongest study day.`);
    }
    if (submitted.length >= 4) {
      const delta = quizAverageRecent - quizAverageEarlier;
      observations.push(
        delta >= 0
          ? `Your recent quiz average is ${delta} points above your earlier attempts.`
          : `Your recent quiz average is ${Math.abs(delta)} points below your earlier attempts — worth slowing down.`,
      );
    }
    const weakest = topicAccuracy[0];
    if (weakest && weakest.accuracy < 70) {
      observations.push(
        `${weakest.title} is your weakest topic on answered questions, at ${weakest.accuracy}%.`,
      );
    }
    const topCause = causes[0];
    if (topCause) {
      observations.push(
        `Most of your mistakes are "${topCause.label}" — ${topCause.total} recorded, ${topCause.open} still open.`,
      );
    }
    if (user.mistakes.length > 0) {
      observations.push(`You have cleared ${resolutionRate}% of the mistakes you have made.`);
    }
  }

  return {
    hasData,
    days,
    minutesLast7,
    minutesPrevious7,
    momentum: minutesLast7 - minutesPrevious7,
    daysStudiedLast28,
    averageMinutesPerActiveDay,
    bestWeekday,
    longestSessionMinutes,
    quizTrend,
    quizAverageRecent,
    quizAverageEarlier,
    topicAccuracy,
    weakestTopics: topicAccuracy.slice(0, 5),
    strongestTopics: [...topicAccuracy].reverse().slice(0, 5),
    causes,
    mistakesOpen,
    mistakesResolved,
    resolutionRate,
    evidence,
    observations,
  };
}
