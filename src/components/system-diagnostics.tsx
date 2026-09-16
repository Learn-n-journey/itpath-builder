import { useRouter } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { navItems } from "@/config/navigation";
import { staticContent } from "@/data/static-content";
import { getDependentSkills, getPrerequisiteChain } from "@/data/prerequisite-graph";
import { createDefaultUserData } from "@/lib/app-data/defaults";
import { buildMistake, recommendReview } from "@/lib/mistake-engine";
import { bucketReviews, createReview, gradeReview } from "@/lib/review-engine";
import { userMutations } from "@/lib/app-data/mutations";
import {
  getAssignment,
  getCertification,
  getLab,
  getLesson,
  getQuiz,
  getQuestion,
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
      pass:
        typeof document !== "undefined" && Boolean(document.getElementById("__diagnostics-anchor")),
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
      topics: [
        {
          id: "diag-topic",
          trackId: "diag-track",
          title: "Test",
          summary: "",
          certificationId: "diag-certification",
          year: 1 as const,
          month: 1,
          week: 1,
          difficulty: "gentle" as const,
          prerequisiteTopicIds: [],
          learningObjectives: [],
          estimatedMinutes: 1,
        },
      ],
      lessons: [
        {
          id: "diag-lesson",
          topicId: "diag-topic",
          title: "Test",
          body: "",
          definition: "",
          whyItMatters: "",
          keyTerms: [],
          realWorldExamples: [],
          commonMisconceptions: [],
          summary: "",
          nextSteps: [],
        },
      ],
      resources: [
        {
          id: "diag-resource",
          title: "Test",
          provider: "Test",
          url: "https://example.com",
          topicIds: ["diag-topic"],
          certificationId: "diag-certification",
          kind: "docs" as const,
          difficulty: "gentle" as const,
          access: "free" as const,
          lastVerified: "2026-09-11",
          status: "verified" as const,
        },
      ],
      assignments: [
        {
          id: "diag-assignment",
          topicId: "diag-topic",
          title: "Test",
          brief: "",
          type: "recall" as const,
          instructions: [],
          responsePrompt: "Test",
          evaluationMode: "automatic" as const,
          rubric: [],
        },
      ],
      labs: [
        {
          id: "diag-lab",
          topicId: "diag-topic",
          title: "Test",
          objective: "Test a guided lab.",
          category: "hardware" as const,
          prerequisites: [],
          difficulty: "gentle" as const,
          estimatedMinutes: 1,
          environment: "Local test environment",
          instructions: ["Perform the test."],
          expectedResult: "The test is documented.",
          checklist: [{ id: "diag-check", label: "Test complete", points: 100 }],
          reflectionPrompt: "What happened?",
          masteryScore: 100,
        },
      ],
      quizzes: [{ id: "diag-quiz", title: "Test", description: "Test quiz", topicIds: ["diag-topic"], questionIds: ["diag-question"] }],
      questions: [
        {
          id: "diag-question",
          quizId: "diag-quiz",
          topicId: "diag-topic",
          certificationId: "diag-certification",
          type: "multiple_choice" as const,
          prompt: "Test?",
          choices: ["Correct", "Incorrect"],
          correctAnswer: ["Correct"],
          acceptableAnswers: [],
          explanation: "Test explanation.",
          difficulty: "gentle" as const,
          mistakeCategory: "concept" as const,
          requiresReasoning: false,
        },
      ],
      certifications: [
        { id: "diag-certification", title: "Test", provider: "Test", objectiveIds: [] },
      ],
    };
    const retrievalOk =
      getTopic("diag-topic", fixture)?.id === "diag-topic" &&
      getLesson("diag-lesson", fixture)?.topicId === "diag-topic" &&
      getResource("diag-resource", fixture)?.topicIds.includes("diag-topic") === true &&
      getAssignment("diag-assignment", fixture)?.topicId === "diag-topic" &&
      getLab("diag-lab", fixture)?.topicId === "diag-topic" &&
      getQuiz("diag-quiz", fixture)?.topicIds.includes("diag-topic") === true &&
      getQuestion("diag-question", fixture)?.quizId === "diag-quiz" &&
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

    const labStartedAt = new Date().toISOString();
    const labFixture = userMutations.addLabAttempt(initialized, {
      id: "diag-lab-attempt",
      labId: "diag-lab",
      topicId: "diag-topic",
      status: "in_progress",
      checklist: {},
      reflection: "",
      score: 0,
      maxScore: 100,
      createdAt: labStartedAt,
      updatedAt: labStartedAt,
    });
    const startedLabAttempt = labFixture.labAttempts[0];
    const labUpdated = startedLabAttempt
      ? userMutations.updateLabAttempt(labFixture, {
      ...startedLabAttempt,
      status: "completed",
      checklist: { "diag-check": true },
      reflection: "The guided test produced the documented expected result.",
      score: 100,
      completedAt: labStartedAt,
    })
      : labFixture;
    const labMutationOk =
      labUpdated.labAttempts[0]?.status === "completed" &&
      labUpdated.labAttempts[0]?.score === 100 &&
      initialized.labAttempts.length === 0;
    results.push({
      name: "Lab lifecycle data",
      pass: labMutationOk,
      detail: labMutationOk
        ? "Lab attempts can be initialized and updated without changing the zero-state fixture."
        : "The centralized lab-attempt lifecycle mutation failed.",
    });

    const quizStartedAt = new Date().toISOString();
    const quizFixture = userMutations.addQuizAttempt(initialized, {
      id: "diag-quiz-attempt",
      quizId: "diag-quiz",
      status: "in_progress",
      questionOrder: ["diag-question"],
      choiceOrder: { "diag-question": ["Incorrect", "Correct"] },
      responses: {},
      results: [],
      score: 0,
      total: 1,
      correct: 0,
      incorrect: 0,
      weakTopicIds: [],
      mistakeCategories: [],
      recommendedTopicIds: [],
      createdAt: quizStartedAt,
      updatedAt: quizStartedAt,
    });
    const startedQuizAttempt = quizFixture.quizAttempts[0];
    const quizUpdated = startedQuizAttempt
      ? userMutations.updateQuizAttempt(quizFixture, {
          ...startedQuizAttempt,
          status: "submitted",
          responses: { "diag-question": ["Correct"] },
          results: [{ questionId: "diag-question", topicId: "diag-topic", correct: true, response: ["Correct"] }],
          score: 100,
          correct: 1,
          submittedAt: quizStartedAt,
        })
      : quizFixture;
    const quizMutationOk =
      quizUpdated.quizAttempts[0]?.status === "submitted" &&
      quizUpdated.quizAttempts[0]?.score === 100 &&
      initialized.quizAttempts.length === 0;
    results.push({
      name: "Quiz lifecycle data",
      pass: quizMutationOk,
      detail: quizMutationOk
        ? "Quiz attempts can be started and submitted without overwriting the zero-state fixture."
        : "The centralized quiz-attempt lifecycle mutation failed.",
    });

    // Mistake + prerequisite engine, tested with a real mistake rather than a mocked result.
    const dnsMistakeUser = userMutations.addMistake(
      initialized,
      buildMistake(initialized, {
        topicId: "topic-dns-fundamentals",
        activity: "quiz",
        category: "misunderstood_concept",
        severity: "high",
        attemptId: "diag-attempt",
      }),
    );
    const recordedMistake = dnsMistakeUser.mistakes[0];
    const mistakeShapeOk = Boolean(
      recordedMistake &&
        recordedMistake.activity === "quiz" &&
        recordedMistake.severity === "high" &&
        recordedMistake.attemptId === "diag-attempt" &&
        recordedMistake.resolved === false &&
        recordedMistake.createdAt &&
        recordedMistake.recommendedSkillIds.length > 0 &&
        initialized.mistakes.length === 0,
    );
    results.push({
      name: "Mistake recording",
      pass: mistakeShapeOk,
      detail: mistakeShapeOk
        ? "A mistake stores topic, activity, category, date, attempt, severity, resolved state and recommended review."
        : "The centralized mistake record is incomplete.",
    });

    // Review engine: intervals advance on pass, shorten on fail, and every grade is stored.
    const seedReview = createReview({ topicId: "topic-dns-fundamentals" });
    let reviewUser = userMutations.addReview(initialized, seedReview);
    const firstPass = gradeReview(seedReview, "pass");
    const secondPass = gradeReview(firstPass.review, "pass");
    const afterFail = gradeReview(secondPass.review, "fail");
    reviewUser = userMutations.addReviewAttempt(
      userMutations.updateReview(reviewUser, afterFail.review),
      afterFail.attempt,
    );
    const intervalsOk =
      seedReview.interval === 1 &&
      firstPass.review.interval > seedReview.interval &&
      secondPass.review.interval > firstPass.review.interval &&
      afterFail.review.interval < secondPass.review.interval &&
      (afterFail.review.ease ?? 0) < (secondPass.review.ease ?? 0) &&
      afterFail.review.lapses === 1 &&
      afterFail.review.successStreak === 0;
    results.push({
      name: "Adaptive review spacing",
      pass: intervalsOk,
      detail: intervalsOk
        ? "Each pass stretches the gap and each miss shortens it, with the growth rate learned from the outcomes."
        : "Spacing did not respond to pass and fail outcomes as expected.",
    });

    const storedAttempts =
      reviewUser.reviewAttempts.length === 1 &&
      reviewUser.reviewAttempts[0]?.outcome === "fail" &&
      reviewUser.reviewAttempts[0]?.intervalBefore === 7 &&
      reviewUser.reviewAttempts[0]?.intervalAfter === 1 &&
      initialized.reviewAttempts.length === 0;
    results.push({
      name: "Review attempts stored",
      pass: storedAttempts,
      detail: storedAttempts
        ? "Every graded review is stored immutably with its before and after schedule."
        : "Graded reviews were not recorded correctly.",
    });

    const openedOnly = bucketReviews(
      [seedReview],
      new Date(new Date(seedReview.dueAt).getTime() + 60 * 60 * 1000),
    );
    const openingDoesNotPass =
      seedReview.totalReviews === 0 &&
      openedOnly.dueToday.length + openedOnly.overdue.length === 1 &&
      openedOnly.mastered.length === 0;
    results.push({
      name: "Opening a review is not a pass",
      pass: openingDoesNotPass,
      detail: openingDoesNotPass
        ? "A review only advances when it is explicitly graded, never by being opened."
        : "An ungraded review changed state.",
    });

    const dnsRecommendation = recommendReview(dnsMistakeUser, {
      topicId: "topic-dns-fundamentals",
    });
    const recommendsPrerequisite =
      dnsRecommendation.reason === "prerequisite_gap" &&
      dnsRecommendation.skillIds.length > 0 &&
      !dnsRecommendation.skillIds.includes("skill-dns") &&
      getPrerequisiteChain("skill-dns").some((skill) =>
        dnsRecommendation.skillIds.includes(skill.id),
      );
    results.push({
      name: "Prerequisite recommendation",
      pass: recommendsPrerequisite,
      detail: recommendsPrerequisite
        ? `A weak DNS mistake recommends the prerequisite ${dnsRecommendation.skillIds.join(", ")} instead of DNS itself.`
        : "The recommendation engine failed to trace the mistake back to a weak prerequisite.",
    });

    const solidUser: typeof initialized = {
      ...dnsMistakeUser,
      topicProgress: Object.fromEntries(
        [
          "topic-computer-hardware-basics",
          "topic-operating-systems-overview",
          "topic-basic-networking-concepts",
          "topic-command-line-fundamentals",
          "topic-networking-basics",
          "topic-dns-fundamentals",
        ].map((topicId) => [
          topicId,
          {
            id: `progress-${topicId}`,
            topicId,
            status: "mastered" as const,
            understanding: 100,
            recall: 100,
            application: 100,
            practicalAbility: 100,
            troubleshooting: 100,
            retention: 100,
            updatedAt: new Date().toISOString(),
          },
        ]),
      ),
      mistakes: [],
    };
    const solidRecommendation = recommendReview(solidUser, { topicId: "topic-dns-fundamentals" });
    const dependents = getDependentSkills("skill-dns").map((skill) => skill.id);
    const noForwardRecommendation =
      solidRecommendation.reason === "same_topic" &&
      solidRecommendation.topicIds.includes("topic-dns-fundamentals") &&
      solidRecommendation.skillIds.every((id) => !dependents.includes(id));
    results.push({
      name: "No advanced-material recommendation",
      pass: noForwardRecommendation,
      detail: noForwardRecommendation
        ? "With prerequisites solid, review stays on the failed topic and never jumps ahead to dependent skills."
        : "The recommendation engine suggested more advanced material.",
    });

    const resolvedUser = recordedMistake
      ? userMutations.setMistakeResolved(dnsMistakeUser, recordedMistake.id, true)
      : dnsMistakeUser;
    const resolveOk =
      resolvedUser.mistakes[0]?.resolved === true &&
      Boolean(resolvedUser.mistakes[0]?.resolvedAt) &&
      dnsMistakeUser.mistakes[0]?.resolved === false;
    results.push({
      name: "Mistake resolution",
      pass: resolveOk,
      detail: resolveOk
        ? "Mistakes can be resolved and reopened without mutating existing records."
        : "The mistake resolution mutation failed.",
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
      loaded.state.user.settings.certificationTarget === user.settings.certificationTarget;
    results.push({
      name: "Settings save",
      pass: settingsOk,
      detail: settingsOk
        ? `Saved settings match (${user.settings.studyHoursPerWeek}h/week, ${user.settings.certificationTarget}).`
        : "Stored settings do not match the current values.",
    });

    setChecks(results);
    setRanAt(new Date().toLocaleTimeString());
  }

  const passCount = checks?.filter((check) => check.pass).length ?? 0;

  return (
    <div id="__diagnostics-anchor">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} variant="secondary">
          Run diagnostics
        </Button>
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
                  {check.name},{" "}
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
