/**
 * The single ordering of the curriculum: the Journey Map order.
 *
 * My Path and the Study Plan both follow this order. The only things allowed
 * to jump ahead of it are work the learner already owes: due spaced reviews
 * and unresolved mistakes. Everything else stays in journey order, and a topic
 * stays locked until the one before it is mastered.
 */
import { certifications, topics as allTopics } from "@/data/static-content";
import { certificationTopics } from "@/lib/cert-path";
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

/** The certification the learner is aiming at, from their settings. */
function chosenCertification(user: UserData) {
  const target = user.settings.certificationTarget;
  return (
    certifications.find((item) => item.id === target || item.title === target) ?? certifications[0]
  );
}

const JOURNEY_CACHE = new Map<string, Topic[]>();

/**
 * The journey for this learner: only the sections that belong to the
 * certification they selected, in journey order.
 */
export function journeyTopics(user: UserData): Topic[] {
  const certification = chosenCertification(user);
  if (!certification) return journeyOrderedTopics;
  const cached = JOURNEY_CACHE.get(certification.id);
  if (cached) return cached;
  const ids = new Set(certificationTopics(certification.id).map((topic) => topic.id));
  const list = journeyOrderedTopics.filter((topic) => ids.has(topic.id));
  const result = list.length > 0 ? list : journeyOrderedTopics;
  JOURNEY_CACHE.set(certification.id, result);
  return result;
}

/** Position of a topic inside this learner's certification journey. */
export function journeyIndexFor(user: UserData, topicId: string): number {
  const index = journeyTopics(user).findIndex((topic) => topic.id === topicId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/** True when the topic belongs to the certification the learner selected. */
export function onJourney(user: UserData, topicId: string): boolean {
  return journeyIndexFor(user, topicId) !== Number.MAX_SAFE_INTEGER;
}

export function topicMastery(user: UserData, topicId: string): number {
  return topicScopeProgress(user, topicId).overall;
}

/** Best recorded score on a section quiz, or 0 when it has never been taken. */
export function sectionQuizBest(user: UserData, topicId: string): number {
  const quizId = `section-quiz-${topicId}`;
  const remembered = user.quizPasses?.[quizId]?.score ?? 0;
  return user.quizAttempts
    .filter((attempt) => attempt.quizId === quizId && attempt.status === "submitted")
    .reduce((top, attempt) => Math.max(top, attempt.score ?? 0), remembered);
}

/** The day this section's quiz was first passed, if it has been. */
export function sectionQuizPassedAt(user: UserData, topicId: string): string | undefined {
  return user.quizPasses?.[`section-quiz-${topicId}`]?.passedAt;
}

/** Passing the section quiz at 80% or better counts as proof on its own. */
export function sectionQuizPassed(user: UserData, topicId: string): boolean {
  if (user.quizPasses?.[`section-quiz-${topicId}`]) return true;
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



/**
 * True when the section is proven well enough to move past it.
 *
 * A quiz score on its own is not enough. Every form of proof the section
 * contains has to stand up on its own, and the delayed check has to be clear.
 */
export function isMastered(user: UserData, topicId: string): boolean {
  return masteryGate(user, topicId).met;
}

/** The topic straight after this one on the journey. */
export function nextJourneyTopic(topicId: string, user?: UserData): Topic | undefined {
  const list = user ? journeyTopics(user) : journeyOrderedTopics;
  const index = user ? journeyIndexFor(user, topicId) : journeyIndex(topicId);
  if (index === Number.MAX_SAFE_INTEGER) return undefined;
  return list[index + 1];
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
  const list = journeyTopics(user);
  if (level === "intermediate") return list.length;
  if (level === "some") return Math.min(BASICS_COUNT, list.length);
  return 0;
}

/** Where the suggested starting point sits for this experience setting. */
export function experienceStartIndex(user: UserData): number {
  if (user.settings.experienceLevel !== "some") return 0;
  return Math.min(BASICS_COUNT, Math.max(0, journeyTopics(user).length - 1));
}

/** The first topic on the journey that is not yet mastered, from their start point. */
export function currentJourneyTopic(user: UserData): Topic | undefined {
  const from = experienceStartIndex(user);
  const list = journeyTopics(user);
  const notMastered = (topic: Topic) => !isMastered(user, topic.id);
  return list.slice(from).find(notMastered) ?? list.find(notMastered);
}

/**
 * A topic is open when every earlier journey topic is mastered, or when the
 * experience setting already opened it. The current topic itself is always
 * open; everything after it waits.
 */
export function isTopicOpen(user: UserData, topicId: string): boolean {
  const index = journeyIndexFor(user, topicId);
  if (index === Number.MAX_SAFE_INTEGER) return true;
  if (index < unlockedByExperience(user)) return true;
  const current = currentJourneyTopic(user);
  if (!current) return true;
  return index <= journeyIndexFor(user, current.id);
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
