/** Strongly typed IT PATH application data. Static content and user records stay separate. */
export const APP_DATA_VERSION = 9;

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
  | "explain"
  | "recall"
  | "configure"
  | "build"
  | "compare"
  | "scenario"
  | "incident"
  | "troubleshoot"
  | "design"
  | "teach_back"
  | "command_challenge"
  | "exam_simulation"
  | "capstone";

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
  category: "hardware" | "windows" | "networking" | "linux" | "powershell" | "bash" | "dns" | "security" | "cloud";
  prerequisites: string[];
  difficulty: Difficulty;
  estimatedMinutes: number;
  environment: string;
  instructions: string[];
  expectedResult: string;
  checklist: LabChecklistItem[];
  reflectionPrompt: string;
  masteryScore: number;
}

export interface LabChecklistItem {
  id: EntityId;
  label: string;
  points: number;
}

export interface Quiz {
  id: EntityId;
  title: string;
  description: string;
  topicIds: EntityId[];
  questionIds: EntityId[];
}

export type QuestionType =
  | "multiple_choice"
  | "multiple_response"
  | "scenario"
  | "troubleshooting"
  | "short_answer"
  | "command";

export type MistakeCategory =
  | "concept"
  | "terminology"
  | "diagnosis"
  | "procedure"
  | "command_syntax"
  | "professional_judgment";

