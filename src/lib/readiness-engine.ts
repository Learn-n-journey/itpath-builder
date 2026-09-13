/**
 * Exam readiness report.
 *
 * Wraps the certification scoring engine with a plain-language verdict: what is
 * holding the score back, how much study time is left, and — from the learner's
 * own recorded pace — roughly when the certification could be exam ready.
 *
 * Every number here comes from recorded evidence or from settings the learner
 * chose. Nothing is estimated optimistically and nothing is invented.
 */
import { certifications } from "@/data/static-content";
import { certificationTopics } from "@/lib/cert-path";
import {
  EXAM_READY_SCORE,
  scoreCertification,
  type CertificationReadiness,
} from "@/lib/certification-engine";
import { EXAM_PREP_MINUTES, topicStudyMinutes } from "@/lib/study-time";
import type { Certification, EntityId, UserData } from "@/lib/app-data/types";

export type ReadinessBand =
  | "not_started"
  | "building"
  | "consolidating"
  | "almost_ready"
  | "exam_ready";

export const readinessBandLabels: Record<ReadinessBand, string> = {
  not_started: "Not started",
  building: "Building knowledge",
  consolidating: "Consolidating",
  almost_ready: "Almost ready",
  exam_ready: "Exam ready",
};

export const readinessBandAdvice: Record<ReadinessBand, string> = {
  not_started: "Nothing recorded for this certification yet. Study one topic and the score starts moving.",
  building: "You are early. Keep working through new topics and record a quiz on each one.",
  consolidating: "The knowledge is coming through. Prove it with labs, incidents and written practice.",
  almost_ready: "Close. Clear your weakest areas and keep spaced reviews current.",
  exam_ready: "Your recorded evidence meets the bar. Book the exam when you feel ready.",
};

export type ReadinessRoute =
  | "/learn"
  | "/labs"
  | "/practice"
  | "/quiz-me"
  | "/review"
  | "/troubleshoot"
  | "/career-mode"
  | "/weak-areas";

export interface ReadinessFactor {
  /** Short name of the measured component. */
  label: string;
  /** 0-100 recorded score for it. */
  score: number;
  /** Share of the overall readiness score this component carries. */
  weight: number;
  /** What lifts it, in plain language. */
  fix: string;
  to: ReadinessRoute;
}

