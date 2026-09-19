/**
 * The course pack: the one place the subject matter enters the app.
 *
 * Everything under src/content is subject material. Everything else (the
 * learning engine, mastery gates, spaced review, GAYL, tutor, labs, tickets,
 * progress, community, feeds, payments, design) is subject agnostic and can be
 * reused as is.
 *
 * The contract below is written in shapes, never in a particular subject: it
 * names no certificate, no awarding body and no field. A pack for another
 * trade satisfies the same shapes with its own material. Qualifications and
 * awarding bodies are optional, because plenty of subjects are taught without
 * either.
 */
import type {
  Assignment,
  Certification,
  CertificationObjective,
  Incident,
  Lab,
  LearningModule,
  Lesson,
  PracticeActivity,
  Question,
  RealWorldScenario,
  RecallQuestion,
  Ticket,
  Topic,
} from "@/lib/app-data/types";
import type { DeepLesson } from "@/data/deep-lessons/types";
import type { HardwareComponent } from "@/data/hardware-explorer";
import type { JourneyPhase } from "@/data/journey-phases";
import type { MesserTopicVideo } from "@/data/messer-topic-videos";
import type { ReadingSource } from "@/data/topic-reading";
import type { SkillNode } from "@/data/prerequisite-graph";
import type { StageExam } from "@/data/stage-exams";
import type { MasteryCheckKind, MasteryItem } from "@/data/mastery-checks";
import type { DomainDefinition } from "@/domain/types";

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

/** How many questions this subject's papers hold. Held to exactly by QA. */
export interface PackAssessmentSizes {
  sectionQuiz: number;
  stageExam: number;
}

/** The full contract a subject has to satisfy to run in this app. */
export interface CoursePack {
  /** Which subject this pack teaches, and what things are called in it. */
  domain: DomainDefinition;
  subject: SubjectProfile;

  /**
   * Qualification tracks and the objectives they are measured against. Both are
   * optional: a subject taught without qualifications supplies neither.
   */
  qualifications: Certification[];
  objectives: CertificationObjective[];

  /** Sections, the teaching text behind them, and the order they unlock in. */
  sections: Topic[];
  lessons: Lesson[];
  deepLessons: DeepLesson[];
  getDeepLesson: (topicId: string) => DeepLesson | undefined;
  phases: JourneyPhase[];
  prerequisites: SkillNode[];

  /** Everything a learner is asked to do. */
  modules: LearningModule[];
  recall: RecallQuestion[];
  practice: PracticeActivity[];
  scenarios: RealWorldScenario[];
  workedExamples: unknown[];
  getRecallQuestions: (topicId: string) => RecallQuestion[];
  getPracticeActivities: (topicId: string) => PracticeActivity[];
  getRealWorldScenario: (topicId: string) => RealWorldScenario | undefined;

  /** Proof of mastery: section quizzes, stage exams, competency checks. */
  sectionQuiz: (topicId: string, attempt?: number) => Question[];
  sectionQuestionPool: (topicId: string) => Question[];
  /** A fresh paper for the same section, used by QA to draw and re-draw. */
  sectionQuizDraw: (topicId: string, nonce: number) => Question[];
  /** Everything a section teaches, gathered into one block of text, for QA. */
  lessonText: (topicId: string) => string;
  /** The idea a question tests, stable wherever the question turns up. */
  conceptId: (question: Question) => string;
  /** The sizes every paper in this subject is held to, exactly. */
  assessmentSizes: PackAssessmentSizes;
  stageExams: StageExam[];
  stageExamQuestions: (examId: string, nonce?: number) => Question[];
  masteryCheckPool: (topicId: string, kind: MasteryCheckKind) => MasteryItem[];
  masteryCheckSet: (...args: never[]) => unknown;
  hasMasteryCheck: (topicId: string, kind: MasteryCheckKind) => boolean;

  /** Hands-on work. */
  labs: Lab[];
  incidents: Incident[];
  tickets: Ticket[];
  assignments: Assignment[];
  identification: {
    parts: HardwareComponent[];
    buildLabs: (topics: Topic[], lessons: Lesson[]) => Lab[];
    set: (...args: never[]) => unknown;
    isIdentificationLab: (labId: string) => boolean;
  };

  /** Outside material, checked nightly by the link crawler. */
  resources: {
    videos: Record<string, MesserTopicVideo[]>;
    reading: Record<string, ReadingSource>;
  };
}
