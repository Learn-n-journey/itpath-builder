/**
 * The IT and cybersecurity course pack.
 *
 * This is one pack among however many the project holds. It satisfies the
 * CoursePack contract and nothing outside src/content imports it directly;
 * the engine only ever sees the active pack.
 */
import { domain } from "@/domain/active";
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
import { STAGE_EXAM_SIZE, getStageExamQuestions, stageExams } from "@/data/stage-exams";
import { staticContent } from "@/data/static-content";
import { readingSources } from "@/data/topic-reading";
import { SECTION_QUIZ_SIZE, conceptIdFor, getSectionQuizQuestions, getTopicQuestionPool } from "@/data/topic-quizzes";
import { workedExamples } from "@/data/worked-examples";



import type { CoursePack } from "@/content/pack-contract";

/** The IT and cybersecurity pack this app ships with. */
export const itPack: CoursePack = {
  domain,

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
  conceptId: conceptIdFor,
  assessmentSizes: { sectionQuiz: SECTION_QUIZ_SIZE, stageExam: STAGE_EXAM_SIZE },
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
