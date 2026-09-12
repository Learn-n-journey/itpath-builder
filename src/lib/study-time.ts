/**
 * Recommended study time.
 *
 * The number shown to a learner is measured from the material that actually
 * exists for a topic: the words in the lesson, the worked examples, the recall
 * questions, the practice activity, the teach-back and the scenario. Nothing is
 * hard-coded per topic, so the estimate stays honest as content grows.
 */
import { lessons, topics } from "@/data/static-content";
import { getDeepLesson } from "@/data/deep-lessons";
import { getWorkedExamples } from "@/data/worked-examples";
import {
  getLearningModule,
  getPracticeActivity,
  getRealWorldScenario,
  getRecallQuestions,
} from "@/data/learning-content";
import type { Difficulty, Topic } from "@/lib/app-data/types";

/**
 * Reading pace for unfamiliar technical material studied properly: slower than
 * casual reading because terms are looked up and notes are taken.
 */
const WORDS_PER_MINUTE = 130;

/** A second pass over the material with notes, as a share of the first read. */
const SECOND_PASS_SHARE = 0.6;

const MINUTES = {
  workedExample: 8,
  practiceItem: 4,
  recallQuestion: 6,
  practiceActivity: 12,
  teachBack: 20,
  scenario: 15,
};

/**
 * Hands-on practice and spaced repetition, which published study-hour guidance
 * for CompTIA exams (roughly 120h for A+, 90h for Network+/Security+) counts as
 * the bulk of preparation time. Scaled by topic difficulty.
 */
const HANDS_ON_MINUTES: Record<Difficulty, number> = {
  gentle: 120,
  standard: 160,
  challenging: 200,
};

const REVIEW_SESSIONS = 4;
const REVIEW_SESSION_MINUTES: Record<Difficulty, number> = {
  gentle: 15,
  standard: 20,
  challenging: 25,
};

export interface StudyTimePart {
  label: string;
  minutes: number;
  detail: string;
}

