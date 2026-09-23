import type { DeepLesson } from "@/data/deep-lessons/types";
import type { LearningActivityKind, Question } from "@/lib/app-data/types";
import { lessonPartAnchor, slugifyHeading } from "@/lib/lesson-anchor";

export interface LessonConceptSection {
  id: string;
  anchor: string;
  label: string;
  part?: number;
}

export const lessonSectionId = (topicId: string, section: string) => `${topicId}:lesson:${section}`;
export const lessonConceptAnchor = (sectionId: string) => `lesson-concept-${slugifyHeading(sectionId)}`;

export function deepSectionId(topicId: string, section: { id?: string; heading: string }): string {
  return section.id?.trim() || lessonSectionId(topicId, `part-${slugifyHeading(section.heading)}`);
}

export function lessonConceptSections(topicId: string, lesson?: DeepLesson): LessonConceptSection[] {
  const fixed: LessonConceptSection[] = [
    { id: lessonSectionId(topicId, "introduction"), anchor: "lesson-reading", label: "Introduction" },
    { id: lessonSectionId(topicId, "key-ideas"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "key-ideas")), label: "Key ideas" },
    { id: lessonSectionId(topicId, "core"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "core")), label: "Core lesson summary" },
    { id: lessonSectionId(topicId, "how-it-works"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "how-it-works")), label: "How it works" },
    { id: lessonSectionId(topicId, "where-you-see-it"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "where-you-see-it")), label: "Where you see it" },
    { id: lessonSectionId(topicId, "practical-knowledge"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "practical-knowledge")), label: "Practical knowledge" },
    { id: lessonSectionId(topicId, "worked-examples"), anchor: "worked-examples", label: "Worked examples" },
    { id: lessonSectionId(topicId, "walkthrough"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "walkthrough")), label: "Walkthrough" },
    { id: lessonSectionId(topicId, "misconceptions"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "misconceptions")), label: "Common misunderstandings" },
    { id: lessonSectionId(topicId, "problems"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "problems")), label: "What goes wrong" },
    { id: lessonSectionId(topicId, "troubleshooting"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "troubleshooting")), label: "How to troubleshoot" },
    { id: lessonSectionId(topicId, "exam-coverage"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "exam-coverage")), label: "Exam coverage" },
    { id: lessonSectionId(topicId, "key-terms"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "key-terms")), label: "Key terms" },
    { id: lessonSectionId(topicId, "reference"), anchor: lessonConceptAnchor(lessonSectionId(topicId, "reference")), label: "Reference" },
  ];
  const parts = (lesson?.sections ?? []).map((section, index) => {
    const id = deepSectionId(topicId, section);
    return { id, anchor: lessonConceptAnchor(id), label: section.heading, part: index + 1 };
  });
  return [...fixed, ...parts];
}

export function resolveLessonSection(topicId: string, sectionId: string | undefined, lesson?: DeepLesson): LessonConceptSection | undefined {
  if (!sectionId) return undefined;
  return lessonConceptSections(topicId, lesson).find((item) => item.id === sectionId);
}

/** Stable source relationships for generated quiz items. Authored/owner items require an explicit mapping. */
export function generatedQuestionSection(topicId: string, kind: string): string | undefined {
  const suffix: Record<string, string> = {
    "term-in-context": "key-terms", reference: "reference", misconception: "misconceptions",
    correction: "misconceptions", "how-it-works": "how-it-works", "where-used": "where-you-see-it",
    "how-it-fails": "problems", "common-problem": "problems", "first-step": "troubleshooting",
    "next-step": "troubleshooting", "practice-point": "practical-knowledge", "exam-point": "exam-coverage",
    "self-check": "core", walkthrough: "walkthrough",
  };
  return suffix[kind] ? lessonSectionId(topicId, suffix[kind]) : undefined;
}

const INFER_STOPWORDS = new Set([
  "which", "where", "there", "their", "these", "those", "about", "after", "before", "being",
  "below", "between", "during", "should", "would", "could", "other", "another", "following",
  "because", "through", "while", "using", "makes", "given", "first", "second", "third",
  "best", "most", "least", "always", "never", "often", "usually", "answer", "question",
  "option", "options", "correct", "incorrect", "example", "examples", "statement",
]);

function inferTerms(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 5 && !INFER_STOPWORDS.has(word)),
    ),
  ];
}

/**
 * Best-effort mapping from a question to the lesson part that teaches it.
 *
 * Only used when the workbook carries no explicit mapping. It links a question
 * to a lesson part only when the wording overlap is clear and beats every other
 * part, so "Review this concept" never points somewhere arbitrary; otherwise it
 * returns nothing and the question simply has no review link.
 */
export function inferLessonSection(topicId: string, prompt: string, lesson?: DeepLesson): string | undefined {
  const sections = lesson?.sections ?? [];
  if (sections.length === 0) return undefined;
  const terms = inferTerms(prompt);
  if (terms.length < 3) return undefined;
  let best = { id: "", score: 0 };
  let runnerUp = 0;
  for (const section of sections) {
    const body = `${section.heading} ${section.paragraphs.join(" ")}`.toLowerCase();
    let score = 0;
    for (const term of terms) if (body.includes(term)) score += 1;
    if (score > best.score) {
      runnerUp = best.score;
      best = { id: deepSectionId(topicId, section), score };
    } else if (score > runnerUp) {
      runnerUp = score;
    }
  }
  if (best.score < 3 || best.score <= runnerUp) return undefined;
  return best.id;
}

export function remediationHref(topicId: string, anchor: string): string {
  return `/topics/${encodeURIComponent(topicId)}#${anchor}`;
}

export function activityReturnLabel(kind: LearningActivityKind): string {
  return `Return to ${kind === "check-yourself" ? "check yourself" : kind}`;
}

export function explicitQuestionSection(question: Question): string | undefined {
  return question.lessonSectionId;
}

export function contentFingerprint(lesson?: DeepLesson): string {
  const source = (lesson?.sections ?? []).map((section) => `${section.id ?? ""}|${section.heading}|${section.paragraphs.length}`).join(";");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function legacyLessonPartAnchor(heading: string): string {
  return lessonPartAnchor(heading);
}