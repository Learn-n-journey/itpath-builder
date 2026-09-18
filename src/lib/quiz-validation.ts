/**
 * Checks a quiz before it is shown.
 *
 * A set is looked at as a whole: every question has to stand up on its own,
 * the same idea must not be asked twice, the spread of difficulty has to be
 * sensible, and the right answer must not sit in the same place too often.
 * Anything that fails is replaced on its own, never by rebuilding the quiz.
 */

import { questionIssues } from "./question-quality";
import type { Question } from "./app-data/types";
import type { TaggedQuestion } from "./question-tags";

export interface QuizSetReport {
  /** Positions in the set that need replacing. */
  replace: number[];
  /** Plain words description of what is wrong with the set as a whole. */
  problems: string[];
}

const normalise = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

/** Where the right answer sits in each question, when there is a single answer. */
function answerSlots(items: TaggedQuestion[]): number[] {
  return items.map((item) => {
    const answer = item.question.correctAnswer[0];
    if (!answer) return -1;
    return item.question.choices.findIndex((choice) => normalise(choice) === normalise(answer));
  });
}

export function reviewQuizSet(items: TaggedQuestion[], size: number): QuizSetReport {
  const replace = new Set<number>();
  const problems: string[] = [];

  const seenPrompts = new Set<string>();
  const seenConcepts = new Set<string>();

  items.forEach((item, index) => {
    // Quality: anything unanswerable, or with options that give it away.
    if (questionIssues(item.question).length > 0) {
      replace.add(index);
      return;
    }
    const prompt = normalise(item.question.prompt);
    // A repeated question, or a second question on an idea already covered.
    if (seenPrompts.has(prompt) || seenConcepts.has(item.tags.conceptId)) {
      replace.add(index);
      return;
    }
    seenPrompts.add(prompt);
    seenConcepts.add(item.tags.conceptId);
  });

  const kept = items.filter((_, index) => !replace.has(index));

  if (kept.length < size) problems.push("The set is short of good questions.");

  const concepts = new Set(kept.map((item) => item.tags.conceptId));
  if (kept.length > 0 && concepts.size < Math.ceil(kept.length * 0.9)) {
    problems.push("Too many questions cover the same idea.");
  }

  const hardest = kept.filter((item) => item.tags.difficulty === "challenging").length;
  if (kept.length >= 8 && hardest === 0) problems.push("Nothing in the set asks for reasoning.");
  if (kept.length >= 8 && hardest === kept.length) problems.push("Every question is a hard one.");

  const slots = answerSlots(kept).filter((slot) => slot >= 0);
  if (slots.length >= 8) {
    const counts = new Map<number, number>();
    for (const slot of slots) counts.set(slot, (counts.get(slot) ?? 0) + 1);
    const worst = Math.max(...counts.values());
    if (worst / slots.length > 0.5) problems.push("The right answer sits in the same place too often.");
  }

  return { replace: [...replace].sort((a, b) => a - b), problems };
}

/**
 * Spreads the right answer around without touching the questions themselves.
 * Only the questions sitting on the crowded position are moved.
 */
export function balanceAnswerPositions(items: TaggedQuestion[]): TaggedQuestion[] {
  const slots = answerSlots(items);
  const counts = new Map<number, number>();
  for (const slot of slots) if (slot >= 0) counts.set(slot, (counts.get(slot) ?? 0) + 1);
  const total = slots.filter((slot) => slot >= 0).length;
  if (total < 8) return items;
  const crowded = [...counts.entries()]
    .filter(([, count]) => count / total > 0.4)
    .map(([slot]) => slot);
  if (crowded.length === 0) return items;

  let shift = 0;
  return items.map((item, index) => {
    const slot = slots[index] ?? -1;
    if (slot < 0 || !crowded.includes(slot)) return item;
    shift += 1;
    if (shift % 2 === 0) return item;
    const choices = item.question.choices.slice();
    const answer = choices.splice(slot, 1)[0] as string;
    const target = (slot + 1 + shift) % (choices.length + 1);
    choices.splice(target, 0, answer);
    const question: Question = { ...item.question, choices };
    return { ...item, question };
  });
}
