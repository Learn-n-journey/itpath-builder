import { assignments, certifications, labs, topics } from "@/data/static-content";
import type { EntityId, UserData } from "@/lib/app-data/types";
import { scoreAllCertifications } from "@/lib/certification-engine";
import { scoreSkills, scoreTracks } from "@/lib/skills-engine";

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
  const perTopic = topics.map((topic) => {
    const p = user.topicProgress[topic.id];
    if (!p) return 0;
    return mean([
      p.understanding,
      p.recall,
      p.application,
      p.practicalAbility,
      p.troubleshooting,
      p.retention,
    ]);
  });
  const overallProgress = round(mean(perTopic));

  const knowledge = round(
    mean(topics.map((t) => {
      const p = user.topicProgress[t.id];
      return p ? mean([p.understanding, p.recall]) : 0;
    })),
  );
  const practical = round(
    mean(topics.map((t) => {
      const p = user.topicProgress[t.id];
      return p ? mean([p.application, p.practicalAbility]) : 0;
    })),
  );
  const troubleshooting = round(
    mean(topics.map((t) => user.topicProgress[t.id]?.troubleshooting ?? 0)),
  );
  const retention = round(mean(topics.map((t) => user.topicProgress[t.id]?.retention ?? 0)));

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
  const masteredTopics = progressList.filter((p) => p.status === "mastered").length;

  // Topics needing review: due reviews, unresolved mistakes, weak recorded dimensions.
  const needing = new Map<EntityId, string>();
  for (const review of user.reviews) {
    if (review.status === "scheduled" && new Date(review.dueAt).getTime() <= nowMs) {
      needing.set(review.topicId, "Review due");
    }
  }
  for (const mistake of user.mistakes) {
    if (!mistake.resolved && !needing.has(mistake.topicId)) {
      needing.set(mistake.topicId, "Unresolved mistake");
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
  const topicsNeedingReview = [...needing.entries()]
    .map(([topicId, reason]) => ({
      topicId,
      title: topics.find((t) => t.id === topicId)?.title ?? topicId,
      reason,
    }))
    .slice(0, 8);

  const certificationReadiness = scoreAllCertifications(user)
    .map((row) => ({
      id: row.certification.id,
      title: row.certification.title,
      overall: row.overall,
      status: row.status as string,
    }))
    .sort((a, b) => b.overall - a.overall)
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
  const nextTopic = topics.find((topic) => {
    const p = user.topicProgress[topic.id];
    return !p || (p.status !== "completed" && p.status !== "mastered");
  });
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
  const dailyTargetMinutes = Math.round(
    (user.settings.studyHoursPerWeek * 60) / Math.max(1, user.settings.studyDays.length),
  );
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
