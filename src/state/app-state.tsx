import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createDefaultUserData } from "@/lib/app-data/defaults";
import { buildMistake, type MistakeInput } from "@/lib/mistake-engine";
import { userMutations } from "@/lib/app-data/mutations";
import {
  createReview,
  findScheduledReview,
  gradeReview,
  rescheduleReview,
} from "@/lib/review-engine";
import {
  loadState,
  saveState,
  clearState,
  isStorageAvailable,
  type LoadOutcome,
} from "@/lib/app-data/storage";
import {
  APP_DATA_VERSION,
  type AssignmentAttempt,
  type Bookmark,
  type IncidentAttempt,
  type LabAttempt,
  type Note,
  type Mistake,
  type PracticeResponse,
  type PortfolioProject,
  type QuizAttempt,
  type RecallResponse,
  type Review,
  type ReviewOutcome,
  type ScenarioResponse,
  type StudySession,
  type TeachBackResponse,
  type TicketAttempt,
  type TopicProgress,
  type UserData,
  type UserSettings,
} from "@/lib/app-data/types";

interface AppActions {
  addQuizAttempt: (attempt: QuizAttempt) => void;
  updateQuizAttempt: (attempt: QuizAttempt) => void;
  addLabAttempt: (attempt: LabAttempt) => void;
  updateLabAttempt: (attempt: LabAttempt) => void;
  addIncidentAttempt: (attempt: IncidentAttempt) => void;
  updateIncidentAttempt: (attempt: IncidentAttempt) => void;
  addTicketAttempt: (attempt: TicketAttempt) => void;
  updateTicketAttempt: (attempt: TicketAttempt) => void;
  addAssignmentAttempt: (attempt: AssignmentAttempt) => void;
  updateAssignmentAttempt: (attempt: AssignmentAttempt) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  removeNote: (id: string) => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  addPortfolioProject: (project: PortfolioProject) => void;
  removePortfolioProject: (id: string) => void;
  addStudySession: (session: StudySession) => void;
  removeStudySession: (id: string) => void;
  addRecallResponse: (response: RecallResponse) => void;
  addMistake: (mistake: Mistake) => void;
  recordMistake: (input: MistakeInput) => void;
  setMistakeResolved: (id: string, resolved: boolean) => void;
  addReview: (review: Review) => void;
  ensureReview: (input: { topicId: string; skillId?: string; sourceMistakeId?: string }) => void;
  gradeReview: (reviewId: string, outcome: ReviewOutcome) => void;
  rescheduleReview: (reviewId: string, days: number) => void;
  addPracticeResponse: (response: PracticeResponse) => void;
  setTeachBackResponse: (response: TeachBackResponse) => void;
  setScenarioResponse: (response: ScenarioResponse) => void;
  setTopicProgress: (progress: TopicProgress) => void;
}

