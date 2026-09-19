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
  // The exact no-context step wording this rule book retired for good.
  /you have just done this/i,
  /^\s*$/,
];

/**
 * Prompts that test nothing. Each of these asks the learner to recognise the
 * section they are already sitting in, or to pick the only sentence that is not
 * absurd, rather than to apply, distinguish, diagnose or reason from evidence.
 */
const GENERIC_PROMPT_PATTERNS: RegExp[] = [
  /which of these is a problem you would expect/i,
  /which of these is a real example of/i,
  /which of these is one of the ideas worth keeping/i,
  /which of these (best )?describes/i,
  /which of the following best describes/i,
  /which statement about .{0,80} is (true|correct)/i,
  /which of these is (a|an) .{0,40}\?$/i,
  /what is the (main |primary )?(purpose|definition|meaning) of/i,
  /what does .{0,40} stand for/i,
  /which term matches (?:this|the) description/i,
  /which (?:answer|option|choice) is correct/i,
];

const TRICK_PROMPT = /\b(?:which|what) .{0,90}\b(?:not|except|least likely)\b|\ball except\b/i;
const VAGUE_REFERENCE = /^\s*(?:in (?:this|that) (?:case|situation|scenario)|given (?:this|that)|based on (?:this|that))\b/i;

/**
 * An absolute claim is a giveaway: a learner who knows nothing still crosses it
 * off. Wrong options have to be mistakes somebody would really make.
 */
const ABSOLUTE_OPTION = /\b(always|never|all|every|no)\b.{0,60}\b(is|are|will|means|makes|works|fixes|causes)\b/i;

/** A "what next" ask is only fair when the prompt states the problem first. */
const STEP_QUESTION = /what comes next|point you to next|best first step|what should you do/i;
const STATED_PROBLEM = /problem|report|fault|symptom|error|issue|user says|reports this/i;

/** Patterns that indicate a specific grammatical response format is expected. */
const SEMANTIC_PATTERNS = {
  TERM: /which term|what is the name of|which name/i,
  ACTION: /best first step|what should you do|how would you|what is the first thing/i,
  EXPLANATION: /why does|how does|which reading|describe|explain/i,
};

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
 * Multiple-choice options must all be answers to the same grammatical ask.
 * This deliberately catches the high-confidence mismatch that reached the app:
 * an action such as "Check the fan" mixed with unrelated factual statements.
 * It does not attempt subjective semantic grading; it only compares response
 * forms that deterministic language patterns can identify safely.
 */
const ACTION_VERBS = new Set([
  "add", "adjust", "back", "boot", "calculate", "check", "clear", "close", "compare", "confirm",
  "connect", "disable", "disconnect", "document", "enable", "inspect", "install", "isolate", "measure",
  "monitor", "open", "power", "record", "remove", "replace", "reproduce", "reset", "restart", "restore",
  "review", "run", "scan", "start", "stop", "swap", "test", "trace", "update", "use", "verify",
]);

const ACTION_QUESTION = /\b(what (?:should|would|do) (?:you|the technician)|what are you actually doing|which (?:action|step|check|test|command)|what (?:action|step|check|test|command)|what comes next|point you to next|comes first|do first|check first)\b/i;
const EXPLANATION_QUESTION = /^\s*why\b|\bwhat (?:best )?(?:explains|causes|accounts for)\b/i;

