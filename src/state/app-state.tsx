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
import { useAuth } from "@/state/auth-state";
import { activityCount, fetchCloudState, pushCloudState } from "@/lib/cloud-sync";
import { buildMistake, type MistakeInput } from "@/lib/mistake-engine";
import { createSignal, type SignalInput } from "@/lib/learner-signals";
import { userMutations } from "@/lib/app-data/mutations";
import { clearExamDeclaration, declareExamOutcome } from "@/lib/certification-engine";
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
  readStateOwner,
  writeStateOwner,
  readStateBackup,
  writeStateBackup,
  clearStateBackup,
  type LoadOutcome,
} from "@/lib/app-data/storage";
import {
  APP_DATA_VERSION,
  type AssignmentAttempt,
  type Bookmark,
  type CertificationObjectiveOverride,
  type IncidentAttempt,
  type LabAttempt,
  type MasteryCheckAttempt,
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
  type StudyPlan,
  type TeachBackResponse,
  type TerminalAttempt,
  type TicketAttempt,
  type TopicProgress,
  type UserData,
  type UserSettings,
} from "@/lib/app-data/types";
import { allTopicScopeProgress } from "@/lib/scope-progress";

interface AppActions {
  addQuizAttempt: (attempt: QuizAttempt) => void;
  updateQuizAttempt: (attempt: QuizAttempt) => void;
  recordQuizPass: (pass: { quizId: string; topicId?: string; score: number }) => void;
  addLabAttempt: (attempt: LabAttempt) => void;
  addMasteryCheckAttempt: (attempt: MasteryCheckAttempt) => void;
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
  updatePortfolioProject: (project: PortfolioProject) => void;
  removePortfolioProject: (id: string) => void;
  addStudySession: (session: StudySession) => void;
  removeStudySession: (id: string) => void;
  addStudyPlan: (plan: StudyPlan) => void;
  updateStudyPlan: (plan: StudyPlan) => void;
  removeStudyPlan: (id: string) => void;
  addRecallResponse: (response: RecallResponse) => void;
  addLearnerSignal: (input: SignalInput) => void;
  addMistake: (mistake: Mistake) => void;
  recordMistake: (input: MistakeInput) => void;
  setMistakeResolved: (id: string, resolved: boolean) => void;
  addReview: (review: Review) => void;
  ensureReview: (input: { topicId: string; skillId?: string; sourceMistakeId?: string }) => void;
  gradeReview: (reviewId: string, outcome: ReviewOutcome) => void;
  /** Clears a due review for a topic from real answers instead of a button. */
  settleTopicReview: (topicId: string, outcome: ReviewOutcome) => void;
  rescheduleReview: (reviewId: string, days: number) => void;
  addPracticeResponse: (response: PracticeResponse) => void;
  setTeachBackResponse: (response: TeachBackResponse) => void;
  setScenarioResponse: (response: ScenarioResponse) => void;
  setTopicProgress: (progress: TopicProgress) => void;
  declareExamOutcome: (certificationId: string, outcome: "attempted" | "passed", note: string) => void;
  clearExamDeclaration: (certificationId: string) => void;
  saveCertificationObjective: (objective: CertificationObjectiveOverride) => void;
  resetCertificationObjectives: (certificationId: string) => void;
  addTerminalAttempt: (attempt: TerminalAttempt) => void;
  updateTerminalAttempt: (attempt: TerminalAttempt) => void;
  removeTerminalAttempt: (id: string) => void;
}

export type CloudStatus = "signed_out" | "syncing" | "synced" | "error";

interface AppStateContextValue {
  user: UserData;
  hydrated: boolean;
  storageAvailable: boolean;
  loadOutcome: LoadOutcome | null;
  lastSavedAt: string | null;
  cloudStatus: CloudStatus;
  cloudSyncedAt: string | null;
  cloudError: string | null;
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

  const { userId, ready: authReady } = useAuth();
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("signed_out");
  const [cloudSyncedAt, setCloudSyncedAt] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const pushedSnapshot = useRef<string>("");

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