export interface StudyTimeEstimate {
  topicId: string;
  totalMinutes: number;
  /** How the total splits across the stages of the topic. */
  parts: StudyTimePart[];
  /** Suggested number of sittings at the learner's session length. */
  sessions: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function wordsIn(values: string[]): number {
  return values.reduce((sum, value) => sum + countWords(value), 0);
}

function roundTo5(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** Recommended study time for one topic, measured from its own content. */
export function topicStudyTime(topicId: string): StudyTimeEstimate {
  const lesson = lessons.find((item) => item.topicId === topicId);
  const deep = getDeepLesson(topicId);
  const module = getLearningModule(topicId);
  const examples = getWorkedExamples(topicId);
  const recall = getRecallQuestions(topicId);
  const practice = getPracticeActivity(topicId);
  const scenario = getRealWorldScenario(topicId);

  let readingWords = 0;
  if (deep) {
    readingWords += countWords(deep.intro) + countWords(deep.whereYouMeetIt);
    for (const section of deep.sections) {
      readingWords += countWords(section.heading);
      readingWords += wordsIn(section.paragraphs);
      readingWords += wordsIn(section.bullets ?? []);
    }
  }
  if (lesson) {
    readingWords +=
      countWords(lesson.body) +
      countWords(lesson.definition) +
      countWords(lesson.whyItMatters) +
      countWords(lesson.summary) +
      wordsIn(lesson.realWorldExamples) +
      wordsIn(lesson.commonMisconceptions) +
      wordsIn(lesson.nextSteps) +
      wordsIn(lesson.keyTerms.map((term) => `${term.term} ${term.meaning}`));
  }
  if (module) {
    readingWords += wordsIn([
      ...module.howItWorks,
      ...module.whereYouSeeIt,
      ...module.commonProblems,
      ...module.howItFails,
      ...module.troubleshooting,
      ...module.practicalKnowledge,
      ...module.examCoverage,
      ...module.interviewQuestions,
    ]);
  }

  const difficulty: Difficulty =
    topics.find((item) => item.id === topicId)?.difficulty ?? "standard";
  const readMinutes = Math.max(10, Math.round(readingWords / WORDS_PER_MINUTE));
  const secondPassMinutes = Math.round(readMinutes * SECOND_PASS_SHARE);
  const handsOnMinutes = HANDS_ON_MINUTES[difficulty];
  const reviewMinutes = REVIEW_SESSIONS * REVIEW_SESSION_MINUTES[difficulty];
  const practiceItems = examples.reduce((sum, example) => sum + example.tryIt.length, 0);
  const exampleMinutes =
    examples.length * MINUTES.workedExample + practiceItems * MINUTES.practiceItem;
  const recallMinutes = recall.length * MINUTES.recallQuestion;
  const practiceMinutes = practice ? MINUTES.practiceActivity : 0;
  const teachBackMinutes = MINUTES.teachBack;
  const scenarioMinutes = scenario ? MINUTES.scenario : 0;

  const parts: StudyTimePart[] = [
    {
      label: "Read the lesson",
      minutes: readMinutes,
      detail: `About ${readingWords.toLocaleString()} words at a careful technical reading pace.`,
    },
    {
      label: "Second pass with notes",
      minutes: secondPassMinutes,
      detail: "Re-read the harder parts and write your own notes.",
    },
    {
      label: "Work through the examples",
      minutes: exampleMinutes,
      detail: `${examples.length} worked example${examples.length === 1 ? "" : "s"} and ${practiceItems} practice question${practiceItems === 1 ? "" : "s"}.`,
    },
    {
      label: "Recall from memory",
      minutes: recallMinutes,
      detail: `${recall.length} written recall question${recall.length === 1 ? "" : "s"}.`,
    },
    {
      label: "Practice decision",
      minutes: practiceMinutes,
      detail: "One applied decision with feedback.",
    },
    {
      label: "Teach it back",
      minutes: teachBackMinutes,
      detail: "Write the topic in your own words.",
    },
    {
      label: "Real-world scenario",
      minutes: scenarioMinutes,
      detail: "Read the situation and justify your decision in writing.",
    },
    {
      label: "Hands-on practice",
      minutes: handsOnMinutes,
      detail: "Labs, commands and configuration until you can do it unaided.",
    },
    {
      label: "Spaced review",
      minutes: reviewMinutes,
      detail: `${REVIEW_SESSIONS} short review sessions spread over the following weeks.`,
    },
  ].filter((part) => part.minutes > 0);

  const totalMinutes = roundTo5(parts.reduce((sum, part) => sum + part.minutes, 0));
  return { topicId, totalMinutes, parts, sessions: 1 };
}

/** Recommended study time with the learner's own session length applied. */
export function topicStudyTimeForSession(
  topicId: string,
  sessionLengthMinutes: number,
): StudyTimeEstimate {
  const estimate = topicStudyTime(topicId);
  const length = sessionLengthMinutes > 0 ? sessionLengthMinutes : 45;
  return { ...estimate, sessions: Math.max(1, Math.ceil(estimate.totalMinutes / length)) };
}

const cache = new Map<string, number>();

/** Cached total minutes, used by list views that estimate many topics at once. */
export function topicStudyMinutes(topicId: string): number {
  const cached = cache.get(topicId);
  if (cached !== undefined) return cached;
  const minutes = topicStudyTime(topicId).totalMinutes;
  cache.set(topicId, minutes);
  return minutes;
}

/** Total recommended study time across a set of topics. */
export function totalStudyMinutes(list: Topic[]): number {
  return list.reduce((sum, topic) => sum + topicStudyMinutes(topic.id), 0);
}

export function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function allTopicStudyMinutes(): number {
  return totalStudyMinutes(topics);
}

/**
 * Final exam preparation for a certification: full-length practice exams,
 * reviewing wrong answers and a last pass over weak objectives.
 */
export const EXAM_PREP_MINUTES = 600;
