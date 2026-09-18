/**
 * Choosing the questions for a quiz.
 *
 * Questions are picked on purpose: shaky ideas and ideas that are due for a
 * look again come first, ideas never met come next, and ideas already proven
 * several times over come last so they take up very little of a quiz. The set
 * is then checked and only the failing places are filled again.
 */

import { conceptPriority, type ConceptStat } from "./concept-mastery";
import { balanceAnswerPositions, reviewQuizSet } from "./quiz-validation";
import type { TaggedQuestion } from "./question-tags";

export interface SelectionOptions {
  size: number;
  stats: Map<string, ConceptStat>;
  /** Seeded generator, so one sitting keeps its paper while it is open. */
  random: () => number;
  now?: Date;
}

interface Scored {
  item: TaggedQuestion;
  score: number;
}

function scorePool(pool: TaggedQuestion[], options: SelectionOptions): Scored[] {
  const now = options.now ?? new Date();
  return pool
    .map((item) => {
      const stat = options.stats.get(item.tags.conceptId);
      const priority = conceptPriority(stat, now);
      // A little shuffle on top, so two sittings of the same standing are
      // still different papers.
      return { item, score: priority * (0.7 + options.random() * 0.6) };
    })
    .sort((a, b) => b.score - a.score);
}

/** Puts gentler questions early and mixes the styles, so the set flows. */
function arrange(items: TaggedQuestion[]): TaggedQuestion[] {
  const rank = { gentle: 0, standard: 1, challenging: 2 } as const;
  const byDifficulty = items
    .slice()
    .sort((a, b) => rank[a.tags.difficulty] - rank[b.tags.difficulty]);
  const out: TaggedQuestion[] = [];
  const remaining = byDifficulty.slice();
  while (remaining.length > 0) {
    const previous = out[out.length - 1];
    let index = 0;
    if (previous) {
      const different = remaining.findIndex(
        (item) => item.tags.kind !== previous.tags.kind && item.tags.skill !== previous.tags.skill,
      );
      const loose = remaining.findIndex((item) => item.tags.kind !== previous.tags.kind);
      index = different >= 0 && different < 4 ? different : loose >= 0 && loose < 4 ? loose : 0;
    }
    out.push(remaining.splice(index, 1)[0] as TaggedQuestion);
  }
  return out;
}

/**
 * Builds one quiz from a tagged pool.
 *
 * Picks the best candidates, checks the set, and swaps out only the places
 * that fail, taking the next best candidate each time.
 */
export function selectQuizQuestions(
  pool: TaggedQuestion[],
  options: SelectionOptions,
): TaggedQuestion[] {
  if (pool.length === 0) return [];
  const ranked = scorePool(pool, options);
  const chosen: TaggedQuestion[] = [];
  const usedIds = new Set<string>();
  const usedConcepts = new Set<string>();
  const queue: TaggedQuestion[] = [];

  for (const entry of ranked) {
    const item = entry.item;
    if (usedIds.has(item.question.id)) continue;
    if (chosen.length < options.size && !usedConcepts.has(item.tags.conceptId)) {
      chosen.push(item);
      usedIds.add(item.question.id);
      usedConcepts.add(item.tags.conceptId);
    } else {
      queue.push(item);
    }
  }

  // Thin sections: allow a second question on an idea rather than a short quiz.
  for (const item of queue) {
    if (chosen.length >= options.size) break;
    if (usedIds.has(item.question.id)) continue;
    chosen.push(item);
    usedIds.add(item.question.id);
  }

  let set = chosen;
  for (let round = 0; round < 4; round += 1) {
    const report = reviewQuizSet(set, options.size);
    if (report.replace.length === 0) break;
    const replacements = queue.filter((item) => !usedIds.has(item.question.id));
    let cursor = 0;
    const next: TaggedQuestion[] = [];
    set.forEach((item, index) => {
      if (!report.replace.includes(index)) {
        next.push(item);
        return;
      }
      // Replace only this place in the set, keeping everything else as it is.
      while (cursor < replacements.length) {
        const candidate = replacements[cursor] as TaggedQuestion;
        cursor += 1;
        if (usedIds.has(candidate.question.id)) continue;
        usedIds.add(candidate.question.id);
        next.push(candidate);
        return;
      }
    });
    set = next;
    if (cursor === 0) break;
  }

  return arrange(balanceAnswerPositions(set.slice(0, options.size)));
}
