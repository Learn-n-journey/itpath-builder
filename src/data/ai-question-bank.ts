/**
 * AI expanded question bank.
 *
 * These multiple choice questions were written with AI from the lesson content of
 * each section, then checked by the same quality gate every other question passes.
 * The file is data only: it is generated in bulk and reviewed, never edited by hand
 * one question at a time.
 */
import type { Question } from "@/lib/app-data/types";

export interface AiQuestionSeed {
  topicId: string;
  certificationId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Question["difficulty"];
  mistakeCategory: Question["mistakeCategory"];
}

export const aiQuestionSeeds: AiQuestionSeed[] = [];

export const aiQuestions: Question[] = aiQuestionSeeds.map((seed, index) => ({
  id: `question-ai-${index + 1}`,
  topicId: seed.topicId,
  quizId: "quiz-generated-bank",
  certificationId: seed.certificationId,
  type: "multiple_choice",
  prompt: seed.prompt,
  choices: seed.choices,
  correctAnswer: [seed.choices[seed.answerIndex] ?? ""],
  acceptableAnswers: [],
  explanation: seed.explanation,
  difficulty: seed.difficulty,
  mistakeCategory: seed.mistakeCategory,
  requiresReasoning: seed.mistakeCategory === "diagnosis" || seed.mistakeCategory === "procedure",
}));
