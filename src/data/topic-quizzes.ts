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
import { domainOverlay } from "@/data/domain-overlay";
import { getLearningModule, learningModules } from "@/data/learning-content";
import { deepLessons, getDeepLesson } from "@/data/deep-lessons";
import { questions as authoredQuestions } from "@/data/quiz-content";
import { generatedQuestions } from "@/data/question-bank";
import { isUsableQuestion, usableQuestions } from "@/lib/question-quality";
import { selectQuizQuestions } from "@/lib/quiz-selection";
import { conceptKey, tagQuestion, type TaggedQuestion } from "@/lib/question-tags";
import { finalizeQuestionSet } from "@/lib/quiz-finalize";
import type { ConceptStat } from "@/lib/concept-mastery";
import type { Question } from "@/lib/app-data/types";

/** How many questions a section quiz holds. Declared by the live subject. */
export const SECTION_QUIZ_SIZE = domainOverlay?.sizes.sectionQuiz ?? 20;
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

/**
 * Cross-section ownership, in curriculum order. Two sections sometimes teach
 * the same term or repeat the same line; the first section keeps the questions
 * about it and later sections skip them, so the same question is never asked
 * twice anywhere in the program.
 */
const termOwner = new Map<string, string>();
const misconceptionOwner = new Map<string, string>();
for (const entry of lessons) {
  for (const term of entry.keyTerms ?? []) {
    const key = term.term.toLowerCase();
    if (!termOwner.has(key)) termOwner.set(key, entry.topicId);
  }
  for (const line of entry.commonMisconceptions ?? []) {
    const key = tidy(line).toLowerCase();
    if (!misconceptionOwner.has(key)) misconceptionOwner.set(key, entry.topicId);
  }
}
const moduleLineOwners = new Map<string, Map<string, string>>();
for (const item of learningModules) {
  for (const field of ["howItWorks", "whereYouSeeIt", "howItFails", "practicalKnowledge"] as const) {
    let map = moduleLineOwners.get(field);
    if (!map) moduleLineOwners.set(field, (map = new Map()));
    for (const line of item[field]) {
      const key = tidy(line).toLowerCase();
      if (!map.has(key)) map.set(key, item.topicId);
    }
  }
}
const ownsModuleLine = (field: string, line: string, topicId: string): boolean =>
  moduleLineOwners.get(field)?.get(tidy(line).toLowerCase()) === topicId;

/**
 * Prompt ownership. Different lines can still produce the same wording when
 * they turn on the same term ("Which of these statements about RAID is
 * correct?"). The first section to ask it keeps that wording; later sections
 * ask about the section by name instead, so no two questions read alike.
 */
const promptOwner = new Map<string, string>();
const claimPrompt = (topicId: string, kind: string, line: string): void => {
  const topic = topics.find((item) => item.id === topicId);
  const subject = subjectFor(topicId, tidy(line), topic?.title ?? "").toLowerCase();
  const key = `${kind}:${subject}`;
  if (!promptOwner.has(key)) promptOwner.set(key, topicId);
};
for (const entry of lessons) {
  for (const line of entry.commonMisconceptions ?? []) claimPrompt(entry.topicId, "misconception", line);
}
for (const item of learningModules) {
  for (const line of item.howItWorks) claimPrompt(item.topicId, "how-it-works", line);
  for (const line of item.whereYouSeeIt) claimPrompt(item.topicId, "where-used", line);
  for (const line of item.howItFails) claimPrompt(item.topicId, "how-it-fails", line);
  for (const line of item.practicalKnowledge) claimPrompt(item.topicId, "practice-point", line);
}

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

const STOP_WORDS = new Set([
  "that", "this", "with", "from", "when", "what", "which", "your", "into", "than", "then", "they",
  "them", "have", "will", "been", "each", "more", "most", "some", "such", "only", "also", "over",
  "does", "make", "makes", "used", "using", "there", "these", "those", "their", "about", "after",
  "before", "other", "would", "could", "should", "while", "where", "every", "still", "being",
]);

/** Content words of a line, used to judge how close two options are. */
function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word)),
  );
}

