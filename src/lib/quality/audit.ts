/**
 * The auditor.
 *
 * It reads the material of whichever subject is active, applies the rule book,
 * and returns a plain list of findings. It changes nothing and decides
 * nothing: it only reports, with a stable rule id and a stable subject id on
 * every line, so the same problem is recognised as the same problem next time
 * it is seen.
 *
 * Nothing here knows what subject is being taught. Everything it reads comes
 * from the active course pack, so the same auditor judges any subject.
 */

import { coursePack } from "@/content/course-pack";
import type { CoursePack } from "@/content/pack-contract";
import { questionIssues } from "@/lib/question-quality";
import { checkTechnicalClaims } from "@/lib/technical-validation";
import { validateQuestionSet } from "@/lib/quiz-finalize";
import { getRule } from "./rules";
import type { AuditOptions, AuditReport, Finding } from "./types";
import type { Question } from "@/lib/app-data/types";

export type { AuditOptions, AuditReport, Finding } from "./types";

function note(findings: Finding[], ruleId: string, subjectId: string, detail: string): void {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  findings.push({ ruleId, severity: rule.severity, subjectId, detail });
}

/** Everything a section teaches, gathered into one block of text. */
export function lessonText(topicId: string, pack: CoursePack = coursePack): string {
  return pack.lessonText(topicId);
}

function auditQuestion(findings: Finding[], question: Question): void {
  const subject = `question:${question.id}`;
  for (const issue of questionIssues(question)) {
    note(findings, "questions.sound", subject, issue);
  }
  const text = `${question.prompt} ${question.correctAnswer.join(" ")} ${question.explanation ?? ""}`;
  for (const issue of checkTechnicalClaims(text)) {
    note(findings, "questions.numbers-hold-up", subject, `${issue.claim.trim()} -> ${issue.problem}`);
  }
  if (!question.explanation || question.explanation.trim().length < 20) {
    note(findings, "questions.explained", subject, "No usable explanation.");
  }
}

/**
 * Audits one course pack and hands back a report.
 *
 * A blocking finding means the material is not fit to publish. A warning is
 * worth fixing but does not stop anything.
 */
export function auditCoursePack(pack: CoursePack, options: AuditOptions = {}): AuditReport {
  const startedAt = new Date().toISOString();
  const findings: Finding[] = [];
  const papersEach = options.papersEach ?? 2;
  const sections = pack.sections;
  const wanted = options.topicIds?.length
    ? sections.filter((topic) => options.topicIds!.includes(topic.id))
    : sections;
  const known = new Set(sections.map((topic) => topic.id));
  const quizSize = pack.assessmentSizes.sectionQuiz;
  const examSize = pack.assessmentSizes.stageExam;
  const conceptOf = pack.conceptId;

  let papers = 0;
  let questionCount = 0;

  for (const topic of wanted) {
    const subject = `topic:${topic.id}`;

    const text = pack.lessonText(topic.id);
    if (text.trim().length === 0) {
      note(findings, "structure.topic-has-lesson", subject, "The section has no lesson text.");
    } else if (text.length < 600) {
      note(findings, "content.lesson-has-substance", subject, `Only ${text.length} characters of teaching text.`);
    }
    for (const issue of checkTechnicalClaims(text)) {
      note(findings, "content.lesson-numbers-hold-up", subject, `${issue.claim.trim()} -> ${issue.problem}`);
    }

    for (const prerequisite of topic.prerequisiteTopicIds ?? []) {
      if (!known.has(prerequisite)) {
        note(findings, "structure.prerequisites-resolve", subject, `Unknown prerequisite ${prerequisite}.`);
      }
    }

    const available = pack.sectionQuestionPool(topic.id).length;
    if (available === 0) continue;

    for (let draw = 0; draw < papersEach; draw += 1) {
      const paper = pack.sectionQuizDraw(topic.id, draw + 1);
      papers += 1;
      questionCount += paper.length;
      const paperSubject = `quiz:section-quiz-${topic.id}#${draw}`;
      for (const problem of validateQuestionSet(paper, quizSize, conceptOf, available)) {
        note(findings, "papers.section-quiz-whole", paperSubject, problem);
      }
      for (const question of paper) {
        if (question.topicId !== topic.id) {
          note(findings, "papers.section-quiz-whole", paperSubject, `Question ${question.id} is from another section.`);
        }
        const conceptId = conceptOf(question);
        if (!conceptId.startsWith(`${question.topicId}:`)) {
          note(findings, "concepts.stable-id", `question:${question.id}`, `Concept ${conceptId} is not anchored to its section.`);
        }
        if (conceptOf(question) !== conceptId) {
          note(findings, "concepts.stable-id", `question:${question.id}`, "The concept id changed between two reads.");
        }
        auditQuestion(findings, question);
      }
    }
  }

  // Stage exams only make sense whole, so they are audited on a full sweep.
  if (!options.topicIds?.length) {
    for (const exam of pack.stageExams) {
      for (let draw = 0; draw < papersEach; draw += 1) {
        const paper = pack.stageExamQuestions(exam.id, draw + 1);
        papers += 1;
        questionCount += paper.length;
        const subject = `exam:${exam.id}#${draw}`;
        for (const problem of validateQuestionSet(paper, examSize, conceptOf)) {
          note(findings, "papers.stage-exam-whole", subject, problem);
        }
        for (const question of paper) auditQuestion(findings, question);
      }
    }
  }

  const blocking = findings.filter((finding) => finding.severity === "blocking").length;
  return {
    startedAt,
    scope: { topics: wanted.length, papers, questions: questionCount },
    findings,
    blocking,
    warnings: findings.length - blocking,
    passed: blocking === 0,
  };
}

/** Audits the active subject. The scripts and the gate call this. */
export function runContentAudit(options: AuditOptions = {}): AuditReport {
  return auditCoursePack(coursePack, options);
}

/** A short, stable line per finding, for a log a person can read. */
export function summariseFindings(findings: Finding[], limit = 40): string[] {
  return findings.slice(0, limit).map((finding) => `${finding.ruleId} ${finding.subjectId}: ${finding.detail}`);
}
