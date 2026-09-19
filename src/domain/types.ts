/**
 * The domain definition: everything the engine needs to know about *which*
 * subject it is teaching.
 *
 * The engine (mastery, adaptive selection, review, assessment, validation,
 * analytics, AI) is written against this shape and never against IT itself.
 * Swapping subject means supplying a different definition plus a different
 * course pack. No engine file should ever spell out a subject by name again.
 *
 * Keep this file free of imports so both the browser, the server and the
 * authoring scripts can read it.
 */

/** What things are called in this subject. */
export interface DomainVocabulary {
  /** What a track leading to an exam is called, lowercase singular. */
  qualification: string;
  /** Plural of the above. */
  qualifications: string;
  /** One unit of study, lowercase singular. */
  section: string;
  /** Plural of the above. */
  sections: string;
  /** Hands-on work, lowercase singular. */
  lab: string;
  /** A real-world job/problem a learner works, lowercase singular. */
  ticket: string;
  /** The final proof of a qualification, lowercase singular. */
  exam: string;
}

/** Optional add-on feeds that only make sense for some subjects. */
export interface DomainFeeds {
  /** Job listings page. */
  jobs: boolean;
  /** Industry news feed. */
  news: boolean;
  /** Video feed. */
  videos: boolean;
}

export interface DomainDefinition {
  /** Stable id for this domain, used in ledgers and generated pack folders. */
  id: string;
  /** The product name shown to learners and written into exports. */
  appName: string;
  /** The field being taught, e.g. "IT and cybersecurity" or "auto repair". */
  field: string;
  /** Who awards the qualifications, e.g. "CompTIA" or "ASE". Empty if none. */
  awardingBody: string;
  /** One sentence describing the subject, used in prompts and search data. */
  summary: string;
  /** Where the material comes from, shown to learners who ask. */
  sourceNote: string;
  /** The qualification a brand new learner starts on. */
  defaultQualification: string;
  /** A sensible default career goal for a new learner. */
  defaultGoal: string;
  vocabulary: DomainVocabulary;
  feeds: DomainFeeds;
}

/** Title-case helper for vocabulary used at the start of a sentence. */
export function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
