/** Strongly typed IT PATH application data. Static content and user records stay separate. */
export const APP_DATA_VERSION = 4;

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
  certificationId: EntityId;
  year: 1 | 2;
  month: number;
  week: number;
  difficulty: Difficulty;
  prerequisiteTopicIds: EntityId[];
  learningObjectives: string[];
  estimatedMinutes: number;
}

export interface Lesson {
  id: EntityId;
  topicId: EntityId;
  title: string;
  body: string;
  definition: string;
  whyItMatters: string;
  keyTerms: Array<{ term: string; meaning: string }>;
  realWorldExamples: string[];
  commonMisconceptions: string[];
  summary: string;
  nextSteps: string[];
}

export interface Resource {
  id: EntityId;
  title: string;
  provider: string;
  url: string;
  topicIds: EntityId[];
  certificationId: EntityId;
  kind: "course" | "article" | "docs" | "learning-path";
  difficulty: Difficulty;
  access: "free" | "paid";
  lastVerified: string;
  status: "verified" | "unavailable";
}

export interface Assignment {
  id: EntityId;
  topicId: EntityId;
  title: string;
  brief: string;
  type: AssignmentType;
  instructions: string[];
  responsePrompt: string;
  evaluationMode: "automatic" | "self_rubric";
  rubric: AssignmentRubricCriterion[];
}

export type AssignmentType =
  | "explain" | "recall" | "configure" | "build" | "compare" | "scenario"
  | "incident" | "troubleshoot" | "design" | "teach_back"
  | "command_challenge" | "exam_simulation" | "capstone";

export interface AssignmentRubricCriterion {
  id: EntityId;
  label: string;
  description: string;
  points: number;
  acceptedConcepts?: string[];
}

export interface AssignmentCriterionResult {
  criterionId: EntityId;
  earnedPoints: number;
  feedback: string;
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
  understanding: number;
  recall: number;
  application: number;
  practicalAbility: number;
  troubleshooting: number;
  retention: number;
  updatedAt: string;
}

export interface RecallQuestion {
  id: EntityId;
  topicId: EntityId;
  prompt: string;
  acceptedConcepts: string[];
  explanation: string;
}

export interface PracticeActivity {
  id: EntityId;
  topicId: EntityId;
  title: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export interface RealWorldScenario {
  id: EntityId;
  topicId: EntityId;
  title: string;
  situation: string;
  decisionPrompt: string;
  expectedConcepts: string[];
  guidance: string;
}

export interface LearningModule {
  id: EntityId;
  lessonId: EntityId;
  topicId: EntityId;
  howItWorks: string[];
  whereYouSeeIt: string[];
  commonProblems: string[];
  howItFails: string[];
  troubleshooting: string[];
  practicalKnowledge: string[];
  examCoverage: string[];
  interviewQuestions: string[];
  recallQuestionIds: EntityId[];
  practiceActivityId: EntityId;
  scenarioId: EntityId;
}

export interface QuizAttempt {
  id: EntityId;
  quizId: EntityId;
  topicId: EntityId;
  score: number;
  total: number;
  createdAt: string;
}

export interface RecallResponse {
  id: EntityId;
  questionId: EntityId;
  topicId: EntityId;
  answer: string;
  correct: boolean;
  matchedConcepts: string[];
  createdAt: string;
}

export interface PracticeResponse {
  id: EntityId;
  activityId: EntityId;
  topicId: EntityId;
  selectedIndex: number;
  correct: boolean;
  createdAt: string;
}

export interface TeachBackResponse {
  id: EntityId;
  topicId: EntityId;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioResponse {
  id: EntityId;
  scenarioId: EntityId;
  topicId: EntityId;
  response: string;
  matchedConcepts: string[];
  meetsCriteria: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Mistake {
  id: EntityId;
  questionId?: EntityId;
  assignmentId?: EntityId;
  assignmentAttemptId?: EntityId;
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
  resourceId?: EntityId;
  assignmentId?: EntityId;
  assignmentAttemptId?: EntityId;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: EntityId;
  label: string;
  href: string;
  resourceId?: EntityId;
  topicId?: EntityId;
  assignmentId?: EntityId;
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
  status: "started" | "submitted" | "evaluated" | "completed";
  responses: Record<string, string>;
  score?: number;
  maxScore?: number;
  criterionResults: AssignmentCriterionResult[];
  feedback?: string;
  evaluationMode?: "automatic" | "self_rubric";
  previousAttemptId?: EntityId;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  evaluatedAt?: string;
  completedAt?: string;
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
  recallResponses: RecallResponse[];
  practiceResponses: PracticeResponse[];
  teachBackResponses: Record<EntityId, TeachBackResponse>;
  scenarioResponses: Record<EntityId, ScenarioResponse>;
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
