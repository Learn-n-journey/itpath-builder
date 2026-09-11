import type {
  AssignmentAttempt,
  Bookmark,
  CareerTicket,
  CertificationObjectiveOverride,
  CertificationProgress,
  IncidentAttempt,
  LabAttempt,
  Mistake,
  Note,
  PortfolioProject,
  QuizAttempt,
  RecallResponse,
  Review,
  ReviewAttempt,
  PracticeResponse,
  ScenarioResponse,
  StudySession,
  TicketAttempt,
  TeachBackResponse,
  TopicProgress,
  UserData,
  UserSettings,
} from "./types";

type UserCollectionKey =
  | "quizAttempts"
  | "recallResponses"
  | "practiceResponses"
  | "mistakes"
  | "reviews"
  | "reviewAttempts"
  | "notes"
  | "bookmarks"
  | "labAttempts"
  | "assignmentAttempts"
  | "careerTickets"
  | "portfolio"
  | "studySessions"
  | "incidentAttempts"
  | "ticketAttempts";

function prepend<T>(user: UserData, key: UserCollectionKey, item: T): UserData {
  return { ...user, [key]: [item, ...user[key]] };
}

function removeById(user: UserData, key: UserCollectionKey, id: string): UserData {
  return { ...user, [key]: user[key].filter((item) => item.id !== id) };
}

