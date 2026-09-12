/** Shared shapes for the deep instructional reading used by the Learn page. */

export interface DeepLessonSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
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
}
