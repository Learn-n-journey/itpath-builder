/**
 * Owner spreadsheet questions: the pieces shared by the nightly sync route and
 * (for the offline snapshot) the build-time importer.
 *
 * Every topic in both courses has a fixed number, in curriculum order, starting
 * at 1. A spreadsheet named "7.xlsx" in the itpath folder feeds IT PATH topic
 * number 7; the same name in the autopath folder feeds AUTO PATH topic number
 * 7. Adding a new numbered file is all it takes for its questions to appear.
 */
import { topics } from "@/data/static-content";
import { autoRepairPackage } from "@/content/packs/auto-repair/3.7.0/package";
import { questionIssues } from "@/lib/question-quality";
import type { Question } from "@/lib/app-data/types";

export type OwnerDomain = "it-cybersecurity" | "auto-repair" | (string & {});

export interface NumberedTopic {
  number: number;
  topicId: string;
  title: string;
  domain: OwnerDomain;
  certificationId: string;
}

/** IT PATH topics, numbered 1..N in curriculum order. */
export const itTopicNumbers: NumberedTopic[] = topics.map((topic, index) => ({
  number: index + 1,
  topicId: topic.id,
  title: topic.title,
  domain: "it-cybersecurity",
  certificationId: topic.certificationId,
}));

/** AUTO PATH sections, numbered 1..N in curriculum order. */
export const autoTopicNumbers: NumberedTopic[] = autoRepairPackage.sections.map(
  (section, index) => ({
    number: index + 1,
    topicId: section.id,
    title: section.title,
    domain: "auto-repair",
    certificationId: section.qualificationId,
  }),
);

export function topicsForDomain(domain: OwnerDomain): NumberedTopic[] {
  if (domain === "auto-repair") return autoTopicNumbers;
  if (domain === "it-cybersecurity") return itTopicNumbers;
  // A path created in Settings numbers its own sections; the caller supplies
  // that list, because it is not part of this build.
  return [];
}

export function topicForNumber(domain: OwnerDomain, number: number): NumberedTopic | undefined {
  return topicsForDomain(domain).find((topic) => topic.number === number);
}

export function topicNumber(domain: OwnerDomain, topicId: string): number | undefined {
  return topicsForDomain(domain).find((topic) => topic.topicId === topicId)?.number;
}

/** Leading number of a spreadsheet filename: "7.xlsx" -> 7, "03-x.xlsx" -> 3. */
export function fileNumber(name: string): number | undefined {
  const match = /(\d+)/.exec(name);
  if (!match) return undefined;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * One spreadsheet row, full format:
 * id, course, topic, question, four choices, correct letter, explanation,
 * source name, source url, objective, difficulty, type.
 */
export interface OwnerRowResult {
  question: Question | null;
  rejectReasons?: string[];
  error?: string;
}

const CORRECT_LETTERS = ["A", "B", "C", "D"];

export function ownerQuestionFromRow(
  topic: NumberedTopic,
  cells: string[],
  sourceFile: string,
  rowNumber: number,
): OwnerRowResult {
  const [id, , , prompt, a, b, c, d, correct, explanation, , , , difficulty] = cells;
  const choices = [a, b, c, d].filter((value): value is string => Boolean(value));
  if (!prompt || choices.length !== 4) {
    return { question: null, error: "row is missing the question text or four choices" };
  }
  const answer = choices[CORRECT_LETTERS.indexOf((correct ?? "").trim().toUpperCase())];
  if (!answer) return { question: null, error: "correct letter is not A, B, C or D" };

  const slug =
    (id || prompt).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) ||
    `row-${rowNumber}`;
  const question: Question = {
    id: `question-owner-${topic.topicId}-${slug}`,
    topicId: topic.topicId,
    quizId: `section-quiz-${topic.topicId}`,
    certificationId: topic.certificationId,
    type: "multiple_choice",
    prompt,
    choices,
    correctAnswer: [answer],
    acceptableAnswers: [answer],
    explanation: explanation ?? "",
    difficulty: /intermediate|advanced/i.test(difficulty ?? "") ? "challenging" : "standard",
    mistakeCategory: "concept",
    requiresReasoning: false,
  };

  // Nothing here decides a question is good. The same deterministic gate that
  // runs at quiz time decides whether the row may ever reach a learner.
  const rejectReasons = questionIssues(question);
  if (rejectReasons.length) return { question, rejectReasons };
  void sourceFile;
  return { question };
}
