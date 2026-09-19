import type { DeepLesson } from "@/data/deep-lessons/types";
import type { Lesson, Topic } from "@/lib/app-data/types";

const PLACEHOLDER = /\b(?:lorem ipsum|todo|tbd|placeholder|insert (?:text|content)|coming soon|to be (?:added|completed|written))\b/i;
const META_FILLER = /\b(?:in this (?:lesson|section|module) (?:we will|you will)|this section (?:covers|discusses)|it is important to note that)\b/i;
const VAGUE_OBJECTIVE = /^(?:learn|know|understand|be aware of|be familiar with|information about|introduction to)\b/i;

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
    if (deep.depth && deep.depth.checkYourself.some((check) => words(check.question) < 4 || !check.answer.trim())) {
      issues.push("a lesson self-check has no meaningful question or answer");
    }
  }

  return [...new Set(issues)];
}
