/**
 * Daily study engine.
 *
 * Builds one study session from the learner's real data. Every task points at
 * an activity that exists in the curriculum or in the learner's own record:
 * nothing is invented, and an empty data set produces an empty plan.
 */
import { assignments, labs, quizzes, topics } from "@/data/static-content";
import type {
  StudyPlan,
  StudyPlanTask,
  StudyTaskKind,
  StudySession,
  UserData,
} from "@/lib/app-data/types";
import { adaptivePath, focusedTopicsFirst } from "@/lib/adaptive-path";
import { topicScopeProgress } from "@/lib/scope-progress";

export const STUDY_DURATIONS = [30, 60, 90, 120] as const;
export type StudyDuration = (typeof STUDY_DURATIONS)[number];

export const studyTaskKindLabels: Record<StudyTaskKind, string> = {
  review: "Review",
  weak_topic: "Weak topic",
  new_material: "New material",
  practice: "Practice",
  lab: "Lab",
  assignment: "Practice",
  quiz: "Quiz",
};

/** Priority order requested for the daily plan. */
const KIND_ORDER: StudyTaskKind[] = [
  "review",
  "weak_topic",
  "new_material",
  "practice",
  "lab",
  "assignment",
  "quiz",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topicTitle(topicId: string): string {
  return topics.find((topic) => topic.id === topicId)?.title ?? topicId;
}

function topicScore(user: UserData, topicId: string): number | null {
  const progress = topicScopeProgress(user, topicId);
  return progress.attempted > 0 ? progress.overall : null;
}


/** True when every prerequisite topic has a recorded score of 60 or better. */
function prerequisitesReady(user: UserData, topicId: string): boolean {
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return false;
  return topic.prerequisiteTopicIds.every((id) => (topicScore(user, id) ?? 0) >= 60);
}

/** The weakest unmet prerequisite of a topic, when there is one. */
function weakestPrerequisite(user: UserData, topicId: string): string | undefined {
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return undefined;
  const unmet = topic.prerequisiteTopicIds
    .map((id) => ({ id, score: topicScore(user, id) ?? 0 }))
    .filter((entry) => entry.score < 60)
    .sort((a, b) => a.score - b.score);
  return unmet[0]?.id;
}

interface Candidate extends Omit<StudyPlanTask, "id" | "status" | "trackedSeconds"> {}

function buildCandidates(user: UserData, now: Date): Candidate[] {
  const nowMs = now.getTime();
  const out: Candidate[] = [];
  const usedTopics = new Set<string>();
  const focus = adaptivePath(user);
  const orderedTopics = focusedTopicsFirst(user);
  const focusTopicIds = new Set(focus.topics.map((topic) => topic.id));

  // 1. Review, reviews the learner actually has scheduled and due.
  const dueReviews = user.reviews
    .filter((r) => r.status === "scheduled" && new Date(r.dueAt).getTime() <= nowMs)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  for (const review of dueReviews.slice(0, 4)) {
    const overdueDays = Math.floor((nowMs - new Date(review.dueAt).getTime()) / DAY_MS);
    out.push({
      kind: "review",
      title: `Review ${topicTitle(review.topicId)}`,
      detail: `Spaced review at the ${review.interval}-day step.`,
      reason: overdueDays > 0 ? `Overdue by ${overdueDays} day(s).` : "Due today.",
      plannedMinutes: 10,
      to: "/review",
      topicId: review.topicId,
      reviewId: review.id,
    });
  }

  // 2. Weak topics, recorded low scores or unresolved mistakes, prerequisite first.
  const weakTopics = new Map<string, string>();
  for (const mistake of user.mistakes) {
    if (mistake.resolved) continue;
    const target = weakestPrerequisite(user, mistake.topicId) ?? mistake.topicId;
    if (!weakTopics.has(target)) {
      weakTopics.set(
        target,
        target === mistake.topicId
          ? "Unresolved mistake on this topic."
          : `Weak prerequisite behind mistakes on ${topicTitle(mistake.topicId)}.`,
      );
    }
  }
  for (const topic of orderedTopics) {
    const score = topicScore(user, topic.id);
    if (score !== null && score > 0 && score < 60 && !weakTopics.has(topic.id)) {
      weakTopics.set(topic.id, `Recorded score is ${Math.round(score)}%.`);
    }
  }
  for (const [topicId, reason] of weakTopics) {
    if (!topics.some((t) => t.id === topicId)) continue;
    usedTopics.add(topicId);
    out.push({
      kind: "weak_topic",
      title: `Rework ${topicTitle(topicId)}`,
      detail: "Read the lesson again, then answer it back in your own words.",
      reason,
      plannedMinutes: 15,
      to: "/topics/$topicId",
      params: { topicId },
      topicId,
    });
  }

  // 3. New material, strictly the current topic on the Journey Map.
  const nextTopic = currentJourneyTopic(user);
  if (nextTopic && !usedTopics.has(nextTopic.id)) {
    usedTopics.add(nextTopic.id);
    const started = (topicScore(user, nextTopic.id) ?? 0) > 0;
    out.push({
      kind: "new_material",
      title: started ? `Finish ${nextTopic.title}` : `Learn ${nextTopic.title}`,
      detail: nextTopic.summary,
      reason: started
        ? "Where you are on the journey. Master this before the next topic opens."
        : "The next topic on your journey.",
      plannedMinutes: 20,
      to: "/topics/$topicId",
      params: { topicId: nextTopic.id },
      topicId: nextTopic.id,
    });
  }

  // 4. Practice, topics already opened and still waiting on an applied attempt.
  const practiced = new Set(user.practiceResponses.map((r) => r.topicId));
  const practiceTopic = orderedTopics.find((topic) => {
    if (!isTopicOpen(user, topic.id)) return false;
    const p = topicScopeProgress(user, topic.id);
    return p.attempted > 0 && !practiced.has(topic.id);
  });
  if (practiceTopic) {
    out.push({
      kind: "practice",
      title: `Practise ${practiceTopic.title}`,
      detail: "Work the topic practice activity, not just the reading.",
      reason: "Understanding is recorded but no practice attempt exists yet.",
      plannedMinutes: 15,
      to: "/topics/$topicId",
      params: { topicId: practiceTopic.id },
      topicId: practiceTopic.id,
    });
  }

  // 5. Lab, finish an open lab first, otherwise the next lab on an open topic.
  const openLab = user.labAttempts.find((attempt) => attempt.status === "in_progress");
  const openLabDef = openLab ? labs.find((lab) => lab.id === openLab.labId) : undefined;
  const doneLabIds = new Set(
    user.labAttempts
      .filter((a) => a.status === "completed" || a.status === "mastered")
      .map((a) => a.labId),
  );
  const journeyLabs = inJourneyOrder(labs.filter((lab) => isTopicOpen(user, lab.topicId)));
  const nextLab =
    openLabDef ??
    journeyLabs.find((lab) => !doneLabIds.has(lab.id) && (topicScore(user, lab.topicId) ?? 0) > 0) ??
    journeyLabs.find((lab) => !doneLabIds.has(lab.id));

  if (nextLab) {
    out.push({
      kind: "lab",
      title: openLabDef ? `Finish lab: ${nextLab.title}` : `Lab: ${nextLab.title}`,
      detail: nextLab.objective,
      reason: openLabDef
        ? "You have this lab in progress."
        : `Practical work for ${topicTitle(nextLab.topicId)}.`,
      plannedMinutes: Math.min(nextLab.estimatedMinutes, 30),
      to: "/labs",
      labId: nextLab.id,
      topicId: nextLab.topicId,
    });
  }

  // 6. Assignment, an open attempt first, otherwise one on a topic you have started.
  const openAssignment = user.assignmentAttempts.find(
    (a) => a.status === "started" || a.status === "submitted" || a.status === "evaluated",
  );
  const openAssignmentDef = openAssignment
    ? assignments.find((a) => a.id === openAssignment.assignmentId)
    : undefined;
  const doneAssignmentIds = new Set(
    user.assignmentAttempts.filter((a) => a.status === "completed").map((a) => a.assignmentId),
  );
  const nextAssignment =
    openAssignmentDef ??
    assignments.find(
      (a) => focusTopicIds.has(a.topicId) && !doneAssignmentIds.has(a.id) && (topicScore(user, a.topicId) ?? 0) > 0,
    ) ??
    assignments.find((a) => focusTopicIds.has(a.topicId) && !doneAssignmentIds.has(a.id)) ??
    assignments.find((a) => !doneAssignmentIds.has(a.id));
  if (nextAssignment) {
    out.push({
      kind: "assignment",
      title: openAssignmentDef
        ? `Finish practice: ${nextAssignment.title}`
        : `Practice: ${nextAssignment.title}`,
      detail: nextAssignment.brief,
      reason: openAssignmentDef
        ? "This practice task is still open."
        : `Written work for ${topicTitle(nextAssignment.topicId)}.`,
      plannedMinutes: 20,
      to: "/practice",
      assignmentId: nextAssignment.id,
      topicId: nextAssignment.topicId,
    });
  }

  // 7. Quiz, only when a quiz exists.
  const quiz = quizzes[0];
  if (quiz) {
    const lastScore = user.quizAttempts.find((a) => a.status === "submitted")?.score;
    out.push({
      kind: "quiz",
      title: `Quiz: ${quiz.title}`,
      detail: quiz.description,
      reason:
        typeof lastScore === "number"
          ? `Your last submitted quiz scored ${lastScore}%.`
          : "No quiz attempt recorded yet.",
      plannedMinutes: 15,
      to: "/quiz-me",
      quizId: quiz.id,
    });
  }

  // Keep one task per topic per plan where the topic is the subject of the work.
  const seenTopicTask = new Set<string>();
  return out.filter((candidate) => {
    if (candidate.kind !== "weak_topic" && candidate.kind !== "new_material" && candidate.kind !== "practice") {
      return true;
    }
    if (!candidate.topicId) return true;
    if (seenTopicTask.has(candidate.topicId)) return false;
    seenTopicTask.add(candidate.topicId);
    return true;
  });
}

/** Builds a plan that fits the chosen duration, in strict priority order. */
export function generateStudyPlan(
  user: UserData,
  targetMinutes: number,
  now: Date = new Date(),
): StudyPlan {
  const candidates = buildCandidates(user, now);
  candidates.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

  const tasks: StudyPlanTask[] = [];
  let planned = 0;
  for (const candidate of candidates) {
    if (planned >= targetMinutes) break;
    const remaining = targetMinutes - planned;
    if (remaining < 5) break;
    const minutes = Math.min(candidate.plannedMinutes, remaining);
    tasks.push({
      ...candidate,
      id: crypto.randomUUID(),
      plannedMinutes: minutes,
      status: "pending",
      trackedSeconds: 0,
    });
    planned += minutes;
  }

  // Ensure the scheduled total exactly matches the chosen target.
  if (tasks.length > 0 && planned < targetMinutes) {
    const lastTask = tasks[tasks.length - 1]!;
    lastTask.plannedMinutes += targetMinutes - planned;
  }

  const iso = now.toISOString();
  return {
    id: crypto.randomUUID(),
    targetMinutes,
    status: "planned",
    tasks,
    trackedSeconds: 0,
    createdAt: iso,
    updatedAt: iso,
  };
}

function closeRunningSegment(plan: StudyPlan, now: Date): StudyPlan {
  if (!plan.runningSince) return plan;
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(plan.runningSince).getTime()) / 1000));
  const { runningSince: _dropped, ...rest } = plan;
  return {
    ...rest,
    trackedSeconds: plan.trackedSeconds + seconds,
    tasks: plan.tasks.map((task) =>
      task.id === plan.activeTaskId
        ? { ...task, trackedSeconds: task.trackedSeconds + seconds }
        : task,
    ),
    updatedAt: now.toISOString(),
  };
}

