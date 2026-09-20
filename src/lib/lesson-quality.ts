import type { DeepLesson } from "@/data/deep-lessons/types";
import type { Lesson, Topic } from "@/lib/app-data/types";

const PLACEHOLDER = /\b(?:lorem ipsum|todo|tbd|placeholder|insert (?:text|content)|coming soon|to be (?:added|completed|written))\b/i;
const META_FILLER = /\b(?:in this (?:lesson|section|module) (?:we will|you will)|this section (?:covers|discusses)|it is important to note that)\b/i;
const VAGUE_OBJECTIVE = /^(?:learn|know|understand|be aware of|be familiar with|information about|introduction to)\b/i;

/**
 * Instructional-design limits, expressed in our own words from long-standing
 * teaching practice: objectives state an observable performance; the reason to
 * care names a real consequence; explanations stay inside a readable sentence
 * length so working memory is not overloaded; a worked example is followed by
 * practice the learner answers themselves.
 */
const MAX_SENTENCE_WORDS = 45;
const MAX_AVERAGE_SENTENCE_WORDS = 28;
const MAX_PARAGRAPH_WORDS = 220;
const MIN_SELF_CHECKS = 2;

function sentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const normalise = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

function repeatedEntries(values: string[]): boolean {
  const meaningful = values.map(normalise).filter((value) => value.length >= 30);
  return new Set(meaningful).size !== meaningful.length;
}

/** Deterministic, domain-neutral defects that make a lesson unfit to publish. */
export function lessonQualityIssues(topic: Topic, lesson: Lesson | undefined, deep?: DeepLesson): string[] {
  const issues: string[] = [];
  if (!lesson) return ["lesson record is missing"];

  const fields = [lesson.body, lesson.definition, lesson.whyItMatters, lesson.summary];
  const allText = fields.join("\n");
  if (fields.some((value) => words(value) < 5)) issues.push("a core lesson section is too short to teach anything");
  if (PLACEHOLDER.test(allText)) issues.push("lesson contains placeholder text");
  if (META_FILLER.test(lesson.body) && words(lesson.body) < 80) issues.push("lesson introduction is mostly instructional filler");

  if (topic.learningObjectives.length === 0) issues.push("lesson has no learning objectives");
  if (topic.learningObjectives.some((objective) => words(objective) < 3 || VAGUE_OBJECTIVE.test(objective.trim()))) {
    issues.push("a learning objective is not a specific observable action");
  }
  if (repeatedEntries(topic.learningObjectives)) issues.push("learning objectives repeat the same outcome");

  const termNames = lesson.keyTerms.map((row) => normalise(row.term)).filter(Boolean);
  if (termNames.length < 3) issues.push("lesson defines fewer than three useful terms");
  if (new Set(termNames).size !== termNames.length) issues.push("lesson defines the same term more than once");
  if (lesson.keyTerms.some((row) => words(row.meaning) < 3 || normalise(row.term) === normalise(row.meaning))) {
    issues.push("a key term has no meaningful plain-language definition");
  }
  if (repeatedEntries([...lesson.realWorldExamples, ...lesson.commonMisconceptions, ...lesson.nextSteps])) {
    issues.push("lesson repeats the same example, misconception, or next step");
  }

  // Readability and cognitive load: long sentences bury the point.
  const bodySentences = sentences(allText);
  if (bodySentences.some((sentence) => words(sentence) > MAX_SENTENCE_WORDS)) {
    issues.push("a sentence is too long to follow in one pass");
  }
  if (bodySentences.length >= 3) {
    const average = bodySentences.reduce((sum, sentence) => sum + words(sentence), 0) / bodySentences.length;
    if (average > MAX_AVERAGE_SENTENCE_WORDS) issues.push("lesson sentences average too long to read comfortably");
  }
  // Relevance: the reason to care has to name a consequence, not restate the title.
  if (words(lesson.whyItMatters) < 12 || normalise(lesson.whyItMatters).includes(normalise(topic.title)) && words(lesson.whyItMatters) < 20) {
    issues.push("the reason this matters does not name a real consequence");
  }
  // Transfer: at least one concrete example the learner could meet at work.
  if (lesson.realWorldExamples.length < 1 || lesson.realWorldExamples.some((example) => words(example) < 6)) {
    issues.push("lesson has no usable real-world example");
  }

  if (deep) {
    if (deep.sections.length < 2 || deep.sections.some((section) => section.paragraphs.length === 0)) {
      issues.push("deep lesson lacks a complete teaching sequence");
    }
    const walkthrough = deep.depth?.walkthrough;
    if (walkthrough && (words(walkthrough.scenario) < 8 || words(walkthrough.outcome) < 5 || walkthrough.steps.length < 3)) {
      issues.push("worked walkthrough lacks a scenario, enough steps, or a verified outcome");
    }
    if (walkthrough && repeatedEntries(walkthrough.steps.map((step) => `${step.label} ${step.detail}`))) {
      issues.push("worked walkthrough repeats a step");
    }
    if (deep.sections.some((section) => section.paragraphs.some((paragraph) => words(paragraph) > MAX_PARAGRAPH_WORDS))) {
      issues.push("a teaching paragraph is too long to hold in working memory");
    }
    if (deep.depth && deep.depth.checkYourself.length < MIN_SELF_CHECKS) {
      issues.push("lesson does not ask the learner to retrieve what it just taught");
    }
    if (deep.depth && deep.depth.checkYourself.some((check) => words(check.question) < 4 || !check.answer.trim())) {
      issues.push("a lesson self-check has no meaningful question or answer");
    }
  }

  return [...new Set(issues)];
}
