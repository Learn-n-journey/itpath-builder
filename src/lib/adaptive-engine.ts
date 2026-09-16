import { adaptivePath } from "@/lib/adaptive-path";
import { buildIntelligence } from "@/lib/intelligence/engine";
import type { Topic, UserData } from "@/lib/app-data/types";
import { topicScopeProgress } from "@/lib/scope-progress";
import { openMistakeCount } from "@/lib/missed-questions";
import {
  MASTERY_THRESHOLD,
  currentJourneyTopic,
  isMastered,
  journeyIndex,
  journeyOrderedTopics,
} from "@/lib/journey-order";


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
  // The intelligence engine supplies the diagnosed cause; the order itself is
  // the Journey Map order, with owed work (due reviews, open mistakes) lifted
  // to the top.
  const intelligence = buildIntelligence(user, now);
  const current = currentJourneyTopic(user);
  const currentIndex = current ? journeyIndex(current.id) : Number.MAX_SAFE_INTEGER;
  const startIndex = experienceStartIndex(user);


  const entries: AdaptiveEntry[] = journeyOrderedTopics.map((topic) => {
    const index = journeyIndex(topic.id);
    const score = mastery(user, topic.id);
    const openMistakes = openMistakeCount(user, topic.id);
    const dueReviews = user.reviews.filter(
      (review) =>
        review.topicId === topic.id &&
        review.status === "scheduled" &&
        new Date(review.dueAt).getTime() <= nowMs,
    ).length;

    const unlocked = isTopicOpen(user, topic.id);
    const owed = openMistakes > 0 || dueReviews > 0;

    let reason: string;
    if (openMistakes > 0) {
      reason = `${openMistakes} unresolved mistake${openMistakes === 1 ? "" : "s"} here.`;
    } else if (dueReviews > 0) {
      reason = `${dueReviews} review${dueReviews === 1 ? "" : "s"} due.`;
    } else if (!unlocked && current) {
      reason = `Opens once ${current.title} is mastered.`;
    } else {
      const intel = intelligence.byTopic[topic.id];
      if (intel && intel.diagnosis !== "solid" && intel.diagnosis !== "never_learned") {
        reason = intel.evidence;
      } else if (score === 0) {
        reason = "Next on your journey.";
      } else if (score < MASTERY_THRESHOLD) {
        reason = `At ${score}%, finish the proof steps to move on.`;
      } else {
        reason = `Mastered at ${score}%.`;
      }
    }

    // Owed work sits above everything; the rest holds journey order exactly.
    // Material their experience setting lets them skip past sits below the
    // main line, still open to revisit whenever they want it.
    const behindStart = index < startIndex ? -100_000 : 0;
    const priority = (owed ? 1_000_000 : 0) + behindStart - index;


    return { topic, mastery: score, priority, unlocked, reason, openMistakes, dueReviews };
  });

  const ordered = [...entries].sort((a, b) => b.priority - a.priority);
  const next = ordered.find((entry) => entry.unlocked && !isMastered(user, entry.topic.id)) ?? ordered[0];

  return {
    certificationTitle: path.certification.title,
    entries: ordered,
    next,
    hasData: Object.keys(user.topicProgress).length > 0,
  };
}

