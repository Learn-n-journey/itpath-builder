/**
 * Full-scope progress, rebuilt around what each measure actually means.
 *
 * Every piece of recorded work is treated as a piece of evidence for one
 * ability, and nothing is counted twice:
 *
 *   Understanding      Can you say what it means and why, in your own words.
 *   Recall             Can you get the fact back out of memory right now.
 *   Application        Can you pick the right thing to do in a situation.
 *   Practical ability  Can you do the work yourself at a machine or terminal.
 *   Troubleshooting    Can you find the cause of a fault and deal with it.
 *
 * Retention is not a sixth ability. It is how well the same evidence holds up
 * once time has passed, so it is measured across all of the items above and
 * kept out of the overall score to avoid counting the same work twice.
 *
 * Every measure is per topic. A topic only counts the items that exist in it,
 * and a measure with no items in the topic is simply not measured there.
 * Unattempted items count as zero: nothing is assumed.
 */
import { getPracticeActivity, getRealWorldScenario, getRecallQuestions } from "@/data/learning-content";
import { getSectionQuizQuestions } from "@/data/topic-quizzes";
import { staticContent } from "@/data/static-content";
import { terminalScenarios } from "@/lib/terminal/scenarios";
import { trainingTickets } from "@/lib/training/tickets";
import { mobileTrainingTickets } from "@/lib/training/mobile-tickets";
import type { EntityId, UserData } from "@/lib/app-data/types";

export type ScopeDimensionKey =
  | "understanding"
  | "recall"
  | "application"
  | "practicalAbility"
  | "troubleshooting";

export interface ScopeDimension {
  score: number;
  earned: number;
  /** How many items of this kind exist in the topic. */
  available: number;
  /** How many of them have a graded attempt. */
  attempted: number;
  /** False when the topic has no work of this kind at all. */
  measured: boolean;
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

/** One thing the learner can be graded on, and every graded go they have had. */
export interface EvidenceItem {
  id: string;
  dimension: ScopeDimensionKey;
  /** Recall is "right now", so it reads the latest go. Skills read the best. */
  reading: "latest" | "best";
  attempts: Array<{ at: number; score: number }>;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const pct = (earned: number, available: number) =>
  available === 0 ? 0 : Math.round((earned / available) * 100);

const PASS = 80;
const DAY = 24 * 60 * 60 * 1000;
const dayOf = (time: number) => Math.floor(time / DAY);

function itemScore(item: EvidenceItem): number | undefined {
  if (!item.attempts.length) return undefined;
  if (item.reading === "best") return clamp(Math.max(...item.attempts.map((row) => row.score)));
  const sorted = [...item.attempts].sort((a, b) => a.at - b.at);
  const last = sorted[sorted.length - 1];
  return last ? clamp(last.score) : undefined;
}

function summarise(items: EvidenceItem[]): ScopeDimension {
  const scores = items.map(itemScore);
  const earned = scores.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return {
    score: pct(earned, scores.length * 100),
    earned,
    available: scores.length,
    attempted: scores.filter((value) => value !== undefined).length,
    measured: scores.length > 0,
  };
}

/**
 * Retention: does the same evidence still hold after time has passed.
 *
 * A single pass proves it was there once, not that it stuck, so it earns
 * little. The credit grows as the gap between passes widens: overnight, then
 * about a week, then about three weeks.
 */
function retentionOf(items: EvidenceItem[]): ScopeDimension {
  const scores = items.map((item) => {
    if (!item.attempts.length) return undefined;
    const sorted = [...item.attempts].sort((a, b) => a.at - b.at);
    const last = sorted[sorted.length - 1];
    if (!last || last.score < PASS) return 0;
    const first = sorted.find((row) => row.score >= PASS);
    if (!first) return 0;
    const gap = dayOf(last.at) - dayOf(first.at);
    if (gap < 1) return 20;
    if (gap < 7) return 50;
    if (gap < 21) return 80;
    return 100;
  });
  const earned = scores.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return {
    score: pct(earned, scores.length * 100),
    earned,
    available: scores.length,
    attempted: scores.filter((value) => value !== undefined).length,
    measured: scores.length > 0,
  };
}

/** Which ability an assignment proves, read from what the assignment asks for. */
function dimensionForAssignment(type: string): ScopeDimensionKey {
  if (type === "explain" || type === "teach_back") return "understanding";
  if (type === "recall") return "recall";
  if (type === "incident" || type === "troubleshoot") return "troubleshooting";
  if (type === "build" || type === "configure" || type === "command_challenge" || type === "capstone")
    return "practicalAbility";
  return "application"; // scenario, compare, design, exam_simulation and the rest
}

/** Every graded item that exists in a topic, with the learner's attempts on it. */
export function topicEvidence(user: UserData, topicId: EntityId): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const byId = new Map<string, EvidenceItem>();
  const add = (id: string, dimension: ScopeDimensionKey, reading: "latest" | "best") => {
    if (byId.has(id)) return;
    const item: EvidenceItem = { id, dimension, reading, attempts: [] };
    byId.set(id, item);
    items.push(item);
  };
  const record = (id: string, at: string | undefined, score: number | undefined) => {
    const item = byId.get(id);
    if (!item || !at || score === undefined || Number.isNaN(score)) return;
    const time = new Date(at).getTime();
    if (Number.isNaN(time)) return;
    item.attempts.push({ at: time, score: clamp(score) });
  };
  const ratio = (score: number | undefined, max: number | undefined) =>
    score === undefined || !max ? undefined : (score / max) * 100;

