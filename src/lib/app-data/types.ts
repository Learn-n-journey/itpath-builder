/** Strongly typed IT PATH application data. Static content and user records stay separate. */
export const APP_DATA_VERSION = 2;

export type EntityId = string;
export type ExperienceLevel = "none" | "beginner" | "some" | "intermediate";
export type Difficulty = "gentle" | "standard" | "challenging";
export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type TopicStatus = "not_started" | "in_progress" | "completed" | "mastered";

export interface Track {
  id: EntityId;
  title: string;
  description: string;
  year: 1 | 2;
}

export interface Topic {
  id: EntityId;
  trackId: EntityId;
  title: string;
  summary: string;
  estimatedMinutes: number;
}

export interface Lesson {
  id: EntityId;
  topicId: EntityId;
  title: string;
  body: string;
}

export interface Resource {
  id: EntityId;
  topicId?: EntityId;
  title: string;
  url: string;
  kind: "video" | "article" | "docs" | "tool";
}

export interface Assignment {
  id: EntityId;
  topicId: EntityId;
  title: string;
  brief: string;
}

export interface Lab {
  id: EntityId;
  topicId: EntityId;
  title: string;
  objective: string;
}

export interface Quiz {
  id: EntityId;
  topicId: EntityId;
  title: string;
  questionIds: EntityId[];
}

export interface Question {
  id: EntityId;
  topicId: EntityId;
  quizId: EntityId;
  prompt: string;
  choices: string[];
  answerIndex: number;
}

export interface Certification {
  id: EntityId;
  title: string;
  provider: string;
  objectiveIds: EntityId[];
}

export interface CertificationObjective {
  id: EntityId;
  certificationId: EntityId;
  code: string;
  title: string;
}

export interface CareerSkill {
  id: EntityId;
  title: string;
  description: string;
}

export interface UserSettings {
  id: EntityId;
  studyHoursPerWeek: number;
  studyDays: WeekDay[];
  sessionLengthMinutes: number;
  experienceLevel: ExperienceLevel;
  targetJob: string;
  certificationTarget: string;
  difficulty: Difficulty;
}

export interface TopicProgress {
  id: EntityId;
  topicId: EntityId;
  status: TopicStatus;
  updatedAt: string;
}

export interface QuizAttempt {
  id: EntityId;
  quizId: EntityId;
  topicId: EntityId;
  score: number;
  total: number;
  createdAt: string;
}

export interface Mistake {
  id: EntityId;
  questionId: EntityId;
  topicId: EntityId;
  quizAttemptId?: EntityId;
  createdAt: string;
  resolved: boolean;
}

export interface Review {
  id: EntityId;
  topicId: EntityId;
  dueAt: string;
  interval: number;
  createdAt: string;
}

export interface CareerTicket {
  id: EntityId;
  topicId: EntityId;
  title: string;
  status: "open" | "in_progress" | "completed";
  createdAt: string;
  completedAt?: string;
}

export interface PortfolioProject {
  id: EntityId;
  title: string;
  summary: string;
  topicIds: EntityId[];
  createdAt: string;
}

export interface StudySession {
  id: EntityId;
  topicId?: EntityId;
  startedAt: string;
  minutes: number;
}

export interface Note {
  id: EntityId;
  title: string;
  body: string;
  topicId?: EntityId;
  lessonId?: EntityId;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: EntityId;
  label: string;
  href: string;
  resourceId?: EntityId;
  topicId?: EntityId;
  createdAt: string;
}

export interface CertificationProgress {
  id: EntityId;
  certificationId: EntityId;
  completedObjectiveIds: EntityId[];
  updatedAt: string;
}

export interface LabAttempt {
  id: EntityId;
  labId: EntityId;
  topicId?: EntityId;
  status: "started" | "completed" | "abandoned";
  createdAt: string;
}

export interface AssignmentAttempt {
  id: EntityId;
  assignmentId: EntityId;
  topicId?: EntityId;
  status: "started" | "submitted" | "completed";
  createdAt: string;
}

export interface CareerScores {
  ticketsCompleted: number;
  communication: number;
  troubleshooting: number;
  documentation: number;
}

/** Compatibility aliases for existing imports while the public model uses concise entity names. */
export type ResourceLink = Resource;
export type MistakeRecord = Mistake;
export type ReviewItem = Review;
export type NoteRecord = Note;
export type BookmarkRecord = Bookmark;

export interface UserData {
  createdAt: string;
  topicProgress: Record<EntityId, TopicProgress>;
  quizAttempts: QuizAttempt[];
  mistakes: Mistake[];
  reviews: Review[];
  notes: Note[];
  bookmarks: Bookmark[];
  labAttempts: LabAttempt[];
  assignmentAttempts: AssignmentAttempt[];
  careerTickets: CareerTicket[];
  portfolio: PortfolioProject[];
  careerScores: CareerScores;
  certificationProgress: Record<EntityId, CertificationProgress>;
  studySessions: StudySession[];
  settings: UserSettings;
}

export interface PersistedState {
  version: number;
  user: UserData;
}
