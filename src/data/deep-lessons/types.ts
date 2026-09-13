/** Shared shapes for the deep instructional reading used by the Learn page. */

export interface DeepLessonSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

/** A step-by-step demonstration a learner can follow along with. */
export interface LessonWalkthroughStep {
  label: string;
  detail: string;
}

export interface LessonWalkthrough {
  title: string;
  scenario: string;
  steps: LessonWalkthroughStep[];
  outcome: string;
}

export interface LessonMisconception {
  claim: string;
  correction: string;
}

export interface LessonReferenceRow {
  term: string;
  detail: string;
}

export interface LessonCheck {
  question: string;
  answer: string;
}

/**
 * The depth layer: the parts of a lesson that turn reading into teaching.
 * Every field is authored per topic — nothing here is templated.
 */
export interface LessonDepth {
  /** The handful of sentences worth remembering forever. */
  keyIdeas: string[];
  /** One realistic worked scenario, start to finish. */
  walkthrough: LessonWalkthrough;
  /** The commands, values, ports or numbers worth keeping at hand. */
  reference: { heading: string; rows: LessonReferenceRow[] };
  /** What beginners get wrong, and the correction. */
  misconceptions: LessonMisconception[];
  /** How the exam tries to catch you out on this topic. */
  examTraps: string[];
  /** Short self-check questions with answers. */
  checkYourself: LessonCheck[];
}

export interface DeepLesson {
  topicId: string;
  /** Honest reading estimate for this specific lesson. */
  readingMinutes: number;
  /** Short orientation shown in the introduction block. */
  intro: string;
  /** Where a working technician actually meets this material. */
  whereYouMeetIt: string;
  sections: DeepLessonSection[];
  /** Optional deeper teaching layer, merged in from the depth files. */
  depth?: LessonDepth;
}