/** How much two lines share, scaled against the shorter one. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/**
 * Three wrong options, chosen without randomness.
 *
 * A wrong option has to be in the same territory as the answer so the question
 * is a real choice, and it has to be clearly not the answer: anything that
 * restates the answer, or that talks about the very thing the question names,
 * is dropped so exactly one option can be correct.
 */
function pickThree(
  candidates: string[],
  correct: string,
  offset: number,
  subject?: string,
  maxNear = 0.5,
  preferred: string[] = [],
): string[] | null {
  const correctWords = contentWords(correct);
  // Wrong options that are known misunderstandings of this very section beat
  // any other wrong option: they are what a learner actually believes.
  const preferSet = new Set(preferred.map((item) => tidy(item).toLowerCase()));
  candidates = [...preferred, ...candidates];
  const subjectKey = subject?.toLowerCase().replace(/^the\s+/, "").trim() ?? "";
  const scored = candidates
    .map((item) => tidy(item))
    .filter((item) => item.toLowerCase() !== correct.toLowerCase())
    .filter((item, index, all) => all.indexOf(item) === index)
    // An option that names the thing the question asks about could be true too.
    .filter((item) => !(subjectKey.length >= 3 && item.toLowerCase().includes(subjectKey)))
    .map((item) => ({ text: item, near: overlap(contentWords(item), correctWords) }))
    // Anything this close to the answer is the same claim in other words.
    .filter((entry) => entry.near <= maxNear);

  // Closest in subject matter first, then trimmed to options of a similar length
  // so the answer never stands out simply by being longer or shorter.
  const ranked = scored.sort((a, b) => b.near - a.near).slice(0, 24).map((entry) => entry.text);
  // A wrong option that is far longer or shorter than the answer gives the
  // answer away and usually comes from unrelated material, so a question that
  // cannot find three options of a comparable size is dropped rather than asked.
  const similarLength = ranked.filter(
    (item) => item.length >= correct.length * 0.5 && item.length <= correct.length * 2,
  );
  if (similarLength.length < 3) return null;
  const pool = similarLength
    .sort((a, b) => {
      const weight = Number(preferSet.has(b.toLowerCase())) - Number(preferSet.has(a.toLowerCase()));
      if (weight !== 0) return weight;
      return Math.abs(a.length - correct.length) - Math.abs(b.length - correct.length);
    })
    .slice(0, 10);
  if (pool.length < 3) return null;
  const picked: string[] = [];
  let index = offset;
  let guard = 0;
  while (picked.length < 3 && guard < pool.length * 3) {
    const candidate = pool[index % pool.length] as string;
    const clash = picked.some(
      (item) => overlap(contentWords(item), contentWords(candidate)) > 0.7,
    );
    if (!picked.includes(candidate) && !clash) picked.push(candidate);
    index += 1;
    guard += 1;
  }
  return picked.length === 3 ? picked : null;
}

/** Puts the answer in a different position each time so it is never predictable. */
function withAnswerPlaced(correct: string, wrong: string[], index: number): string[] {
  const options = [...wrong];
  // The slot is spread by the wording itself, so the right answer does not
  // settle into a favourite position across a section.
  const seedText = `${correct}|${wrong.join("|")}|${index}`;
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const slot = (seed >>> 8) % (options.length + 1);

  options.splice(slot, 0, correct);
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
  if (!term) return topicTitle.toLowerCase();
  // Acronyms read better with an article: "how the CPU works", not "how CPU works".
  return /^[A-Z0-9.\- ]+$/.test(term) ? `the ${term}` : term;
}

/**
 * What learners actually get wrong in the section currently being built.
 * These are offered as wrong options first, because a believable wrong option
 * is one somebody really believes.
 */
