/**
 * Section quizzes: a 20 question quiz for every topic in the program.
 *
 * Every question is multiple choice and is built from the material the section
 * actually teaches. The generator works in several different styles (what a
 * term means, which term is being described, how the thing works, where you
 * meet it, how it fails, what to check first, good practice, and common
 * misunderstandings) so a quiz does not keep asking the same kind of question
 * about the same handful of words.
 *
 * Each question carries the piece of content it came from, so one quiz never
 * asks about the same idea twice, and each attempt rotates through the pool so
 * a retake is a genuinely new set of questions.
 */

import { lessons, topics } from "@/data/static-content";
import { getLearningModule, learningModules } from "@/data/learning-content";
import { questions as authoredQuestions } from "@/data/quiz-content";
import { generatedQuestions } from "@/data/question-bank";
import { usableQuestions } from "@/lib/question-quality";
import type { Question } from "@/lib/app-data/types";

export const SECTION_QUIZ_SIZE = 20;
export const SECTION_PASS_SCORE = 80;

/** A generated question plus what it came from, so a set can stay varied. */
interface PoolItem {
  question: Question;
  /** Style of question: term meaning, first step, how it fails, and so on. */
  kind: string;
  /** The underlying piece of content, so one idea is only asked about once. */
  sourceKey: string;
}

/** First sentence of a definition, trimmed so every option reads at a similar length. */
function shortMeaning(text: string): string {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const clean = first.trim().replace(/\s+/g, " ");
  if (clean.length <= 150) return clean;
  return `${clean.slice(0, 147).trimEnd()}...`;
}