function firstPending(plan: StudyPlan): StudyPlanTask | undefined {
  return plan.tasks.find((task) => task.status === "pending");
}

/** Live tracked seconds, including the currently running segment. */
export function liveTrackedSeconds(plan: StudyPlan, now: Date = new Date()): number {
  if (plan.status !== "active" || !plan.runningSince) return plan.trackedSeconds;
  return (
    plan.trackedSeconds +
    Math.max(0, Math.round((now.getTime() - new Date(plan.runningSince).getTime()) / 1000))
  );
}

export function startPlan(plan: StudyPlan, now: Date = new Date()): StudyPlan {
  const next = firstPending(plan);
  if (!next) return plan;
  const iso = now.toISOString();
  return {
    ...plan,
    status: "active",
    activeTaskId: next.id,
    runningSince: iso,
    startedAt: plan.startedAt ?? iso,
    updatedAt: iso,
    tasks: plan.tasks.map((task) =>
      task.id === next.id ? { ...task, status: "active", startedAt: task.startedAt ?? iso } : task,
    ),
  };
}

export function pausePlan(plan: StudyPlan, now: Date = new Date()): StudyPlan {
  if (plan.status !== "active") return plan;
  return { ...closeRunningSegment(plan, now), status: "paused" };
}

export function resumePlan(plan: StudyPlan, now: Date = new Date()): StudyPlan {
  if (plan.status !== "paused") return plan;
  const active = plan.tasks.find((task) => task.id === plan.activeTaskId && task.status === "active");
  const target = active ?? firstPending(plan);
  if (!target) return plan;
  const iso = now.toISOString();
  return {
    ...plan,
    status: "active",
    activeTaskId: target.id,
    runningSince: iso,
    updatedAt: iso,
    tasks: plan.tasks.map((task) =>
      task.id === target.id
        ? { ...task, status: "active", startedAt: task.startedAt ?? iso }
        : task,
    ),
  };
}

