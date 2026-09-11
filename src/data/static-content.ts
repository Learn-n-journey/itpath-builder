/**
 * STATIC DATA registry.
 *
 * This is curriculum-side content only. It is read-only and never mixed with
 * user data. The foundation step intentionally ships empty collections — the
 * curriculum, question bank, labs and certification objectives are authored in
 * later steps and only need to be added to these arrays.
 */

export interface Track {
  id: string;
  title: string;
  description: string;
  year: 1 | 2;
}

export interface Topic {
  id: string;
  trackId: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
}

export interface Lesson {
  id: string;
  topicId: string;
  title: string;
  body: string;
}

export interface ResourceLink {
  id: string;
  topicId?: string;
  title: string;
  url: string;
  kind: "video" | "article" | "docs" | "tool";
}

export interface Assignment {
  id: string;
  topicId: string;
  title: string;
  brief: string;
}

export interface Lab {
  id: string;
  topicId: string;
  title: string;
  objective: string;
}

export interface Question {
  id: string;
  topicId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export interface CertificationObjective {
  id: string;
  certification: string;
  code: string;
  title: string;
}

export const tracks: Track[] = [];
export const topics: Topic[] = [];
export const lessons: Lesson[] = [];
export const resources: ResourceLink[] = [];
export const assignments: Assignment[] = [];
export const labs: Lab[] = [];
export const questions: Question[] = [];
export const certificationObjectives: CertificationObjective[] = [];

export const staticContent = {
  tracks,
  topics,
  lessons,
  resources,
  assignments,
  labs,
  questions,
  certificationObjectives,
};
