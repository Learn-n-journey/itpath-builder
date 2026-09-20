/**
 * Generated question bank.
 *
 * Every question here is multiple choice and is derived from real curriculum
 * content (practice activities, key terms and troubleshooting steps), so the
 * quiz engine can draw from hundreds of questions without inventing facts.
 * Anything that does not read as a sensible question is dropped by the shared
 * quality gate before it ever reaches a learner.
 */
import { lessons, topics } from "@/data/static-content";
import { learningModules, practiceActivities } from "@/data/learning-content";
import { aiQuestions } from "@/data/ai-question-bank";
import { ownerTopicIds, ownerQuestionMap, ownerPoolVersion } from "@/lib/owner-question-store";
import { usableQuestions } from "@/lib/question-quality";
import type { Difficulty, MistakeCategory, Question } from "@/lib/app-data/types";

const GENERATED_QUIZ_ID = "quiz-generated-bank";

function make(
  id: string,
  topicId: string,
  certificationId: string,
  prompt: string,
  choices: string[],
  correctAnswer: string[],
  explanation: string,
  difficulty: Difficulty,
  mistakeCategory: MistakeCategory,
  requiresReasoning: boolean,
): Question {
  return {
    id,
    topicId,
    quizId: GENERATED_QUIZ_ID,
    certificationId,
    type: "multiple_choice",
    prompt,
    choices,
    correctAnswer,
    acceptableAnswers: [],
    explanation,
    difficulty,
    mistakeCategory,
    requiresReasoning,
  };
}

/** Other real terms, preferring the same topic, then the same certification. */
function distractorTerms(topicId: string, exclude: string, count: number, offset: number): string[] {
  const topic = topics.find((item) => item.id === topicId);
  const ranked = lessons
    .map((lesson) => ({
      lesson,
      topic: topics.find((item) => item.id === lesson.topicId),
    }))
    .sort((a, b) => {
      const score = (entry: { topic?: { id: string; certificationId: string } | undefined }) =>
        entry.topic?.id === topicId ? 0 : entry.topic?.certificationId === topic?.certificationId ? 1 : 2;
      return score(a) - score(b);
    })
    .flatMap((entry) => entry.lesson.keyTerms.map((term) => term.term))
    .filter((term) => term.toLowerCase() !== exclude.toLowerCase());

  const unique = [...new Set(ranked)];
  const picked: string[] = [];
  let index = offset;
  let guard = 0;
  while (picked.length < count && unique.length > 0 && guard < unique.length * 2) {
    const candidate = unique[index % unique.length] as string;
    if (!picked.includes(candidate)) picked.push(candidate);
    index += 1;
    guard += 1;
  }
  return picked;
}

/** Troubleshooting steps taken from other sections, used as plausible wrong first steps. */
function otherFirstSteps(topicId: string, exclude: string, count: number, offset: number): string[] {
  const topic = topics.find((item) => item.id === topicId);
  const pool = learningModules
    .filter((item) => item.topicId !== topicId)
    .filter((item) => {
      const other = topics.find((entry) => entry.id === item.topicId);
      return other?.certificationId === topic?.certificationId;
    })
    .map((item) => item.troubleshooting[0])
    .filter((step): step is string => Boolean(step) && step !== exclude);
  const unique = [...new Set(pool)];
  const picked: string[] = [];
  let index = offset;
  let guard = 0;
  while (picked.length < count && unique.length > 0 && guard < unique.length * 2) {
    const candidate = unique[index % unique.length] as string;
    if (!picked.includes(candidate)) picked.push(candidate);
    index += 1;
    guard += 1;
  }
  return picked;
}

function build(): Question[] {
  const out: Question[] = [];

  for (const topic of topics) {
    const cert = topic.certificationId;
    const difficulty = topic.difficulty;

    // Practice activities are already multiple choice with a single answer.
    practiceActivities
      .filter((item) => item.topicId === topic.id)
      .forEach((practice) => {
        const answer = practice.choices[practice.answerIndex];
        if (!answer) return;
        out.push(
          make(
            `question-gen-${practice.id}`,
            topic.id,
            cert,
            practice.prompt,
            practice.choices,
            [answer],
            practice.explanation,
            difficulty,
            "concept",
            true,
          ),
        );
      });

    // Terms are tested through a concrete requirement, not by asking learners
    // to match a dictionary definition or recognise a lesson heading.
    const lesson = lessons.find((item) => item.topicId === topic.id);
    lesson?.keyTerms.slice(0, 6).forEach((term, index) => {
      const wrong = distractorTerms(topic.id, term.term, 3, index * 3 + 1);
      if (wrong.length < 3) return;
      out.push(
        make(
          `question-gen-term-${topic.id}-${index + 1}`,
          topic.id,
          cert,
          `A task has this requirement: ${term.meaning} Which item should be selected?`,
          [term.term, ...wrong],
          [term.term],
          `${term.term}: ${term.meaning}`,
          difficulty,
          "terminology",
          false,
        ),
      );
    });

    // Common problems become "what do you check first" multiple choice.
    const currentModule = learningModules.find((item) => item.topicId === topic.id);
    const firstStep = currentModule?.troubleshooting[0];
    if (currentModule && firstStep) {
      currentModule.commonProblems.slice(0, 2).forEach((problem, index) => {
        const wrong = otherFirstSteps(topic.id, firstStep, 3, index * 5 + 2);
        if (wrong.length < 3) return;
        out.push(
          make(
            `question-gen-trouble-${topic.id}-${index + 1}`,
            topic.id,
            cert,
            `A user reports this problem: ${problem.replace(/\.$/, "")}. Which is the best first step?`,
            [firstStep, ...wrong],
            [firstStep],
            `Start here: ${firstStep}`,
            difficulty,
            "diagnosis",
            true,
          ),
        );
      });
    }
  }

  return usableQuestions([...out, ...aiQuestions]);
}

let generatedCache: Question[] | null = null;

/**
 * The generated bank, built once on first read rather than at import time:
 * screens that never ask for questions no longer pay for filtering the whole
 * bank while the page is loading.
 *
 * A topic the owner has written a spreadsheet for uses those questions and
 * nothing else — everywhere, not just in the topic's own quizzes. Anything
 * generated for that topic is dropped by the readers below, so certification
 * quizzes, the daily challenge and review screens cannot serve old questions.
 */
export function generatedQuestions(): Question[] {
  if (!generatedCache) generatedCache = build();
  return generatedCache;
}

/**
 * The question bank as it stands right now: the build-time generated bank
 * minus every topic that has owner questions, plus those topics' live
 * spreadsheet questions. Read fresh at each call so new spreadsheet rows
 * appear as soon as the store loads.
 */
let bankCache: { version: number; items: Question[] } | null = null;

export function bankQuestions(): Question[] {
  // Held between calls and thrown away the moment new spreadsheet rows land,
  // so repeated screen reads do not re-filter thousands of questions.
  const version = ownerPoolVersion();
  if (bankCache && bankCache.version === version) return bankCache.items;
  const ownerTopics = ownerTopicIds();
  const ownerLists = Object.entries(ownerQuestionMap())
    .filter(([topicId]) => ownerTopics.has(topicId))
    .flatMap(([, list]) => list);
  const items = [
    ...usableQuestions(ownerLists),
    ...generatedQuestions().filter((q) => !ownerTopics.has(q.topicId)),
  ];
  bankCache = { version, items };
  return items;
}

export function questionsForCertification(certificationId: string): Question[] {
  return bankQuestions().filter((question) => question.certificationId === certificationId);
}