  /* ---------------- what exists in this topic ---------------- */

  const recallQuestions = getRecallQuestions(topicId);
  const practiceActivity = getPracticeActivity(topicId);
  const scenario = getRealWorldScenario(topicId);
  const questions = staticContent.questions.filter((item) => item.topicId === topicId);
  const assignments = staticContent.assignments.filter((item) => item.topicId === topicId);
  const labs = staticContent.labs.filter((item) => item.topicId === topicId);
  const incidents = staticContent.incidents.filter((item) => item.topicId === topicId);
  const tickets = staticContent.tickets.filter((item) => item.topicId === topicId);
  const simulatorTickets = [...trainingTickets, ...mobileTrainingTickets].filter((item) => item.topicId === topicId);
  const terminal = terminalScenarios.filter((item) => item.topicId === topicId);
  const quizQuestionIds = [
    ...new Set([
      ...questions.map((item) => item.id),
      ...getSectionQuizQuestions(topicId).map((item) => item.id),
    ]),
  ];

  // Understanding: explaining it back in your own words.
  add(`teach-back-${topicId}`, "understanding", "best");
  // Recall: the recall pool plus every question in the section.
  recallQuestions.forEach((item) => add(item.id, "recall", "latest"));
  quizQuestionIds.forEach((id) => add(id, "recall", "latest"));
  // Application: deciding what is right in a described situation.
  if (practiceActivity) add(practiceActivity.id, "application", "best");
  if (scenario) add(scenario.id, "application", "best");
  // Practical ability: doing the work.
  labs.forEach((item) => add(item.id, "practicalAbility", "best"));
  terminal.forEach((item) => add(item.id, "practicalAbility", "best"));
  // Troubleshooting: finding the cause of a fault.
  incidents.forEach((item) => add(item.id, "troubleshooting", "best"));
  tickets.forEach((item) => add(item.id, "troubleshooting", "best"));
  simulatorTickets.forEach((item) => add(item.id, "troubleshooting", "best"));
  // Assignments land wherever their task type points.
  assignments.forEach((item) => {
    const dimension = dimensionForAssignment(item.type);
    add(item.id, dimension, dimension === "recall" ? "latest" : "best");
  });

  /* ---------------- what the learner has recorded ---------------- */

  const teachBack = user.teachBackResponses[topicId];
  if (teachBack) {
    const graded = user.learnerSignals
      .filter((signal) => signal.topicId === topicId && signal.kind === "ai_grading")
      .map((signal) =>
        typeof signal.score === "number"
          ? signal.score * 100
          : signal.correct === undefined
            ? undefined
            : signal.correct ? 100 : 0,
      )
      .filter((value): value is number => value !== undefined);
    const best = graded.length
      ? Math.max(...graded)
      : user.topicProgress[topicId]?.understanding ?? 0;
    record(`teach-back-${topicId}`, teachBack.updatedAt ?? teachBack.createdAt, best);
  }

  user.recallResponses
    .filter((row) => row.topicId === topicId)
    .forEach((row) => record(row.questionId, row.createdAt, row.correct ? 100 : 0));

