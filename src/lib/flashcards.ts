/**
 * Flashcards.
 *
 * Every card is built from teaching material that already exists for a
 * section: its key terms, the quick reference rows, the exam traps, the common
 * mix-ups and the self-check questions. Nothing is generated and nothing is
 * invented. Scheduling follows the same spacing idea the review system uses: a
 * card you know comes back later, a card you miss comes back tomorrow.
 */
import { getDeepLesson } from "@/data/deep-lessons";
import { lessons, topics } from "@/data/static-content";
import type { FlashcardReview, UserData } from "@/lib/app-data/types";

export type FlashcardKind = "term" | "reference" | "trap" | "mixup" | "check";

export interface Flashcard {
  id: string;
  topicId: string;
  topicTitle: string;
  kind: FlashcardKind;
  /** Short label for where the card came from. */
  source: string;
  front: string;
  back: string;
}

export const flashcardKindLabels: Record<FlashcardKind, string> = {
  term: "Key term",
  reference: "Quick reference",
  trap: "Exam trap",
  mixup: "Common mix-up",
  check: "Self check",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EASE = 2.4;
const MIN_EASE = 1.4;
const MAX_EASE = 3.2;
const MAX_INTERVAL_DAYS = 120;

function cardId(topicId: string, kind: FlashcardKind, index: number): string {
  return `card-${topicId}-${kind}-${index}`;
}

/** Every card available for one section, in a stable order. */
export function topicFlashcards(topicId: string): Flashcard[] {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) return [];
  const lesson = lessons.find((item) => item.topicId === topicId);
  const deep = getDeepLesson(topicId);
  const out: Flashcard[] = [];

  const push = (kind: FlashcardKind, index: number, front: string, back: string) => {
    const cleanFront = front.trim();
    const cleanBack = back.trim();
    if (cleanFront.length < 3 || cleanBack.length < 3) return;
    out.push({
      id: cardId(topicId, kind, index),
      topicId,
      topicTitle: topic.title,
      kind,
      source: flashcardKindLabels[kind],
      front: cleanFront,
      back: cleanBack,
    });
  };

  lesson?.keyTerms.forEach((term, index) => {
    push("term", index, `What does "${term.term}" mean?`, term.meaning);
  });
  deep?.plain?.wordList.forEach((word, index) => {
    if (lesson?.keyTerms.some((term) => term.term.toLowerCase() === word.term.toLowerCase())) return;
    push("term", 1000 + index, `What does "${word.term}" mean?`, word.plain);
  });
  deep?.depth?.reference.rows.forEach((row, index) => {
    push("reference", index, row.term, row.detail);
  });
  deep?.depth?.examTraps.forEach((trap, index) => {
    const [question, ...rest] = trap.split(/(?<=\?)\s+/);
    push(
      "trap",
      index,
      rest.length > 0 ? (question as string) : `What is the catch here: ${trap}`,
      rest.length > 0 ? rest.join(" ") : trap,
    );
  });
  deep?.depth?.misconceptions.forEach((item, index) => {
    push("mixup", index, `True or false: ${item.claim}`, item.correction);
  });
  (lesson?.commonMisconceptions ?? []).forEach((claim, index) => {
    if (deep?.depth?.misconceptions.some((item) => item.claim === claim)) return;
    push("mixup", 1000 + index, `Why is this wrong: ${claim}`, lesson?.definition ?? "");
  });
  deep?.depth?.checkYourself.forEach((check, index) => {
    push("check", index, check.question, check.answer);
  });

  return out;
}

/** Every card across a set of sections. */
export function deckFor(topicIds: string[]): Flashcard[] {
  return topicIds.flatMap((topicId) => topicFlashcards(topicId));
}

/** Sections that actually have cards, for the deck list. */
export function topicsWithCards(topicIds: string[]): Array<{ topicId: string; count: number }> {
  return topicIds
    .map((topicId) => ({ topicId, count: topicFlashcards(topicId).length }))
    .filter((entry) => entry.count > 0);
}

export function reviewById(user: UserData): Map<string, FlashcardReview> {
  return new Map(user.flashcardReviews.map((record) => [record.id, record]));
}

export function isDue(record: FlashcardReview | undefined, now: Date = new Date()): boolean {
  if (!record) return true;
  const due = new Date(record.dueAt).getTime();
  return Number.isNaN(due) || due <= now.getTime();
}

export interface DeckCounts {
  total: number;
  due: number;
  learning: number;
  known: number;
  unseen: number;
}

/** Honest counts for a deck: nothing is counted as known without a real run. */
export function deckCounts(cards: Flashcard[], user: UserData, now: Date = new Date()): DeckCounts {
  const byId = reviewById(user);
  let due = 0;
  let learning = 0;
  let known = 0;
  let unseen = 0;
  for (const card of cards) {
    const record = byId.get(card.id);
    if (!record) {
      unseen += 1;
      due += 1;
      continue;
    }
    if (isDue(record, now)) due += 1;
    if (record.streak >= 3) known += 1;
    else learning += 1;
  }
  return { total: cards.length, due, learning, known, unseen };
}

/** The cards to study now: everything due, unseen first, then the oldest. */
export function dueCards(cards: Flashcard[], user: UserData, now: Date = new Date()): Flashcard[] {
  const byId = reviewById(user);
  return cards
    .filter((card) => isDue(byId.get(card.id), now))
    .sort((a, b) => {
      const left = byId.get(a.id);
      const right = byId.get(b.id);
      if (!left && right) return -1;
      if (left && !right) return 1;
      if (!left || !right) return 0;
      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });
}

function clampEase(value: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, Number(value.toFixed(2))));
}

/** The next state for a card after one answer. */
export function nextReview(
  card: Flashcard,
  existing: FlashcardReview | undefined,
  answer: "known" | "unknown",
  now: Date = new Date(),
): FlashcardReview {
  const ease = clampEase(existing?.ease ?? DEFAULT_EASE);
  const previousInterval = existing?.interval ?? 0;

  let interval: number;
  let nextEase: number;
  let streak: number;

  if (answer === "known") {
    streak = (existing?.streak ?? 0) + 1;
    nextEase = clampEase(ease + 0.05);
    interval =
      previousInterval <= 0 ? 1 : Math.min(MAX_INTERVAL_DAYS, Math.round(previousInterval * ease));
    if (interval <= previousInterval) interval = previousInterval + 1;
  } else {
    streak = 0;
    nextEase = clampEase(ease - 0.2);
    interval = 1;
  }

  return {
    id: card.id,
    topicId: card.topicId,
    interval,
    ease: nextEase,
    streak,
    reviewCount: (existing?.reviewCount ?? 0) + 1,
    lastAnswer: answer,
    lastReviewedAt: now.toISOString(),
    dueAt: new Date(now.getTime() + interval * DAY_MS).toISOString(),
  };
}

/** Records one answer against the saved progress. */
export function applyAnswer(
  user: UserData,
  card: Flashcard,
  answer: "known" | "unknown",
  now: Date = new Date(),
): UserData {
  const existing = user.flashcardReviews.find((record) => record.id === card.id);
  const next = nextReview(card, existing, answer, now);
  return {
    ...user,
    flashcardReviews: [next, ...user.flashcardReviews.filter((record) => record.id !== card.id)],
  };
}

/** How many cards are due right now across every section the learner can study. */
export function totalDue(topicIds: string[], user: UserData, now: Date = new Date()): number {
  return deckCounts(deckFor(topicIds), user, now).due;
}
