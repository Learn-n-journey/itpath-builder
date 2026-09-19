/**
 * The last gate every paper passes through before a learner sees it.
 *
 * Whatever built the set, the same rules apply at the end: every question has
 * to be a sound one, no question appears twice, no idea is asked twice while
 * the pool still has something else to offer, and the paper is the full length
 * it is meant to be. Only missing or failing places are filled, never the set
 * as a whole.
 */

import { isUsableQuestion } from "./question-quality";
import type { Question } from "./app-data/types";

export interface FinalizeOptions {
  /** How many questions the finished paper must hold. */
  size: number;
  /** Everything else that could fill a gap, in any order. */
  pool: Question[];
  /** The idea a question tests, for keeping one paper to one idea each. */
  conceptOf: (question: Question) => string | undefined;
  /** Seeded generator, so one sitting keeps its paper while it is open. */
  random: () => number;
  /** Stamped on every question in the finished paper. */
  quizId: string;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap] as T, copy[index] as T];
  }
  return copy;
}

/**
 * Trims a draft paper to sound, unique questions and tops it up to length.
 *
 * Fresh ideas are taken first. A second question on an idea already covered is
 * only used when the pool has nothing new left, which keeps a thin section from
 * handing back a short paper.
 */
export function finalizeQuestionSet(draft: Question[], options: FinalizeOptions): Question[] {
  const { size, conceptOf, quizId } = options;
  const kept: Question[] = [];
  const usedIds = new Set<string>();
  const usedConcepts = new Set<string>();
  const spare: Question[] = [];

  const consider = (question: Question, allowRepeatConcept: boolean): boolean => {
    if (kept.length >= size) return false;
    if (usedIds.has(question.id)) return false;
    if (!isUsableQuestion(question)) return false;
    const concept = conceptOf(question);
    if (concept && usedConcepts.has(concept)) {
      if (!allowRepeatConcept) {
        spare.push(question);
        return false;
      }
    }
    kept.push(question);
    usedIds.add(question.id);
    if (concept) usedConcepts.add(concept);
    return true;
  };

  for (const question of draft) consider(question, false);

  if (kept.length < size) {
    for (const question of shuffled(options.pool, options.random)) {
      if (kept.length >= size) break;
      consider(question, false);
    }
  }

  // Thin material: a second question on an idea beats a short paper.
  if (kept.length < size) {
    for (const question of spare) {
      if (kept.length >= size) break;
      if (usedIds.has(question.id)) continue;
      kept.push(question);
      usedIds.add(question.id);
    }
  }

  return kept.slice(0, size).map((question, index) => ({
    ...question,
    quizId,
    order: index,
  }));
}

export interface PaperProblem {
  problem: string;
}

/**
 * Everything wrong with a finished paper, in plain words. Empty means the paper
 * is the right length, every question stands up, and nothing repeats.
 */
export function validateQuestionSet(
  questions: Question[],
  expectedSize: number,
  conceptOf: (question: Question) => string | undefined,
  availableInPool = Number.POSITIVE_INFINITY,
): string[] {
  const problems: string[] = [];
  const target = Math.min(expectedSize, availableInPool);
  if (questions.length !== target) {
    problems.push(`paper holds ${questions.length} questions instead of ${target}`);
  }

  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.id)) problems.push(`question ${question.id} appears twice`);
    ids.add(question.id);
    const issues = isUsableQuestion(question);
    if (!issues) problems.push(`question ${question.id} is not a sound question`);
  }

  const concepts = questions.map(conceptOf).filter(Boolean) as string[];
  const seen = new Set<string>();
  let repeated = 0;
  for (const concept of concepts) {
    if (seen.has(concept)) repeated += 1;
    seen.add(concept);
  }
  // A repeat is only a fault when the pool had room for something else.
  if (repeated > 0 && availableInPool > questions.length) {
    problems.push(`${repeated} questions repeat an idea already covered`);
  }

  return problems;
}
