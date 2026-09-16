/**
 * The single ordering of the curriculum: the Journey Map order.
 *
 * My Path and the Study Plan both follow this order. The only things allowed
 * to jump ahead of it are work the learner already owes: due spaced reviews
 * and unresolved mistakes. Everything else stays in journey order, and a topic
 * stays locked until the one before it is mastered.
 */
import { topics as allTopics } from "@/data/static-content";
import type { Topic, UserData } from "@/lib/app-data/types";
import { topicScopeProgress } from "@/lib/scope-progress";

/** Recorded score that counts as "mastered" for unlocking the next topic. */
export const MASTERY_THRESHOLD = 80;

/** Every topic in Journey Map order: stage (month band) first, then curriculum order. */
export const journeyOrderedTopics: Topic[] = allTopics
  .map((topic, index) => ({ topic, index }))
  .sort((a, b) => a.topic.month - b.topic.month || a.index - b.index)
  .map((entry) => entry.topic);

const ORDER_INDEX = new Map(journeyOrderedTopics.map((topic, index) => [topic.id, index]));

/** Position of a topic on the journey, or a large number when it is not on it. */
export function journeyIndex(topicId: string): number {
  return ORDER_INDEX.get(topicId) ?? Number.MAX_SAFE_INTEGER;
}

export function topicMastery(user: UserData, topicId: string): number {
  return topicScopeProgress(user, topicId).overall;
}

/** Best recorded score on a section quiz, or 0 when it has never been taken. */
export function sectionQuizBest(user: UserData, topicId: string): number {
  const quizId = `section-quiz-${topicId}`;
  return user.quizAttempts
    .filter((attempt) => attempt.quizId === quizId && attempt.status === "submitted")
    .reduce((top, attempt) => Math.max(top, attempt.score ?? 0), 0);
}

/** Passing the section quiz at 80% or better counts as proof on its own. */
export function sectionQuizPassed(user: UserData, topicId: string): boolean {
  return sectionQuizBest(user, topicId) >= MASTERY_THRESHOLD;
}

/** True when there is any recorded work on this topic, of any kind. */
export function hasTopicActivity(user: UserData, topicId: string): boolean {
  const status = user.topicProgress[topicId]?.status;
  if (status && status !== "not_started") return true;
  if (user.recallResponses.some((item) => item.topicId === topicId)) return true;
  if (user.practiceResponses.some((item) => item.topicId === topicId)) return true;
  if (user.labAttempts.some((item) => item.topicId === topicId)) return true;
  if (user.terminalAttempts.some((item) => item.topicId === topicId)) return true;
  if (user.assignmentAttempts.some((item) => item.topicId === topicId)) return true;
  if (Object.values(user.teachBackResponses).some((item) => item.topicId === topicId)) return true;
  if (Object.values(user.scenarioResponses).some((item) => item.topicId === topicId)) return true;
  if (user.quizAttempts.some((item) => item.quizId === `section-quiz-${topicId}`)) return true;
  return false;
}



/** True when the topic is proven well enough to move past it. */
export function isMastered(user: UserData, topicId: string): boolean {
  const status = user.topicProgress[topicId]?.status;
  if (status === "mastered") return true;
  if (sectionQuizPassed(user, topicId)) return true;
  return topicMastery(user, topicId) >= MASTERY_THRESHOLD;
}

/** The topic straight after this one on the journey. */
export function nextJourneyTopic(topicId: string): Topic | undefined {
  const index = journeyIndex(topicId);
  if (index === Number.MAX_SAFE_INTEGER) return undefined;
  return journeyOrderedTopics[index + 1];
}

/** Last month band counted as "the basics" (Stage 1 of the Journey Map). */
const BASICS_LAST_MONTH = 7;

const BASICS_COUNT = journeyOrderedTopics.filter((topic) => topic.month <= BASICS_LAST_MONTH).length;

/**
 * How much of the path the experience setting opens straight away.
 *
 * Complete beginner and some basics start at the very beginning. Home lab
 * experience opens all of the basics. Already working in IT opens everything.
 */
export function unlockedByExperience(user: UserData): number {
  const level = user.settings.experienceLevel;
  if (level === "intermediate") return journeyOrderedTopics.length;
  if (level === "some") return BASICS_COUNT;
  return 0;
}

/** Where the suggested starting point sits for this experience setting. */
export function experienceStartIndex(user: UserData): number {
  return user.settings.experienceLevel === "some" ? BASICS_COUNT : 0;
}

/** The first topic on the journey that is not yet mastered, from their start point. */
export function currentJourneyTopic(user: UserData): Topic | undefined {
  const from = experienceStartIndex(user);
  const notMastered = (topic: Topic) => !isMastered(user, topic.id);
  return (
    journeyOrderedTopics.slice(from).find(notMastered) ?? journeyOrderedTopics.find(notMastered)
  );
}

/**
 * A topic is open when every earlier journey topic is mastered, or when the
 * experience setting already opened it. The current topic itself is always
 * open; everything after it waits.
 */
export function isTopicOpen(user: UserData, topicId: string): boolean {
  const index = journeyIndex(topicId);
  if (index === Number.MAX_SAFE_INTEGER) return true;
  if (index < unlockedByExperience(user)) return true;
  const current = currentJourneyTopic(user);
  if (!current) return true;
  return index <= journeyIndex(current.id);
}


/** The topic that has to be mastered before the given one opens. */
export function blockingTopic(user: UserData, topicId: string): Topic | undefined {
  if (isTopicOpen(user, topicId)) return undefined;
  return currentJourneyTopic(user);
}

/** Sorts any topic list into journey order. */
export function inJourneyOrder<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => journeyIndex(a.id) - journeyIndex(b.id));
}
