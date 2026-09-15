/**
 * Study record and backup file.
 *
 * Turns recorded activity into a transcript a learner can download and show an
 * employer, plus a full JSON backup they can restore later. Every figure comes
 * from real records; nothing is estimated or invented.
 */
import { computeProgress } from "@/lib/progress-engine";
import { buildAllReadinessReports, readinessBandLabels } from "@/lib/readiness-engine";
import { scoreSkills } from "@/lib/skills-engine";
import { portfolioToMarkdown } from "@/lib/portfolio-engine";
import { APP_DATA_VERSION, type UserData } from "@/lib/app-data/types";

export interface RecordTopicRow {
  title: string;
  score: number;
  status: string;
}

export interface RecordCertRow {
  title: string;
  score: number;
  band: string;
  topicsDone: number;
  topicsTotal: number;
}

export interface RecordSkillRow {
  label: string;
  score: number;
  evidenceCount: number;
  coveredCount: number;
  availableCount: number;
}

export interface StudyRecord {
  generatedAt: Date;
  hasActivity: boolean;
  totals: {
    studyMinutes: number;
    sessions: number;
    activeDays: number;
    topicsStarted: number;
    topicsMastered: number;
    topicsTotal: number;
    quizAttempts: number;
    quizAverage: number;
    labsCompleted: number;
    practiceCompleted: number;
    incidentsWorked: number;
    ticketsWorked: number;
    mistakesResolved: number;
    mistakesOpen: number;
    portfolioProjects: number;
  };
  certifications: RecordCertRow[];
  topics: RecordTopicRow[];
  skills: RecordSkillRow[];
}

export function buildStudyRecord(user: UserData, now: Date = new Date()): StudyRecord {
  const progress = computeProgress(user, now);
  const reports = buildAllReadinessReports(user, now);
  const skills = scoreSkills(user);

  return {
    generatedAt: now,
    hasActivity: progress.hasActivity,
    totals: {
      studyMinutes: progress.study.totalMinutes,
      sessions: progress.study.sessions,
      activeDays: progress.study.activeDays,
      topicsStarted: progress.byTopic.filter((row) => row.hasActivity).length,
      topicsMastered: progress.byTopic.filter((row) => row.status === "mastered").length,
      topicsTotal: progress.byTopic.length,
      quizAttempts: progress.quiz.attempts,
      quizAverage: progress.quiz.average,
      labsCompleted: progress.lab.completed,
      practiceCompleted: progress.assignment.completed,
      incidentsWorked: user.incidentAttempts.length,
      ticketsWorked: user.ticketAttempts.length,
      mistakesResolved: progress.mistakes.total - progress.mistakes.open,
      mistakesOpen: progress.mistakes.open,
      portfolioProjects: user.portfolio.length,
    },
    certifications: reports.map((report) => ({
      title: report.certification.title,
      score: Math.round(report.readiness.overall),
      band: readinessBandLabels[report.band],
      topicsDone: report.topicsDone,
      topicsTotal: report.topicsTotal,
    })),
    topics: progress.byTopic
      .filter((row) => row.hasActivity)
      .sort((a, b) => b.score - a.score)
      .map((row) => ({ title: row.title, score: row.score, status: row.status })),
    skills: skills
      .filter((skill) => skill.score > 0)
      .map((skill) => ({
        label: skill.label,
        score: Math.round(skill.score),
        evidenceCount: skill.evidence.length,
        coveredCount: skill.coveredCount,
        availableCount: skill.availableCount,
      })),
  };
}

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Plain-text transcript of everything recorded. */
export function recordAsText(record: StudyRecord, name?: string): string {
  const t = record.totals;
  const lines: string[] = [
    "IT PATH, STUDY RECORD",
    name ? `Learner: ${name}` : "",
    `Generated: ${record.generatedAt.toLocaleString()}`,
    "",
    "TOTALS",
    `Study time recorded: ${hours(t.studyMinutes)} across ${t.sessions} sessions on ${t.activeDays} days`,
    `Topics: ${t.topicsStarted} started, ${t.topicsMastered} mastered of ${t.topicsTotal}`,
    `Quizzes: ${t.quizAttempts} attempts, ${t.quizAverage}% average`,
    `Labs completed: ${t.labsCompleted}`,
    `Practice tasks completed: ${t.practiceCompleted}`,
    `Incidents worked: ${t.incidentsWorked}`,
    `Career tickets worked: ${t.ticketsWorked}`,
    `Mistakes: ${t.mistakesResolved} resolved, ${t.mistakesOpen} open`,
    `Portfolio projects written up: ${t.portfolioProjects}`,
    "",
    "CERTIFICATION READINESS",
    ...record.certifications.map(
      (row) =>
        `- ${row.title}: ${row.score}% (${row.band}), ${row.topicsDone}/${row.topicsTotal} topics`,
    ),
    "",
    "SKILLS EVIDENCED",
    ...(record.skills.length
      ? record.skills.map((row) => `- ${row.label}: ${row.score}%, ${row.coveredCount}/${row.availableCount} available activities covered (${row.evidenceCount} evidence records)`)
      : ["- Nothing recorded yet"]),
    "",
    "TOPICS STUDIED",
    ...(record.topics.length
      ? record.topics.map((row) => `- ${row.title}: ${row.score}% (${row.status.replace(/_/g, " ")})`)
      : ["- Nothing recorded yet"]),
    "",
    "Every figure above is derived from work recorded in IT PATH.",
  ];
  return lines.filter((line) => line !== "").join("\n");
}

/** Transcript plus the written portfolio, as one shareable document. */
export function recordWithPortfolio(record: StudyRecord, user: UserData, name?: string): string {
  const base = recordAsText(record, name);
  if (!user.portfolio.length) return base;
  return `${base}\n\n\n${portfolioToMarkdown(user.portfolio)}`;
}

export interface BackupFile {
  app: "IT PATH";
  version: number;
  exportedAt: string;
  user: UserData;
}

export function buildBackup(user: UserData): string {
  const payload: BackupFile = {
    app: "IT PATH",
    version: APP_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    user,
  };
  return JSON.stringify(payload, null, 2);
}

export function readBackup(contents: string): { ok: true; user: UserData } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return { ok: false, error: "That file is not a valid IT PATH backup." };
  }
  const candidate = parsed as Partial<BackupFile> | null;
  const user = candidate?.user as UserData | undefined;
  if (!user || typeof user !== "object" || !user.settings || !user.topicProgress) {
    return { ok: false, error: "That file does not contain IT PATH progress." };
  }
  return { ok: true, user };
}
