/**
 * Progress engine.
 *
 * Every number in here is computed from recorded user activity. Nothing is
 * hard-coded: with an empty store every value is zero and every list is empty.
 */
import { assignments, certifications, labs, topics } from "@/data/static-content";
import type { EntityId, TopicProgress, UserData } from "@/lib/app-data/types";
import { scoreAllCertifications } from "@/lib/certification-engine";
import { summarizeMistakes, mistakeCauseLabels } from "@/lib/mistake-engine";
import { scoreSkills, type SkillScore } from "@/lib/skills-engine";

const WEAK_SCORE = 60;

function round(value: number): number {
  return Math.round(value);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface Dimensions {
  knowledge: number;
  understanding: number;
  recall: number;
  application: number;
  practicalAbility: number;
  troubleshooting: number;
  retention: number;
}

export const dimensionLabels: Array<{ key: keyof Dimensions; label: string; help: string }> = [
  { key: "knowledge", label: "Knowledge", help: "Understanding and recall combined" },
  { key: "understanding", label: "Understanding", help: "Explained the idea in your own words" },
  { key: "recall", label: "Recall", help: "Answered recall questions correctly" },
  { key: "application", label: "Application", help: "Applied the idea in practice tasks" },
  { key: "practicalAbility", label: "Practical ability", help: "Completed labs and hands-on work" },
  { key: "troubleshooting", label: "Troubleshooting", help: "Diagnosed incidents and tickets" },
  { key: "retention", label: "Retention", help: "Passed spaced reviews over time" },
];

export function topicScore(progress: TopicProgress | undefined): number {
  if (!progress) return 0;
  return mean([
    progress.understanding,
    progress.recall,
    progress.application,
    progress.practicalAbility,
    progress.troubleshooting,
    progress.retention,
  ]);
}

function dimensionsFor(user: UserData, topicIds: EntityId[]): Dimensions {
  const list = topicIds.map((id) => user.topicProgress[id]);
  const pick = (fn: (p: TopicProgress) => number) => round(mean(list.map((p) => (p ? fn(p) : 0))));
  return {
    knowledge: pick((p) => (p.understanding + p.recall) / 2),
    understanding: pick((p) => p.understanding),
    recall: pick((p) => p.recall),
    application: pick((p) => p.application),
    practicalAbility: pick((p) => p.practicalAbility),
    troubleshooting: pick((p) => p.troubleshooting),
    retention: pick((p) => p.retention),
  };
}

export interface TopicRow {
  topicId: EntityId;
  title: string;
  year: 1 | 2;
  month: number;
  week: number;
  certificationId: EntityId;
  score: number;
  status: string;
  hasActivity: boolean;
  dimensions: Dimensions;
}

export interface GroupRow {
  key: string;
  label: string;
  score: number;
  topicCount: number;
  startedCount: number;
  masteredCount: number;
}

export interface ActivityRow {
  key: string;
  label: string;
  completed: number;
  total: number | null;
  attempts: number;
  averageScore: number | null;
  detail: string;
}

export interface WeakPrerequisite {
  topicId: EntityId;
  title: string;
  score: number;
  dependents: string[];
}

export interface ProgressReport {
  hasActivity: boolean;
  overall: number;
  dimensions: Dimensions;
  byMonth: GroupRow[];
  byWeek: GroupRow[];
  byTopic: TopicRow[];
  byCertification: Array<GroupRow & { readiness: number; status: string }>;
  bySkill: SkillScore[];
  byActivity: ActivityRow[];
  quiz: { attempts: number; average: number; best: number; lastScore: number | null };
  assignment: { completed: number; total: number; attempts: number; average: number };
  lab: { completed: number; mastered: number; total: number; attempts: number; average: number };
  study: { totalMinutes: number; sessions: number; averageMinutes: number; activeDays: number };
  review: { graded: number; passed: number; failed: number; passRate: number; scheduled: number; due: number };
  mistakes: { total: number; open: number; byCategory: Array<{ label: string; count: number }> };
  masteredTopics: TopicRow[];
  weakPrerequisites: WeakPrerequisite[];
}

export function computeProgress(user: UserData, now: Date = new Date()): ProgressReport {
  const nowMs = now.getTime();
  const allIds = topics.map((topic) => topic.id);

  const byTopic: TopicRow[] = topics.map((topic) => {
    const progress = user.topicProgress[topic.id];
    return {
      topicId: topic.id,
      title: topic.title,
      year: topic.year,
      month: topic.month,
      week: topic.week,
      certificationId: topic.certificationId,
      score: round(topicScore(progress)),
      status: progress?.status ?? "not_started",
      hasActivity: Boolean(progress) && topicScore(progress) > 0,
      dimensions: dimensionsFor(user, [topic.id]),
    };
  });
  const scoreById = new Map(byTopic.map((row) => [row.topicId, row]));

  const overall = round(mean(byTopic.map((row) => row.score)));
  const dimensions = dimensionsFor(user, allIds);

  function group(
    keyOf: (topic: (typeof topics)[number]) => string,
    labelOf: (topic: (typeof topics)[number]) => string,
  ): GroupRow[] {
    const map = new Map<string, { label: string; rows: TopicRow[] }>();
    for (const topic of topics) {
      const key = keyOf(topic);
      const entry = map.get(key) ?? { label: labelOf(topic), rows: [] };
      const row = scoreById.get(topic.id);
      if (row) entry.rows.push(row);
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([key, entry]) => ({
        key,
        label: entry.label,
        score: round(mean(entry.rows.map((row) => row.score))),
        topicCount: entry.rows.length,
        startedCount: entry.rows.filter((row) => row.hasActivity).length,
        masteredCount: entry.rows.filter((row) => row.status === "mastered").length,
      }))
      .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  }

  const byMonth = group(
    (topic) => `${topic.year}-${String(topic.month).padStart(2, "0")}`,
    (topic) => `Year ${topic.year} · Month ${topic.month}`,
  );
  const byWeek = group(
    (topic) => `${topic.year}-${String(topic.month).padStart(2, "0")}-${topic.week}`,
    (topic) => `Y${topic.year} M${topic.month} W${topic.week}`,
  );

  const certificationReadiness = new Map(
    scoreAllCertifications(user).map((row) => [row.certification.id, row]),
  );
  const byCertification = group(
    (topic) => topic.certificationId,
    (topic) => certifications.find((c) => c.id === topic.certificationId)?.title ?? topic.certificationId,
  ).map((row) => {
    const readiness = certificationReadiness.get(row.key);
    return {
      ...row,
      readiness: readiness?.overall ?? 0,
      status: readiness?.status ?? "in_progress",
    };
  });

  const bySkill = scoreSkills(user).sort((a, b) => b.score - a.score);

  /* ---------------- activity performance ---------------- */

  const submittedQuizzes = user.quizAttempts.filter((a) => a.status === "submitted");
  const quizScores = submittedQuizzes.map((a) => a.score);
  const lastQuiz = [...submittedQuizzes].sort((a, b) =>
    (a.submittedAt ?? a.updatedAt).localeCompare(b.submittedAt ?? b.updatedAt),
  ).at(-1);
  const quiz = {
    attempts: submittedQuizzes.length,
    average: round(mean(quizScores)),
    best: quizScores.length ? Math.max(...quizScores) : 0,
    lastScore: lastQuiz ? lastQuiz.score : null,
  };

  const gradedAssignments = user.assignmentAttempts.filter(
    (a) => typeof a.score === "number" && typeof a.maxScore === "number" && a.maxScore > 0,
  );
  const assignment = {
    completed: new Set(
      user.assignmentAttempts.filter((a) => a.status === "completed").map((a) => a.assignmentId),
    ).size,
    total: assignments.length,
    attempts: user.assignmentAttempts.length,
    average: round(mean(gradedAssignments.map((a) => ((a.score ?? 0) / (a.maxScore ?? 1)) * 100))),
  };

  const gradedLabs = user.labAttempts.filter((l) => l.maxScore > 0 && l.status !== "in_progress");
  const lab = {
    completed: new Set(
      user.labAttempts
        .filter((l) => l.status === "completed" || l.status === "mastered")
        .map((l) => l.labId),
    ).size,
    mastered: new Set(user.labAttempts.filter((l) => l.status === "mastered").map((l) => l.labId))
      .size,
    total: labs.length,
    attempts: user.labAttempts.length,
    average: round(mean(gradedLabs.map((l) => (l.score / l.maxScore) * 100))),
  };

  const totalMinutes = user.studySessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const activeDays = new Set(
    user.studySessions.map((s) => new Date(s.startedAt).toDateString()),
  ).size;
  const study = {
    totalMinutes,
    sessions: user.studySessions.length,
    averageMinutes: user.studySessions.length
      ? round(totalMinutes / user.studySessions.length)
      : 0,
    activeDays,
  };

  const graded = user.reviewAttempts ?? [];
  const passed = graded.filter((a) => a.outcome === "passed").length;
  const scheduled = user.reviews.filter((r) => r.status === "scheduled");
  const review = {
    graded: graded.length,
    passed,
    failed: graded.length - passed,
    passRate: graded.length ? round((passed / graded.length) * 100) : 0,
    scheduled: scheduled.length,
    due: scheduled.filter((r) => new Date(r.dueAt).getTime() <= nowMs).length,
  };

  const mistakeSummary = summarizeMistakes(user);
  const mistakes = {
    total: mistakeSummary.total,
    open: mistakeSummary.open,
    byCategory: mistakeSummary.byCategory.map((row) => ({
      label: mistakeCauseLabels[row.category] ?? row.category,
      count: row.count,
    })),
  };

  const submittedIncidents = user.incidentAttempts.filter((a) => a.status === "submitted");
  const submittedTickets = user.ticketAttempts.filter((a) => a.status === "submitted");

  const byActivity: ActivityRow[] = [
    {
      key: "learn",
      label: "Learn",
      completed: byTopic.filter((row) => row.hasActivity).length,
      total: topics.length,
      attempts: byTopic.filter((row) => row.hasActivity).length,
      averageScore: overall,
      detail: "Topics with recorded evidence",
    },
    {
      key: "quiz",
      label: "Quizzes",
      completed: quiz.attempts,
      total: null,
      attempts: quiz.attempts,
      averageScore: quiz.attempts ? quiz.average : null,
      detail: "Submitted quiz attempts",
    },
    {
      key: "assignment",
      label: "Assignments",
      completed: assignment.completed,
      total: assignment.total,
      attempts: assignment.attempts,
      averageScore: gradedAssignments.length ? assignment.average : null,
      detail: "Completed assignments",
    },
    {
      key: "lab",
      label: "Labs",
      completed: lab.completed,
      total: lab.total,
      attempts: lab.attempts,
      averageScore: gradedLabs.length ? lab.average : null,
      detail: "Completed or mastered labs",
    },
    {
      key: "troubleshoot",
      label: "Troubleshooting",
      completed: submittedIncidents.length,
      total: null,
      attempts: user.incidentAttempts.length,
      averageScore: submittedIncidents.length
        ? round(mean(submittedIncidents.map((a) => a.totalScore ?? 0)))
        : null,
      detail: "Submitted incidents",
    },
    {
      key: "career",
      label: "Career Mode",
      completed: submittedTickets.length,
      total: null,
      attempts: user.ticketAttempts.length,
      averageScore: submittedTickets.length
        ? round(mean(submittedTickets.map((a) => a.totalScore ?? 0)))
        : null,
      detail: "Submitted tickets",
    },
    {
      key: "review",
      label: "Reviews",
      completed: review.passed,
      total: null,
      attempts: review.graded,
      averageScore: review.graded ? review.passRate : null,
      detail: "Passed spaced reviews",
    },
    {
      key: "study",
      label: "Study sessions",
      completed: study.sessions,
      total: null,
      attempts: study.sessions,
      averageScore: null,
      detail: `${study.totalMinutes} minutes logged`,
    },
  ];

  const masteredTopics = byTopic.filter((row) => row.status === "mastered");

  /* --------------- weak prerequisites --------------- */
  const weakMap = new Map<EntityId, WeakPrerequisite>();
  for (const topic of topics) {
    const row = scoreById.get(topic.id);
    if (!row) continue;
    // Only look at prerequisites of work the learner has actually touched or is weak at.
    const touched = row.hasActivity;
    const struggling = row.score < WEAK_SCORE;
    if (!touched || !struggling) continue;
    for (const prereqId of topic.prerequisiteTopicIds) {
      const prereq = scoreById.get(prereqId);
      if (!prereq) continue;
      if (prereq.score >= WEAK_SCORE) continue;
      const entry = weakMap.get(prereqId) ?? {
        topicId: prereqId,
        title: prereq.title,
        score: prereq.score,
        dependents: [],
      };
      entry.dependents.push(topic.title);
      weakMap.set(prereqId, entry);
    }
  }
  const weakPrerequisites = [...weakMap.values()].sort(
    (a, b) => b.dependents.length - a.dependents.length || a.score - b.score,
  );

  const hasActivity =
    byTopic.some((row) => row.hasActivity) ||
    user.quizAttempts.length > 0 ||
    user.assignmentAttempts.length > 0 ||
    user.labAttempts.length > 0 ||
    user.incidentAttempts.length > 0 ||
    user.ticketAttempts.length > 0 ||
    user.studySessions.length > 0 ||
    graded.length > 0;

  return {
    hasActivity,
    overall,
    dimensions,
    byMonth,
    byWeek,
    byTopic,
    byCertification,
    bySkill,
    byActivity,
    quiz,
    assignment,
    lab,
    study,
    review,
    mistakes,
    masteredTopics,
    weakPrerequisites,
  };
}
