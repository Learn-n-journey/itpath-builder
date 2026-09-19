/**
 * The auditor.
 *
 * It reads the material as it stands, applies the rule book, and returns a
 * plain list of findings. It changes nothing and decides nothing: it only
 * reports, with a stable rule id and a stable subject id on every line, so the
 * same problem is recognised as the same problem next time it is seen.
 */

import { lessons, topics } from "@/data/static-content";
import { getDeepLesson } from "@/data/deep-lessons";
import { getLearningModule } from "@/data/learning-content";
import {
  SECTION_QUIZ_SIZE,
  buildSectionQuiz,
  conceptIdFor,
  getTopicQuestionPool,
} from "@/data/topic-quizzes";
import { STAGE_EXAM_SIZE, getStageExamQuestions, stageExams } from "@/data/stage-exams";
import { questionIssues } from "@/lib/question-quality";
import { checkTechnicalClaims } from "@/lib/technical-validation";
import { validateQuestionSet } from "@/lib/quiz-finalize";
import { getRule, type Severity } from "./rules";
import type { Question } from "@/lib/app-data/types";

export interface Finding {
  /** The rule that produced this line. */
  ruleId: string;
  severity: Severity;
  /** Stable name for the thing at fault, for example `question:q-123`. */
  subjectId: string;
  detail: string;
}

export interface AuditReport {
  startedAt: string;
  /** How much was looked at, so a sampled run is never mistaken for a full one. */
  scope: { topics: number; papers: number; questions: number };
  findings: Finding[];
  blocking: number;
  warnings: number;
  passed: boolean;
}

export interface AuditOptions {
  /** Limit the sweep to these sections. Leave empty to audit everything. */
  topicIds?: string[];
  /** How many papers to draw per section and per stage exam. */
  papersEach?: number;
}

function note(findings: Finding[], ruleId: string, subjectId: string, detail: string): void {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  findings.push({ ruleId, severity: rule.severity, subjectId, detail });
}

/** Everything a section teaches, gathered into one block of text. */
export function lessonText(topicId: string): string {
  const lesson = lessons.find((item) => item.topicId === topicId);
  if (!lesson) return "";
  const deep = getDeepLesson(topicId);
  const module = getLearningModule(topicId);
  return [
    lesson.body,
    lesson.definition,
    lesson.whyItMatters,
    lesson.summary,
    ...(lesson.realWorldExamples ?? []),
    ...(lesson.commonMisconceptions ?? []),
    ...(lesson.keyTerms ?? []).map((term) => `${term.term}: ${term.meaning}`),
    deep?.intro ?? "",
    ...(deep?.sections ?? []).flatMap((section) => [section.heading, ...section.paragraphs]),
    ...(module?.howItWorks ?? []),
    ...(module?.troubleshooting ?? []),
  ]
    .filter(Boolean)
    .join("\n");
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
 * Audits the material and hands back a report.
 *
 * A blocking finding means the material is not fit to publish. A warning is
 * worth fixing but does not stop anything.
 */
export function runContentAudit(options: AuditOptions = {}): AuditReport {
  const startedAt = new Date().toISOString();
  const findings: Finding[] = [];
  const papersEach = options.papersEach ?? 2;
  const wanted = options.topicIds?.length
    ? topics.filter((topic) => options.topicIds!.includes(topic.id))
    : topics;
  const known = new Set(topics.map((topic) => topic.id));

  let papers = 0;
  let questionCount = 0;

  for (const topic of wanted) {
    const subject = `topic:${topic.id}`;

    const text = lessonText(topic.id);
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

    const available = getTopicQuestionPool(topic.id).length;
    if (available === 0) continue;

    for (let draw = 0; draw < papersEach; draw += 1) {
      const paper = buildSectionQuiz(topic.id, draw + 1);
      papers += 1;
      questionCount += paper.length;
      const paperSubject = `quiz:section-quiz-${topic.id}#${draw}`;
      for (const problem of validateQuestionSet(paper, SECTION_QUIZ_SIZE, conceptIdFor, available)) {
        note(findings, "papers.section-quiz-whole", paperSubject, problem);
      }
      for (const question of paper) {
        if (question.topicId !== topic.id) {
          note(findings, "papers.section-quiz-whole", paperSubject, `Question ${question.id} is from another section.`);
        }
        const conceptId = conceptIdFor(question);
        if (!conceptId.startsWith(`${question.topicId}:`)) {
          note(findings, "concepts.stable-id", `question:${question.id}`, `Concept ${conceptId} is not anchored to its section.`);
        }
        if (conceptIdFor(question) !== conceptId) {
          note(findings, "concepts.stable-id", `question:${question.id}`, "The concept id changed between two reads.");
        }
        auditQuestion(findings, question);
      }
    }
  }

  // Stage exams only make sense whole, so they are audited on a full sweep.
  if (!options.topicIds?.length) {
    for (const exam of stageExams) {
      for (let draw = 0; draw < papersEach; draw += 1) {
        const paper = getStageExamQuestions(exam.id, draw + 1);
        papers += 1;
        questionCount += paper.length;
        const subject = `exam:${exam.id}#${draw}`;
        for (const problem of validateQuestionSet(paper, STAGE_EXAM_SIZE, conceptIdFor)) {
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

/** A short, stable line per finding, for a log a person can read. */
export function summariseFindings(findings: Finding[], limit = 40): string[] {
  return findings.slice(0, limit).map((finding) => `${finding.ruleId} ${finding.subjectId}: ${finding.detail}`);
}
