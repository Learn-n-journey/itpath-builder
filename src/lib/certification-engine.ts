/**
 * Certification readiness engine.
 *
 * Readiness is calculated from recorded evidence only. An exam is never marked
 * passed by the application: "Exam Attempted" and "Exam Passed" are declared by
 * the learner and stored on CertificationProgress.
 */
import { staticContent } from "@/data/static-content";
import type {
  Certification,
  CertificationObjective,
  CertificationProgress,
  CertificationStatus,
  EntityId,
  UserData,
} from "@/lib/app-data/types";
import { topicScopeProgress } from "@/lib/scope-progress";

export const certificationStatusLabels: Record<CertificationStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  curriculum_complete: "Curriculum Complete",
  exam_ready: "Exam Ready",
  exam_attempted: "Exam Attempted",
  exam_passed: "Exam Passed",
};

/** Overall readiness needed before IT PATH calls a certification Exam Ready. */
export const EXAM_READY_SCORE = 80;

const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/** Built-in objectives merged with the learner's edits, additions and removals. */
export function getObjectives(user: UserData, certificationId: EntityId): CertificationObjective[] {
  const edits = Object.values(user.certificationObjectives).filter(
    (item) => item.certificationId === certificationId,
  );
  const editById = new Map(edits.map((item) => [item.id, item]));
  const base = staticContent.certificationObjectives.filter(
    (objective) => objective.certificationId === certificationId,
  );
  const merged: CertificationObjective[] = [];
  for (const objective of base) {
    const edit = editById.get(objective.id);
    if (edit?.removed) continue;
    merged.push(edit ? { ...objective, ...edit } : objective);
  }
  for (const edit of edits) {
    if (edit.removed || base.some((objective) => objective.id === edit.id)) continue;
    merged.push(edit);
  }
  return merged.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

export function getCertificationProgress(
  user: UserData,
  certificationId: EntityId,
): CertificationProgress | undefined {
  return user.certificationProgress[certificationId];
}

export interface DomainReadiness {
  domain: string;
  objectiveCount: number;
  coveredTopicCount: number;
  score: number;
  hasEvidence: boolean;
}

export interface CertificationReadiness {
  certification: Certification;
  objectives: CertificationObjective[];
  topicIds: EntityId[];
  knowledge: number;
  practical: number;
  troubleshooting: number;
  retention: number;
  quizPerformance: number;
  labCompletion: number;
  assignmentCompletion: number;
  overall: number;
  domains: DomainReadiness[];
  weakDomains: DomainReadiness[];
  curriculumComplete: boolean;
  status: CertificationStatus;
  hasEvidence: boolean;
  examRecordCount: number;
}

function topicScores(user: UserData, topicIds: EntityId[]) {
  return topicIds.map((topicId) => user.topicProgress[topicId]);
}

export function scoreCertification(user: UserData, certification: Certification): CertificationReadiness {
  const objectives = getObjectives(user, certification.id);
  const topicIds = [...new Set(objectives.flatMap((objective) => objective.topicIds ?? []))];
  const progressRows = topicScores(user, topicIds);
  const scopeRows = topicIds.map((topicId) => topicScopeProgress(user, topicId));

  // Knowledge: recorded understanding and recall on the mapped topics.
  const knowledge = pct(mean(scopeRows.map((row) => mean([
    row.understanding.score,
    row.recall.score,
    row.application.score,
  ]))));

  const retention = pct(mean(scopeRows.map((row) => row.retention.score)));

  // Labs mapped through their topic.
  const labs = staticContent.labs.filter((lab) => topicIds.includes(lab.topicId));
  const labAttemptsFor = (labId: EntityId) =>
    user.labAttempts.filter((attempt) => attempt.labId === labId && attempt.status !== "in_progress");
  const labScores = labs.map((lab) => {
    const attempts = labAttemptsFor(lab.id);
    if (attempts.length === 0) return 0;
    return pct(Math.max(...attempts.map((a) => (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0))));
  });
  const labCompletion = labs.length === 0 ? 0 : pct((labs.filter((lab) => labAttemptsFor(lab.id).some((a) => a.status === "completed" || a.status === "mastered")).length / labs.length) * 100);

  // Assignments mapped through their topic.
  const assignments = staticContent.assignments.filter((a) => topicIds.includes(a.topicId));
  const assignmentAttemptsFor = (assignmentId: EntityId) =>
    user.assignmentAttempts.filter((a) => a.assignmentId === assignmentId && a.score !== undefined);
  const assignmentScores = assignments.map((assignment) => {
    const attempts = assignmentAttemptsFor(assignment.id);
    if (attempts.length === 0) return 0;
    return pct(Math.max(...attempts.map((a) => ((a.score ?? 0) / (a.maxScore || 100)) * 100)));
  });
  const assignmentCompletion = assignments.length === 0
    ? 0
    : pct((assignments.filter((a) => user.assignmentAttempts.some((x) => x.assignmentId === a.id && x.status === "completed")).length / assignments.length) * 100);

  const practical = pct(mean(scopeRows.map((row) => mean([
    row.application.score,
    row.practicalAbility.score,
  ]))));

  // Troubleshooting: incidents and tickets on the mapped topics.
  const troubleshooting = pct(mean(scopeRows.map((row) => row.troubleshooting.score)));

  // Quiz performance: questions tagged with this certification.
  const questionIds = new Set(
    staticContent.questions
      .filter((q) => q.certificationId === certification.id || topicIds.includes(q.topicId))
      .map((q) => q.id),
  );
  const quizResults = user.quizAttempts
    .filter((attempt) => attempt.status === "submitted")
    .flatMap((attempt) => attempt.results)
    .filter((result) => questionIds.has(result.questionId));
  const quizPerformance = pct(
    questionIds.size === 0
      ? 0
      : ([...questionIds].filter((questionId) =>
          quizResults.some((result) => result.questionId === questionId && result.correct),
        ).length / questionIds.size) * 100,
  );

  // Domains.
  const domainNames = [...new Set(objectives.map((o) => o.domain ?? "General"))];
  const domains: DomainReadiness[] = domainNames.map((domain) => {
    const rows = objectives.filter((o) => (o.domain ?? "General") === domain);
    const domainTopics = [...new Set(rows.flatMap((o) => o.topicIds ?? []))];
    const scores = domainTopics.map((topicId) => topicScopeProgress(user, topicId).overall);
    return {
      domain,
      objectiveCount: rows.length,
      coveredTopicCount: domainTopics.length,
      score: pct(mean(scores.length ? scores : [0])),
      hasEvidence: domainTopics.some((topicId) => topicScopeProgress(user, topicId).attempted > 0),
    };
  });

  const overall = pct(
    knowledge * 0.25 +
      practical * 0.2 +
      troubleshooting * 0.15 +
      retention * 0.1 +
      quizPerformance * 0.2 +
      ((labCompletion + assignmentCompletion) / 2) * 0.1,
  );

  const curriculumComplete =
    topicIds.length > 0 &&
    topicIds.every((topicId) => {
      const p = user.topicProgress[topicId];
      return p?.status === "completed" || p?.status === "mastered";
    });

  const progress = getCertificationProgress(user, certification.id);
  const hasEvidence =
    overall > 0 || scopeRows.some((row) => row.attempted > 0) || quizResults.length > 0 || (progress?.examRecords.length ?? 0) > 0;

  let status: CertificationStatus = "not_started";
  if (progress?.declaredStatus === "exam_passed") status = "exam_passed";
  else if (progress?.declaredStatus === "exam_attempted") status = "exam_attempted";
  else if (curriculumComplete && overall >= EXAM_READY_SCORE) status = "exam_ready";
  else if (curriculumComplete) status = "curriculum_complete";
  else if (hasEvidence) status = "in_progress";

  return {
    certification,
    objectives,
    topicIds,
    knowledge,
    practical,
    troubleshooting,
    retention,
    quizPerformance,
    labCompletion,
    assignmentCompletion,
    overall,
    domains,
    weakDomains: domains.filter((d) => d.score < 60).sort((a, b) => a.score - b.score),
    curriculumComplete,
    status,
    hasEvidence,
    examRecordCount: progress?.examRecords.length ?? 0,
  };
}

export function scoreAllCertifications(user: UserData): CertificationReadiness[] {
  return staticContent.certifications.map((certification) => scoreCertification(user, certification));
}

/** Records a learner-declared exam outcome. Passing always comes from here. */
export function declareExamOutcome(
  current: CertificationProgress | undefined,
  certificationId: EntityId,
  outcome: "attempted" | "passed",
  note: string,
): CertificationProgress {
  const now = new Date().toISOString();
  const base: CertificationProgress = current ?? {
    id: `certprogress-${certificationId}`,
    certificationId,
    completedObjectiveIds: [],
    examRecords: [],
    updatedAt: now,
  };
  return {
    ...base,
    declaredStatus: outcome === "passed" ? "exam_passed" : "exam_attempted",
    examRecords: [
      { id: crypto.randomUUID(), certificationId, outcome, note, recordedAt: now },
      ...base.examRecords,
    ],
    ...(outcome === "passed" ? { passConfirmedAt: now } : {}),
    updatedAt: now,
  };
}

/** Clears a declared exam status so readiness is calculated from evidence again. */
export function clearExamDeclaration(current: CertificationProgress): CertificationProgress {
  const next: CertificationProgress = { ...current, updatedAt: new Date().toISOString() };
  delete next.declaredStatus;
  delete next.passConfirmedAt;
  return next;
}
