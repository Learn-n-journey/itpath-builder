import { generatedQuestions } from "@/data/question-bank";
import { recallQuestions } from "@/data/learning-content";
import { questions as staticQuestions } from "@/data/static-content";
import type { Mistake, Question, RecallQuestion, UserData } from "@/lib/app-data/types";
import { matchesConcept } from "@/lib/fuzzy-match";
import { isQuestionCorrect } from "@/lib/quiz-engine";

export type MissedQuestion =
  | { kind: "quiz"; mistake: Mistake; question: Question }
  | { kind: "recall"; mistake: Mistake; recall: RecallQuestion };

function findQuizQuestion(id: string): Question | undefined {
  return (
    staticQuestions.find((question) => question.id === id) ??
    generatedQuestions.find((question) => question.id === id)
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
    if (!mistake.questionId) continue;
    if (!includeCleared && mistake.resolved) continue;
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
  return item.kind === "quiz" ? item.question.prompt : item.recall.prompt;
}

export function missedQuestionExplanation(item: MissedQuestion): string {
  return item.kind === "quiz" ? item.question.explanation : item.recall.explanation;
}
