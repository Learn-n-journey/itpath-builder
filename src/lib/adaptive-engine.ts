import { topics as allTopics } from "@/data/static-content";
import { adaptivePath } from "@/lib/adaptive-path";
import { buildIntelligence } from "@/lib/intelligence/engine";
import type { Topic, UserData } from "@/lib/app-data/types";
import { topicScopeProgress } from "@/lib/scope-progress";

export interface AdaptiveEntry {
  topic: Topic;
  /** 0-100 average of the six recorded dimensions. */
  mastery: number;
  /** Higher means "study this sooner". */
  priority: number;
  /** True when every prerequisite inside the same certification is at 60+. */
  unlocked: boolean;
  /** Plain sentence explaining the placement. */
  reason: string;
  openMistakes: number;
  dueReviews: number;
}

export interface AdaptiveQueue {
  certificationTitle: string;
  entries: AdaptiveEntry[];
  /** The single next topic to work on. */
  next: AdaptiveEntry | undefined;
  hasData: boolean;
}

function mastery(user: UserData, topicId: string): number {
  return topicScopeProgress(user, topicId).overall;
}

/**
 * Orders a certification's topics by what will move the learner forward most:
 * unresolved mistakes and overdue reviews first, then locked-but-close
 * material, then untouched topics in curriculum order.
 */
export function adaptiveQueue(user: UserData, now: Date = new Date()): AdaptiveQueue {
  const path = adaptivePath(user);
  const nowMs = now.getTime();
  // The intelligence engine supplies the diagnosed cause and its urgency; this
  // queue keeps curriculum order as the tie-breaker.
  const intelligence = buildIntelligence(user, now);

  const entries: AdaptiveEntry[] = path.topics.map((topic, index) => {
    const score = mastery(user, topic.id);
    const openMistakes = user.mistakes.filter(
      (mistake) => mistake.topicId === topic.id && !mistake.resolved,
    ).length;
    const dueReviews = user.reviews.filter(
      (review) => review.topicId === topic.id && new Date(review.dueAt).getTime() <= nowMs,
    ).length;

    const prerequisites = topic.prerequisiteTopicIds
      .map((id) => allTopics.find((item) => item.id === id))
      .filter((item): item is Topic => Boolean(item))
      .filter((item) => item.certificationId === topic.certificationId);
    const weakPrerequisite = prerequisites.find(
      (item) => mastery(user, item.id) < 60,
    );
    const unlocked = !weakPrerequisite;

    let priority = 0;
    priority += openMistakes * 14;
    priority += dueReviews * 10;
    if (score > 0 && score < 60) priority += 30; // started but not solid
    if (score === 0) priority += 12;
    priority += Math.max(0, 100 - score) / 10;
    priority -= index * 0.4; // keep curriculum order as a tie-breaker
    if (!unlocked) priority -= 25;
    const intel = intelligence.byTopic[topic.id];
    if (intel) priority += intel.priority * 0.35;

    let reason: string;
    if (openMistakes > 0) {
      reason = `${openMistakes} unresolved mistake${openMistakes === 1 ? "" : "s"} here.`;
    } else if (dueReviews > 0) {
      reason = `${dueReviews} review${dueReviews === 1 ? "" : "s"} due.`;
    } else if (!unlocked && weakPrerequisite) {
      reason = `Build ${weakPrerequisite.title} first.`;
    } else if (intel && intel.diagnosis !== "solid" && intel.diagnosis !== "never_learned") {
      reason = intel.evidence;
    } else if (score === 0) {
      reason = "Not started yet.";
    } else if (score < 60) {
      reason = `Started at ${score}% — finish the proof steps.`;
    } else {
      reason = `Solid at ${score}%.`;
    }

    return { topic, mastery: score, priority, unlocked, reason, openMistakes, dueReviews };
  });

  const ordered = [...entries].sort((a, b) => b.priority - a.priority);
  const next = ordered.find((entry) => entry.unlocked && entry.mastery < 85) ?? ordered[0];

  return {
    certificationTitle: path.certification.title,
    entries: ordered,
    next,
    hasData: Object.keys(user.topicProgress).length > 0,
  };
}
