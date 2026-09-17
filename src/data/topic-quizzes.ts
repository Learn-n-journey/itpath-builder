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
import { deepLessons, getDeepLesson } from "@/data/deep-lessons";
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

/**
 * What the question should actually name. A statement usually turns on one of
 * the section's key terms, and asking about that term reads like a real
 * question. Only when nothing matches do we fall back to the section name.
 */
function subjectFor(topicId: string, line: string, topicTitle: string): string {
  const lesson = lessons.find((item) => item.topicId === topicId);
  const lower = line.toLowerCase();
  const term = (lesson?.keyTerms ?? [])
    .map((entry) => entry.term)
    .filter((entry) => entry.length >= 3)
    .sort((a, b) => b.length - a.length)
    .find((entry) => lower.includes(entry.toLowerCase()));
  return term ?? topicTitle.toLowerCase();
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
  const subject = subjectFor(topicId, answer, topicTitle);
  return {
    kind,
    sourceKey: `${kind}:${answer.slice(0, 60).toLowerCase()}`,
    question: question({
      id: `section-${topicId}-${kind}-${index}`,
      topicId,
      prompt: prompt.replace("{topic}", subject).replace("{section}", topicTitle),
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
      `Which of these statements about {topic} is correct?`,
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
        `Which of these describes a way {topic} commonly goes wrong?`,
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
        `Which of these is sound practice when working with {topic}?`,
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
    module.commonProblems.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "common-problem",
        `Which of these is a problem you would expect to meet with {topic}?`,
        line,
        otherStatements(topicId, "commonProblems"),
        index,
        `From this section: ${tidy(line)}`,
        "diagnosis",
      );
      if (item) items.push(item);
    });
  }

  if (lesson) {
    lesson.realWorldExamples.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "real-example",
        `Which of these is a real example of {section} in use?`,
        line,
        lessons
          .filter((other) => other.topicId !== topicId && certOf(other.topicId) === cert)
          .flatMap((other) => other.realWorldExamples.map(tidy)),
        index,
        `From this section: ${tidy(line)}`,
        "procedure",
      );
      if (item) items.push(item);
    });

    const definition = shortMeaning(lesson.definition);
    const definitionItem = statementItem(
      topicId,
      title,
      "definition",
      `Which of these best describes {section}?`,
      definition,
      lessons
        .filter((other) => other.topicId !== topicId && certOf(other.topicId) === cert)
        .map((other) => shortMeaning(other.definition)),
      0,
      `${title}: ${definition}`,
    );
    if (definitionItem) items.push(definitionItem);

    const matters = shortMeaning(lesson.whyItMatters);
    const mattersItem = statementItem(
      topicId,
      title,
      "why-it-matters",
      `Why does {section} matter in day to day work?`,
      matters,
      lessons
        .filter((other) => other.topicId !== topicId && certOf(other.topicId) === cert)
        .map((other) => shortMeaning(other.whyItMatters)),
      0,
      matters,
    );
    if (mattersItem) items.push(mattersItem);
  }

  // Exam coverage and objectives: more of the section's own material, so a
  // retake has somewhere new to draw from.
  if (module) {
    module.examCoverage.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "exam-point",
        `Which of these does the exam expect you to know about {section}?`,
        line,
        learningModules
          .filter((other) => other.topicId !== topicId && certOf(other.topicId) === cert)
          .flatMap((other) => other.examCoverage.map(tidy)),
        index,
        `From this section: ${tidy(line)}`,
      );
      if (item) items.push(item);
    });
  }

  topic?.learningObjectives.forEach((line, index) => {
    const item = statementItem(
      topicId,
      title,
      "objective",
      `Which of these should you be able to do after working through {topic}?`,
      line,
      topics
        .filter((other) => other.id !== topicId && other.certificationId === cert)
        .flatMap((other) => other.learningObjectives.map(tidy)),
      index,
      `An objective of this section: ${tidy(line)}`,
      "procedure",
    );
    if (item) items.push(item);
  });

  // The depth layer: key ideas, exam traps, corrections, reference rows and
  // the short self-checks, all authored per topic.
  const depth = getDeepLesson(topicId)?.depth;
  if (depth) {
    const otherDepths = deepLessons.filter(
      (other) => other.topicId !== topicId && certOf(other.topicId) === cert,
    );
    depth.keyIdeas.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "key-idea",
        `Which of these is one of the ideas worth keeping from {topic}?`,
        shortMeaning(line),
        otherDepths.flatMap((other) => (other.depth?.keyIdeas ?? []).map((row) => shortMeaning(row))),
        index,
        `From this section: ${tidy(line)}`,
      );
      if (item) items.push(item);
    });
    depth.examTraps.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "exam-trap",
        `Which of these is a way the exam tries to catch you out on {topic}?`,
        shortMeaning(line),
        otherDepths.flatMap((other) => (other.depth?.examTraps ?? []).map((row) => shortMeaning(row))),
        index,
        `Watch for this: ${tidy(line)}`,
      );
      if (item) items.push(item);
    });
    depth.misconceptions.forEach((row, index) => {
      const item = statementItem(
        topicId,
        title,
        "correction",
        `Someone says: "${tidy(row.claim)}" What is actually the case?`,
        shortMeaning(row.correction),
        otherDepths.flatMap((other) =>
          (other.depth?.misconceptions ?? []).map((entry) => shortMeaning(entry.correction)),
        ),
        index,
        tidy(row.correction),
      );
      if (item) items.push(item);
    });
    depth.reference.rows.forEach((row, index) => {
      const item = statementItem(
        topicId,
        title,
        "reference",
        `In {topic}, which of these describes ${tidy(row.term)}?`,
        shortMeaning(row.detail),
        otherDepths.flatMap((other) =>
          (other.depth?.reference.rows ?? []).map((entry) => shortMeaning(entry.detail)),
        ),
        index,
        `${tidy(row.term)}: ${tidy(row.detail)}`,
        "terminology",
      );
      if (item) items.push(item);
    });
    depth.checkYourself.forEach((row, index) => {
      const item = statementItem(
        topicId,
        title,
        "self-check",
        tidy(row.question),
        shortMeaning(row.answer),
        otherDepths.flatMap((other) =>
          (other.depth?.checkYourself ?? []).map((entry) => shortMeaning(entry.answer)),
        ),
        index,
        tidy(row.answer),
      );
      if (item) items.push(item);
    });
    depth.walkthrough.steps.forEach((step, index) => {
      const item = statementItem(
        topicId,
        title,
        "walkthrough",
        `Working through ${tidy(depth.walkthrough.scenario).replace(/\.$/, "")}, what does "${tidy(step.label)}" involve?`,
        shortMeaning(step.detail),
        otherDepths.flatMap((other) =>
          (other.depth?.walkthrough.steps ?? []).map((entry) => shortMeaning(entry.detail)),
        ),
        index,
        tidy(step.detail),
        "procedure",
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
 * The whole pool laid out in one varied running order: it goes round the
 * different styles of question in turn, so any window of it is mixed.
 */
function interleavedPool(topicId: string): PoolItem[] {
  const pool = topicPool(topicId);
  const byKind = new Map<string, PoolItem[]>();
  for (const item of pool) {
    const list = byKind.get(item.kind) ?? [];
    list.push(item);
    byKind.set(item.kind, list);
  }
  const kinds = [...byKind.keys()].sort();
  const cursors = new Map(kinds.map((kind) => [kind, 0]));
  const out: PoolItem[] = [];
  while (out.length < pool.length) {
    let added = 0;
    for (const kind of kinds) {
      const list = byKind.get(kind) ?? [];
      const cursor = cursors.get(kind) ?? 0;
      if (cursor >= list.length) continue;
      out.push(list[cursor] as PoolItem);
      cursors.set(kind, cursor + 1);
      added += 1;
    }
    if (added === 0) break;
  }
  return out;
}

const orderCache = new Map<string, PoolItem[]>();

interface Sequence {
  sets: Question[][];
  /** Questions already asked in the current pass through the pool. */
  cycleUsed: Set<string>;
  /** Where the running order starts for the current pass. */
  offset: number;
}

const sequenceCache = new Map<string, Sequence>();

function orderFor(topicId: string): PoolItem[] {
  let order = orderCache.get(topicId);
  if (!order) {
    order = interleavedPool(topicId);
    orderCache.set(topicId, order);
  }
  return order;
}

/**
 * Builds the next set in the running order. Nothing already asked in this pass
 * through the pool can come back, so consecutive retakes are entirely new
 * questions. When the pool runs out the pass resets and the order shifts, so
 * the sets after that are grouped differently from the first time round.
 */
function nextSet(topicId: string, order: PoolItem[], sequence: Sequence, size: number): Question[] {
  const unused = order.filter((item) => !sequence.cycleUsed.has(item.question.id));
  if (unused.length < size) {
    sequence.cycleUsed = new Set<string>();
    sequence.offset = (sequence.offset + Math.max(1, Math.floor(size / 2))) % order.length;
  }

  const chosen: Question[] = [];
  const usedSources = new Set<string>();
  const usedIds = new Set<string>();

  for (let pass = 0; pass < 2 && chosen.length < size; pass += 1) {
    for (let step = 0; step < order.length && chosen.length < size; step += 1) {
      const item = order[(sequence.offset + step) % order.length] as PoolItem;
      if (usedIds.has(item.question.id)) continue;
      if (sequence.cycleUsed.has(item.question.id)) continue;
      // First pass keeps one question per idea; a second pass fills thin sections.
      if (pass === 0 && usedSources.has(item.sourceKey)) continue;
      chosen.push(item.question);
      usedIds.add(item.question.id);
      usedSources.add(item.sourceKey);
    }
  }

  for (const question of chosen) sequence.cycleUsed.add(question.id);

  return chosen.map((item, index) => ({
    ...item,
    quizId: `section-quiz-${topicId}`,
    order: index,
  })) as Question[];
}

/**
 * The 20 question quiz for one section. Pass an attempt number to get a
 * different set of questions from the same section's material.
 */
export function getSectionQuizQuestions(topicId: string, attempt = 0): Question[] {
  const order = orderFor(topicId);
  if (order.length === 0) return [];
  let sequence = sequenceCache.get(topicId);
  if (!sequence) {
    sequence = { sets: [], cycleUsed: new Set<string>(), offset: 0 };
    sequenceCache.set(topicId, sequence);
  }
  while (sequence.sets.length <= attempt) {
    sequence.sets.push(nextSet(topicId, order, sequence, SECTION_QUIZ_SIZE));
  }
  return sequence.sets[attempt] as Question[];
}

/** Every question available for a topic, used to top up the larger stage exams. */
export function getTopicQuestionPool(topicId: string): Question[] {
  return usableQuestions(topicPool(topicId).map((item) => item.question));
}
