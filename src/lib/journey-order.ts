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

/** True when the topic is proven well enough to move past it. */
export function isMastered(user: UserData, topicId: string): boolean {
  const status = user.topicProgress[topicId]?.status;
  if (status === "mastered") return true;
  return topicMastery(user, topicId) >= MASTERY_THRESHOLD;
}

/** The first topic on the journey that is not yet mastered. */
export function currentJourneyTopic(user: UserData): Topic | undefined {
  return journeyOrderedTopics.find((topic) => !isMastered(user, topic));
}

/**
 * A topic is open when every earlier journey topic is mastered. The current
 * topic itself is always open; everything after it waits.
 */
export function isTopicOpen(user: UserData, topicId: string): boolean {
  const index = journeyIndex(topicId);
  if (index === Number.MAX_SAFE_INTEGER) return true;
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
