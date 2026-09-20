/**
 * Removes AI bank questions that fail the current quality gate, then rewrites
 * src/data/ai-question-bank.ts in its original format. Run after tightening
 * rules in src/lib/question-quality.ts so retired families leave the bank.
 *
 * Run with: bun scripts/prune-ai-bank.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { aiQuestionSeeds } from "@/data/ai-question-bank";
import { questionIssues } from "@/lib/question-quality";
import type { Question } from "@/lib/app-data/types";

const PATH = "src/data/ai-question-bank.ts";

const asQuestion = (seed: (typeof aiQuestionSeeds)[number]): Question => ({
  id: "probe",
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
  requiresReasoning: false,
});

const kept: typeof aiQuestionSeeds = [];
const dropped: { prompt: string; issues: string[] }[] = [];
for (const seed of aiQuestionSeeds) {
  const issues = questionIssues(asQuestion(seed));
  if (issues.length === 0) kept.push(seed);
  else dropped.push({ prompt: seed.prompt, issues });
}

const source = readFileSync(PATH, "utf8");
const footer = source.slice(source.indexOf("] as AiQuestionSeed[];"));
const header = source.slice(0, source.indexOf("export const aiQuestionSeeds"));
const body = kept
  .map((seed) => JSON.stringify(seed, null, 2).replace(/\n/g, "\n  ").replace(/^/, "  "))
  .join(",\n");
writeFileSync(PATH, `${header}export const aiQuestionSeeds: AiQuestionSeed[] = [\n${body}\n${footer}`);

console.log(`kept ${kept.length}, dropped ${dropped.length}`);
for (const item of dropped.slice(0, 40)) console.log(`- ${item.issues[0]} :: ${item.prompt.slice(0, 90)}`);