export const userMutations = {
  updateSettings: (user: UserData, patch: Partial<Omit<UserSettings, "id">>): UserData => ({
    ...user,
    settings: { ...user.settings, ...patch },
  }),
  setTopicProgress: (user: UserData, progress: TopicProgress): UserData => ({
    ...user,
    topicProgress: { ...user.topicProgress, [progress.topicId]: progress },
  }),
  removeTopicProgress: (user: UserData, topicId: string): UserData => {
    const next = { ...user.topicProgress };
    delete next[topicId];
    return { ...user, topicProgress: next };
  },
  addQuizAttempt: (user: UserData, item: QuizAttempt) => prepend(user, "quizAttempts", item),
  updateQuizAttempt: (user: UserData, item: QuizAttempt): UserData => ({
    ...user,
    quizAttempts: user.quizAttempts.map((attempt) =>
      attempt.id === item.id ? item : attempt,
    ),
  }),
  removeQuizAttempt: (user: UserData, id: string) => removeById(user, "quizAttempts", id),
  addRecallResponse: (user: UserData, item: RecallResponse) =>
    prepend(user, "recallResponses", item),
  addPracticeResponse: (user: UserData, item: PracticeResponse) =>
    prepend(user, "practiceResponses", item),
  setTeachBackResponse: (user: UserData, item: TeachBackResponse): UserData => ({
    ...user,
    teachBackResponses: { ...user.teachBackResponses, [item.topicId]: item },
  }),
  setScenarioResponse: (user: UserData, item: ScenarioResponse): UserData => ({
    ...user,
    scenarioResponses: { ...user.scenarioResponses, [item.topicId]: item },
  }),
  updateNote: (user: UserData, item: Note): UserData => ({
    ...user,
    notes: user.notes.map((note) => (note.id === item.id ? item : note)),
  }),
  addMistake: (user: UserData, item: Mistake) => prepend(user, "mistakes", item),
  removeMistake: (user: UserData, id: string) => removeById(user, "mistakes", id),
  setMistakeResolved: (user: UserData, id: string, resolved: boolean): UserData => ({
    ...user,
    mistakes: user.mistakes.map((mistake) =>
      mistake.id === id
        ? (() => {
            const { resolvedAt: _previous, ...rest } = mistake;
            return resolved
              ? { ...rest, resolved, resolvedAt: new Date().toISOString() }
              : { ...rest, resolved };
          })()
        : mistake,
    ),
  }),
  addReview: (user: UserData, item: Review) => prepend(user, "reviews", item),
  updateReview: (user: UserData, item: Review): UserData => ({
    ...user,
    reviews: user.reviews.map((review) => (review.id === item.id ? item : review)),
  }),
  addReviewAttempt: (user: UserData, item: ReviewAttempt) =>
    prepend(user, "reviewAttempts", item),
  removeReview: (user: UserData, id: string) => removeById(user, "reviews", id),
  addNote: (user: UserData, item: Note) => prepend(user, "notes", item),
  removeNote: (user: UserData, id: string) => removeById(user, "notes", id),
  addBookmark: (user: UserData, item: Bookmark) => prepend(user, "bookmarks", item),
  removeBookmark: (user: UserData, id: string) => removeById(user, "bookmarks", id),
  addLabAttempt: (user: UserData, item: LabAttempt) => prepend(user, "labAttempts", item),
  updateLabAttempt: (user: UserData, item: LabAttempt): UserData => ({
    ...user,
    labAttempts: user.labAttempts.map((attempt) => (attempt.id === item.id ? item : attempt)),
  }),
  removeLabAttempt: (user: UserData, id: string) => removeById(user, "labAttempts", id),
  addAssignmentAttempt: (user: UserData, item: AssignmentAttempt) =>
    prepend(user, "assignmentAttempts", item),
  updateAssignmentAttempt: (user: UserData, item: AssignmentAttempt): UserData => ({
    ...user,
    assignmentAttempts: user.assignmentAttempts.map((attempt) =>
      attempt.id === item.id ? item : attempt,
    ),
  }),
  removeAssignmentAttempt: (user: UserData, id: string) =>
    removeById(user, "assignmentAttempts", id),
  addCareerTicket: (user: UserData, item: CareerTicket) => prepend(user, "careerTickets", item),
  removeCareerTicket: (user: UserData, id: string) => removeById(user, "careerTickets", id),
  addPortfolioProject: (user: UserData, item: PortfolioProject) => prepend(user, "portfolio", item),
  removePortfolioProject: (user: UserData, id: string) => removeById(user, "portfolio", id),
  addIncidentAttempt: (user: UserData, item: IncidentAttempt) =>
    prepend(user, "incidentAttempts", item),
  updateIncidentAttempt: (user: UserData, item: IncidentAttempt): UserData => ({
    ...user,
    incidentAttempts: user.incidentAttempts.map((attempt) =>
      attempt.id === item.id ? item : attempt,
    ),
  }),
  removeIncidentAttempt: (user: UserData, id: string) => removeById(user, "incidentAttempts", id),
  addTicketAttempt: (user: UserData, item: TicketAttempt) => prepend(user, "ticketAttempts", item),
  updateTicketAttempt: (user: UserData, item: TicketAttempt): UserData => ({
    ...user,
    ticketAttempts: user.ticketAttempts.map((attempt) =>
      attempt.id === item.id ? item : attempt,
    ),
  }),
  removeTicketAttempt: (user: UserData, id: string) => removeById(user, "ticketAttempts", id),
  addStudySession: (user: UserData, item: StudySession) => prepend(user, "studySessions", item),
  removeStudySession: (user: UserData, id: string) => removeById(user, "studySessions", id),
  addStudyPlan: (user: UserData, item: StudyPlan) => prepend(user, "studyPlans", item),
  updateStudyPlan: (user: UserData, item: StudyPlan): UserData => ({
    ...user,
    studyPlans: user.studyPlans.map((plan) => (plan.id === item.id ? item : plan)),
  }),
  removeStudyPlan: (user: UserData, id: string) => removeById(user, "studyPlans", id),

  setCertificationProgress: (user: UserData, progress: CertificationProgress): UserData => ({
    ...user,
    certificationProgress: {
      ...user.certificationProgress,
      [progress.certificationId]: progress,
    },
  }),
  setCertificationObjective: (
    user: UserData,
    objective: CertificationObjectiveOverride,
  ): UserData => ({
    ...user,
    certificationObjectives: { ...user.certificationObjectives, [objective.id]: objective },
  }),
  clearCertificationObjectiveEdits: (user: UserData, certificationId: string): UserData => ({
    ...user,
    certificationObjectives: Object.fromEntries(
      Object.entries(user.certificationObjectives).filter(
        ([, value]) => value.certificationId !== certificationId,
      ),
    ),
  }),
  removeCertificationProgress: (user: UserData, certificationId: string): UserData => {
    const next = { ...user.certificationProgress };
    delete next[certificationId];
    return { ...user, certificationProgress: next };
  },
};

export type UserMutations = typeof userMutations;
