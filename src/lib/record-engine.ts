import { staticContent } from "@/data/static-content";
import type { UserData } from "@/lib/app-data/types";
import { APP_DATA_VERSION } from "@/lib/app-data/types";
import { buildAllReadinessReports, readinessBandLabels } from "@/lib/readiness-engine";
import { scoreSkills } from "@/lib/skills-engine";
import { topicScore } from "@/lib/progress-engine";

export interface RecordLine {
  label: string;
  value: string;
  detail?: string;
}

export interface RecordTopicRow {
  title: string;
  score: number;
  status: string;
}

export interface RecordCertRow {
  name: string;
  readiness: number;
  band: string;
  topicsDone: number;
  topicsTotal: number;
  passed: boolean;
}

export interface RecordSkillRow {
  label: string;
  score: number;
  evidenceCount: number;
}

export interface RecordProject {
  title: string;
  summary: string;
  skills: string[];
  date: string;
}

export interface StudyRecord {
  generatedAt: string;
  hasActivity: boolean;
  firstActivity: string | null;
  lastActivity: string | null;
  studyHours: number;
  studySessions: number;
  totals: RecordLine[];
  quizAccuracy: number | null;
  topics: RecordTopicRow[];
  certifications: RecordCertRow[];
  skills: RecordSkillRow[];
  projects: RecordProject[];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function statusLabel(score: number): string {
  if (score >= 85) return "Mastered";
  if (score >= 70) return "Solid";
  if (score >= 40) return "In progress";
  return "Started";
}

function timestamps(user: UserData): string[] {
  const stamps: string[] = [];
  for (const s of user.studySessions) stamps.push(s.startedAt);
  for (const a of user.quizAttempts) stamps.push(a.createdAt);
  for (const a of user.labAttempts) stamps.push(a.createdAt);
  for (const a of user.assignmentAttempts) stamps.push(a.createdAt);
  for (const a of user.incidentAttempts) stamps.push(a.createdAt);
  for (const a of user.ticketAttempts) stamps.push(a.createdAt);
  return stamps.filter(Boolean).sort();
}

/** Builds a verifiable transcript of the work the learner has actually recorded. */
export function buildStudyRecord(user: UserData, now: Date = new Date()): StudyRecord {
  const stamps = timestamps(user);
  const studyMinutes = user.studySessions.reduce((sum, s) => sum + (s.minutes || 0), 0);

  const submittedQuizzes = user.quizAttempts.filter((a) => a.status === "submitted");
  const answered = submittedQuizzes.reduce((sum, a) => sum + a.total, 0);
  const correct = submittedQuizzes.reduce((sum, a) => sum + a.correct, 0);
  const quizAccuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;

  const labsDone = user.labAttempts.filter(
    (a) => a.status === "completed" || a.status === "mastered",
  ).length;
  const practiceGraded = user.assignmentAttempts.filter(
    (a) => a.status === "evaluated" || a.status === "completed",
  ).length;
  const incidentsDone = user.incidentAttempts.filter((a) => a.status === "submitted").length;
  const ticketsDone = user.ticketAttempts.filter((a) => a.status === "submitted").length;
  const mistakesResolved = user.mistakes.filter((m) => m.resolved).length;
  const reviewsGraded = user.reviews.reduce((sum, r) => sum + (r.attempts?.length ?? 0), 0);

  const topics = Object.values(user.topicProgress)
    .map((progress) => {
      const topic = staticContent.topics.find((t) => t.id === progress.topicId);
      const score = topicScore(progress);
      return topic ? { title: topic.title, score, status: statusLabel(score) } : null;
    })
    .filter((row): row is RecordTopicRow => row !== null)
    .sort((a, b) => b.score - a.score);

  const certifications = buildAllReadinessReports(user, now)
    .map((report) => ({
      name: report.certification.name,
      readiness: Math.round(report.readiness.overall),
      band: readinessBandLabels[report.band],
      topicsDone: report.topicsDone,
      topicsTotal: report.topicsTotal,
      passed: user.certificationProgress[report.certification.id]?.status === "passed",
    }))
    .filter((row) => row.readiness > 0 || row.topicsDone > 0 || row.passed)
    .sort((a, b) => b.readiness - a.readiness);

  const skills = scoreSkills(user)
    .filter((skill) => skill.hasEvidence)
    .map((skill) => ({
      label: skill.label,
      score: Math.round(skill.score),
      evidenceCount: skill.evidenceCount,
    }))
    .sort((a, b) => b.score - a.score);

  const projects = user.portfolio.map((p) => ({
    title: p.title,
    summary: p.summary,
    skills: p.skills,
    date: p.date,
  }));

  const totals: RecordLine[] = [
    { label: "Study time logged", value: `${round(studyMinutes / 60)} hours`, detail: `${user.studySessions.length} sessions` },
    { label: "Topics studied", value: String(topics.length), detail: `of ${staticContent.topics.length} in the curriculum` },
    {
      label: "Quiz questions answered",
      value: String(answered),
      detail: quizAccuracy === null ? "No graded quizzes yet" : `${quizAccuracy}% correct`,
    },
    { label: "Practice tasks graded", value: String(practiceGraded) },
    { label: "Labs completed", value: String(labsDone) },
    { label: "Incidents resolved", value: String(incidentsDone) },
    { label: "Support tickets closed", value: String(ticketsDone) },
    { label: "Spaced reviews graded", value: String(reviewsGraded) },
    {
      label: "Mistakes corrected",
      value: String(mistakesResolved),
      detail: `${user.mistakes.length - mistakesResolved} still open`,
    },
  ];

  return {
    generatedAt: now.toISOString(),
    hasActivity: stamps.length > 0 || topics.length > 0,
    firstActivity: stamps[0] ?? null,
    lastActivity: stamps[stamps.length - 1] ?? null,
    studyHours: round(studyMinutes / 60),
    studySessions: user.studySessions.length,
    totals,
    quizAccuracy,
    topics,
    certifications,
    skills,
    projects,
  };
}

function line(label: string, value: string): string {
  return `${label}: ${value}`;
}

/** Plain-text transcript a learner can paste into an email or application. */
export function recordAsText(record: StudyRecord, name: string): string {
  const out: string[] = [];
  out.push("IT PATH STUDY RECORD");
  out.push(name ? `Learner: ${name}` : "Learner: (name not set)");
  out.push(line("Generated", new Date(record.generatedAt).toLocaleString()));
  if (record.firstActivity) {
    out.push(
      line(
        "Period",
        `${new Date(record.firstActivity).toLocaleDateString()} to ${new Date(record.lastActivity ?? record.generatedAt).toLocaleDateString()}`,
      ),
    );
  }
  out.push("");
  out.push("RECORDED WORK");
  for (const total of record.totals) {
    out.push(`- ${total.label}: ${total.value}${total.detail ? ` (${total.detail})` : ""}`);
  }
  if (record.certifications.length > 0) {
    out.push("");
    out.push("CERTIFICATION READINESS");
    for (const cert of record.certifications) {
      out.push(
        `- ${cert.name}: ${cert.readiness}% (${cert.band}), ${cert.topicsDone} of ${cert.topicsTotal} topics${cert.passed ? ", exam passed" : ""}`,
      );
    }
  }
  if (record.skills.length > 0) {
    out.push("");
    out.push("SKILLS WITH RECORDED EVIDENCE");
    for (const skill of record.skills) {
      out.push(`- ${skill.label}: ${skill.score}% from ${skill.evidenceCount} pieces of evidence`);
    }
  }
  if (record.topics.length > 0) {
    out.push("");
    out.push("TOPICS");
    for (const topic of record.topics) {
      out.push(`- ${topic.title}: ${topic.score}% (${topic.status})`);
    }
  }
  if (record.projects.length > 0) {
    out.push("");
    out.push("PORTFOLIO PROJECTS");
    for (const project of record.projects) {
      out.push(`- ${project.title} (${project.date}): ${project.summary}`);
      if (project.skills.length > 0) out.push(`  Skills: ${project.skills.join(", ")}`);
    }
  }
  out.push("");
  out.push(
    "Every figure above is calculated from work recorded inside IT PATH. Nothing is estimated or simulated.",
  );
  return out.join("\n");
}

export interface BackupFile {
  app: "it-path";
  kind: "backup";
  version: number;
  exportedAt: string;
  user: UserData;
}

export function buildBackup(user: UserData, now: Date = new Date()): BackupFile {
  return {
    app: "it-path",
    kind: "backup",
    version: APP_DATA_VERSION,
    exportedAt: now.toISOString(),
    user,
  };
}

/** Pulls the user payload out of a backup file, tolerating older shapes. */
export function readBackup(raw: unknown): unknown | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value["user"] && typeof value["user"] === "object") return value["user"];
  if (value["settings"] && value["topicProgress"]) return value;
  return null;
}