  // Pull the account copy once per sign-in. The device cache is tagged with the
  // account that owns it: a different account never inherits it, so a new user
  // on this machine always starts from their own (empty) record.
  useEffect(() => {
    if (!hydrated || !authReady) return;
    if (!userId) {
      // Signing out clears the device cache so the next person starts clean,
      // but anything not yet confirmed saved to the account is kept as a
      // per-account safety copy and restored at the next sign-in.
      const owner = readStateOwner();
      if (owner) {
        if (pushedSnapshot.current !== JSON.stringify(user)) {
          writeStateBackup(owner, user);
        }
        clearState();
        writeStateOwner(null);
        skipNextSave.current = true;
        setUser(createDefaultUserData());
      }
      setSyncedUserId(null);
      setCloudStatus("signed_out");
      setCloudError(null);
      pushedSnapshot.current = "";
      return;
    }
    if (syncedUserId === userId) return;

    const owner = readStateOwner();
    // Cache belongs to someone else: drop it before touching the account copy.
    const foreignCache = owner !== null && owner !== userId;
    if (foreignCache) {
      clearState();
      setUser(createDefaultUserData());
    }
    const backup = readStateBackup(userId);

    let cancelled = false;
    setCloudStatus("syncing");
    void fetchCloudState(userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        // The account copy is unreachable: keep the unsaved safety copy where
        // it is so a later sign-in can still recover it.
        if (backup) setUser((local) => (activityCount(backup) > activityCount(local) ? backup : local));
        setCloudError(result.error ?? "Could not reach your account");
        setCloudStatus("error");
        return;
      }
      setUser((local) => {
        const candidates: UserData[] = [];
        if (result.found && result.user) candidates.push(result.user);
        if (backup) candidates.push(backup);
        if (!foreignCache) candidates.push(local);
        if (candidates.length === 0) return local;
        // Whichever copy holds the most recorded work wins.
        return candidates.reduce((best, item) =>
          activityCount(item) > activityCount(best) ? item : best,
        );
      });
      writeStateOwner(userId);
      pushedSnapshot.current = "";
      setCloudError(null);
      setSyncedUserId(userId);
      setCloudStatus("synced");
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, authReady, userId, syncedUserId]);

