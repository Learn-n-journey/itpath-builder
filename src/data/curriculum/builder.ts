/**
 * Shared builder for the expanded 24-month curriculum.
 * Seeds hold the real content; the builder derives the stable entity IDs and
 * relationships used by every existing engine (Learn, Quiz, Labs, Assignments).
 */
import type {
  Difficulty,
  LearningModule,
  Lesson,
  PracticeActivity,
  RealWorldScenario,
  RecallQuestion,
  Topic,
} from "@/lib/app-data/types";

export interface TopicSeed {
  slug: string;
  title: string;
  summary: string;
  cert: string;
  month: number;
  week: number;
  difficulty: Difficulty;
  /** Slugs of prerequisite topics. */
  prereqs: string[];
  minutes: number;
  objectives: string[];
  lesson: {
    title: string;
    body: string;
    definition: string;
    whyItMatters: string;
    keyTerms: Array<[string, string]>;
    examples: string[];
    misconceptions: string[];
    summary: string;
    nextSteps: string[];
  };
  module: {
    howItWorks: string[];
    whereYouSeeIt: string[];
    commonProblems: string[];
    howItFails: string[];
    troubleshooting: string[];
    practicalKnowledge: string[];
    examCoverage: string[];
    interviewQuestions: string[];
  };
  recall: Array<[string, string[], string]>;
  practice: {
    title: string;
    prompt: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
  };
  scenario: {
    title: string;
    situation: string;
    decisionPrompt: string;
    expectedConcepts: string[];
    guidance: string;
  };
}

export const YEAR_ONE_TRACK = "track-year-1-foundations";
export const YEAR_TWO_TRACK = "track-year-2-specialisation";

export function seedTopics(seeds: TopicSeed[]): Topic[] {
  return seeds.map((seed) => ({
    id: `topic-${seed.slug}`,
    trackId: seed.month <= 12 ? YEAR_ONE_TRACK : YEAR_TWO_TRACK,
    title: seed.title,
    summary: seed.summary,
    certificationId: seed.cert,
    year: seed.month <= 12 ? 1 : 2,
    month: seed.month,
    week: seed.week,
    difficulty: seed.difficulty,
    prerequisiteTopicIds: seed.prereqs.map((slug) => `topic-${slug}`),
    learningObjectives: seed.objectives,
    estimatedMinutes: seed.minutes,
  }));
}

export function seedLessons(seeds: TopicSeed[]): Lesson[] {
  return seeds.map((seed) => ({
    id: `lesson-${seed.slug}-core`,
    topicId: `topic-${seed.slug}`,
    title: seed.lesson.title,
    body: seed.lesson.body,
    definition: seed.lesson.definition,
    whyItMatters: seed.lesson.whyItMatters,
    keyTerms: seed.lesson.keyTerms.map(([term, meaning]) => ({ term, meaning })),
    realWorldExamples: seed.lesson.examples,
    commonMisconceptions: seed.lesson.misconceptions,
    summary: seed.lesson.summary,
    nextSteps: seed.lesson.nextSteps,
  }));
}

export function seedModules(seeds: TopicSeed[]): LearningModule[] {
  return seeds.map((seed) => ({
    id: `module-${seed.slug}`,
    lessonId: `lesson-${seed.slug}-core`,
    topicId: `topic-${seed.slug}`,
    ...seed.module,
    recallQuestionIds: seed.recall.map((_, index) => `recall-${seed.slug}-${index + 1}`),
    practiceActivityId: `practice-${seed.slug}`,
    scenarioId: `scenario-${seed.slug}`,
  }));
}

export function seedRecall(seeds: TopicSeed[]): RecallQuestion[] {
  return seeds.flatMap((seed) =>
    seed.recall.map(([prompt, acceptedConcepts, explanation], index) => ({
      id: `recall-${seed.slug}-${index + 1}`,
      topicId: `topic-${seed.slug}`,
      prompt,
      acceptedConcepts,
      explanation,
    })),
  );
}

export function seedPractice(seeds: TopicSeed[]): PracticeActivity[] {
  return seeds.map((seed) => ({
    id: `practice-${seed.slug}`,
    topicId: `topic-${seed.slug}`,
    ...seed.practice,
  }));
}

export function seedScenarios(seeds: TopicSeed[]): RealWorldScenario[] {
  return seeds.map((seed) => ({
    id: `scenario-${seed.slug}`,
    topicId: `topic-${seed.slug}`,
    ...seed.scenario,
  }));
}