interface AppStateContextValue {
  user: UserData;
  hydrated: boolean;
  storageAvailable: boolean;
  loadOutcome: LoadOutcome | null;
  lastSavedAt: string | null;
  actions: AppActions;
  updateUser: (updater: (current: UserData) => UserData) => void;
  updateSettings: (patch: Partial<Omit<UserSettings, "id">>) => void;
  resetAll: () => void;
  forceSave: () => boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData>(() => createDefaultUserData());
  const [hydrated, setHydrated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(false);
  const [loadOutcome, setLoadOutcome] = useState<LoadOutcome | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const skipNextSave = useRef(true);

  // Hydrate after mount so server and client render the same initial markup.
  useEffect(() => {
    const { state, outcome } = loadState();
    setUser(state.user);
    setLoadOutcome(outcome);
    setStorageAvailable(isStorageAvailable());
    setHydrated(true);
  }, []);

  // Auto-save on every change once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveState({ version: APP_DATA_VERSION, user })) {
      setLastSavedAt(new Date().toISOString());
    }
  }, [user, hydrated]);

  const updateUser = useCallback((updater: (current: UserData) => UserData) => {
    setUser((current) => updater(current));
  }, []);

  const updateSettings = useCallback((patch: Partial<Omit<UserSettings, "id">>) => {
    setUser((current) => userMutations.updateSettings(current, patch));
  }, []);

  const actions = useMemo<AppActions>(
    () => ({
      addQuizAttempt: (attempt) =>
        setUser((current) => userMutations.addQuizAttempt(current, attempt)),
      updateQuizAttempt: (attempt) =>
        setUser((current) => userMutations.updateQuizAttempt(current, attempt)),
      addLabAttempt: (attempt) =>
        setUser((current) => userMutations.addLabAttempt(current, attempt)),
      updateLabAttempt: (attempt) =>
        setUser((current) => userMutations.updateLabAttempt(current, attempt)),
      addIncidentAttempt: (attempt) =>
        setUser((current) => userMutations.addIncidentAttempt(current, attempt)),
      updateIncidentAttempt: (attempt) =>
        setUser((current) => userMutations.updateIncidentAttempt(current, attempt)),
      addTicketAttempt: (attempt) =>
        setUser((current) => userMutations.addTicketAttempt(current, attempt)),
      updateTicketAttempt: (attempt) =>
        setUser((current) => userMutations.updateTicketAttempt(current, attempt)),
      addAssignmentAttempt: (attempt) =>
        setUser((current) => userMutations.addAssignmentAttempt(current, attempt)),
      updateAssignmentAttempt: (attempt) =>
        setUser((current) => userMutations.updateAssignmentAttempt(current, attempt)),
      addNote: (note) => setUser((current) => userMutations.addNote(current, note)),
      updateNote: (note) => setUser((current) => userMutations.updateNote(current, note)),
      removeNote: (id) => setUser((current) => userMutations.removeNote(current, id)),
      addBookmark: (bookmark) => setUser((current) => userMutations.addBookmark(current, bookmark)),
      removeBookmark: (id) => setUser((current) => userMutations.removeBookmark(current, id)),
      addPortfolioProject: (project) =>
        setUser((current) => userMutations.addPortfolioProject(current, project)),
      removePortfolioProject: (id) =>
        setUser((current) => userMutations.removePortfolioProject(current, id)),
      addStudySession: (session) =>
        setUser((current) => userMutations.addStudySession(current, session)),
      removeStudySession: (id) =>
        setUser((current) => userMutations.removeStudySession(current, id)),
      addRecallResponse: (response) =>
        setUser((current) => userMutations.addRecallResponse(current, response)),
      addMistake: (mistake) => setUser((current) => userMutations.addMistake(current, mistake)),
      recordMistake: (input) =>
        setUser((current) => userMutations.addMistake(current, buildMistake(current, input))),
      setMistakeResolved: (id, resolved) =>
        setUser((current) => userMutations.setMistakeResolved(current, id, resolved)),
      addReview: (review) => setUser((current) => userMutations.addReview(current, review)),
      ensureReview: (input) =>
        setUser((current) => {
          const existing = findScheduledReview(current, input.topicId);
          if (existing) {
            // Already scheduled: pull it forward instead of creating a duplicate.
            return userMutations.updateReview(current, {
              ...existing,
              dueAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          return userMutations.addReview(current, createReview(input));
        }),
      gradeReview: (reviewId, outcome) =>
        setUser((current) => {
          const target = current.reviews.find((review) => review.id === reviewId);
          if (!target) return current;
          const { review, attempt } = gradeReview(target, outcome);
          return userMutations.addReviewAttempt(
            userMutations.updateReview(current, review),
            attempt,
          );
        }),
      rescheduleReview: (reviewId, days) =>
        setUser((current) => {
          const target = current.reviews.find((review) => review.id === reviewId);
          if (!target) return current;
          return userMutations.updateReview(current, rescheduleReview(target, days));
        }),
      addPracticeResponse: (response) =>
        setUser((current) => userMutations.addPracticeResponse(current, response)),
      setTeachBackResponse: (response) =>
        setUser((current) => userMutations.setTeachBackResponse(current, response)),
      setScenarioResponse: (response) =>
        setUser((current) => userMutations.setScenarioResponse(current, response)),
      setTopicProgress: (progress) =>
        setUser((current) => userMutations.setTopicProgress(current, progress)),
    }),
    [],
  );

  const resetAll = useCallback(() => {
    clearState();
    skipNextSave.current = false;
    setUser(createDefaultUserData());
  }, []);

  const forceSave = useCallback(() => {
    const ok = saveState({ version: APP_DATA_VERSION, user });
    if (ok) setLastSavedAt(new Date().toISOString());
    return ok;
  }, [user]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      user,
      hydrated,
      storageAvailable,
      loadOutcome,
      lastSavedAt,
      actions,
      updateUser,
      updateSettings,
      resetAll,
      forceSave,
    }),
    [
      user,
      hydrated,
      storageAvailable,
      loadOutcome,
      lastSavedAt,
      actions,
      updateUser,
      updateSettings,
      resetAll,
      forceSave,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}

/** Derived, always-truthful counters. Zero until the user actually does work. */
export function useStats() {
  const { user } = useAppState();
  return useMemo(() => {
    const progress = Object.values(user.topicProgress);
    const completed = progress.filter(
      (p) => p.status === "completed" || p.status === "mastered",
    ).length;
    const mastered = progress.filter((p) => p.status === "mastered").length;
    const studyMinutes = user.studySessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
    return {
      topicsCompleted: completed,
      topicsMastered: mastered,
      topicsInProgress: progress.filter((p) => p.status === "in_progress").length,
      assignmentsCompleted: user.assignmentAttempts.filter((a) => a.status === "completed").length,
      labsCompleted: user.labAttempts.filter(
        (l) => l.status === "completed" || l.status === "mastered",
      ).length,
      quizAttempts: user.quizAttempts.length,
      studyMinutes,
      studyHours: Math.round((studyMinutes / 60) * 10) / 10,
      mistakes: user.mistakes.filter((m) => !m.resolved).length,
      reviewsDue: user.reviews.filter(
        (review) => review.status === "scheduled" && new Date(review.dueAt).getTime() <= Date.now(),
      ).length,
      reviewsScheduled: user.reviews.length,
      reviewAttempts: user.reviewAttempts.length,
      bookmarks: user.bookmarks.length,
      notes: user.notes.length,
      portfolioProjects: user.portfolio.length,
      careerTickets: user.ticketAttempts.filter((t) => t.passed).length,
    };
  }, [user]);
}
