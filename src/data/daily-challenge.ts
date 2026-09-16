/**
 * The Daily Challenge.
 *
 * Everyone gets the same short mixed set on the same day. The set is derived
 * deterministically from the calendar date, so no storage is needed to know
 * which questions belong to today: the date is the seed.
 */
import { generatedQuestions } from "@/data/question-bank";
import { shuffleWithSeed } from "@/lib/shuffle";
import type { Difficulty, Question } from "@/lib/app-data/types";

export const DAILY_QUESTION_COUNT = 5;

/** The three tiers of the daily challenge, easiest first. */
export type ChallengeTier = "beginner" | "intermediate" | "expert";

export interface ChallengeTierInfo {
  id: ChallengeTier;
  label: string;
  count: number;
  /** Difficulties preferred for this tier, best fit first. */
  prefers: Difficulty[];
  description: string;
}

export const DAILY_TIERS: ChallengeTierInfo[] = [
  {
    id: "beginner",
    label: "Beginner",
    count: 5,
    prefers: ["gentle", "standard", "challenging"],
    description: "Five questions on the plainer end of the material. A three minute warm up.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    count: 8,
    prefers: ["standard", "challenging", "gentle"],
    description: "Eight questions that ask you to apply the idea, not just name it.",
  },
  {
    id: "expert",
    label: "Expert",
    count: 12,
    prefers: ["challenging", "standard", "gentle"],
    description: "Twelve of the harder questions, spread right across the material.",
  },
];

export function tierInfo(tier: ChallengeTier): ChallengeTierInfo {
  return DAILY_TIERS.find((item) => item.id === tier) ?? DAILY_TIERS[0]!;
}


/** Local calendar date key, YYYY-MM-DD. */
export function dailyDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seedFromDateKey(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

export interface DailyChallenge {
  /** Quiz id the attempt is stored under, e.g. "daily-2026-09-15" or "daily-2026-09-15-expert". */
  id: string;
  dateKey: string;
  tier: ChallengeTier;
  questions: Question[];
}

/** The quiz id an attempt for this day and tier is stored under. */
export function dailyQuizId(dateKey: string, tier: ChallengeTier): string {
  return tier === "beginner" ? `daily-${dateKey}` : `daily-${dateKey}-${tier}`;
}

/** Reads the day and tier back out of a stored daily quiz id. */
export function parseDailyQuizId(quizId: string): { dateKey: string; tier: ChallengeTier } | null {
  if (!quizId.startsWith("daily-")) return null;
  const rest = quizId.slice("daily-".length);
  const dateKey = rest.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const suffix = rest.slice(11);
  const tier: ChallengeTier =
    suffix === "intermediate" || suffix === "expert" ? suffix : "beginner";
  return { dateKey, tier };
}

/** The one challenge set for a given day and tier. Same day, same set, everywhere. */
export function dailyChallenge(dateKey: string, tier: ChallengeTier = "beginner"): DailyChallenge {
  const info = tierInfo(tier);
  const pool = generatedQuestions.filter((question) => question.choices.length > 0);
  // The tier is part of the seed so the three sets never overlap on the same day.
  const ordered = shuffleWithSeed(pool, seedFromDateKey(`${dateKey}:${tier}`));

  const picked: Question[] = [];
  const used = new Set<string>();
  const take = (question: Question) => {
    if (used.has(question.id)) return;
    used.add(question.id);
    picked.push(question);
  };

  // Harder tiers pull from their preferred difficulty first, then widen out.
  for (const difficulty of info.prefers) {
    const usedTopics = new Set(picked.map((question) => question.topicId));
    for (const question of ordered) {
      if (picked.length >= info.count) break;
      if (question.difficulty !== difficulty) continue;
      if (usedTopics.has(question.topicId)) continue;
      usedTopics.add(question.topicId);
      take(question);
    }
    if (picked.length >= info.count) break;
    for (const question of ordered) {
      if (picked.length >= info.count) break;
      if (question.difficulty !== difficulty) continue;
      take(question);
    }
    if (picked.length >= info.count) break;
  }
  // Last resort: top up from anywhere so the set is always full.
  for (const question of ordered) {
    if (picked.length >= info.count) break;
    take(question);
  }

  return { id: dailyQuizId(dateKey, tier), dateKey, tier, questions: picked };
}

/** The last `count` daily keys, oldest first. */
export function recentDailyKeys(count: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = -(count - 1); offset <= 0; offset += 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    keys.push(dailyDateKey(date));
  }
  return keys;
}

/** Friendly label for a daily key, e.g. "Mon 15 Sep". */
export function dailyKeyLabel(key: string): string {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
