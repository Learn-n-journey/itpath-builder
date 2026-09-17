/**
 * One gate every quiz question passes through.
 *
 * Quizzes are multiple choice only, so anything without real options is dropped.
 * A question is also dropped when it reads like a broken template rather than a
 * question a person would actually ask ("you suspect: ...", "at step 3", and so on).
 */
import type { Question } from "./app-data/types";

const BROKEN_PROMPT_PATTERNS: RegExp[] = [
  /you suspect:/i,
  /what would you do at step/i,
  /working through a fault in this section/i,
  /in practical work on/i,
  /in your own words/i,
  /what does good practice require here/i,
  /how would you recognise this in practice/i,
  /describe what you would see/i,
  /^\s*$/,
];

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const STOP_WORDS = new Set([
  "that", "this", "with", "from", "when", "what", "which", "your", "into", "than", "then", "they",
  "them", "have", "will", "been", "each", "more", "most", "some", "such", "only", "also", "over",
  "does", "make", "makes", "used", "using", "there", "these", "those", "their", "about", "after",
  "before", "other", "would", "could", "should", "while", "where", "every", "still", "being",
]);

function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word)),
  );
}

/** How much two options say the same thing, scaled against the shorter one. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size < 3 || b.size < 3) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/** True when the question is a well formed multiple choice item we can show. */
export function isUsableQuestion(question: Question): boolean {
  const prompt = question.prompt?.trim() ?? "";
  if (prompt.length < 20 || prompt.length > 600) return false;
  if (BROKEN_PROMPT_PATTERNS.some((pattern) => pattern.test(prompt))) return false;
  // A prompt that just repeats raw content with no question mark and no colon reads as a fragment.
  if (!prompt.includes("?")) return false;

  const choices = (question.choices ?? []).map((choice) => choice?.trim() ?? "").filter(Boolean);
  if (choices.length < 4) return false;
  if (choices.some((choice) => choice.length > 240)) return false;
  if (new Set(choices.map(norm)).size !== choices.length) return false;
  if (choices.some((choice) => norm(choice) === norm(prompt))) return false;

  const answers = (question.correctAnswer ?? []).map((answer) => answer?.trim() ?? "").filter(Boolean);
  if (answers.length < 1) return false;
  if (!answers.every((answer) => choices.some((choice) => norm(choice) === norm(answer)))) return false;
  if (question.type === "multiple_response" ? answers.length < 2 : answers.length !== 1) return false;
  if (answers.length >= choices.length) return false;

  // Exactly one option can be right, so no wrong option may restate the answer.
  const answerSets = answers.map(contentWords);
  const wrong = choices.filter((choice) => !answers.some((answer) => norm(answer) === norm(choice)));
  if (wrong.some((choice) => answerSets.some((set) => overlap(contentWords(choice), set) > 0.6))) {
    return false;
  }

  return true;
}

/** Keep only usable questions, and never repeat the same prompt twice in one set. */
export function usableQuestions(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const question of questions) {
    if (!isUsableQuestion(question)) continue;
    const key = norm(question.prompt);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(question);
  }
  return out;
}
