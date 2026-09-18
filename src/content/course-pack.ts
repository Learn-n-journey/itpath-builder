/**
 * The course pack: the one place the subject matter enters the app.
 *
 * Everything under src/content is subject material. Everything else (the
 * learning engine, mastery gates, spaced review, GAYL, tutor, labs, tickets,
 * progress, community, feeds, payments, design) is subject agnostic and can be
 * reused as is.
 *
 * To build a different subject, for example auto repair, supply a new pack
 * that satisfies CoursePack and point this file at it. Nothing else in the app
 * needs to change. src/content/README.md walks through it step by step.
 */
import { certificationObjectives, certifications } from "@/data/certification-content";
import { deepLessons, getDeepLesson } from "@/data/deep-lessons";
import { hardwareComponents } from "@/data/hardware-explorer";
import { buildIdentificationLabs, identificationSet, isIdentificationLab } from "@/data/identification-labs";
import { journeyPhases } from "@/data/journey-phases";
import {
  getPracticeActivities,
  getRealWorldScenario,
  getRecallQuestions,
  learningModules,
  practiceActivities,
  realWorldScenarios,
  recallQuestions,
} from "@/data/learning-content";
import { hasMasteryCheck, masteryCheckPool, masteryCheckSet } from "@/data/mastery-checks";
import { messerTopicVideos } from "@/data/messer-topic-videos";
import { skillNodes } from "@/data/prerequisite-graph";
import { getStageExamQuestions, stageExams } from "@/data/stage-exams";
import { staticContent } from "@/data/static-content";
import { readingSources } from "@/data/topic-reading";
import { getSectionQuizQuestions, getTopicQuestionPool } from "@/data/topic-quizzes";
import { workedExamples } from "@/data/worked-examples";

import type { Question } from "@/lib/app-data/types";

/**
 * How the subject is described on screen. A pack for another trade changes
 * these words and nothing else has to know the difference.
 */
export interface SubjectProfile {
  /** The field being taught, e.g. "IT and cybersecurity" or "auto repair". */
  field: string;
  /** What a certificate track is called in this field. */
  qualificationWord: string;
  /** What one unit of study is called. */
  sectionWord: string;
  /** Where the material comes from, shown to learners who ask. */
  sourceNote: string;
}

/** The full contract a subject has to satisfy to run in this app. */
export interface CoursePack {
  subject: SubjectProfile;

  /** Qualification tracks and the objectives they are measured against. */
  qualifications: typeof certifications;
  objectives: typeof certificationObjectives;

  /** Sections, the teaching text behind them, and the order they unlock in. */
  sections: typeof staticContent.topics;
  lessons: typeof staticContent.lessons;
  deepLessons: typeof deepLessons;
  getDeepLesson: typeof getDeepLesson;
  phases: typeof journeyPhases;
  prerequisites: typeof skillNodes;

  /** Everything a learner is asked to do. */
  modules: typeof learningModules;
  recall: typeof recallQuestions;
  practice: typeof practiceActivities;
  scenarios: typeof realWorldScenarios;
  workedExamples: typeof workedExamples;
  getRecallQuestions: typeof getRecallQuestions;
  getPracticeActivities: typeof getPracticeActivities;
  getRealWorldScenario: typeof getRealWorldScenario;

  /** Proof of mastery: section quizzes, stage exams, competency checks. */
  sectionQuiz: (topicId: string, attempt?: number) => Question[];
  sectionQuestionPool: typeof getTopicQuestionPool;
  stageExams: typeof stageExams;
  stageExamQuestions: typeof getStageExamQuestions;
  masteryCheckPool: typeof masteryCheckPool;
  masteryCheckSet: typeof masteryCheckSet;
  hasMasteryCheck: typeof hasMasteryCheck;

  /** Hands-on work. */
  labs: typeof staticContent.labs;
  incidents: typeof staticContent.incidents;
  tickets: typeof staticContent.tickets;
  assignments: typeof staticContent.assignments;
  identification: {
    parts: typeof hardwareComponents;
    buildLabs: typeof buildIdentificationLabs;
    set: typeof identificationSet;
    isIdentificationLab: typeof isIdentificationLab;
  };

  /** Outside material, checked nightly by the link crawler. */
  resources: {
    videos: typeof messerTopicVideos;
    reading: typeof readingSources;
  };
}

/** The IT and cybersecurity pack this app ships with. */
export const coursePack: CoursePack = {
  subject: {
    field: "IT and cybersecurity",
    qualificationWord: "certification",
    sectionWord: "section",
    sourceNote: "Built to the published CompTIA exam objectives, with primary documentation and standards as reading.",
  },

  qualifications: certifications,
  objectives: certificationObjectives,

  sections: staticContent.topics,
  lessons: staticContent.lessons,
  deepLessons,
  getDeepLesson,
  phases: journeyPhases,
  prerequisites: skillNodes,

  modules: learningModules,
  recall: recallQuestions,
  practice: practiceActivities,
  scenarios: realWorldScenarios,
  workedExamples,
  getRecallQuestions,
  getPracticeActivities,
  getRealWorldScenario,

  sectionQuiz: getSectionQuizQuestions,
  sectionQuestionPool: getTopicQuestionPool,
  stageExams,
  stageExamQuestions: getStageExamQuestions,
  masteryCheckPool,
  masteryCheckSet,
  hasMasteryCheck,

  labs: staticContent.labs,
  incidents: staticContent.incidents,
  tickets: staticContent.tickets,
  assignments: staticContent.assignments,
  identification: {
    parts: hardwareComponents,
    buildLabs: buildIdentificationLabs,
    set: identificationSet,
    isIdentificationLab,
  },

  resources: {
    videos: messerTopicVideos,
    reading: readingSources,
  },
};
