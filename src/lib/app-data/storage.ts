import { REVIEW_INTERVALS } from "@/lib/review-engine";
import { createDefaultState, createDefaultUserData, defaultSettings } from "./defaults";
import { APP_DATA_VERSION, type PersistedState, type UserData } from "./types";

export const STORAGE_KEY = "itpath:state:v1";
/** Which account the cached copy on this device belongs to (null = not signed in yet). */
export const STORAGE_OWNER_KEY = "itpath:state-owner:v1";

export function readStateOwner(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_OWNER_KEY);
  } catch {
    return null;
  }
}

export function writeStateOwner(userId: string | null): void {
  try {
    if (userId) window.localStorage.setItem(STORAGE_OWNER_KEY, userId);
    else window.localStorage.removeItem(STORAGE_OWNER_KEY);
  } catch {
    /* ignore */
  }
}

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
export function sanitizeUser(raw: unknown): UserData {
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
    mistakes: arr(r.mistakes, base.mistakes).map((mistake) => ({
      ...mistake,
      activity: mistake.activity ?? (mistake.assignmentId ? "assignment" : "quiz"),
      category: mistake.category ?? "misunderstood_concept",
      severity: mistake.severity ?? "medium",
      ...(mistake.attemptId ?? mistake.quizAttemptId ?? mistake.assignmentAttemptId
        ? {
            attemptId: (mistake.attemptId ??
              mistake.quizAttemptId ??
              mistake.assignmentAttemptId) as string,
          }
        : {}),
      recommendedTopicIds: mistake.recommendedTopicIds ?? [],
      recommendedSkillIds: mistake.recommendedSkillIds ?? [],
      resolved: Boolean(mistake.resolved),
    })),
    reviews: arr(r.reviews, base.reviews).map((review) => {
      const interval = typeof review.interval === "number" ? review.interval : 1;
      const index =
        typeof review.intervalIndex === "number"
          ? review.intervalIndex
          : Math.max(0, REVIEW_INTERVALS.indexOf(interval as (typeof REVIEW_INTERVALS)[number]));
      return {
        ...review,
        interval: REVIEW_INTERVALS[Math.min(index, REVIEW_INTERVALS.length - 1)] ?? 1,
        intervalIndex: index,
        status: review.status === "mastered" ? "mastered" : "scheduled",
        successStreak: review.successStreak ?? 0,
        lapses: review.lapses ?? 0,
        totalReviews: review.totalReviews ?? 0,
        updatedAt: review.updatedAt ?? review.createdAt,
      };
    }),
    reviewAttempts: arr(r.reviewAttempts, base.reviewAttempts),
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
    portfolio: arr(r.portfolio, base.portfolio).map((project) => ({
      ...project,
      title: project.title ?? "Untitled project",
      summary: project.summary ?? "",
      problem: project.problem ?? "",
      approach: project.approach ?? "",
      skills: Array.isArray(project.skills) ? project.skills : [],
      tools: Array.isArray(project.tools) ? project.tools : [],
      result: project.result ?? project.summary ?? "",
      evidence: project.evidence ?? "",
      date: project.date ?? (project.createdAt ?? base.createdAt).slice(0, 10),
      difficulty: project.difficulty ?? "standard",
      topicIds: Array.isArray(project.topicIds) ? project.topicIds : [],
      source: project.source ?? (project.labAttemptId ? "lab" : "manual"),
      createdAt: project.createdAt ?? base.createdAt,
      updatedAt: project.updatedAt ?? project.createdAt ?? base.createdAt,
    })),
    careerScores: { ...base.careerScores, ...(r.careerScores ?? {}) },
    certificationProgress:
      r.certificationProgress &&
      typeof r.certificationProgress === "object" &&
      !Array.isArray(r.certificationProgress)
        ? Object.fromEntries(
            Object.entries(r.certificationProgress as Record<string, any>).map(([key, value]) => [
              key,
              { ...value, examRecords: Array.isArray(value?.examRecords) ? value.examRecords : [] },
            ]),
          )
        : base.certificationProgress,
    certificationObjectives:
      r.certificationObjectives &&
      typeof r.certificationObjectives === "object" &&
      !Array.isArray(r.certificationObjectives)
        ? r.certificationObjectives
        : base.certificationObjectives,
    studySessions: arr(r.studySessions, base.studySessions),
    studyPlans: arr(r.studyPlans, base.studyPlans).map((plan) => ({
      ...plan,
      targetMinutes: typeof plan.targetMinutes === "number" ? plan.targetMinutes : 60,
      status: plan.status ?? "planned",
      trackedSeconds: typeof plan.trackedSeconds === "number" ? plan.trackedSeconds : 0,
      tasks: Array.isArray(plan.tasks)
        ? plan.tasks.map((task) => ({
            ...task,
            status: task.status ?? "pending",
            trackedSeconds: typeof task.trackedSeconds === "number" ? task.trackedSeconds : 0,
            plannedMinutes: typeof task.plannedMinutes === "number" ? task.plannedMinutes : 15,
          }))
        : [],
    })),
    terminalAttempts: arr(r.terminalAttempts, base.terminalAttempts).filter(
      (attempt) =>
        attempt &&
        typeof attempt.id === "string" &&
        typeof attempt.scenarioId === "string" &&
        attempt.machine &&
        typeof attempt.machine === "object" &&
        Array.isArray(attempt.transcript),
    ),

    incidentAttempts: arr(r.incidentAttempts, base.incidentAttempts).map((attempt) => ({
      ...attempt,
      status: attempt.status === "submitted" ? "submitted" : "in_progress",
      performedActionIds: attempt.performedActionIds ?? [],
      causeGuessIds: attempt.causeGuessIds ?? [],
      verificationIds: attempt.verificationIds ?? [],
      reasoning: attempt.reasoning ?? "",
      documentation: attempt.documentation ?? "",
      updatedAt: attempt.updatedAt ?? attempt.createdAt,
    })),
    ticketAttempts: arr(r.ticketAttempts, base.ticketAttempts).map((attempt) => ({
      ...attempt,
      status: attempt.status === "submitted" ? "submitted" : "in_progress",
      performedActionIds: attempt.performedActionIds ?? [],
      diagnosisGuessIds: attempt.diagnosisGuessIds ?? [],
      resolutionIds: attempt.resolutionIds ?? [],
      verificationIds: attempt.verificationIds ?? [],
      reasoning: attempt.reasoning ?? "",
      communication: attempt.communication ?? "",
      documentation: attempt.documentation ?? "",
      updatedAt: attempt.updatedAt ?? attempt.createdAt,
    })),
    learnerSignals: arr(r.learnerSignals, base.learnerSignals).filter(
      (signal) =>
        signal && typeof signal.topicId === "string" && typeof signal.at === "string",
    ),
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