  // Back up to the account shortly after any change.
  useEffect(() => {
    if (!hydrated || !userId || syncedUserId !== userId) return;
    const snapshot = JSON.stringify(user);
    if (pushedSnapshot.current === snapshot) return;

    const timer = setTimeout(() => {
      setCloudStatus("syncing");
      void pushCloudState(userId, user).then((result) => {
        if (result.ok) {
          pushedSnapshot.current = snapshot;
          // Safely in the account now, so the local safety copy is no longer needed.
          clearStateBackup(userId);
          setCloudError(null);
          setCloudSyncedAt(new Date().toISOString());
          setCloudStatus("synced");
        } else {
          setCloudError(result.error ?? "Could not save to your account");
          setCloudStatus("error");
        }
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, hydrated, userId, syncedUserId]);

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
      recordQuizPass: (pass) =>
        setUser((current) => userMutations.recordQuizPass(current, pass)),
      addLabAttempt: (attempt) =>
        setUser((current) => userMutations.addLabAttempt(current, attempt)),
      addMasteryCheckAttempt: (attempt) =>
        setUser((current) => userMutations.addMasteryCheckAttempt(current, attempt)),
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
      updatePortfolioProject: (project) =>
        setUser((current) => userMutations.updatePortfolioProject(current, project)),
      removePortfolioProject: (id) =>
        setUser((current) => userMutations.removePortfolioProject(current, id)),
      addStudySession: (session) =>
        setUser((current) => userMutations.addStudySession(current, session)),
      removeStudySession: (id) =>
        setUser((current) => userMutations.removeStudySession(current, id)),
      addStudyPlan: (plan) => setUser((current) => userMutations.addStudyPlan(current, plan)),
      updateStudyPlan: (plan) =>
        setUser((current) => userMutations.updateStudyPlan(current, plan)),
      removeStudyPlan: (id) => setUser((current) => userMutations.removeStudyPlan(current, id)),
      addRecallResponse: (response) =>
        setUser((current) => userMutations.addRecallResponse(current, response)),
      addLearnerSignal: (input) =>
        setUser((current) => userMutations.addLearnerSignal(current, createSignal(input))),
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
            const now = Date.now();
            const due = new Date(existing.dueAt).getTime();
            // Already due: leave it exactly where it is, otherwise the same item
            // keeps being pushed back to "now" and never looks cleared.
            if (due <= now) return current;
            // Graded very recently: bring it back tomorrow rather than instantly.
            // Re-testing the same thing minutes later teaches almost nothing.
            const gradedRecently =
              existing.lastReviewedAt &&
              now - new Date(existing.lastReviewedAt).getTime() < 20 * 60 * 60 * 1000;
            const nextDue = gradedRecently ? now + 24 * 60 * 60 * 1000 : now;
            return userMutations.updateReview(current, {
              ...existing,
              dueAt: new Date(nextDue).toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          return userMutations.addReview(current, createReview(input));
        }),
      /**
       * Grades whatever review is already due for this topic straight from real
       * work, so answering well in a lesson, quiz or practice clears the review
       * without anyone having to press a button on the Review page.
       */
      settleTopicReview: (topicId, outcome) =>
        setUser((current) => {
          const now = Date.now();
          const target = current.reviews.find(
            (review) =>
              review.topicId === topicId &&
              review.status === "scheduled" &&
              new Date(review.dueAt).getTime() <= now,
          );
          if (!target) return current;
          const { review, attempt } = gradeReview(target, outcome);
          let next = userMutations.updateReview(current, review);
          if (outcome === "pass" && target.sourceMistakeId) {
            next = userMutations.setMistakeResolved(next, target.sourceMistakeId, true);
          }
          return userMutations.addReviewAttempt(next, attempt);
        }),
      gradeReview: (reviewId, outcome) =>
        setUser((current) => {
          const target = current.reviews.find((review) => review.id === reviewId);
          if (!target) return current;
          const { review, attempt } = gradeReview(target, outcome);
          let next = userMutations.updateReview(current, review);
          // A passed review that came from a mistake counts as evidence the
          // mistake is cleared, so it no longer shows as unresolved.
          if (outcome === "pass" && target.sourceMistakeId) {
            next = userMutations.setMistakeResolved(next, target.sourceMistakeId, true);
          }
          return userMutations.addReviewAttempt(next, attempt);
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
      declareExamOutcome: (certificationId, outcome, note) =>
        setUser((current) =>
          userMutations.setCertificationProgress(
            current,
            declareExamOutcome(
              current.certificationProgress[certificationId],
              certificationId,
              outcome,
              note,
            ),
          ),
        ),
      clearExamDeclaration: (certificationId) =>
        setUser((current) => {
          const progress = current.certificationProgress[certificationId];
          if (!progress) return current;
          return userMutations.setCertificationProgress(current, clearExamDeclaration(progress));
        }),
      saveCertificationObjective: (objective) =>
        setUser((current) => userMutations.setCertificationObjective(current, objective)),
      resetCertificationObjectives: (certificationId) =>
        setUser((current) =>
          userMutations.clearCertificationObjectiveEdits(current, certificationId),
        ),
      addTerminalAttempt: (attempt) =>
        setUser((current) => userMutations.addTerminalAttempt(current, attempt)),
      updateTerminalAttempt: (attempt) =>
        setUser((current) => userMutations.updateTerminalAttempt(current, attempt)),
      removeTerminalAttempt: (id) =>
        setUser((current) => userMutations.removeTerminalAttempt(current, id)),
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
      cloudStatus,
      cloudSyncedAt,
      cloudError,
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
      cloudStatus,
      cloudSyncedAt,
      cloudError,
      actions,
      updateUser,
      updateSettings,
      resetAll,
      forceSave,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppStateOptional(): AppStateContextValue | null {
  return useContext(AppStateContext);
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
    const progress = allTopicScopeProgress(user);
    const completed = progress.filter((p) => p.overall >= 70).length;
    const mastered = progress.filter((p) => p.overall >= 85).length;
    const studyMinutes = user.studySessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
    return {
      topicsCompleted: completed,
      topicsMastered: mastered,
      topicsInProgress: progress.filter((p) => p.attempted > 0 && p.overall < 70).length,
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
