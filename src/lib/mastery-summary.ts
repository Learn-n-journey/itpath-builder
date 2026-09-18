/**
 * Two headline measures, used everywhere a score is shown to the learner.
 *
 *   Learning progress   How much of the available work has actually been done.
 *   Overall mastery     How well the final assessments went: the section quiz
 *                       at the end of each topic, and the stage exams at the
 *                       end of each certification block.
 *
 * Nothing is assumed. Work that has not been done counts as zero, and an
 * assessment that has not been taken counts as zero.
 */
import { staticContent } from "@/data/static-content";
import { stageExams } from "@/data/stage-exams";
import type { EntityId, UserData } from "@/lib/app-data/types";
import { topicEvidence } from "@/lib/scope-progress";

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export interface MeasurePair {
  /** 0-100. Share of available work completed. */
  learningProgress: number;
  activitiesCompleted: number;
  activitiesTotal: number;
  /** 0-100. Final assessment results, untaken assessments count as zero. */
  overallMastery: number;
  assessmentsTaken: number;
  assessmentsTotal: number;
}

export function sectionQuizId(topicId: EntityId): string {
  return `section-quiz-${topicId}`;
}

/** Best submitted score for a quiz or exam id, or undefined when never taken. */
function bestScore(user: UserData, quizId: string): number | undefined {
  const scores = user.quizAttempts
    .filter((attempt) => attempt.quizId === quizId && attempt.status === "submitted")
    .map((attempt) => attempt.score);
  return scores.length ? Math.max(...scores) : undefined;
}

/** Learning progress for one topic: graded items attempted out of items available. */
export function topicLearningProgress(user: UserData, topicId: EntityId) {
  const items = topicEvidence(user, topicId);
  const completed = items.filter((item) => item.attempts.length > 0).length;
  return { score: pct(completed, items.length), completed, total: items.length };
}

/** Mastery for one topic: the best result on its final section quiz. */
export function topicMastery(user: UserData, topicId: EntityId) {
  const best = bestScore(user, sectionQuizId(topicId));
  return { score: Math.round(best ?? 0), taken: best !== undefined };
}

/** Both measures for one topic. */
export function topicMeasures(user: UserData, topicId: EntityId): MeasurePair {
  const progress = topicLearningProgress(user, topicId);
  const mastery = topicMastery(user, topicId);
  return {
    learningProgress: progress.score,
    activitiesCompleted: progress.completed,
    activitiesTotal: progress.total,
    overallMastery: mastery.score,
    assessmentsTaken: mastery.taken ? 1 : 0,
    assessmentsTotal: 1,
  };
}

/** Both measures across the whole curriculum. */
export function overallMeasures(user: UserData): MeasurePair {
  let completed = 0;
  let total = 0;
  const finals: Array<number | undefined> = [];

  for (const topic of staticContent.topics) {
    const items = topicEvidence(user, topic.id);
    total += items.length;
    completed += items.filter((item) => item.attempts.length > 0).length;
    finals.push(bestScore(user, sectionQuizId(topic.id)));
  }
  for (const exam of stageExams) {
    finals.push(bestScore(user, exam.id));
  }

  const earned = finals.reduce<number>((sum, score) => sum + (score ?? 0), 0);

  return {
    learningProgress: pct(completed, total),
    activitiesCompleted: completed,
    activitiesTotal: total,
    overallMastery: pct(earned, finals.length * 100),
    assessmentsTaken: finals.filter((score) => score !== undefined).length,
    assessmentsTotal: finals.length,
  };
}
