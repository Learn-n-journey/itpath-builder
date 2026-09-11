/** Read-only curriculum registry. User activity is never stored here. */
import type {
  Assignment,
  CareerSkill,
  Certification,
  CertificationObjective,
  Lab,
  Lesson,
  Question,
  Quiz,
  Resource,
  Topic,
  Track,
} from "@/lib/app-data/types";

export type {
  Assignment,
  CareerSkill,
  Certification,
  CertificationObjective,
  Lab,
  Lesson,
  Question,
  Quiz,
  Resource,
  ResourceLink,
  Topic,
  Track,
} from "@/lib/app-data/types";

export const tracks: Track[] = [];
export const topics: Topic[] = [];
export const lessons: Lesson[] = [];
export const resources: Resource[] = [];
export const assignments: Assignment[] = [];
export const labs: Lab[] = [];
export const quizzes: Quiz[] = [];
export const questions: Question[] = [];
export const certifications: Certification[] = [];
export const certificationObjectives: CertificationObjective[] = [];
export const careerSkills: CareerSkill[] = [];

export const staticContent = {
  tracks,
  topics,
  lessons,
  resources,
  assignments,
  labs,
  quizzes,
  questions,
  certifications,
  certificationObjectives,
  careerSkills,
};

export type StaticContent = typeof staticContent;
