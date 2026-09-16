/**
 * Section quizzes: a 20 question quiz for every topic in the program.
 *
 * Questions come first from the authored banks for that topic, then from the topic's own
 * lesson material (key terms, common problems, troubleshooting steps). Everything is built
 * deterministically from the same content the learner studied, so a quiz never asks about
 * something the section did not teach. Multiple choice options are drawn from other real
 * terms in the same subject area, which keeps the wrong answers plausible.
 */

import { lessons, topics } from "@/data/static-content";
import { getLearningModule } from "@/data/learning-content";
import { questions as authoredQuestions } from "@/data/quiz-content";
import { generatedQuestions } from "@/data/question-bank";
import { usableQuestions } from "@/lib/question-quality";
import type { Question } from "@/lib/app-data/types";

export const SECTION_QUIZ_SIZE = 20;
export const SECTION_PASS_SCORE = 80;


/** First sentence of a definition, trimmed so every option reads at a similar length. */
function shortMeaning(text: string): string {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const clean = first.trim().replace(/\s+/g, " ");
  if (clean.length <= 150) return clean;
  return `${clean.slice(0, 147).trimEnd()}...`;
}

function question(part: Partial<Question> & Pick<Question, "id" | "topicId" | "prompt">): Question {
  const topic = topics.find((item) => item.id === part.topicId);
  return {
    quizId: `section-quiz-${part.topicId}`,
    certificationId: topic?.certificationId ?? "",
    type: "multiple_choice",
    choices: [],
    correctAnswer: [],
    acceptableAnswers: [],
    explanation: "",
    difficulty: "standard",
    mistakeCategory: "concept",
    requiresReasoning: false,
    ...part,
  } as Question;
}

/** Deterministic pick of other definitions from the same subject area, used as options. */
function distractorPool(topicId: string): { term: string; meaning: string }[] {
  const topic = topics.find((item) => item.id === topicId);
  const sameArea = lessons.filter((lesson) => {
    const other = topics.find((item) => item.id === lesson.topicId);
    return other && (other.id === topicId || other.certificationId === topic?.certificationId);
  });
  const pool: { term: string; meaning: string }[] = [];
  for (const lesson of sameArea) {
    for (const term of lesson.keyTerms) {
      pool.push({ term: term.term, meaning: shortMeaning(term.meaning) });
    }
  }
  return pool;
}

function generatedFor(topicId: string): { choice: Question[] } {
  const lesson = lessons.find((item) => item.topicId === topicId);
  const module = getLearningModule(topicId);
  const pool = distractorPool(topicId);
  const choice: Question[] = [];


  lesson?.keyTerms.forEach((term, index) => {
    const correct = shortMeaning(term.meaning);
    const others = pool
      .filter((entry) => entry.term !== term.term && entry.meaning !== correct)
      .filter((entry, position, all) => all.findIndex((x) => x.meaning === entry.meaning) === position);
    // Options of a similar length read as equally possible, so the answer is not given away.
    const near = others
      .slice()
      .sort((a, b) => Math.abs(a.meaning.length - correct.length) - Math.abs(b.meaning.length - correct.length))
      .slice(0, 8);
    const picked = [near[index % Math.max(near.length, 1)], near[(index + 3) % Math.max(near.length, 1)], near[(index + 6) % Math.max(near.length, 1)]]
      .filter((entry): entry is { term: string; meaning: string } => Boolean(entry))
      .filter((entry, position, all) => all.findIndex((x) => x.meaning === entry.meaning) === position);
    if (picked.length === 3) {
      const options = [correct, ...picked.map((entry) => entry.meaning)];
      // Rotate the answer position by index so it is never predictable.
      const at = index % 4;
      const ordered = [...options.slice(1)];
      ordered.splice(at, 0, correct);
      choice.push(
        question({
          id: `section-${topicId}-term-${index}`,
          topicId,
          prompt: `Which description fits ${term.term} as it is used here?`,
          choices: ordered,
          correctAnswer: [correct],
          acceptableAnswers: [correct],
          explanation: `${term.term}: ${term.meaning}`,
        }),
      );
    }
    const namePool = pool
      .filter((entry) => entry.term.toLowerCase() !== term.term.toLowerCase())
      .filter((entry, position, all) => all.findIndex((x) => x.term === entry.term) === position);
    const nameOptions = [
      namePool[(index * 2) % Math.max(namePool.length, 1)],
      namePool[(index * 2 + 5) % Math.max(namePool.length, 1)],
      namePool[(index * 2 + 9) % Math.max(namePool.length, 1)],
    ]
      .filter((entry): entry is { term: string; meaning: string } => Boolean(entry))
      .filter((entry, position, all) => all.findIndex((x) => x.term === entry.term) === position);
    if (nameOptions.length === 3) {
      const names = nameOptions.map((entry) => entry.term);
      names.splice((index + 2) % 4, 0, term.term);
      choice.push(
        question({
          id: `section-${topicId}-name-${index}`,
          topicId,
          prompt: `Which term is being described? ${shortMeaning(term.meaning)}`,
          choices: names,
          correctAnswer: [term.term],
          acceptableAnswers: [term.term],
          explanation: `${term.term}: ${term.meaning}`,
        }),
      );
    }

  });

  // Common problems become a "what do you check first" question with real steps as options.
  const firstStep = module?.troubleshooting[0];
  if (module && firstStep) {
    module.commonProblems.slice(0, 3).forEach((item, index) => {
      const otherSteps = module.troubleshooting.slice(1, 4);
      if (otherSteps.length < 3) return;
      const options = [firstStep, ...otherSteps];
      choice.push(
        question({
          id: `section-${topicId}-problem-${index}`,
          topicId,
          type: "multiple_choice",
          prompt: `A user reports this problem: ${item.replace(/\.$/, "")}. Which step comes first?`,
          choices: options,
          correctAnswer: [firstStep],
          acceptableAnswers: [firstStep],
          explanation: `Start here: ${firstStep}`,
          mistakeCategory: "diagnosis",
          requiresReasoning: true,
        }),
      );
    });
  }

  return { choice: usableQuestions(choice) };
}

const authoredByTopic = new Map<string, Question[]>();
for (const item of usableQuestions([...authoredQuestions, ...generatedQuestions])) {
  const list = authoredByTopic.get(item.topicId) ?? [];
  list.push(item);
  authoredByTopic.set(item.topicId, list);
}

const cache = new Map<string, Question[]>();

/** The 20 question quiz for one section of the program. Multiple choice throughout. */
export function getSectionQuizQuestions(topicId: string): Question[] {
  const cached = cache.get(topicId);
  if (cached) return cached;

  const authored = authoredByTopic.get(topicId) ?? [];
  const gen = generatedFor(topicId);

  // Do not ask a generated question about something the authored bank already tests.
  const alreadyAsked = new Set(
    authored.flatMap((item) => item.correctAnswer.map((answer) => answer.trim().toLowerCase())),
  );
  const pool = usableQuestions([
    ...authored,
    ...gen.choice.filter((item) => !alreadyAsked.has((item.correctAnswer[0] ?? "").trim().toLowerCase())),
  ]);

  const result = pool.slice(0, SECTION_QUIZ_SIZE).map((item, index) => ({
    ...item,
    quizId: `section-quiz-${topicId}`,
    order: index,
  })) as Question[];
  cache.set(topicId, result);
  return result;
}

/** Every question available for a topic, used to top up the larger stage exams. */
export function getTopicQuestionPool(topicId: string): Question[] {
  const gen = generatedFor(topicId);
  return usableQuestions([...(authoredByTopic.get(topicId) ?? []), ...gen.choice]);
}