export interface ReadinessReport {
  certification: Certification;
  readiness: CertificationReadiness;
  band: ReadinessBand;
  /** Percentage points still needed to reach the exam-ready bar. */
  pointsToReady: number;
  factors: ReadinessFactor[];
  /** The three weakest factors, weighted by how much they cost the score. */
  blockers: ReadinessFactor[];
  /** Factors already at or above the exam-ready bar. */
  strengths: ReadinessFactor[];
  topicsTotal: number;
  topicsDone: number;
  /** Study minutes left across unfinished topics, plus exam preparation. */
  minutesRemaining: number;
  hoursRemaining: number;
  /** Minutes a week the learner is actually recording, over the last 28 days. */
  recordedWeeklyMinutes: number;
  /** Minutes a week the settings plan for. */
  plannedWeeklyMinutes: number;
  /** The pace used for the projection, and whether it came from real sessions. */
  paceWeeklyMinutes: number;
  paceFromRecordedSessions: boolean;
  /** Whole weeks at the current pace, or undefined when there is no usable pace. */
  weeksRemaining: number | undefined;
  projectedReadyDate: Date | undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function buildFactors(r: CertificationReadiness): ReadinessFactor[] {
  return [
    {
      label: "Knowledge",
      score: r.knowledge,
      weight: 25,
      fix: "Work through the lesson, recall and teach-back stages on your remaining topics.",
      to: "/learn",
    },
    {
      label: "Quiz accuracy",
      score: r.quizPerformance,
      weight: 20,
      fix: "Take exam-style quizzes on this certification and clear what you miss.",
      to: "/quiz-me",
    },
    {
      label: "Practical skill",
      score: r.practical,
      weight: 20,
      fix: "Complete labs and written practice tasks on the topics you have studied.",
      to: "/labs",
    },
    {
      label: "Troubleshooting",
      score: r.troubleshooting,
      weight: 15,
      fix: "Work incidents and career tickets end to end: diagnose, fix, verify, document.",
      to: "/troubleshoot",
    },
    {
      label: "Retention",
      score: r.retention,
      weight: 10,
      fix: "Keep spaced reviews current so material sticks rather than fading.",
      to: "/review",
    },
    {
      label: "Coverage",
      score: Math.round((r.labCompletion + r.assignmentCompletion) / 2),
      weight: 10,
      fix: "Finish the labs and practice tasks you have not attempted at all.",
      to: "/practice",
    },
  ];
}

function bandFor(overall: number, hasEvidence: boolean): ReadinessBand {
  if (!hasEvidence || overall === 0) return "not_started";
  if (overall >= EXAM_READY_SCORE) return "exam_ready";
  if (overall >= 65) return "almost_ready";
  if (overall >= 35) return "consolidating";
  return "building";
}

/** Minutes recorded per week over the trailing 28 days. */
export function recordedWeeklyMinutes(user: UserData, now: Date = new Date()): number {
  const cutoff = now.getTime() - 28 * DAY_MS;
  const minutes = user.studySessions
    .filter((session) => new Date(session.startedAt).getTime() >= cutoff)
    .reduce((sum, session) => sum + (session.minutes || 0), 0);
  return Math.round(minutes / 4);
}

export function plannedWeeklyMinutes(user: UserData): number {
  const days = user.settings.studyDays.length;
  const session = Math.max(0, Math.round(user.settings.sessionLengthMinutes || 0));
  return days * session;
}

export function buildReadinessReport(
  user: UserData,
  certification: Certification,
  now: Date = new Date(),
): ReadinessReport {
  const readiness = scoreCertification(user, certification);
  const factors = buildFactors(readiness);
  const band = bandFor(readiness.overall, readiness.hasEvidence);

  const courseTopics = certificationTopics(certification.id);
  const isDone = (topicId: EntityId) => {
    const status = user.topicProgress[topicId]?.status;
    return status === "completed" || status === "mastered";
  };
  const topicsDone = courseTopics.filter((topic) => isDone(topic.id)).length;
  const remainingTopicMinutes = courseTopics
    .filter((topic) => !isDone(topic.id))
    .reduce((sum, topic) => sum + topicStudyMinutes(topic.id), 0);
  const examPrepLeft = Math.round(
    EXAM_PREP_MINUTES * Math.max(0, (EXAM_READY_SCORE - readiness.overall) / EXAM_READY_SCORE),
  );
  const minutesRemaining = remainingTopicMinutes + examPrepLeft;

  const recorded = recordedWeeklyMinutes(user, now);
  const planned = plannedWeeklyMinutes(user);
  const paceFromRecordedSessions = recorded > 0;
  const pace = paceFromRecordedSessions ? recorded : planned;
  const weeksRemaining =
    pace > 0 && minutesRemaining > 0 ? Math.ceil(minutesRemaining / pace) : pace > 0 ? 0 : undefined;
  const projectedReadyDate =
    weeksRemaining === undefined ? undefined : new Date(now.getTime() + weeksRemaining * 7 * DAY_MS);

  const byCost = [...factors].sort(
    (a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight,
  );

  return {
    certification,
    readiness,
    band,
    pointsToReady: Math.max(0, EXAM_READY_SCORE - readiness.overall),
    factors,
    blockers: byCost.filter((factor) => factor.score < EXAM_READY_SCORE).slice(0, 3),
    strengths: factors.filter((factor) => factor.score >= EXAM_READY_SCORE),
    topicsTotal: courseTopics.length,
    topicsDone,
    minutesRemaining,
    hoursRemaining: Math.round(minutesRemaining / 60),
    recordedWeeklyMinutes: recorded,
    plannedWeeklyMinutes: planned,
    paceWeeklyMinutes: pace,
    paceFromRecordedSessions,
    weeksRemaining,
    projectedReadyDate,
  };
}

export function buildAllReadinessReports(user: UserData, now: Date = new Date()): ReadinessReport[] {
  return certifications.map((certification) => buildReadinessReport(user, certification, now));
}
