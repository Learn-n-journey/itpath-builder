/**
 * Tagging for quiz questions.
 *
 * Every question carries what it is really testing: the concept, the exam
 * objective it sits under, the kind of thinking it asks for, how hard it is,
 * and its question type. The quiz builder uses these tags to choose questions
 * on purpose instead of at random.
 */

import { certificationObjectives } from "@/data/certification-content";
import type { Difficulty, MistakeCategory, Question, QuestionType } from "./app-data/types";

export interface QuestionTags {
  /** The idea being tested. Two questions sharing this test the same thing. */
  conceptId: string;
  /** Exam objective the section maps to, empty when the section has none. */
  objectiveId: string;
  /** The kind of thinking asked for. */
  skill: MistakeCategory;
  difficulty: Difficulty;
  type: QuestionType;
  /** Style of question, for keeping a set varied. */
  kind: string;
}

export interface TaggedQuestion {
  question: Question;
  tags: QuestionTags;
}

/** Styles that mostly ask for a straight recall of what a thing means. */
const GENTLE_KINDS = new Set(["term-meaning", "term-name", "definition", "key-idea", "objective"]);

/** Styles that ask the learner to reason, diagnose, or avoid a trap. */
const CHALLENGING_KINDS = new Set([
  "first-step",
  "next-step",
  "walkthrough",
  "exam-trap",
  "misconception",
  "how-it-fails",
  "evidence",
  "check-yourself",
]);

export function difficultyForKind(kind: string, fallback: Difficulty = "standard"): Difficulty {
  if (GENTLE_KINDS.has(kind)) return "gentle";
  if (CHALLENGING_KINDS.has(kind)) return "challenging";
  return fallback;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join("-");
}

/**
 * The idea a question is about. Built from what the question turns on, not
 * from the answer wording alone, so two different questions that happen to
 * share an answer are still treated as two questions.
 */
export function conceptKey(topicId: string, anchor: string): string {
  return `${topicId}:${normalise(anchor).slice(0, 70)}`;
}

let objectiveIndex: Map<string, string> | null = null;

function objectiveMap(): Map<string, string> {
  if (objectiveIndex) return objectiveIndex;
  const map = new Map<string, string>();
  for (const objective of certificationObjectives) {
    for (const topicId of objective.topicIds ?? []) {
      if (!map.has(topicId)) map.set(topicId, objective.id);
    }
  }
  objectiveIndex = map;
  return map;
}

export function objectiveForTopic(topicId: string): string {
  return objectiveMap().get(topicId) ?? "";
}

export function tagQuestion(question: Question, kind: string, anchor: string): QuestionTags {
  return {
    conceptId: conceptKey(question.topicId, anchor),
    objectiveId: objectiveForTopic(question.topicId),
    skill: question.mistakeCategory,
    difficulty: difficultyForKind(kind, question.difficulty),
    type: question.type,
    kind,
  };
}
