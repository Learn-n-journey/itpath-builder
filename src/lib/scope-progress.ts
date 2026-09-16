/**
 * Full-scope progress calculations.
 *
 * Each dimension is earned against every relevant activity that exists for the
 * topic. Unattempted work contributes zero. Retakes improve an activity's best
 * result without making repeated attempts inflate coverage.
 */
import { getPracticeActivity, getRealWorldScenario, getRecallQuestions } from "@/data/learning-content";
import { getSectionQuizQuestions } from "@/data/topic-quizzes";
import { staticContent } from "@/data/static-content";
import { terminalScenarios } from "@/lib/terminal/scenarios";
import type { EntityId, UserData } from "@/lib/app-data/types";

export interface ScopeDimension {
  score: number;
  earned: number;
  available: number;
  attempted: number;
}

export interface TopicScopeProgress {
  topicId: EntityId;
  understanding: ScopeDimension;
  recall: ScopeDimension;
  application: ScopeDimension;
  practicalAbility: ScopeDimension;
  troubleshooting: ScopeDimension;
  retention: ScopeDimension;
  overall: number;
  earned: number;
  available: number;
  attempted: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const score = (earned: number, available: number) =>
  available === 0 ? 0 : Math.round((earned / available) * 100);

function dimension(values: Array<number | undefined>): ScopeDimension {
  const normalized = values.map((value) => value === undefined ? undefined : clamp(value));
  const earned = normalized.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return {
    score: score(earned, normalized.length * 100),
    earned,
    available: normalized.length,
    attempted: normalized.filter((value) => value !== undefined).length,
  };
}

function bestById<T>(
  ids: EntityId[],
  rows: T[],
  rowId: (row: T) => EntityId,
  rowScore: (row: T) => number | undefined,
): Array<number | undefined> {
  return ids.map((id) => {
    const values = rows.filter((row) => rowId(row) === id).map(rowScore).filter((value): value is number => value !== undefined);
    return values.length ? Math.max(...values) : undefined;
  });
}

function bestSignal(user: UserData, topicId: EntityId, kinds: string[]): number | undefined {
  const scores = user.learnerSignals
    .filter((signal) => signal.topicId === topicId && kinds.includes(signal.kind))
    .map((signal) => typeof signal.score === "number" ? signal.score * 100 : signal.correct === undefined ? undefined : signal.correct ? 100 : 0)
    .filter((value): value is number => value !== undefined);
  return scores.length ? Math.max(...scores) : undefined;
}

function merge(...parts: ScopeDimension[]): ScopeDimension {
  const earned = parts.reduce((sum, part) => sum + part.earned, 0);
  const available = parts.reduce((sum, part) => sum + part.available, 0);
  const attempted = parts.reduce((sum, part) => sum + part.attempted, 0);
  return { score: score(earned, available * 100), earned, available, attempted };
}

export function topicScopeProgress(user: UserData, topicId: EntityId): TopicScopeProgress {
  const recallQuestions = getRecallQuestions(topicId);
  const practiceActivity = getPracticeActivity(topicId);
  const scenario = getRealWorldScenario(topicId);
  const questions = staticContent.questions.filter((item) => item.topicId === topicId);
  const assignments = staticContent.assignments.filter((item) => item.topicId === topicId);
  const labs = staticContent.labs.filter((item) => item.topicId === topicId);
  const incidents = staticContent.incidents.filter((item) => item.topicId === topicId);
  const tickets = staticContent.tickets.filter((item) => item.topicId === topicId);
  const terminal = terminalScenarios.filter((item) => item.topicId === topicId);

  const quizResults = user.quizAttempts
    .filter((attempt) => attempt.status === "submitted")
    .flatMap((attempt) => attempt.results);

  const stored = user.topicProgress[topicId];
  const teachBack = user.teachBackResponses[topicId];
  const teachBackScore = teachBack
    ? bestSignal(user, topicId, ["ai_grading"]) ?? stored?.understanding ?? 0
    : undefined;
  const understanding = dimension([teachBackScore]);

  // Every question a learner can meet in this section counts: the recall pool,
  // the authored question bank and the twenty question section quiz.
  const quizQuestionIds = [
    ...new Set([...questions.map((item) => item.id), ...getSectionQuizQuestions(topicId).map((item) => item.id)]),
  ];
  const recall = merge(
    dimension(bestById(recallQuestions.map((item) => item.id), user.recallResponses, (row) => row.questionId, (row) => row.correct ? 100 : 0)),
    dimension(bestById(quizQuestionIds, quizResults, (row) => row.questionId, (row) => row.correct ? 100 : 0)),
  );

  const assignmentScores = bestById(
    assignments.map((item) => item.id),
    user.assignmentAttempts,
    (row) => row.assignmentId,
    (row) => row.score === undefined || !row.maxScore ? undefined : (row.score / row.maxScore) * 100,
  );
  const scenarioScore = scenario
    ? user.scenarioResponses[topicId]?.meetsCriteria === undefined
      ? undefined
      : user.scenarioResponses[topicId]?.meetsCriteria ? 100 : 0
    : undefined;
  const practiceScore = practiceActivity
    ? bestById([practiceActivity.id], user.practiceResponses, (row) => row.activityId, (row) => row.correct ? 100 : 0)
    : [];
  const application = merge(dimension(practiceScore), dimension(scenario ? [scenarioScore] : []), dimension(assignmentScores));

  const labScores = bestById(
    labs.map((item) => item.id),
    user.labAttempts.filter((row) => row.status !== "in_progress"),
    (row) => row.labId,
    (row) => row.maxScore > 0 ? (row.score / row.maxScore) * 100 : undefined,
  );
  const terminalScores = bestById(
    terminal.map((item) => item.id),
    user.terminalAttempts.filter((row) => row.status === "submitted"),
    (row) => row.scenarioId,
    (row) => row.score,
  );
  const practicalAbility = merge(dimension(labScores), dimension(terminalScores));

  const incidentScores = bestById(
    incidents.map((item) => item.id),
    user.incidentAttempts.filter((row) => row.status === "submitted"),
    (row) => row.incidentId,
    (row) => row.totalScore,
  );
  const ticketScores = bestById(
    tickets.map((item) => item.id),
    user.ticketAttempts.filter((row) => row.status === "submitted"),
    (row) => row.ticketId,
    (row) => row.totalScore,
  );
  const troubleshooting = merge(dimension(incidentScores), dimension(ticketScores), dimension(terminalScores));

  // Retention covers every review this section has scheduled, not one lump
  // result. Each item scores on its most recent graded outcome.
  const reviewAttempts = user.reviewAttempts.filter((row) => row.topicId === topicId);
  const reviewItems = user.reviews.filter((row) => row.topicId === topicId);
  const reviewScores: Array<number | undefined> = reviewItems.map((item) => {
    const graded = reviewAttempts
      .filter((row) => row.reviewId === item.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const last = graded[graded.length - 1];
    return last ? (last.outcome === "pass" ? 100 : 0) : undefined;
  });
  // Graded reviews whose scheduled item has since been cleared still count.
  const orphanAttempts = reviewAttempts.filter((row) => !reviewItems.some((item) => item.id === row.reviewId));
  const orphanByReview = [...new Set(orphanAttempts.map((row) => row.reviewId))].map((reviewId) => {
    const graded = orphanAttempts
      .filter((row) => row.reviewId === reviewId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const last = graded[graded.length - 1];
    return last ? (last.outcome === "pass" ? 100 : 0) : undefined;
  });
  const allReviewScores = [...reviewScores, ...orphanByReview];
  const retention = dimension(allReviewScores.length ? allReviewScores : [undefined]);

  const dimensions = [understanding, recall, application, practicalAbility, troubleshooting, retention];
  const earned = dimensions.reduce((sum, item) => sum + item.earned, 0);
  const available = dimensions.reduce((sum, item) => sum + item.available, 0);
  const attempted = dimensions.reduce((sum, item) => sum + item.attempted, 0);
  return {
    topicId,
    understanding,
    recall,
    application,
    practicalAbility,
    troubleshooting,
    retention,
    overall: score(earned, available * 100),
    earned,
    available,
    attempted,
  };
}

export function allTopicScopeProgress(user: UserData): TopicScopeProgress[] {
  return staticContent.topics.map((topic) => topicScopeProgress(user, topic.id));
}