function beginsWithAction(value: string): boolean {
  const clean = value.trim().toLowerCase().replace(/^["'“”‘’([{]+/, "");
  const first = clean.match(/^[a-z]+/)?.[0] ?? "";
  if (ACTION_VERBS.has(first)) return true;
  if (/^(?:checking|confirming|connecting|disconnecting|documenting|inspecting|measuring|monitoring|recording|replacing|reproducing|reviewing|running|scanning|testing|tracing|verifying)\b/.test(clean)) return true;
  return /^(?:you|a technician|the technician|an administrator|the administrator)\s+(?:should|must|needs? to|would)\s+[a-z]+\b/.test(clean)
    || /^(?:you|a technician|the technician|an administrator|the administrator)\s+(?:checks?|confirms?|connects?|documents?|inspects?|measures?|monitors?|records?|replaces?|reproduces?|reviews?|runs?|scans?|tests?|traces?|verifies?)\b/.test(clean)
    || /^(?:the )?(?:first|next|best) (?:step|action|check|test) (?:is|would be) to\s+[a-z]+\b/.test(clean);
}

export function answerFormatIssues(question: Question): string[] {
  const prompt = question.prompt?.trim() ?? "";
  const choices = (question.choices ?? []).map((choice) => choice?.trim() ?? "").filter(Boolean);
  const answers = (question.correctAnswer ?? []).map(norm);
  const correct = choices.find((choice) => answers.includes(norm(choice)));
  if (!correct || choices.length < 2) return [];

  const actionFlags = choices.map(beginsWithAction);
  const expectsAction = ACTION_QUESTION.test(prompt);
  const expectsExplanation = EXPLANATION_QUESTION.test(prompt);

  if (expectsAction && !actionFlags.every(Boolean)) {
    return ["not every option is formatted as an action requested by the question"];
  }
  if (expectsExplanation && actionFlags.some(Boolean)) {
    return ["an option is formatted as an action instead of an explanation requested by the question"];
  }
  return [];
}

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
  if (GENERIC_PROMPT_PATTERNS.some((pattern) => pattern.test(prompt))) {
    issues.push("prompt tests recognition of the section rather than applying it");
  }
  if (TRICK_PROMPT.test(prompt)) issues.push("prompt relies on negative or exception wording instead of demonstrating knowledge");
  if (VAGUE_REFERENCE.test(prompt)) issues.push("prompt refers to context that it does not state");
  if (wordCount(prompt) < 10) issues.push("prompt gives too little to reason from");
  // A prompt that just repeats raw content with no question mark reads as a fragment.
  if (!prompt.includes("?")) issues.push("prompt is not a question");
  if (STEP_QUESTION.test(prompt) && !STATED_PROBLEM.test(prompt)) {
    issues.push("step question never states the problem being worked on");
  }

  const choices = (question.choices ?? []).map((choice) => choice?.trim() ?? "").filter(Boolean);
  if (choices.length < 4) issues.push("fewer than four options");
  if (choices.some((choice) => choice.length > 240)) issues.push("an option is too long to read");
  if (new Set(choices.map(norm)).size !== choices.length) issues.push("two options say the same thing");
  if (choices.some((choice) => norm(choice) === norm(prompt))) issues.push("an option repeats the question");
  if (choices.some((choice) => /\b(?:obviously|clearly|definitely|certainly)\b/i.test(choice))) {
    issues.push("an option uses giveaway certainty language");
  }

  // Semantic/Grammatical consistency checks
  const isTermRequest = SEMANTIC_PATTERNS.TERM.test(prompt);
  const isActionRequest = SEMANTIC_PATTERNS.ACTION.test(prompt);
  const isExplanationRequest = SEMANTIC_PATTERNS.EXPLANATION.test(prompt);

  if (isTermRequest) {
    if (choices.some((c) => wordCount(c) > 6)) {
      issues.push("terminology question has choices that are too long to be terms");
    }
  }

  if (isActionRequest) {
    // Actions should typically start with a verb or be a clear instructional step.
    const actionVerbs = /^(check|run|verify|inspect|open|configure|restart|use|install|update|review|trace|identify|compare|distinguish|list|move|change|find|ask|report|test|look|start|stop|remove|add|enable|disable|connect|disconnect)/i;
    if (choices.some((c) => wordCount(c) < 2)) {
      issues.push("action question has choices that are too short to be steps");
    }
  }

  if (isExplanationRequest) {
    if (choices.some((c) => wordCount(c) < 5)) {
      issues.push("explanation question has choices that are too short to explain anything");
    }
  }

  const answers = (question.correctAnswer ?? []).map((answer) => answer?.trim() ?? "").filter(Boolean);
  if (answers.length < 1) issues.push("no correct answer recorded");
  if (!answers.every((answer) => choices.some((choice) => norm(choice) === norm(answer)))) {
    issues.push("the correct answer is not one of the options");
  }
  if (question.type === "multiple_response" ? answers.length < 2 : answers.length !== 1) {
    issues.push("the number of correct answers does not match the question type");
  }
  if (answers.length >= choices.length) issues.push("every option is marked correct");

  issues.push(...answerFormatIssues(question));

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
  if (wrong.some((choice) => ABSOLUTE_OPTION.test(choice))) {
    issues.push("a wrong option is an absolute claim a learner can cross off without knowing the material");
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
