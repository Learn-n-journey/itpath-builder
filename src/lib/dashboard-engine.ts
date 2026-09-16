import { assignments, certifications, labs, topics } from "@/data/static-content";
import type { EntityId, UserData } from "@/lib/app-data/types";
import { scoreAllCertifications } from "@/lib/certification-engine";
import { scoreSkills, scoreTracks } from "@/lib/skills-engine";
import { adaptivePath } from "@/lib/adaptive-path";
import { allTopicScopeProgress } from "@/lib/scope-progress";
import { openMistakeCount, openMistakes } from "@/lib/missed-questions";
import { currentJourneyTopic, journeyIndex } from "@/lib/journey-order";

const DAY_MS = 24 * 60 * 60 * 1000;

function round(value: number): number {
  return Math.round(value);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function startOfDay(input: Date | string | number): number {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}


export interface DashboardTask {
  id: string;
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
}

export interface DashboardMetrics {
  /** 0-100, averaged over every curriculum topic. Untouched topics count as zero. */
  overallProgress: number;
  todaysTasks: DashboardTask[];
  studyMinutesTotal: number;
  studyHoursTotal: number;
  studyMinutesToday: number;
  streakDays: number;
  knowledge: number;
  practical: number;
  troubleshooting: number;
  retention: number;
  quizAverage: number;
  quizAttempts: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  labsCompleted: number;
  labsTotal: number;
  masteredTopics: number;
  topicsTotal: number;
  topicsNeedingReview: { topicId: EntityId; title: string; reason: string }[];
  certificationReadiness: { id: EntityId; title: string; overall: number; status: string }[];
  careerReadiness: { track: string; label: string; score: number }[];
  hasAnyActivity: boolean;
}

export function computeDashboard(user: UserData, now: Date = new Date()): DashboardMetrics {
  const nowMs = now.getTime();
  const progressList = Object.values(user.topicProgress);

  // Overall progress: every curriculum topic counts, so a new user sees zero.
  const scope = allTopicScopeProgress(user);
  const perTopic = scope.map((row) => row.overall);
  const overallProgress = round(mean(perTopic));

  const knowledge = round(
    mean(scope.map((row) => mean([row.understanding.score, row.recall.score]))),
  );
  const practical = round(
    mean(scope.map((row) => mean([row.application.score, row.practicalAbility.score]))),
  );
  const troubleshooting = round(
    mean(scope.map((row) => row.troubleshooting.score)),
  );
  const retention = round(mean(scope.map((row) => row.retention.score)));

  // Study time
  const studyMinutesTotal = user.studySessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const todayStart = startOfDay(now);
  const studyMinutesToday = user.studySessions
    .filter((s) => startOfDay(s.startedAt) === todayStart)
    .reduce((sum, s) => sum + s.minutes, 0);

  // Streak: consecutive days ending today (or yesterday) with a logged study session.
  const studyDays = new Set(user.studySessions.map((s) => startOfDay(s.startedAt)));
  let streakDays = 0;
  let cursor = studyDays.has(todayStart) ? todayStart : todayStart - DAY_MS;
  if (studyDays.has(cursor)) {
    while (studyDays.has(cursor)) {
      streakDays += 1;
      cursor -= DAY_MS;
    }
  }

  // Quiz average across submitted attempts only.
  const submittedQuizzes = user.quizAttempts.filter((a) => a.status === "submitted");
  const quizAverage = round(mean(submittedQuizzes.map((a) => a.score)));

  const assignmentsCompleted = new Set(
    user.assignmentAttempts.filter((a) => a.status === "completed").map((a) => a.assignmentId),
  ).size;
  const labsCompleted = new Set(
    user.labAttempts
      .filter((l) => l.status === "completed" || l.status === "mastered")
      .map((l) => l.labId),
  ).size;
  const masteredTopics = scope.filter((row) => row.overall >= 85).length;

  // Topics needing review: due reviews, unresolved mistakes, weak recorded dimensions.
  const needing = new Map<EntityId, string>();
  for (const review of user.reviews) {
    if (review.status === "scheduled" && new Date(review.dueAt).getTime() <= nowMs) {
      needing.set(review.topicId, "Review due");
    }
  }
  for (const item of openMistakes(user)) {
    if (!needing.has(item.mistake.topicId)) {
      const count = openMistakeCount(user, item.mistake.topicId);
      needing.set(item.mistake.topicId, count === 1 ? "1 open mistake" : `${count} open mistakes`);
    }
  }
  for (const p of progressList) {
    const score = mean([
      p.understanding,
      p.recall,
      p.application,
      p.practicalAbility,
      p.troubleshooting,
      p.retention,
    ]);
    if (score > 0 && score < 60 && !needing.has(p.topicId)) {
      needing.set(p.topicId, "Weak scores recorded");
    }
  }
  // Only list topics the learner has actually started (a completed practice task
  // is the marker), plus the one topic that is next in line.
  const startedTopics = new Set<EntityId>();
  for (const attempt of user.assignmentAttempts) {
    if (!attempt.topicId) continue;
    if (attempt.status === "completed" || attempt.status === "evaluated") {
      startedTopics.add(attempt.topicId);
    }
  }
  const nextInLine = currentJourneyTopic(user)?.id;
  const topicsNeedingReview = [...needing.entries()]
    .filter(([topicId]) => startedTopics.has(topicId) || topicId === nextInLine)
    .sort((a, b) => journeyIndex(a[0]) - journeyIndex(b[0]))
    .map(([topicId, reason]) => ({
      topicId,
      title: topics.find((t) => t.id === topicId)?.title ?? topicId,
      reason,
    }))
    .slice(0, 8);

  const focusCertificationId = adaptivePath(user).certification.id;
  const certificationReadiness = scoreAllCertifications(user)
    .map((row) => ({
      id: row.certification.id,
      title: row.certification.title,
      overall: row.overall,
      status: row.status as string,
    }))
    .sort((a, b) => {
      if (a.id === focusCertificationId) return -1;
      if (b.id === focusCertificationId) return 1;
      return b.overall - a.overall;
    })
    .slice(0, 4);

  const careerReadiness = scoreTracks(scoreSkills(user)).map((track) => ({
    track: track.track as string,
    label: track.label,
    score: track.score,
  }));

  // Today's tasks, all derived from real state.
  const tasks: DashboardTask[] = [];
  const dueReview = user.reviews.find(
    (r) => r.status === "scheduled" && new Date(r.dueAt).getTime() <= nowMs,
  );
  if (dueReview) {
    const dueCount = user.reviews.filter(
      (r) => r.status === "scheduled" && new Date(r.dueAt).getTime() <= nowMs,
    ).length;
    tasks.push({
      id: "task-review",
      label: `Clear ${dueCount} review${dueCount === 1 ? "" : "s"} due`,
      detail: "Spaced review keeps retention honest.",
      to: "/review",
    });
  }
  const openLab = user.labAttempts.find((l) => l.status === "in_progress");
  if (openLab) {
    tasks.push({
      id: "task-lab",
      label: "Finish your open lab",
      detail: labs.find((l) => l.id === openLab.labId)?.title ?? "Lab in progress",
      to: "/labs",
    });
  }
  const openAssignment = user.assignmentAttempts.find(
    (a) => a.status === "started" || a.status === "submitted" || a.status === "evaluated",
  );
  if (openAssignment) {
    tasks.push({
      id: "task-assignment",
      label: "Finish your open practice task",
      detail:
        assignments.find((a) => a.id === openAssignment.assignmentId)?.title ?? "Practice task open",
      to: "/practice",
    });
  }
  const nextTopic = adaptivePath(user).recommendedTopic;
  if (nextTopic) {
    tasks.push({
      id: "task-topic",
      label: `Study ${nextTopic.title}`,
      detail:
        certifications.find((c) => c.id === nextTopic.certificationId)?.title ??
        "Next topic on your path",
      to: "/topics/$topicId",
      params: { topicId: nextTopic.id },
    });
  }
  const dailyTargetMinutes = Math.max(0, Math.round(user.settings.sessionLengthMinutes || 0));
  if (studyMinutesToday < dailyTargetMinutes) {
    tasks.push({
      id: "task-study",
      label: `Log ${dailyTargetMinutes - studyMinutesToday} more study minutes today`,
      detail: `${studyMinutesToday} of ${dailyTargetMinutes} minutes logged.`,
      to: "/study-plan",
    });
  }

  const hasAnyActivity =
    user.studySessions.length > 0 ||
    progressList.length > 0 ||
    user.quizAttempts.length > 0 ||
    user.labAttempts.length > 0 ||
    user.assignmentAttempts.length > 0 ||
    user.ticketAttempts.length > 0 ||
    user.incidentAttempts.length > 0;

  return {
    overallProgress,
    todaysTasks: tasks.slice(0, 5),
    studyMinutesTotal,
    studyHoursTotal: Math.round((studyMinutesTotal / 60) * 10) / 10,
    studyMinutesToday,
    streakDays,
    knowledge,
    practical,
    troubleshooting,
    retention,
    quizAverage,
    quizAttempts: submittedQuizzes.length,
    assignmentsCompleted,
    assignmentsTotal: assignments.length,
    labsCompleted,
    labsTotal: labs.length,
    masteredTopics,
    topicsTotal: topics.length,
    topicsNeedingReview,
    certificationReadiness,
    careerReadiness,
    hasAnyActivity,
  };
}
