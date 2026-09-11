import {
  APP_DATA_VERSION,
  type PersistedState,
  type UserData,
  type UserSettings,
} from "./types";

export const defaultSettings: UserSettings = {
  id: "user-settings",
  studyHoursPerWeek: 8,
  studyDays: ["mon", "tue", "wed", "thu"],
  sessionLengthMinutes: 45,
  experienceLevel: "none",
  targetJob: "IT Support Specialist",
  certificationTarget: "CompTIA A+",
  difficulty: "standard",
};

/** A brand new user starts completely at zero. No fake progress, ever. */
export function createDefaultUserData(): UserData {
  return {
    createdAt: new Date().toISOString(),
    topicProgress: {},
    quizAttempts: [],
    recallResponses: [],
    practiceResponses: [],
    teachBackResponses: {},
    scenarioResponses: {},
    mistakes: [],
    reviews: [],
    notes: [],
    bookmarks: [],
    labAttempts: [],
    assignmentAttempts: [],
    careerTickets: [],
    portfolio: [],
    careerScores: {
      ticketsCompleted: 0,
      communication: 0,
      troubleshooting: 0,
      documentation: 0,
    },
    certificationProgress: {},
    studySessions: [],
    settings: { ...defaultSettings },
  };
}

export function createDefaultState(): PersistedState {
  return { version: APP_DATA_VERSION, user: createDefaultUserData() };
}
