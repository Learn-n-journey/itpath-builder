/**
 * The Daily Challenge.
 *
 * Everyone gets the same short mixed set on the same day. The set is derived
 * deterministically from the calendar date, so no storage is needed to know
 * which questions belong to today: the date is the seed.
 */
import { generatedQuestions } from "@/data/question-bank";
import { shuffleWithSeed } from "@/lib/shuffle";
import type { Question } from "@/lib/app-data/types";

export const DAILY_QUESTION_COUNT = 5;

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
  /** Quiz id the attempt is stored under, e.g. "daily-2026-09-15". */
  id: string;
  dateKey: string;
  questions: Question[];
}

/** The one challenge set for a given day. Same day, same set, everywhere. */
export function dailyChallenge(dateKey: string): DailyChallenge {
  const pool = generatedQuestions.filter((question) => question.choices.length > 0);
  const ordered = shuffleWithSeed(pool, seedFromDateKey(dateKey));

  const picked: Question[] = [];
  const usedTopics = new Set<string>();
  // First pass: one question per topic so the set spreads across the material.
  for (const question of ordered) {
    if (picked.length >= DAILY_QUESTION_COUNT) break;
    if (usedTopics.has(question.topicId)) continue;
    usedTopics.add(question.topicId);
    picked.push(question);
  }
  // Second pass: top up from anywhere if the spread ran out.
  for (const question of ordered) {
    if (picked.length >= DAILY_QUESTION_COUNT) break;
    if (!picked.includes(question)) picked.push(question);
  }

  return { id: `daily-${dateKey}`, dateKey, questions: picked };
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