  user.quizAttempts
    .filter((attempt) => attempt.status === "submitted")
    .forEach((attempt) =>
      attempt.results.forEach((result) =>
        record(result.questionId, attempt.createdAt, result.correct ? 100 : 0),
      ),
    );

  user.practiceResponses
    .filter((row) => row.topicId === topicId)
    .forEach((row) => record(row.activityId, row.createdAt, row.correct ? 100 : 0));

  const scenarioResponse = user.scenarioResponses[topicId];
  if (scenario && scenarioResponse && scenarioResponse.meetsCriteria !== undefined) {
    record(
      scenario.id,
      scenarioResponse.updatedAt ?? scenarioResponse.createdAt,
      scenarioResponse.meetsCriteria ? 100 : 0,
    );
  }

  user.labAttempts
    .filter((row) => row.status !== "in_progress")
    .forEach((row) => record(row.labId, row.submittedAt ?? row.updatedAt, ratio(row.score, row.maxScore)));

  user.terminalAttempts
    .filter((row) => row.status === "submitted")
    .forEach((row) => record(row.scenarioId, row.createdAt, row.score));

  user.incidentAttempts
    .filter((row) => row.status === "submitted")
    .forEach((row) => record(row.incidentId, row.createdAt, row.totalScore));

  user.ticketAttempts
    .filter((row) => row.status === "submitted")
    .forEach((row) => record(row.ticketId, row.createdAt, row.totalScore));

  user.assignmentAttempts.forEach((row) =>
    record(row.assignmentId, row.submittedAt ?? row.updatedAt, ratio(row.score, row.maxScore)),
  );

  // Verified simulator outcomes may strengthen an authored Lab/Ticket, but may
  // never create a new mastery item. The activity must already exist in this
  // topic's curriculum evidence map. Recording onto the same item also avoids
  // double-counting when a normal attempt record exists.
  user.learnerSignals
    .filter((signal) =>
      signal.topicId === topicId &&
      (signal.kind === "lab" || signal.kind === "troubleshoot" || signal.kind === "career") &&
      signal.errorTag?.startsWith("simulator:"),
    )
    .forEach((signal) => {
      const match = signal.errorTag?.match(/^simulator:([^:]+)(?::help-(\d+))?$/);
      if (!match) return;
      const activityId = match[1];
      const item = activityId ? byId.get(activityId) : undefined;
      if (!item) return;
      if (signal.kind === "lab" && item.dimension !== "practicalAbility") return;
      if ((signal.kind === "troubleshoot" || signal.kind === "career") && item.dimension !== "troubleshooting") return;
      const score = typeof signal.score === "number"
        ? signal.score * 100
        : signal.correct === undefined ? undefined : signal.correct ? 100 : 0;
      record(activityId, signal.at, score);
    });

  return items;
}

export function topicScopeProgress(user: UserData, topicId: EntityId): TopicScopeProgress {
  const items = topicEvidence(user, topicId);

  /* ---------------- the measures ---------------- */

  const of = (dimension: ScopeDimensionKey) =>
    summarise(items.filter((item) => item.dimension === dimension));

  const understanding = of("understanding");
  const recall = of("recall");
  const application = of("application");
  const practicalAbility = of("practicalAbility");
  const troubleshooting = of("troubleshooting");

  // Retention reads the same items again, this time asking whether the passes
  // held up over spaced days rather than what the score was.
  const retention = retentionOf(items);

  // The overall score is the five abilities only. Retention describes how well
  // that same work has lasted, so folding it in here would count it twice.
  const abilities = [understanding, recall, application, practicalAbility, troubleshooting];
  const earned = abilities.reduce((sum, item) => sum + item.earned, 0);
  const available = abilities.reduce((sum, item) => sum + item.available, 0);
  const attempted = abilities.reduce((sum, item) => sum + item.attempted, 0);

  return {
    topicId,
    understanding,
    recall,
    application,
    practicalAbility,
    troubleshooting,
    retention,
    overall: pct(earned, available * 100),
    earned,
    available,
    attempted,
  };
}

export function allTopicScopeProgress(user: UserData): TopicScopeProgress[] {
  return staticContent.topics.map((topic) => topicScopeProgress(user, topic.id));
}