function advance(plan: StudyPlan, taskId: string, status: "completed" | "skipped", now: Date): StudyPlan {
  const wasActive = plan.status === "active" && plan.activeTaskId === taskId;
  const closed = wasActive ? closeRunningSegment(plan, now) : plan;
  const iso = now.toISOString();
  const withTask: StudyPlan = {
    ...closed,
    tasks: closed.tasks.map((task) =>
      task.id === taskId ? { ...task, status, finishedAt: iso } : task,
    ),
    updatedAt: iso,
  };
  const next = firstPending(withTask);
  if (!next) {
    const { runningSince: _r, activeTaskId: _a, ...rest } = withTask;
    return { ...rest, status: withTask.status === "completed" ? "completed" : withTask.status };
  }
  if (!wasActive) return withTask;
  return {
    ...withTask,
    activeTaskId: next.id,
    runningSince: iso,
    status: "active",
    tasks: withTask.tasks.map((task) =>
      task.id === next.id ? { ...task, status: "active", startedAt: task.startedAt ?? iso } : task,
    ),
  };
}

export function completeTask(plan: StudyPlan, taskId: string, now: Date = new Date()): StudyPlan {
  return advance(plan, taskId, "completed", now);
}

export function skipTask(plan: StudyPlan, taskId: string, now: Date = new Date()): StudyPlan {
  return advance(plan, taskId, "skipped", now);
}

export interface FinishResult {
  plan: StudyPlan;
  /** Only created when real tracked time exists, never a fabricated session. */
  session?: StudySession;
}

/** Ends the session and logs the time actually tracked. */
export function finishPlan(plan: StudyPlan, now: Date = new Date()): FinishResult {
  const closed = closeRunningSegment(plan, now);
  const iso = now.toISOString();
  const minutes = Math.round(closed.trackedSeconds / 60);
  const { runningSince: _dropped, ...rest } = closed;
  const finished: StudyPlan = {
    ...rest,
    status: "completed",
    completedAt: iso,
    updatedAt: iso,
    tasks: rest.tasks.map((task) =>
      task.status === "active" ? { ...task, status: "completed", finishedAt: iso } : task,
    ),
  };
  if (minutes <= 0) return { plan: finished };
  const firstTopic = finished.tasks.find((task) => task.topicId)?.topicId;
  const session: StudySession = {
    id: crypto.randomUUID(),
    startedAt: finished.startedAt ?? iso,
    minutes,
    studyPlanId: finished.id,
    ...(firstTopic ? { topicId: firstTopic } : {}),
  };
  return { plan: { ...finished, studySessionId: session.id }, session };
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
