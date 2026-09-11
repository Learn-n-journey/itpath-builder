import { useRouter } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { navItems } from "@/config/navigation";
import { staticContent } from "@/data/static-content";
import { createDefaultUserData } from "@/lib/app-data/defaults";
import { userMutations } from "@/lib/app-data/mutations";
import {
  getAssignment,
  getCertification,
  getLab,
  getLesson,
  getQuiz,
  getResource,
  getTopic,
  getTopicProgress,
} from "@/lib/app-data/selectors";
import { loadState, saveState, STORAGE_KEY } from "@/lib/app-data/storage";
import { APP_DATA_VERSION } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

export function SystemDiagnostics() {
  const router = useRouter();
  const { user, hydrated, forceSave } = useAppState();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);

  function run() {
    const results: Check[] = [];

    results.push({
      name: "Application loads",
      pass: typeof document !== "undefined" && Boolean(document.getElementById("__diagnostics-anchor")),
      detail: "The application is mounted and rendering in the browser.",
    });

    const routePaths = new Set(Object.keys(router.routesByPath ?? {}));
    const missing = navItems.filter((item) => !routePaths.has(item.to)).map((item) => item.to);
    results.push({
      name: "Navigation works",
      pass: missing.length === 0 && routePaths.size > 1,
      detail:
        missing.length === 0
          ? `All ${navItems.length} navigation items resolve to a real page.`
          : `Missing pages: ${missing.join(", ")}`,
    });

    const initialized = createDefaultUserData();
    const initializationOk =
      initialized.settings.id === "user-settings" &&
      Object.keys(initialized.topicProgress).length === 0 &&
      initialized.quizAttempts.length === 0 &&
      initialized.recallResponses.length === 0 &&
      initialized.practiceResponses.length === 0 &&
      Object.keys(initialized.teachBackResponses).length === 0 &&
      Object.keys(initialized.scenarioResponses).length === 0 &&
      initialized.mistakes.length === 0 &&
      initialized.reviews.length === 0 &&
      initialized.careerTickets.length === 0 &&
      initialized.portfolio.length === 0 &&
      Object.keys(initialized.certificationProgress).length === 0 &&
      initialized.studySessions.length === 0;
    results.push({
      name: "Data initialization",
      pass: initializationOk,
      detail: initializationOk
        ? "The complete user-data shape initializes with an honest zero state."
        : "The initial user-data shape or zero state is invalid.",
    });

    const fixture = {
      ...staticContent,
      topics: [{ id: "diag-topic", trackId: "diag-track", title: "Test", summary: "", certificationId: "diag-certification", year: 1 as const, month: 1, week: 1, difficulty: "gentle" as const, prerequisiteTopicIds: [], learningObjectives: [], estimatedMinutes: 1 }],
      lessons: [{ id: "diag-lesson", topicId: "diag-topic", title: "Test", body: "", definition: "", whyItMatters: "", keyTerms: [], realWorldExamples: [], commonMisconceptions: [], summary: "", nextSteps: [] }],
      resources: [{ id: "diag-resource", topicId: "diag-topic", title: "Test", url: "https://example.com", kind: "docs" as const }],
      assignments: [{ id: "diag-assignment", topicId: "diag-topic", title: "Test", brief: "" }],
      labs: [{ id: "diag-lab", topicId: "diag-topic", title: "Test", objective: "" }],
      quizzes: [{ id: "diag-quiz", topicId: "diag-topic", title: "Test", questionIds: [] }],
      certifications: [{ id: "diag-certification", title: "Test", provider: "Test", objectiveIds: [] }],
    };
    const retrievalOk =
      getTopic("diag-topic", fixture)?.id === "diag-topic" &&
      getLesson("diag-lesson", fixture)?.topicId === "diag-topic" &&
      getResource("diag-resource", fixture)?.topicId === "diag-topic" &&
      getAssignment("diag-assignment", fixture)?.topicId === "diag-topic" &&
      getLab("diag-lab", fixture)?.topicId === "diag-topic" &&
      getQuiz("diag-quiz", fixture)?.topicId === "diag-topic" &&
      getCertification("diag-certification", fixture)?.id === "diag-certification";
    results.push({
      name: "Data retrieval",
      pass: retrievalOk,
      detail: retrievalOk
        ? "Every centralized static-data lookup returned the expected ID relationship."
        : "One or more centralized static-data lookups returned the wrong record.",
    });

    const mutationFixture = userMutations.setTopicProgress(initialized, {
      id: "diag-progress",
      topicId: "diag-topic",
      status: "in_progress",
      understanding: 0,
      recall: 0,
      application: 0,
      practicalAbility: 0,
      troubleshooting: 0,
      retention: 0,
      updatedAt: new Date().toISOString(),
    });
    const mutationOk =
      getTopicProgress(mutationFixture, "diag-topic")?.id === "diag-progress" &&
      getTopicProgress(initialized, "diag-topic") === undefined;
    results.push({
      name: "Data mutation",
      pass: mutationOk,
      detail: mutationOk
        ? "An isolated immutable mutation succeeded without changing live user data."
        : "The centralized mutation did not preserve immutable state behavior.",
    });

    let storageOk = false;
    try {
      const probe = "__itpath_diag__";
      window.localStorage.setItem(probe, "ok");
      storageOk = window.localStorage.getItem(probe) === "ok";
      window.localStorage.removeItem(probe);
    } catch {
      storageOk = false;
    }
    results.push({
      name: "LocalStorage works",
      pass: storageOk,
      detail: storageOk
        ? "A test value was written, read, and removed."
        : "LocalStorage is unavailable or failed its read/write test.",
    });

    const saved = forceSave() && saveState({ version: APP_DATA_VERSION, user });
    let savedVersion: number | undefined;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : undefined;
      savedVersion = typeof parsed?.version === "number" ? parsed.version : undefined;
    } catch {
      savedVersion = undefined;
    }
    results.push({
      name: "LocalStorage save",
      pass: saved && savedVersion === APP_DATA_VERSION,
      detail:
        saved && savedVersion === APP_DATA_VERSION
          ? "Current user data was serialized and saved successfully."
          : "Current user data could not be saved or verified.",
    });

    const loaded = loadState();
    const loadOk =
      hydrated &&
      loaded.outcome !== "unavailable" &&
      loaded.state.user.settings.id === user.settings.id;
    results.push({
      name: "LocalStorage load",
      pass: loadOk,
      detail: loadOk
        ? `Saved user data loaded successfully (${loaded.outcome}).`
        : `Saved user data failed to load safely (${loaded.outcome}).`,
    });

    const versionOk =
      loaded.state.version === APP_DATA_VERSION && savedVersion === APP_DATA_VERSION;
    results.push({
      name: "Data version",
      pass: versionOk,
      detail: versionOk
        ? `Stored and loaded data use version ${APP_DATA_VERSION}.`
        : `Expected version ${APP_DATA_VERSION}; stored or loaded data did not match.`,
    });

    const settingsOk =
      loaded.state.user.settings.studyHoursPerWeek === user.settings.studyHoursPerWeek &&
      loaded.state.user.settings.targetJob === user.settings.targetJob;
    results.push({
      name: "Settings save",
      pass: settingsOk,
      detail: settingsOk
        ? `Saved settings match (${user.settings.studyHoursPerWeek}h/week, ${user.settings.targetJob}).`
        : "Stored settings do not match the current values.",
    });

    setChecks(results);
    setRanAt(new Date().toLocaleTimeString());
  }

  const passCount = checks?.filter((check) => check.pass).length ?? 0;

  return (
    <div id="__diagnostics-anchor">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} variant="secondary">Run diagnostics</Button>
        {checks ? (
          <p className="text-sm text-muted-foreground">
            {passCount}/{checks.length} passed at {ranAt}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No tests have been run yet.</p>
        )}
      </div>

      {checks ? (
        <ul className="mt-4 divide-y divide-border">
          {checks.map((check) => (
            <li key={check.name} className="flex items-start gap-3 py-3">
              {check.pass ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              )}
              <div>
                <p className="text-sm font-medium">
                  {check.name} —{" "}
                  <span className={check.pass ? "text-success" : "text-destructive"}>
                    {check.pass ? "PASS" : "FAIL"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
