import { createDefaultState, createDefaultUserData, defaultSettings } from "./defaults";
import { APP_DATA_VERSION, type PersistedState, type UserData } from "./types";

export const STORAGE_KEY = "itpath:state:v1";

export type LoadOutcome = "fresh" | "loaded" | "recovered" | "migrated" | "unavailable";

export interface LoadResult {
  state: PersistedState;
  outcome: LoadOutcome;
}

export function isStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const probe = "__itpath_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Fills in anything missing/corrupted on a persisted user object. */
function sanitizeUser(raw: unknown): UserData {
  const base = createDefaultUserData();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<UserData>;
  const arr = <T>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);

  return {
    createdAt: typeof r.createdAt === "string" ? r.createdAt : base.createdAt,
    topicProgress:
      r.topicProgress && typeof r.topicProgress === "object" && !Array.isArray(r.topicProgress)
        ? Object.fromEntries(
            Object.entries(r.topicProgress).map(([topicId, value]) => {
              const progress = value && typeof value === "object" ? value : {};
              return [
                topicId,
                {
                  id: `progress-${topicId}`,
                  topicId,
                  status: "not_started",
                  understanding: 0,
                  recall: 0,
                  application: 0,
                  practicalAbility: 0,
                  troubleshooting: 0,
                  retention: 0,
                  updatedAt: base.createdAt,
                  ...progress,
                },
              ];
            }),
          )
        : base.topicProgress,
    quizAttempts: arr(r.quizAttempts, base.quizAttempts).map((attempt) => {
      const legacy = !attempt.status;
      const legacyCorrect = legacy ? attempt.score ?? 0 : attempt.correct ?? 0;
      const total = attempt.total ?? 0;
      return {
        ...attempt,
        status: legacy || attempt.status === "submitted" ? "submitted" : "in_progress",
        questionOrder: attempt.questionOrder ?? [],
        choiceOrder: attempt.choiceOrder ?? {},
        responses: attempt.responses ?? {},
        results: attempt.results ?? [],
        score: legacy && total > 0 ? Math.round((legacyCorrect / total) * 100) : attempt.score ?? 0,
        total,
        correct: legacyCorrect,
        incorrect: attempt.incorrect ?? Math.max(0, total - legacyCorrect),
        weakTopicIds: attempt.weakTopicIds ?? [],
        mistakeCategories: attempt.mistakeCategories ?? [],
        recommendedTopicIds: attempt.recommendedTopicIds ?? [],
        updatedAt: attempt.updatedAt ?? attempt.createdAt,
      };
    }),
    recallResponses: arr(r.recallResponses, base.recallResponses),
    practiceResponses: arr(r.practiceResponses, base.practiceResponses),
    teachBackResponses:
      r.teachBackResponses &&
      typeof r.teachBackResponses === "object" &&
      !Array.isArray(r.teachBackResponses)
        ? r.teachBackResponses
        : base.teachBackResponses,
    scenarioResponses:
      r.scenarioResponses &&
      typeof r.scenarioResponses === "object" &&
      !Array.isArray(r.scenarioResponses)
        ? r.scenarioResponses
        : base.scenarioResponses,
    mistakes: arr(r.mistakes, base.mistakes),
    reviews: arr(r.reviews, base.reviews),
    notes: arr(r.notes, base.notes),
    bookmarks: arr(r.bookmarks, base.bookmarks),
    labAttempts: arr(r.labAttempts, base.labAttempts).map((attempt) => ({
      ...attempt,
      status:
        attempt.status === "completed"
          ? "completed"
          : attempt.status === "mastered" || attempt.status === "needs_review"
            ? attempt.status
            : "in_progress",
      topicId: attempt.topicId ?? "",
      checklist: attempt.checklist ?? {},
      reflection: attempt.reflection ?? "",
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore ?? 100,
      updatedAt: attempt.updatedAt ?? attempt.createdAt,
    })),
    assignmentAttempts: arr(r.assignmentAttempts, base.assignmentAttempts).map((attempt) => ({
      ...attempt,
      responses: attempt.responses ?? {},
      criterionResults: attempt.criterionResults ?? [],
      updatedAt: attempt.updatedAt ?? attempt.createdAt,
    })),
    careerTickets: arr(r.careerTickets, base.careerTickets),
    portfolio: arr(r.portfolio, base.portfolio),
    careerScores: { ...base.careerScores, ...(r.careerScores ?? {}) },
    certificationProgress:
      r.certificationProgress &&
      typeof r.certificationProgress === "object" &&
      !Array.isArray(r.certificationProgress)
        ? r.certificationProgress
        : base.certificationProgress,
    studySessions: arr(r.studySessions, base.studySessions),
    settings: {
      ...defaultSettings,
      ...(r.settings ?? {}),
      studyDays: Array.isArray(r.settings?.studyDays)
        ? r.settings.studyDays
        : defaultSettings.studyDays,
    },
  };
}

export function loadState(): LoadResult {
  if (!isStorageAvailable()) {
    return { state: createDefaultState(), outcome: "unavailable" };
  }
  let rawText: string | null = null;
  try {
    rawText = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: createDefaultState(), outcome: "unavailable" };
  }
  if (!rawText) return { state: createDefaultState(), outcome: "fresh" };

  try {
    const parsed = JSON.parse(rawText) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    const version = typeof parsed.version === "number" ? parsed.version : 0;
    const user = sanitizeUser(parsed.user);
    return {
      state: { version: APP_DATA_VERSION, user },
      outcome: version === APP_DATA_VERSION ? "loaded" : "migrated",
    };
  } catch {
    // Corrupted payload: never crash the app, start clean instead.
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:corrupt-backup`, rawText);
    } catch {
      /* ignore */
    }
    return { state: createDefaultState(), outcome: "recovered" };
  }
}

export function saveState(state: PersistedState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
