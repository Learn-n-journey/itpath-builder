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

/** Options that carry no subject meaning, so they are never a fair wrong answer. */
const THROWAWAY_OPTIONS = [
  /^none of (the )?above$/i,
  /^all of (the )?above$/i,
  /^both( of the above)?$/i,
  /^n\/?a$/i,
  /^not applicable$/i,
  /^nothing$/i,
  /^no(ne)?$/i,
  /^yes$/i,
  /^i don'?t know$/i,
  /^other$/i,
  /^unknown$/i,
  /^tbd$/i,
];

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Every problem with a question, in plain words. Empty means the question is
 * fair: exactly one option is right and every other option is a believable
 * answer to the same question.
 */
export function questionIssues(question: Question): string[] {
  const issues: string[] = [];
  const prompt = question.prompt?.trim() ?? "";
  if (prompt.length < 20 || prompt.length > 600) issues.push("prompt length is out of range");
  if (BROKEN_PROMPT_PATTERNS.some((pattern) => pattern.test(prompt))) issues.push("prompt reads like a broken template");
  // A prompt that just repeats raw content with no question mark reads as a fragment.
  if (!prompt.includes("?")) issues.push("prompt is not a question");

  const choices = (question.choices ?? []).map((choice) => choice?.trim() ?? "").filter(Boolean);
  if (choices.length < 4) issues.push("fewer than four options");
  if (choices.some((choice) => choice.length > 240)) issues.push("an option is too long to read");
  if (new Set(choices.map(norm)).size !== choices.length) issues.push("two options say the same thing");
  if (choices.some((choice) => norm(choice) === norm(prompt))) issues.push("an option repeats the question");

  const answers = (question.correctAnswer ?? []).map((answer) => answer?.trim() ?? "").filter(Boolean);
  if (answers.length < 1) issues.push("no correct answer recorded");
  if (!answers.every((answer) => choices.some((choice) => norm(choice) === norm(answer)))) {
    issues.push("the correct answer is not one of the options");
  }
  if (question.type === "multiple_response" ? answers.length < 2 : answers.length !== 1) {
    issues.push("the number of correct answers does not match the question type");
  }
  if (answers.length >= choices.length) issues.push("every option is marked correct");

  if (issues.length > 0) return issues;

  const answerSets = answers.map(contentWords);
  const wrong = choices.filter((choice) => !answers.some((answer) => norm(answer) === norm(choice)));

  // Exactly one option can be right, so no wrong option may restate the answer.
  if (wrong.some((choice) => answerSets.some((set) => overlap(contentWords(choice), set) > 0.6))) {
    issues.push("a wrong option restates the correct answer");
  }

  // Each wrong option has to be a believable answer to the same question.
  if (wrong.some((choice) => THROWAWAY_OPTIONS.some((pattern) => pattern.test(choice)))) {
    issues.push("a wrong option carries no subject meaning");
  }
  if (wrong.some((choice) => choice.replace(/[^a-z0-9]/gi, "").length < 2)) {
    issues.push("a wrong option is too short to mean anything");
  }

  // A correct answer that towers over every wrong option gives itself away.
  const answerWords = Math.max(...answers.map(wordCount));
  const longestWrong = Math.max(...wrong.map(wordCount));
  if (answerWords >= 6 && answerWords > longestWrong * 2.5) {
    issues.push("the correct answer is far longer than every wrong option");
  }

  // A wrong option drawn from unrelated material shares nothing with the question.
  const promptWords = contentWords(prompt);
  const territory = new Set<string>(promptWords);
  for (const set of answerSets) for (const word of set) territory.add(word);
  const offTopic = wrong.filter((choice) => {
    const words = contentWords(choice);
    if (words.size === 0 || wordCount(choice) <= 2) return false;
    for (const word of words) if (territory.has(word)) return false;
    return words.size >= 4;
  });
  if (offTopic.length === wrong.length && wrong.length > 0) {
    issues.push("no wrong option belongs to the same subject as the question");
  }

  return issues;
}

/** True when the question is a well formed multiple choice item we can show. */
export function isUsableQuestion(question: Question): boolean {
  return questionIssues(question).length === 0;
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
