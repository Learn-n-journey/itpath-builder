import type {
  AssignmentAttempt,
  Bookmark,
  CareerTicket,
  CertificationProgress,
  LabAttempt,
  Mistake,
  Note,
  PortfolioProject,
  QuizAttempt,
  RecallResponse,
  Review,
  PracticeResponse,
  ScenarioResponse,
  StudySession,
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
  | "notes"
  | "bookmarks"
  | "labAttempts"
  | "assignmentAttempts"
  | "careerTickets"
  | "portfolio"
  | "studySessions";

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
  removeQuizAttempt: (user: UserData, id: string) => removeById(user, "quizAttempts", id),
  addRecallResponse: (user: UserData, item: RecallResponse) => prepend(user, "recallResponses", item),
  addPracticeResponse: (user: UserData, item: PracticeResponse) => prepend(user, "practiceResponses", item),
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
  addReview: (user: UserData, item: Review) => prepend(user, "reviews", item),
  removeReview: (user: UserData, id: string) => removeById(user, "reviews", id),
  addNote: (user: UserData, item: Note) => prepend(user, "notes", item),
  removeNote: (user: UserData, id: string) => removeById(user, "notes", id),
  addBookmark: (user: UserData, item: Bookmark) => prepend(user, "bookmarks", item),
  removeBookmark: (user: UserData, id: string) => removeById(user, "bookmarks", id),
  addLabAttempt: (user: UserData, item: LabAttempt) => prepend(user, "labAttempts", item),
  removeLabAttempt: (user: UserData, id: string) => removeById(user, "labAttempts", id),
  addAssignmentAttempt: (user: UserData, item: AssignmentAttempt) => prepend(user, "assignmentAttempts", item),
  removeAssignmentAttempt: (user: UserData, id: string) => removeById(user, "assignmentAttempts", id),
  addCareerTicket: (user: UserData, item: CareerTicket) => prepend(user, "careerTickets", item),
  removeCareerTicket: (user: UserData, id: string) => removeById(user, "careerTickets", id),
  addPortfolioProject: (user: UserData, item: PortfolioProject) => prepend(user, "portfolio", item),
  removePortfolioProject: (user: UserData, id: string) => removeById(user, "portfolio", id),
  addStudySession: (user: UserData, item: StudySession) => prepend(user, "studySessions", item),
  removeStudySession: (user: UserData, id: string) => removeById(user, "studySessions", id),
  setCertificationProgress: (user: UserData, progress: CertificationProgress): UserData => ({
    ...user,
    certificationProgress: {
      ...user.certificationProgress,
      [progress.certificationId]: progress,
    },
  }),
  removeCertificationProgress: (user: UserData, certificationId: string): UserData => {
    const next = { ...user.certificationProgress };
    delete next[certificationId];
    return { ...user, certificationProgress: next };
  },
};

export type UserMutations = typeof userMutations;