export interface Question {
  id: EntityId;
  topicId: EntityId;
  quizId: EntityId;
  certificationId: EntityId;
  type: QuestionType;
  prompt: string;
  choices: string[];
  correctAnswer: string[];
  acceptableAnswers: string[];
  explanation: string;
  difficulty: Difficulty;
  mistakeCategory: MistakeCategory;
  requiresReasoning: boolean;
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
  status: "in_progress" | "submitted";
  questionOrder: EntityId[];
  choiceOrder: Record<EntityId, string[]>;
  responses: Record<EntityId, string[]>;
  results: QuizQuestionResult[];
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  weakTopicIds: EntityId[];
  mistakeCategories: MistakeCategory[];
  recommendedTopicIds: EntityId[];
  previousAttemptId?: EntityId;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface QuizQuestionResult {
  questionId: EntityId;
  topicId: EntityId;
  correct: boolean;
  response: string[];
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

/** Why the learner got it wrong. Recorded per mistake, never inferred later. */
export type MistakeCause =
  | "didnt_know_fact"
  | "misunderstood_concept"
  | "misread_question"
  | "rushed"
  | "confused_concepts"
  | "scenario_recognition_failure"
  | "command_knowledge_gap"
  | "reasoning_error"
  | "prerequisite_gap";

export type MistakeActivity =
  | "quiz"
  | "recall"
  | "practice"
  | "assignment"
  | "lab"
  | "scenario"
  | "troubleshoot";

export type MistakeSeverity = "low" | "medium" | "high";

export interface Mistake {
  id: EntityId;
  questionId?: EntityId;
  assignmentId?: EntityId;
  assignmentAttemptId?: EntityId;
  topicId: EntityId;
  skillId?: EntityId;
  quizAttemptId?: EntityId;
  /** Where the mistake happened. */
  activity: MistakeActivity;
  /** Identifier of the attempt the mistake belongs to, when the activity has attempts. */
  attemptId?: EntityId;
  category: MistakeCause;
  severity: MistakeSeverity;
  /** Curriculum topics the recommendation engine suggests reviewing first. */
  recommendedTopicIds: EntityId[];
  /** Prerequisite skills to shore up, including ones without a topic yet. */
  recommendedSkillIds: EntityId[];
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export type ReviewStatus = "scheduled" | "mastered";
export type ReviewOutcome = "pass" | "fail";

export interface Review {
  id: EntityId;
  topicId: EntityId;
  /** Prerequisite skill the review targets, when the schedule came from a skill gap. */
  skillId?: EntityId;
  /** Mistake that caused this review to be scheduled. */
  sourceMistakeId?: EntityId;
  dueAt: string;
  /** Current spacing in days: one of the fixed 1/3/7/14/30/60/90 steps. */
  interval: number;
  /** Index into the fixed interval ladder. */
  intervalIndex: number;
  status: ReviewStatus;
  successStreak: number;
  lapses: number;
  totalReviews: number;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Immutable record of one graded review. Opening a review never creates one. */
export interface ReviewAttempt {
  id: EntityId;
  reviewId: EntityId;
  topicId: EntityId;
  outcome: ReviewOutcome;
  intervalBefore: number;
  intervalAfter: number;
  dueBefore: string;
  dueAfter: string;
  /** True when the item was already past due when it was graded. */
  wasOverdue: boolean;
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
  labId?: EntityId;
  labAttemptId?: EntityId;
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
  labId?: EntityId;
  labAttemptId?: EntityId;
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
  labId?: EntityId;
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
  topicId: EntityId;
  status: "in_progress" | "completed" | "needs_review" | "mastered";
  checklist: Record<EntityId, boolean>;
  reflection: string;
  score: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  masteredAt?: string;
  portfolioProjectId?: EntityId;
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
  reviewAttempts: ReviewAttempt[];
  notes: Note[];
  bookmarks: Bookmark[];
  labAttempts: LabAttempt[];
  assignmentAttempts: AssignmentAttempt[];
  careerTickets: CareerTicket[];
  portfolio: PortfolioProject[];
  careerScores: CareerScores;
  certificationProgress: Record<EntityId, CertificationProgress>;
  studySessions: StudySession[];
  incidentAttempts: IncidentAttempt[];
  settings: UserSettings;
}

export type IncidentCategory =
  | "hardware"
  | "windows"
  | "networking"
  | "dns"
  | "dhcp"
  | "linux"
  | "security"
  | "cloud"
  | "authentication";

/** One diagnostic step a learner may run. Every action returns its own real finding. */
export interface IncidentAction {
  id: EntityId;
  label: string;
  command?: string;
  /** What the learner observes after running this step. */
  finding: string;
  /** True when the step materially advances the diagnosis for this incident. */
  informative: boolean;
}

export interface IncidentOption {
  id: EntityId;
  label: string;
  correct: boolean;
  /** Shown after a wrong choice: narrows the search without revealing the answer. */
  hint?: string;
}

export interface Incident {
  id: EntityId;
  topicId: EntityId;
  category: IncidentCategory;
  title: string;
  /** The report as it reaches the technician. */
  report: string;
  environment: string;
  difficulty: Difficulty;
  actions: IncidentAction[];
  /** Steps that must be run to justify a diagnosis. */
  keyActionIds: EntityId[];
  /** Fewest sensible steps for a clean, efficient diagnosis. */
  efficientActionCount: number;
  causes: IncidentOption[];
  fixes: IncidentOption[];
  verifications: IncidentOption[];
  reasoningKeywords: string[];
  documentationKeywords: string[];
  /** Explanation released only after the learner submits their own conclusion. */
  rootCause: string;
}

export interface IncidentScores {
  diagnosticChoices: number;
  technicalAccuracy: number;
  reasoning: number;
  efficiency: number;
  verification: number;
  documentation: number;
}

export interface IncidentAttempt {
  id: EntityId;
  incidentId: EntityId;
  topicId: EntityId;
  status: "in_progress" | "submitted";
  /** Diagnostic steps in the order they were run. */
  performedActionIds: EntityId[];
  /** Every cause selection made, in order. Wrong guesses are kept. */
  causeGuessIds: EntityId[];
  selectedCauseId?: EntityId;
  reasoning: string;
  selectedFixId?: EntityId;
  verificationIds: EntityId[];
  documentation: string;
  scores?: IncidentScores;
  totalScore?: number;
  previousAttemptId?: EntityId;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface PersistedState {
  version: number;
  user: UserData;
}
