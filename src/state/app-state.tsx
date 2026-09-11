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
import { userMutations } from "@/lib/app-data/mutations";
import {
  loadState,
  saveState,
  clearState,
  isStorageAvailable,
  type LoadOutcome,
} from "@/lib/app-data/storage";
import {
  APP_DATA_VERSION,
  type Bookmark,
  type Note,
  type PortfolioProject,
  type StudySession,
  type UserData,
  type UserSettings,
} from "@/lib/app-data/types";

interface AppActions {
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  addPortfolioProject: (project: PortfolioProject) => void;
  removePortfolioProject: (id: string) => void;
  addStudySession: (session: StudySession) => void;
  removeStudySession: (id: string) => void;
}

interface AppStateContextValue {
  user: UserData;
  hydrated: boolean;
  storageAvailable: boolean;
  loadOutcome: LoadOutcome | null;
  lastSavedAt: string | null;
  actions: AppActions;
  updateUser: (updater: (current: UserData) => UserData) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
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

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setUser((current) => userMutations.updateSettings(current, patch));
  }, []);

  const actions = useMemo<AppActions>(
    () => ({
      addNote: (note) => setUser((current) => userMutations.addNote(current, note)),
      removeNote: (id) => setUser((current) => userMutations.removeNote(current, id)),
      addBookmark: (bookmark) =>
        setUser((current) => userMutations.addBookmark(current, bookmark)),
      removeBookmark: (id) =>
        setUser((current) => userMutations.removeBookmark(current, id)),
      addPortfolioProject: (project) =>
        setUser((current) => userMutations.addPortfolioProject(current, project)),
      removePortfolioProject: (id) =>
        setUser((current) => userMutations.removePortfolioProject(current, id)),
      addStudySession: (session) =>
        setUser((current) => userMutations.addStudySession(current, session)),
      removeStudySession: (id) =>
        setUser((current) => userMutations.removeStudySession(current, id)),
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
      labsCompleted: user.labAttempts.filter((l) => l.status === "completed").length,
      quizAttempts: user.quizAttempts.length,
      studyMinutes,
      studyHours: Math.round((studyMinutes / 60) * 10) / 10,
      mistakes: user.mistakes.filter((m) => !m.resolved).length,
      reviewsDue: user.reviews.length,
      bookmarks: user.bookmarks.length,
      notes: user.notes.length,
      portfolioProjects: user.portfolio.length,
      careerTickets: user.careerScores.ticketsCompleted,
    };
  }, [user]);
}
