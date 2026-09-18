/**
 * Achievement badges.
 *
 * Every badge is earned from work that is already recorded: sections mastered,
 * exams passed, questions answered, tickets closed, days studied. Nothing is
 * awarded for signing in, and an unearned badge always says exactly what would
 * earn it. No points, no levels, no invented progress.
 */
import { stageExams } from "@/data/stage-exams";
import { staticContent } from "@/data/static-content";
import type { UserData } from "@/lib/app-data/types";
import { sectionQuizId } from "@/lib/mastery-summary";
import { streakSummary } from "@/lib/streak-engine";

export type BadgeGroup = "Mastery" | "Consistency" | "Practice";

export interface Badge {
  id: string;
  title: string;
  group: BadgeGroup;
  /** What earns it, in plain words. */
  requirement: string;
  earned: boolean;
  /** The recorded evidence behind it, or how far along you are. */
  evidence: string;
}

interface Counts {
  sectionsMastered: number;
  stageExamsPassed: number;
  stageExamsTotal: number;
  questionsAnswered: number;
  perfectQuizzes: number;
  ticketsClosed: number;
  teachBacks: number;
  labs: number;
  currentStreak: number;
  longestStreak: number;
  activeDaysLast28: number;
}

const PASS = 80;

export function badgeCounts(user: UserData): Counts {
  const passes = Object.values(user.quizPasses ?? {});
  const sectionQuizIds = new Set(staticContent.topics.map((topic) => sectionQuizId(topic.id)));
  const stageExamIds = new Set(stageExams.map((exam) => exam.id));

  const submitted = user.quizAttempts.filter((attempt) => attempt.status === "submitted");
  const streak = streakSummary(user);

  return {
    sectionsMastered: passes.filter((pass) => sectionQuizIds.has(pass.quizId) && pass.score >= PASS)
      .length,
    stageExamsPassed: passes.filter((pass) => stageExamIds.has(pass.quizId) && pass.score >= PASS)
      .length,
    stageExamsTotal: stageExams.length,
    questionsAnswered: submitted.reduce((sum, attempt) => sum + (attempt.total ?? 0), 0),
    perfectQuizzes: submitted.filter((attempt) => attempt.total > 0 && attempt.score >= 100).length,
    ticketsClosed: user.ticketAttempts.length,
    teachBacks: Object.values(user.teachBackResponses ?? {}).length,
    labs: user.labAttempts.length,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    activeDaysLast28: streak.activeDaysLast28,
  };
}

function countBadge(
  id: string,
  group: BadgeGroup,
  title: string,
  requirement: string,
  value: number,
  target: number,
  unit: string,
): Badge {
  const earned = value >= target;
  return {
    id,
    group,
    title,
    requirement,
    earned,
    evidence: earned
      ? `Recorded: ${value} ${unit}.`
      : `${value} of ${target} ${unit} so far.`,
  };
}

/** Every badge, earned and unearned, in a stable order. */
export function allBadges(user: UserData): Badge[] {
  const counts = badgeCounts(user);

  return [
    countBadge(
      "section-1",
      "Mastery",
      "First section mastered",
      "Pass one section quiz at 80 or better.",
      counts.sectionsMastered,
      1,
      "sections mastered",
    ),
    countBadge(
      "section-5",
      "Mastery",
      "Five sections mastered",
      "Pass five section quizzes at 80 or better.",
      counts.sectionsMastered,
      5,
      "sections mastered",
    ),
    countBadge(
      "section-10",
      "Mastery",
      "Ten sections mastered",
      "Pass ten section quizzes at 80 or better.",
      counts.sectionsMastered,
      10,
      "sections mastered",
    ),
    countBadge(
      "section-25",
      "Mastery",
      "Twenty five sections mastered",
      "Pass twenty five section quizzes at 80 or better.",
      counts.sectionsMastered,
      25,
      "sections mastered",
    ),
    countBadge(
      "stage-exam-1",
      "Mastery",
      "First stage exam passed",
      "Pass one stage exam at 80 or better.",
      counts.stageExamsPassed,
      1,
      "stage exams passed",
    ),
    countBadge(
      "stage-exam-all",
      "Mastery",
      "Every stage exam passed",
      "Pass all of the stage exams at 80 or better.",
      counts.stageExamsPassed,
      counts.stageExamsTotal,
      "stage exams passed",
    ),
    countBadge(
      "perfect-quiz",
      "Mastery",
      "A perfect quiz",
      "Score 100 on any quiz.",
      counts.perfectQuizzes,
      1,
      "perfect quizzes",
    ),
    countBadge(
      "streak-7",
      "Consistency",
      "Seven days in a row",
      "Study on seven consecutive days.",
      counts.longestStreak,
      7,
      "days in your best run",
    ),
    countBadge(
      "streak-30",
      "Consistency",
      "Thirty days in a row",
      "Study on thirty consecutive days.",
      counts.longestStreak,
      30,
      "days in your best run",
    ),
    countBadge(
      "streak-100",
      "Consistency",
      "One hundred days in a row",
      "Study on one hundred consecutive days.",
      counts.longestStreak,
      100,
      "days in your best run",
    ),
    countBadge(
      "month-20",
      "Consistency",
      "Twenty days in a month",
      "Study on twenty days within the last twenty eight.",
      counts.activeDaysLast28,
      20,
      "days studied in the last four weeks",
    ),
    countBadge(
      "questions-100",
      "Practice",
      "One hundred questions answered",
      "Answer one hundred questions in submitted quizzes.",
      counts.questionsAnswered,
      100,
      "questions answered",
    ),
    countBadge(
      "questions-500",
      "Practice",
      "Five hundred questions answered",
      "Answer five hundred questions in submitted quizzes.",
      counts.questionsAnswered,
      500,
      "questions answered",
    ),
    countBadge(
      "questions-2000",
      "Practice",
      "Two thousand questions answered",
      "Answer two thousand questions in submitted quizzes.",
      counts.questionsAnswered,
      2000,
      "questions answered",
    ),
    countBadge(
      "ticket-1",
      "Practice",
      "First ticket closed",
      "Work one career mode ticket through to the end.",
      counts.ticketsClosed,
      1,
      "tickets closed",
    ),
    countBadge(
      "teach-back-1",
      "Practice",
      "First teach back",
      "Explain one section in your own words.",
      counts.teachBacks,
      1,
      "teach backs recorded",
    ),
    countBadge(
      "lab-1",
      "Practice",
      "First lab completed",
      "Finish one hands-on lab.",
      counts.labs,
      1,
      "labs completed",
    ),
  ];
}

export function earnedBadges(user: UserData): Badge[] {
  return allBadges(user).filter((badge) => badge.earned);
}