function tidy(text: string): string {
  return text.trim().replace(/\s+/g, " ");
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

const certOf = (topicId: string) => topics.find((item) => item.id === topicId)?.certificationId ?? "";

/** Statements pulled from other sections in the same subject area, used as wrong options. */
function otherStatements(topicId: string, field: keyof ReturnType<typeof moduleFields>): string[] {
  const cert = certOf(topicId);
  const out: string[] = [];
  for (const item of learningModules) {
    if (item.topicId === topicId) continue;
    if (certOf(item.topicId) !== cert) continue;
    for (const line of moduleFields(item)[field]) out.push(tidy(line));
  }
  return [...new Set(out)].filter((line) => line.length >= 25 && line.length <= 200);
}

function moduleFields(item: (typeof learningModules)[number]) {
  return {
    howItWorks: item.howItWorks,
    whereYouSeeIt: item.whereYouSeeIt,
    howItFails: item.howItFails,
    practicalKnowledge: item.practicalKnowledge,
    troubleshooting: item.troubleshooting,
    commonProblems: item.commonProblems,
  };
}

/** Misconception corrections from other sections in the same subject area. */
function otherMisconceptions(topicId: string): string[] {
  const cert = certOf(topicId);
  const out: string[] = [];
  for (const lesson of lessons) {
    if (lesson.topicId === topicId) continue;
    if (certOf(lesson.topicId) !== cert) continue;
    for (const line of lesson.commonMisconceptions) out.push(tidy(line));
  }
  return [...new Set(out)].filter((line) => line.length >= 25 && line.length <= 200);
}

/** Three wrong options of a similar length to the answer, chosen without randomness. */
function pickThree(candidates: string[], correct: string, offset: number): string[] | null {
  const pool = candidates
    .filter((item) => item.toLowerCase() !== correct.toLowerCase())
    .filter((item, index, all) => all.indexOf(item) === index)
    .sort((a, b) => Math.abs(a.length - correct.length) - Math.abs(b.length - correct.length))
    .slice(0, 12);
  if (pool.length < 3) return null;
  const picked: string[] = [];
  let index = offset;
  let guard = 0;
  while (picked.length < 3 && guard < pool.length * 3) {
    const candidate = pool[index % pool.length] as string;
    if (!picked.includes(candidate)) picked.push(candidate);
    index += 1;
    guard += 1;
  }
  return picked.length === 3 ? picked : null;
}

/** Puts the answer in a different position each time so it is never predictable. */
function withAnswerPlaced(correct: string, wrong: string[], index: number): string[] {
  const options = [...wrong];
  options.splice(index % 4, 0, correct);
  return options;
}

function statementItem(
  topicId: string,
  topicTitle: string,
  kind: string,
  prompt: string,
  correct: string,
  candidates: string[],
  index: number,
  explanation: string,
  mistakeCategory: Question["mistakeCategory"] = "concept",
): PoolItem | null {
  const answer = tidy(correct);
  if (answer.length < 25 || answer.length > 200) return null;
  const wrong = pickThree(candidates, answer, index * 3 + 1);
  if (!wrong) return null;
  return {
    kind,
    sourceKey: `${kind}:${answer.slice(0, 60).toLowerCase()}`,
    question: question({
      id: `section-${topicId}-${kind}-${index}`,
      topicId,
      prompt: prompt.replace("{topic}", topicTitle),
      choices: withAnswerPlaced(answer, wrong, index + 1),
      correctAnswer: [answer],
      acceptableAnswers: [answer],
      explanation,
      mistakeCategory,
    }),
  };
}

/** Everything this section can be asked about, grouped by style of question. */
function buildPool(topicId: string): PoolItem[] {
  const topic = topics.find((item) => item.id === topicId);
  const title = topic?.title ?? "this section";
  const lesson = lessons.find((item) => item.topicId === topicId);
  const module = getLearningModule(topicId);
  const items: PoolItem[] = [];

  // Definitions from other sections in the same subject area, used as options.
  const cert = certOf(topicId);
  const meaningPool: { term: string; meaning: string }[] = [];
  for (const other of lessons) {
    if (certOf(other.topicId) !== cert) continue;
    for (const term of other.keyTerms) {
      meaningPool.push({ term: term.term, meaning: shortMeaning(term.meaning) });
    }
  }

  lesson?.keyTerms.forEach((term, index) => {
    const correct = shortMeaning(term.meaning);
    const meaningOptions = pickThree(
      meaningPool.filter((entry) => entry.term !== term.term).map((entry) => entry.meaning),
      correct,
      index * 2 + 1,
    );
    if (meaningOptions) {
      items.push({
        kind: "term-meaning",
        sourceKey: `term:${term.term.toLowerCase()}`,
        question: question({
          id: `section-${topicId}-term-${index}`,
          topicId,
          prompt: `Which description fits ${term.term} as it is used here?`,
          choices: withAnswerPlaced(correct, meaningOptions, index),
          correctAnswer: [correct],
          acceptableAnswers: [correct],
          explanation: `${term.term}: ${term.meaning}`,
          mistakeCategory: "terminology",
        }),
      });
    }

    const nameOptions = pickThree(
      meaningPool
        .filter((entry) => entry.term.toLowerCase() !== term.term.toLowerCase())
        .map((entry) => entry.term),
      term.term,
      index * 2 + 3,
    );
    if (nameOptions) {
      items.push({
        kind: "term-name",
        sourceKey: `term:${term.term.toLowerCase()}`,
        question: question({
          id: `section-${topicId}-name-${index}`,
          topicId,
          prompt: `Which term is being described? ${shortMeaning(term.meaning)}`,
          choices: withAnswerPlaced(term.term, nameOptions, index + 2),
          correctAnswer: [term.term],
          acceptableAnswers: [term.term],
          explanation: `${term.term}: ${term.meaning}`,
          mistakeCategory: "terminology",
        }),
      });
    }
  });

  lesson?.commonMisconceptions.forEach((line, index) => {
    const item = statementItem(
      topicId,
      title,
      "misconception",
      `Which statement about {topic} is correct?`,
      line,
      otherMisconceptions(topicId),
      index,
      `This is one of the points people most often get the wrong way round: ${tidy(line)}`,
    );
    if (item) items.push(item);
  });

  if (module) {
    module.howItWorks.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "how-it-works",
        `Which of these correctly describes how {topic} works?`,
        line,
        otherStatements(topicId, "howItWorks"),
        index,
        `From this section: ${tidy(line)}`,
      );
      if (item) items.push(item);
    });

    module.whereYouSeeIt.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "where-used",
        `Where would you actually come across {topic} in real work?`,
        line,
        otherStatements(topicId, "whereYouSeeIt"),
        index,
        `From this section: ${tidy(line)}`,
        "procedure",
      );
      if (item) items.push(item);
    });

    module.howItFails.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "how-it-fails",
        `Which of these is a way {topic} typically goes off track?`,
        line,
        otherStatements(topicId, "howItFails"),
        index,
        `From this section: ${tidy(line)}`,
        "diagnosis",
      );
      if (item) items.push(item);
    });

    module.practicalKnowledge.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "practice-point",
        `Which of these reflects sound practice with {topic}?`,
        line,
        otherStatements(topicId, "practicalKnowledge"),
        index,
        `From this section: ${tidy(line)}`,
        "procedure",
      );
      if (item) items.push(item);
    });

    // What to check first, using this section's own steps as the options.
    const firstStep = module.troubleshooting[0];
    const otherSteps = module.troubleshooting.slice(1, 4);
    if (firstStep && otherSteps.length >= 3) {
      module.commonProblems.forEach((problem, index) => {
        items.push({
          kind: "first-step",
          sourceKey: `problem:${problem.slice(0, 50).toLowerCase()}`,
          question: question({
            id: `section-${topicId}-problem-${index}`,
            topicId,
            prompt: `A user reports this problem: ${tidy(problem).replace(/\.$/, "")}. Which step comes first?`,
            choices: withAnswerPlaced(firstStep, otherSteps.slice(0, 3), index),
            correctAnswer: [firstStep],
            acceptableAnswers: [firstStep],
            explanation: `Start here: ${firstStep}`,
            mistakeCategory: "diagnosis",
            requiresReasoning: true,
          }),
        });
      });
    }

    // Later steps in the sequence, so the order of work is tested too.
    module.troubleshooting.forEach((step, index) => {
      if (index === 0 || index > 3) return;
      const before = module.troubleshooting[index - 1];
      if (!before) return;
      const item = statementItem(
        topicId,
        title,
        "next-step",
        `You have just done this: ${tidy(before).replace(/\.$/, "")}. What comes next?`,
        step,
        [...module.troubleshooting.filter((_, at) => at !== index), ...otherStatements(topicId, "troubleshooting")],
        index,
        `The next step here is: ${tidy(step)}`,
        "diagnosis",
      );
      if (item) items.push(item);
    });
  }

  return items.filter((item) => usableQuestions([item.question]).length === 1);
}

