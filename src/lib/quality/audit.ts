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
import { lessonQualityIssues } from "@/lib/lesson-quality";
import { shingles } from "@/lib/originality";
import { getRule } from "./rules";
import type { AuditOptions, AuditReport, Finding } from "./types";
import type { Question } from "@/lib/app-data/types";
import { lessonConceptSections } from "@/lib/lesson-concepts";

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
    const isSemantic = issue.includes("terminology question") || 
                      issue.includes("action question") || 
                      issue.includes("explanation question");
    note(findings, isSemantic ? "questions.semantic-consistency" : "questions.sound", subject, issue);
  }
  // Wrong choices are intentionally incorrect claims. Validate the prompt,
  // marked answer and teaching feedback as facts; distractor plausibility and
  // format are enforced separately by questionIssues().
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

  // One pass over every lesson, so repeated wording can be spotted cheaply.
  const shingleCounts = new Map<string, number>();
  for (const topic of wanted) {
    for (const run of shingles(pack.lessonText(topic.id))) {
      shingleCounts.set(run, (shingleCounts.get(run) ?? 0) + 1);
    }
  }

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
    const lesson = pack.lessons.find((item) => item.topicId === topic.id);
    const deepLesson = pack.getDeepLesson(topic.id);
    const lessonSections = lessonConceptSections(topic.id, deepLesson);
    const validSectionIds = new Set(lessonSections.map((item) => item.id));
    const anchors = lessonSections.map((item) => item.anchor);
    if (new Set(anchors).size !== anchors.length) {
      note(findings, "concepts.remediation-maps", subject, "Two lesson concepts render the same remediation anchor.");
    }
    for (const issue of lessonQualityIssues(topic, lesson, deepLesson)) {
      note(findings, "content.lesson-instructionally-sound", subject, issue);
    }
    // Copied wording: no lesson may reuse long runs of another lesson's text.
    if (text.trim().length > 0) {
      const own = [...shingles(text)];
      if (own.length > 0) {
        const shared = own.filter((run) => (shingleCounts.get(run) ?? 0) > 1);
        const overlap = shared.length / own.length;
        if (overlap > 0.12) {
          note(
            findings,
            "content.lesson-instructionally-sound",
            subject,
            `Lesson reuses wording from other sections (${Math.round(overlap * 100)}% overlap): "${(shared[0] ?? "").slice(0, 120)}"`,
          );
        }
      }
    }

    for (const prerequisite of topic.prerequisiteTopicIds ?? []) {
      if (!known.has(prerequisite)) {
        note(findings, "structure.prerequisites-resolve", subject, `Unknown prerequisite ${prerequisite}.`);
      }
    }

    const available = pack.sectionQuestionPool(topic.id).length;
    for (const question of pack.sectionQuestionPool(topic.id)) {
      if (question.topicId !== topic.id) {
        note(findings, "papers.section-quiz-whole", `question:${question.id}`, "Question is stored in another section's pool.");
      }
      auditQuestion(findings, question);
      if (!question.lessonSectionId) {
        note(findings, "concepts.remediation-maps", `question:${question.id}`, "Required assessment item has no lesson section mapping.");
      } else if (!validSectionIds.has(question.lessonSectionId)) {
        note(findings, "concepts.remediation-maps", `question:${question.id}`, `Mapped lesson section ${question.lessonSectionId} does not exist.`);
      }
    }
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
