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

/**
 * Recall is "can you retrieve this now", so it uses the most recent graded
 * attempt rather than the best one ever recorded. An old lucky pass does not
 * keep the score up once a later attempt goes the other way.
 */
function latestById<T>(
  ids: EntityId[],
  rows: T[],
  rowId: (row: T) => EntityId,
  rowAt: (row: T) => string | undefined,
  rowScore: (row: T) => number | undefined,
): Array<number | undefined> {
  return ids.map((id) => {
    const values = rows
      .filter((row) => rowId(row) === id && rowScore(row) !== undefined)
      .sort((a, b) => new Date(rowAt(a) ?? 0).getTime() - new Date(rowAt(b) ?? 0).getTime());
    const last = values[values.length - 1];
    return last ? rowScore(last) : undefined;
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
    .flatMap((attempt) => attempt.results.map((result) => ({ ...result, at: attempt.createdAt })));

  const stored = user.topicProgress[topicId];
  const teachBack = user.teachBackResponses[topicId];
  const teachBackScore = teachBack
    ? bestSignal(user, topicId, ["ai_grading"]) ?? stored?.understanding ?? 0
    : undefined;
  const understanding = dimension([teachBackScore]);

  // Every question a learner can meet in this section counts: the recall pool,
  // the authored question bank and the twenty question section quiz.
  // Recall is judged on the latest attempt for each item, not the best one.
  const quizQuestionIds = [
    ...new Set([...questions.map((item) => item.id), ...getSectionQuizQuestions(topicId).map((item) => item.id)]),
  ];
  const recall = merge(
    dimension(latestById(recallQuestions.map((item) => item.id), user.recallResponses, (row) => row.questionId, (row) => row.createdAt, (row) => row.correct ? 100 : 0)),
    dimension(latestById(quizQuestionIds, quizResults, (row) => row.questionId, (row) => row.at, (row) => row.correct ? 100 : 0)),
  );


  // Assignments are split by what they actually ask for: choosing the right
  // answer for a situation counts as application, doing the work counts as
  // practical ability, and diagnosing a fault counts as troubleshooting.
  const assignmentScoreOf = (row: (typeof user.assignmentAttempts)[number]) =>
    row.score === undefined || !row.maxScore ? undefined : (row.score / row.maxScore) * 100;
  const assignmentIdsOfType = (types: string[]) =>
    assignments.filter((item) => types.includes(item.type)).map((item) => item.id);
  const applicationAssignments = bestById(
    assignmentIdsOfType(["scenario", "compare", "design", "exam_simulation", "explain"]),
    user.assignmentAttempts,
    (row) => row.assignmentId,
    assignmentScoreOf,
  );
  const practicalAssignments = bestById(
    assignmentIdsOfType(["build", "configure", "command_challenge", "capstone"]),
    user.assignmentAttempts,
    (row) => row.assignmentId,
    assignmentScoreOf,
  );
  const troubleshootingAssignments = bestById(
    assignmentIdsOfType(["incident", "troubleshoot"]),
    user.assignmentAttempts,
    (row) => row.assignmentId,
    assignmentScoreOf,
  );
  const scenarioScore = scenario
    ? user.scenarioResponses[topicId]?.meetsCriteria === undefined
      ? undefined
      : user.scenarioResponses[topicId]?.meetsCriteria ? 100 : 0
    : undefined;
  const practiceScore = practiceActivity
    ? bestById([practiceActivity.id], user.practiceResponses, (row) => row.activityId, (row) => row.correct ? 100 : 0)
    : [];
  // Application: using what you know to decide what is right in a situation.
  const application = merge(
    dimension(practiceScore),
    dimension(scenario ? [scenarioScore] : []),
    dimension(applicationAssignments),
  );

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
  // Practical ability: doing the work yourself, at the machine and the terminal.
  const practicalAbility = merge(dimension(labScores), dimension(terminalScores), dimension(practicalAssignments));

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
  // Troubleshooting: working out the cause of a fault and what to do about it.
  const troubleshooting = merge(
    dimension(incidentScores),
    dimension(ticketScores),
    dimension(troubleshootingAssignments),
  );


  // Retention covers every item this section contains, not just scheduled
  // reviews. An item only counts as retained once it has been answered well
  // again on a later day, so a single first-time pass is partial credit.
  type Graded = { at: number; pass: boolean };
  const attemptsByItem = new Map<string, Graded[]>();
  const addAttempt = (itemId: string, at: string | undefined, pass: boolean) => {
    if (!at) return;
    const list = attemptsByItem.get(itemId) ?? [];
    list.push({ at: new Date(at).getTime(), pass });
    attemptsByItem.set(itemId, list);
  };

  user.recallResponses
    .filter((row) => row.topicId === topicId)
    .forEach((row) => addAttempt(row.questionId, row.createdAt, row.correct));
  user.practiceResponses
    .filter((row) => row.topicId === topicId)
    .forEach((row) => addAttempt(row.activityId, row.createdAt, row.correct));
  user.quizAttempts
    .filter((attempt) => attempt.status === "submitted")
    .forEach((attempt) => attempt.results.forEach((result) => addAttempt(result.questionId, attempt.createdAt, result.correct)));
  user.labAttempts
    .filter((row) => row.topicId === topicId && row.status !== "in_progress")
    .forEach((row) => addAttempt(row.labId, row.submittedAt ?? row.updatedAt, row.maxScore > 0 && row.score / row.maxScore >= 0.8));
  user.terminalAttempts
    .filter((row) => row.topicId === topicId && row.status === "submitted")
    .forEach((row) => addAttempt(row.scenarioId, row.createdAt, (row.score ?? 0) >= 80));
  user.incidentAttempts
    .filter((row) => row.topicId === topicId && row.status === "submitted")
    .forEach((row) => addAttempt(row.incidentId, row.createdAt, (row.totalScore ?? 0) >= 80));
  user.ticketAttempts
    .filter((row) => row.topicId === topicId && row.status === "submitted")
    .forEach((row) => addAttempt(row.ticketId, row.createdAt, (row.totalScore ?? 0) >= 80));
  user.assignmentAttempts
    .filter((row) => assignments.some((item) => item.id === row.assignmentId))
    .forEach((row) => addAttempt(row.assignmentId, row.submittedAt ?? row.updatedAt, !!row.score && !!row.maxScore && row.score / row.maxScore >= 0.8));
  const scenarioResponse = user.scenarioResponses[topicId];
  if (scenario && scenarioResponse) addAttempt(scenario.id, scenarioResponse.updatedAt ?? scenarioResponse.createdAt, !!scenarioResponse.meetsCriteria);
  if (teachBack) addAttempt(`teach-back-${topicId}`, teachBack.updatedAt ?? teachBack.createdAt, (teachBackScore ?? 0) >= 80);
  const reviewAttempts = user.reviewAttempts.filter((row) => row.topicId === topicId);
  reviewAttempts.forEach((row) => addAttempt(`review-${row.reviewId}`, row.createdAt, row.outcome === "pass"));

  const dayOf = (time: number) => Math.floor(time / (24 * 60 * 60 * 1000));
  const retentionItemIds = [
    ...new Set([
      ...recallQuestions.map((item) => item.id),
      ...quizQuestionIds,
      ...(practiceActivity ? [practiceActivity.id] : []),
      ...labs.map((item) => item.id),
      ...terminal.map((item) => item.id),
      ...incidents.map((item) => item.id),
      ...tickets.map((item) => item.id),
      ...assignments.map((item) => item.id),
      ...(scenario ? [scenario.id] : []),
      `teach-back-${topicId}`,
      ...user.reviews.filter((row) => row.topicId === topicId).map((row) => `review-${row.id}`),
      ...reviewAttempts.map((row) => `review-${row.reviewId}`),
    ]),
  ];
  // Retention is what is still held after time has passed, so it is earned over
  // spaced gaps: a same day pass earns nothing lasting yet, and the credit grows
  // as the gap between passes widens (about a day, a week, then three weeks).
  const retentionScores: Array<number | undefined> = retentionItemIds.map((itemId) => {
    const graded = (attemptsByItem.get(itemId) ?? []).sort((a, b) => a.at - b.at);
    if (!graded.length) return undefined;
    const last = graded[graded.length - 1];
    if (!last || !last.pass) return 0;
    const passes = graded.filter((row) => row.pass);
    const first = passes[0];
    if (!first) return 0;
    const gapDays = dayOf(last.at) - dayOf(first.at);
    if (gapDays < 1) return 20;
    if (gapDays < 7) return 50;
    if (gapDays < 21) return 80;
    return 100;
  });
  const retention = dimension(retentionScores.length ? retentionScores : [undefined]);



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