let currentMisbeliefs: string[] = [];

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
  preferred: string[] = [],
): PoolItem | null {
  const answer = tidy(correct);
  if (answer.length < 25 || answer.length > 200) return null;
  const subject = subjectFor(topicId, answer, topicTitle);
  // Another section already asks about this subject in this style; ask about
  // the section by name instead so the wording is never repeated.
  const claimedBy = promptOwner.get(`${kind}:${subject.toLowerCase()}`);
  const askedAbout = claimedBy && claimedBy !== topicId ? topicTitle : subject;
  // Some styles ask what is true in general, so a wrong option that shades into
  // the answer could be defended as correct. Those are held further apart.
  const openEnded = new Set([
    "where-used",
    "practice-point",
    "common-problem",
    "exam-point",
    "objective",
    "key-idea",
    "exam-trap",
  ]);
  const wrong = pickThree(
    candidates,
    answer,
    index * 3 + 1,
    subject,
    openEnded.has(kind) ? 0.25 : 0.5,
    kind === "misconception" || kind === "correction"
      ? []
      : preferred.length > 0
        ? preferred
        : currentMisbeliefs,
  );
  if (!wrong) return null;
  return {
    kind,
    sourceKey: `${kind}:${answer.slice(0, 60).toLowerCase()}`,
    question: question({
      id: `section-${topicId}-${kind}-${index}`,
      topicId,
      prompt: prompt.replace("{topic}", askedAbout).replace("{section}", topicTitle),
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

  // Terms taught in this same section make the closest wrong options.
  const ownTerms = new Set((lesson?.keyTerms ?? []).map((entry) => entry.term.toLowerCase()));

  // The things people actually get wrong about this section. Used as wrong
  // options first, so a wrong choice is a real misunderstanding rather than
  // an unrelated statement that nobody would pick.
  currentMisbeliefs = (getDeepLesson(topicId)?.depth?.misconceptions ?? [])
    .map((row) => tidy(row.claim))
    .filter((line) => line.length >= 25 && line.length <= 200);

  lesson?.keyTerms.forEach((term, index) => {
    // A term an earlier section introduced already has its questions there.
    if (termOwner.get(term.term.toLowerCase()) !== topicId) return;
    const correct = shortMeaning(term.meaning);
    const meaningOptions = pickThree(
      meaningPool.filter((entry) => entry.term !== term.term).map((entry) => entry.meaning),
      correct,
      index * 2 + 1,
      term.term,
    );
    if (meaningOptions) {
      items.push({
        kind: "term-meaning",
        sourceKey: `term:${term.term.toLowerCase()}`,
        question: question({
          id: `section-${topicId}-term-${index}`,
          topicId,
          prompt: `A colleague uses the term ${term.term} on a job and you have to act on what they mean. Which reading of it is correct here?`,
          choices: withAnswerPlaced(correct, meaningOptions, index),
          correctAnswer: [correct],
          acceptableAnswers: [correct],
          explanation: `${term.term}: ${term.meaning}`,
          mistakeCategory: "terminology",
        }),
      });
    }

    const description = shortMeaning(term.meaning);
    // A term named in the description could fairly be the answer, so leave it out.
    const nameCandidates = meaningPool
      .map((entry) => entry.term)
      .filter((entry) => entry.toLowerCase() !== term.term.toLowerCase())
      .filter((entry) => !description.toLowerCase().includes(entry.toLowerCase()));
    const sameSection = nameCandidates.filter((entry) => ownTerms.has(entry.toLowerCase()));
    const nameOptions = pickThree(
      sameSection.length >= 3 ? sameSection : nameCandidates,
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
          prompt: `Which term is being described? ${description}`,
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
    if (misconceptionOwner.get(tidy(line).toLowerCase()) !== topicId) return;
    const item = statementItem(
      topicId,
      title,
      "misconception",
      `Two colleagues disagree about {topic} while working on it. Which statement holds up?`,
      line,
      otherMisconceptions(topicId),
      index,
      `This is one of the points people most often get the wrong way round: ${tidy(line)}`,
    );
    if (item) items.push(item);
  });

  if (module) {
    module.howItWorks.forEach((line, index) => {
      if (!ownsModuleLine("howItWorks", line, topicId)) return;
      const item = statementItem(
        topicId,
        title,
        "how-it-works",
        `A new starter asks you what actually happens inside {topic} while it is running. Which account is accurate?`,
        line,
        otherStatements(topicId, "howItWorks"),
        index,
        `From this section: ${tidy(line)}`,
      );
      if (item) items.push(item);
    });

    module.whereYouSeeIt.forEach((line, index) => {
      if (!ownsModuleLine("whereYouSeeIt", line, topicId)) return;
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
      if (!ownsModuleLine("howItFails", line, topicId)) return;
      const item = statementItem(
        topicId,
        title,
        "how-it-fails",
        `You are called to a fault involving {topic}. Which of these is a failure it genuinely produces?`,
        line,
        otherStatements(topicId, "howItFails"),
        index,
        `From this section: ${tidy(line)}`,
        "diagnosis",
      );
      if (item) items.push(item);
    });

    module.practicalKnowledge.forEach((line, index) => {
      if (!ownsModuleLine("practicalKnowledge", line, topicId)) return;
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
            prompt: `A user reports this problem: ${tidy(problem).replace(/\.$/, "")}. You have seen it happen yourself and nothing else has been changed. Going on what you can actually observe, which step comes first?`,
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

    // Later steps in the sequence, so the order of work is tested too. The
    // problem is always stated: a step question without the symptom in front
    // of it has no context and no defensible answer, and the quality gate
    // rejects that wording outright.
    module.troubleshooting.forEach((step, index) => {
      if (index === 0 || index > 3) return;
      const before = module.troubleshooting[index - 1];
      if (!before || module.commonProblems.length === 0) return;
      const problem = module.commonProblems[(index - 1) % module.commonProblems.length] as string;
      const item = statementItem(
        topicId,
        title,
        "next-step",
        `A user reports this problem: ${tidy(problem).replace(/\.$/, "")}. Working through it, you have already done this: ${tidy(before).replace(/\.$/, "")}. It gave no conclusive answer. What does the evidence point you to next?`,
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
        `You are triaging a report against {topic} and have to decide whether it is even the right place to look. Which complaint genuinely fits it?`,
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
        `You want to show a new starter {section} being used on a real job rather than in theory. Which situation is genuinely that?`,
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
      `A colleague asks what {section} actually covers before you start a job together. Which account is accurate?`,
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
      `Which of these should you be able to do after working through {section}?`,
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
    // Key-idea recognition items used to ask learners to identify a sentence
    // copied from the section among unrelated statements. They did not require
    // evidence or application, so they are intentionally not quiz material.
    depth.examTraps.forEach((line, index) => {
      const item = statementItem(
        topicId,
        title,
        "exam-trap",
        `Which of these is a way the exam tries to catch you out on {section}?`,
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
        `In {section}, which of these describes ${tidy(row.term)}?`,
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
        // The section name keeps a short check question anchored to its material.
        `In {section}: ${tidy(row.question)}`,
        shortMeaning(row.answer),
        // Answers from the same section come first, so the wrong options stay on
        // the subject the question is actually about.
        [
          ...depth.checkYourself
            .filter((entry) => entry.question !== row.question)
            .map((entry) => shortMeaning(entry.answer)),
          ...depth.reference.rows.map((entry) => shortMeaning(entry.detail)),
          ...otherDepths.flatMap((other) =>
            (other.depth?.checkYourself ?? []).map((entry) => shortMeaning(entry.answer)),
          ),
        ],
        index,
        tidy(row.answer),
      );
      if (item) items.push(item);
    });
    depth.walkthrough.steps.forEach((step, index) => {
      // Only steps from this walkthrough are valid options. Pulling fallback
      // statements from another lesson creates grammatically mismatched answers
      // (an action beside a claim), so a short walkthrough simply yields no item.
      const sameScenario = depth.walkthrough.steps
        .filter((entry) => entry.label !== step.label)
        .map((entry) => shortMeaning(entry.detail));
      if (sameScenario.length < 3) return;
      const item = statementItem(
        topicId,
        title,
        "walkthrough",
        `A scenario from this section: ${tidy(depth.walkthrough.scenario).replace(/\.$/, "")}. At the "${tidy(step.label)}" step, what are you actually doing?`,
        shortMeaning(step.detail),
        sameScenario,
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
    // The idea comes from what the question asks, not from the answer text.
    // Two questions that share an answer but ask different things are two
    // questions, so neither is thrown away as a duplicate.
    // Put a stable full-prompt fingerprint first because concept ids retain only
    // their opening words; several "Which term..." prompts otherwise collapse.
    sourceKey: `authored-${stableQuestionKey(item.prompt.trim().toLowerCase())}:${item.prompt}`,
  }));
  const all = [...authored, ...buildPool(topicId)];
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

/** Small seeded generator, so one sitting keeps its paper while it is open. */
function seeded(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let value = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const taggedCache = new Map<string, TaggedQuestion[]>();

function stableQuestionKey(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36);
}

/** The section's pool with every question tagged, ready for the quiz builder. */
export function getTaggedTopicPool(topicId: string): TaggedQuestion[] {
  const cached = taggedCache.get(topicId);
  if (cached) return cached;
  const tagged = topicPool(topicId)
    .filter((item) => isUsableQuestion(item.question))
    .map((item) => ({
      question: item.question,
      tags: tagQuestion(item.question, item.kind, item.sourceKey),
    }));
  taggedCache.set(topicId, tagged);
  return tagged;
}

/** Which idea a question tests, for tracking mastery concept by concept. */
export function conceptOfQuestion(topicId: string, questionId: string): string | undefined {
  return getTaggedTopicPool(topicId).find((item) => item.question.id === questionId)?.tags.conceptId;
}

/**
 * The stable idea behind any question, wherever it turns up.
 *
 * The same question carries the same conceptId in a section quiz, a stage exam,
 * mastery tracking and review, so all four agree on what has been proven.
 */
export function conceptIdFor(question: Question): string {
  return (
    conceptOfQuestion(question.topicId, question.id) ?? conceptKey(question.topicId, question.prompt)
  );
}

/** A lookup from question id to concept for one section, for mastery tracking. */
export function topicConceptLookup(topicId: string): (questionId: string) => string | undefined {
  const map = new Map(
    getTaggedTopicPool(topicId).map((item) => [item.question.id, item.tags.conceptId] as const),
  );
  return (questionId: string) => map.get(questionId);
}

/**
 * A mastery driven section quiz.
 *
 * Shaky ideas and ideas due for another look come first, ideas never met come
 * next, and ideas already proven several times over take up very little room.
 * The set is checked before it is handed over and only failing places are
 * filled again.
 */
export function buildSectionQuiz(
  topicId: string,
  nonce: number,
  stats: Map<string, ConceptStat> = new Map(),
): Question[] {
  const pool = getTaggedTopicPool(topicId);
  if (pool.length === 0) return [];
  const chosen = selectQuizQuestions(pool, {
    size: SECTION_QUIZ_SIZE,
    stats,
    random: seeded(`${topicId}:${nonce}`),
  });
  return finalizeQuestionSet(
    chosen.map((item) => item.question),
    {
      size: SECTION_QUIZ_SIZE,
      pool: pool.map((item) => item.question),
      conceptOf: conceptIdFor,
      random: seeded(`${topicId}:${nonce}:fill`),
      quizId: `section-quiz-${topicId}`,
    },
  );
}

/**
 * One freshly drawn section quiz. Every question comes from this section's own
 * pool and nothing else, and each sitting draws a different selection.
 */
export function drawSectionQuiz(topicId: string, nonce: number): Question[] {
  const order = orderFor(topicId);
  if (order.length === 0) return [];
  const random = seeded(`${topicId}:${nonce}`);
  const shuffled = order.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap] as PoolItem, shuffled[index] as PoolItem];
  }

  const chosen: Question[] = [];
  const usedSources = new Set<string>();
  const usedIds = new Set<string>();
  for (let pass = 0; pass < 2 && chosen.length < SECTION_QUIZ_SIZE; pass += 1) {
    for (const item of shuffled) {
      if (chosen.length >= SECTION_QUIZ_SIZE) break;
      if (usedIds.has(item.question.id)) continue;
      if (pass === 0 && usedSources.has(item.sourceKey)) continue;
      chosen.push(item.question);
      usedIds.add(item.question.id);
      usedSources.add(item.sourceKey);
    }
  }

  return finalizeQuestionSet(chosen, {
    size: SECTION_QUIZ_SIZE,
    pool: order.map((item) => item.question),
    conceptOf: conceptIdFor,
    random: seeded(`${topicId}:${nonce}:fill`),
    quizId: `section-quiz-${topicId}`,
  });
}

/** Every question available for a topic, used to top up the larger stage exams. */
export function getTopicQuestionPool(topicId: string): Question[] {
  return usableQuestions(topicPool(topicId).map((item) => item.question));
}
