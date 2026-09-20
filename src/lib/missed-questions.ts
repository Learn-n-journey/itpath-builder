import { bankQuestions } from "@/data/question-bank";
import { assignments } from "@/data/static-content";
import { recallQuestions } from "@/data/learning-content";
import { questions as staticQuestions } from "@/data/static-content";
import type {
  Assignment,
  Mistake,
  Question,
  RecallQuestion,
  UserData,
} from "@/lib/app-data/types";
import { matchesConcept } from "@/lib/fuzzy-match";
import { isQuestionCorrect } from "@/lib/quiz-engine";

export type MissedQuestion =
  | { kind: "quiz"; mistake: Mistake; question: Question }
  | { kind: "recall"; mistake: Mistake; recall: RecallQuestion }
  | { kind: "practice"; mistake: Mistake; assignment: Assignment };

/** Stable key + anchor id so a link can jump straight back to the item. */
export function missedQuestionKey(item: MissedQuestion): string {
  if (item.kind === "practice") return item.assignment.id;
  return item.mistake.questionId ?? item.mistake.id;
}

export function missedQuestionAnchor(item: MissedQuestion): string {
  return `missed-${missedQuestionKey(item)}`;
}

function findQuizQuestion(id: string): Question | undefined {
  return (
    staticQuestions.find((question) => question.id === id) ??
    bankQuestions().find((question) => question.id === id)
  );
}

/**
 * Every mistake that points at a specific question, resolved back to the real
 * question so the learner can answer it again from the Review page.
 */
export function missedQuestions(user: UserData, includeCleared = false): MissedQuestion[] {
  const seen = new Set<string>();
  const items: MissedQuestion[] = [];
  for (const mistake of user.mistakes) {
    if (!includeCleared && mistake.resolved) continue;
    if (!mistake.questionId) {
      if (!mistake.assignmentId || seen.has(mistake.assignmentId)) continue;
      const assignment = assignments.find((item) => item.id === mistake.assignmentId);
      if (!assignment) continue;
      seen.add(mistake.assignmentId);
      items.push({ kind: "practice", mistake, assignment });
      continue;
    }
    if (seen.has(mistake.questionId)) continue;
    const question = findQuizQuestion(mistake.questionId);
    if (question) {
      seen.add(mistake.questionId);
      items.push({ kind: "quiz", mistake, question });
      continue;
    }
    const recall = recallQuestions.find((item) => item.id === mistake.questionId);
    if (recall) {
      seen.add(mistake.questionId);
      items.push({ kind: "recall", mistake, recall });
    }
  }
  return items;
}

/** Grades a re-attempt of a missed question using the same rules as the original activity. */
export function gradeMissedQuestion(item: MissedQuestion, response: string[]): boolean {
  if (item.kind === "quiz") return isQuestionCorrect(item.question, response);
  if (item.kind === "practice") return false;
  const answer = response[0] ?? "";
  if (!answer.trim()) return false;
  const normalized = answer.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const matched = item.recall.acceptedConcepts.filter((concept) =>
    normalized.includes(concept.toLowerCase().replace(/[^a-z0-9\s]/g, " ")),
  );
  if (matched.length >= Math.min(2, item.recall.acceptedConcepts.length)) return true;
  return matchesConcept(answer, item.recall.acceptedConcepts, 0.5);
}

export function missedQuestionPrompt(item: MissedQuestion): string {
  if (item.kind === "quiz") return item.question.prompt;
  if (item.kind === "practice") return `${item.assignment.title}, ${item.assignment.brief}`;
  return item.recall.prompt;
}

export function missedQuestionExplanation(item: MissedQuestion): string {
  if (item.kind === "quiz") return item.question.explanation;
  if (item.kind === "practice")
    return "Retake this practice task and score 70 or higher to clear it.";
  return item.recall.explanation;
}

/** Count of questions and practice tasks still waiting to be worked on. */
export function missedQuestionCount(user: UserData): number {
  return missedQuestions(user).length;
}

/**
 * The open mistakes a learner can actually see and work on, one per distinct
 * question or task. Every counter in the app reads this so the number quoted
 * always matches the items flagged in Review.
 */
export function openMistakes(user: UserData, topicId?: string): MissedQuestion[] {
  const items = missedQuestions(user);
  return topicId ? items.filter((item) => item.mistake.topicId === topicId) : items;
}

/** How many distinct open mistakes are recorded, overall or on one topic. */
export function openMistakeCount(user: UserData, topicId?: string): number {
  return openMistakes(user, topicId).length;
}
