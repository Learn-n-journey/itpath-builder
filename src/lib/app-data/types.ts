/**
 * Type definitions for IT PATH application data.
 *
 * STATIC DATA (curriculum, lessons, resources, ...) is defined in `src/data`.
 * USER DATA (progress, attempts, settings, ...) lives here and is persisted
 * to LocalStorage. The two are never mixed.
 */

export const APP_DATA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type ExperienceLevel = "none" | "beginner" | "some" | "intermediate";
export type Difficulty = "gentle" | "standard" | "challenging";
export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface UserSettings {
  studyHoursPerWeek: number;
  studyDays: WeekDay[];
  sessionLengthMinutes: number;
  experienceLevel: ExperienceLevel;
  targetJob: string;
  certificationTarget: string;
  difficulty: Difficulty;
}

/* ------------------------------------------------------------------ */
/* User records                                                        */
/* ------------------------------------------------------------------ */

export type TopicStatus = "not_started" | "in_progress" | "completed" | "mastered";

export interface TopicProgress {
  topicId: string;
  status: TopicStatus;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  topicId: string;
  score: number;
  total: number;
  createdAt: string;
}

export interface MistakeRecord {
  id: string;
  questionId: string;
  topicId: string;
  createdAt: string;
  resolved: boolean;
}

export interface ReviewItem {
  id: string;
  topicId: string;
  dueAt: string;
  interval: number;
  createdAt: string;
}

export interface NoteRecord {
  id: string;
  title: string;
  body: string;
  topicId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkRecord {
  id: string;
  label: string;
  href: string;
  createdAt: string;
}

export interface LabAttempt {
  id: string;
  labId: string;
  status: "started" | "completed" | "abandoned";
  createdAt: string;
}

export interface AssignmentAttempt {
  id: string;
  assignmentId: string;
  status: "started" | "submitted" | "completed";
  createdAt: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
}

export interface CareerScores {
  ticketsCompleted: number;
  communication: number;
  troubleshooting: number;
  documentation: number;
}

export interface StudySession {
  id: string;
  startedAt: string;
  minutes: number;
}

export interface UserData {
  createdAt: string;
  topicProgress: Record<string, TopicProgress>;
  quizAttempts: QuizAttempt[];
  mistakes: MistakeRecord[];
  reviews: ReviewItem[];
  notes: NoteRecord[];
  bookmarks: BookmarkRecord[];
  labAttempts: LabAttempt[];
  assignmentAttempts: AssignmentAttempt[];
  portfolio: PortfolioProject[];
  careerScores: CareerScores;
  studySessions: StudySession[];
  settings: UserSettings;
}

export interface PersistedState {
  version: number;
  user: UserData;
}