const authoredByTopic = new Map<string, Question[]>();
for (const item of usableQuestions([...authoredQuestions, ...generatedQuestions])) {
  const list = authoredByTopic.get(item.topicId) ?? [];
  list.push(item);
  authoredByTopic.set(item.topicId, list);
}

const poolCache = new Map<string, PoolItem[]>();

function topicPool(topicId: string): PoolItem[] {
  const cached = poolCache.get(topicId);
  if (cached) return cached;
  const authored: PoolItem[] = (authoredByTopic.get(topicId) ?? []).map((item) => ({
    question: item,
    kind: "authored",
    sourceKey: `authored:${(item.correctAnswer[0] ?? item.id).trim().toLowerCase()}`,
  }));
  const generated = buildPool(topicId);
  // Do not generate a question about something the authored bank already tests.
  const asked = new Set(authored.map((item) => item.sourceKey.replace("authored:", "")));
  const fresh = generated.filter(
    (item) => !asked.has((item.question.correctAnswer[0] ?? "").trim().toLowerCase()),
  );
  const all = [...authored, ...fresh];
  // Drop repeated prompts across the whole pool.
  const seen = new Set<string>();
  const unique = all.filter((item) => {
    const key = item.question.prompt.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  poolCache.set(topicId, unique);
  return unique;
}

/**
 * Picks one quiz set: it walks round the different styles of question in turn
 * so the set stays varied, never asks about the same idea twice, and starts
 * from a different place on every attempt so a retake is a new set.
 */
function selectSet(topicId: string, attempt: number, size: number): Question[] {
  const pool = topicPool(topicId);
  const byKind = new Map<string, PoolItem[]>();
  for (const item of pool) {
    const list = byKind.get(item.kind) ?? [];
    list.push(item);
    byKind.set(item.kind, list);
  }

  const kinds = [...byKind.keys()].sort();
  if (kinds.length === 0) return [];
  // Each attempt starts from a different style and a different point in each list.
  const kindStart = attempt % kinds.length;
  const cursors = new Map<string, number>(
    kinds.map((kind, index) => [kind, (attempt * (index + 2)) % Math.max((byKind.get(kind) ?? []).length, 1)]),
  );

  const chosen: Question[] = [];
  const usedSources = new Set<string>();
  const usedIds = new Set<string>();
  let guard = 0;

  while (chosen.length < size && guard < pool.length * 4) {
    let addedThisRound = 0;
    for (let step = 0; step < kinds.length && chosen.length < size; step += 1) {
      const kind = kinds[(kindStart + step) % kinds.length] as string;
      const list = byKind.get(kind) ?? [];
      if (list.length === 0) continue;
      let cursor = cursors.get(kind) ?? 0;
      for (let look = 0; look < list.length; look += 1) {
        const item = list[(cursor + look) % list.length] as PoolItem;
        if (usedIds.has(item.question.id) || usedSources.has(item.sourceKey)) continue;
        chosen.push(item.question);
        usedIds.add(item.question.id);
        usedSources.add(item.sourceKey);
        cursors.set(kind, (cursor + look + 1) % list.length);
        addedThisRound += 1;
        break;
      }
      cursor = cursors.get(kind) ?? 0;
    }
    if (addedThisRound === 0) break;
    guard += 1;
  }

  // If the section is thin on material, allow a second question on the same idea.
  if (chosen.length < size) {
    for (const item of pool) {
      if (chosen.length >= size) break;
      if (usedIds.has(item.question.id)) continue;
      chosen.push(item.question);
      usedIds.add(item.question.id);
    }
  }

  return chosen.map((item, index) => ({
    ...item,
    quizId: `section-quiz-${topicId}`,
    order: index,
  })) as Question[];
}

const setCache = new Map<string, Question[]>();

/**
 * The 20 question quiz for one section. Pass an attempt number to get a
 * different set of questions from the same section's material.
 */
export function getSectionQuizQuestions(topicId: string, attempt = 0): Question[] {
  const key = `${topicId}:${attempt}`;
  const cached = setCache.get(key);
  if (cached) return cached;
  const result = selectSet(topicId, attempt, SECTION_QUIZ_SIZE);
  setCache.set(key, result);
  return result;
}

/** Every question available for a topic, used to top up the larger stage exams. */
export function getTopicQuestionPool(topicId: string): Question[] {
  return usableQuestions(topicPool(topicId).map((item) => item.question));
}
