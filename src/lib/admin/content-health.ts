/**
 * Topic-level content health.
 *
 * The existing quality pipeline stays authoritative for the defects it
 * already detects: this file only turns its findings, plus a few presence
 * checks, into per-topic checks the owner can read on a phone.
 */
import type { CoursePack } from "@/content/pack-contract";
import type { Finding } from "@/lib/quality/types";
import { lessonConceptSections } from "@/lib/lesson-concepts";
import {
  courseCoverage,
  courseVocabulary,
  coverageCsv,
  topicCoverage,
  type CoverageFinding,
  type TaughtVocabulary,
} from "./concept-coverage";
import type { HealthCheck } from "./types";

const PLACEHOLDER = /\b(lorem ipsum|todo|tbd|coming soon|placeholder|fill in later|xxx+)\b/i;

function check(part: Omit<HealthCheck, "area">): HealthCheck {
  return { area: "content", ...part };
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

export interface TopicHealthOptions {
  /** Findings produced by the existing content audit, if it has been run. */
  findings?: Finding[];
  ranAt?: string | null;
  /** Vocabulary of the whole course, computed once when checking every topic. */
  courseVocabulary?: TaughtVocabulary;
}

/**
 * Questions in a topic whose required technical knowledge the topic (or a
 * prerequisite) never teaches. Concept coverage decides this, not word
 * matching: see src/lib/admin/concept-coverage.ts.
 */
export function untaughtQuestions(
  pack: CoursePack,
  topicId: string,
  course: TaughtVocabulary = courseVocabulary(pack),
): CoverageFinding[] {
  return topicCoverage(pack, topicId, course).filter((finding) => finding.verdict !== "pass");
}

/** Every reviewable or failing question across the whole course. */
export function coverageGaps(pack: CoursePack): CoverageFinding[] {
  return courseCoverage(pack).findings;
}

/** Coverage findings as a spreadsheet-friendly CSV. */
export const coverageGapsCsv = coverageCsv;


/** Every check for one topic. */
export function topicHealthChecks(
  pack: CoursePack,
  topicId: string,
  options: TopicHealthOptions = {},
): HealthCheck[] {
  const ranAt = options.ranAt ?? null;
  const topic = pack.sections.find((section) => section.id === topicId);
  const checks: HealthCheck[] = [];
  if (!topic) {
    return [
      check({
        id: `content:${topicId}:exists`,
        label: "Topic exists",
        state: "failed",
        detail: `No topic with the id ${topicId}.`,
        affects: "Nothing can be taught for this topic.",
        action: "Check the course list or the created path's section list.",
        subjectId: topicId,
        lastRunAt: ranAt,
      }),
    ];
  }

  const add = (
    id: string,
    label: string,
    ok: boolean,
    failDetail: string,
    affects: string,
    action: string,
    severity: "failed" | "warning" = "failed",
    okDetail = "Present and valid.",
  ) =>
    checks.push(
      check({
        id: `content:${topicId}:${id}`,
        label,
        state: ok ? "healthy" : severity,
        detail: ok ? okDetail : failDetail,
        affects,
        action: ok ? "Nothing to do." : action,
        subjectId: topicId,
        lastRunAt: ranAt,
      }),
    );

  // Lesson
  const text = pack.lessonText(topicId);
  add(
    "lesson",
    "Lesson",
    text.trim().length >= 600,
    text.trim().length === 0 ? "No lesson text at all." : `Only ${text.trim().length} characters of teaching text.`,
    "Learners open this topic and have nothing to read.",
    "Import the lesson workbook for this topic, or write the lesson.",
  );
  add(
    "placeholder",
    "No filler text",
    !PLACEHOLDER.test(text),
    "The lesson still contains placeholder wording.",
    "Learners read unfinished material.",
    "Replace the placeholder wording and re-import.",
  );

  // Objectives
  add(
    "objectives",
    "Learning objectives",
    (topic.learningObjectives ?? []).length > 0,
    "The topic declares no learning objectives.",
    "Nothing states what the learner should be able to do.",
    "Add objectives to the topic in its workbook.",
    "warning",
  );

  // Quiz
  const pool = pack.sectionQuestionPool(topicId);
  const required = pack.assessmentSizes.sectionQuiz;
  add(
    "quiz",
    "Section quiz",
    pool.length >= required,
    `Only ${pool.length} questions available; the quiz needs ${required}.`,
    "Learners cannot pass this section, so the path stops here.",
    "Import the quiz workbook for this topic.",
  );

  // Duplicates inside the pool
  const seenPrompt = new Map<string, number>();
  for (const question of pool) seenPrompt.set(normalise(question.prompt), (seenPrompt.get(normalise(question.prompt)) ?? 0) + 1);
  const duplicates = [...seenPrompt.values()].filter((count) => count > 1).length;
  add(
    "duplicate-questions",
    "No duplicate questions",
    duplicates === 0,
    `${duplicates} question${duplicates === 1 ? "" : "s"} appear more than once.`,
    "The same question can be asked twice in one paper.",
    "Remove the duplicate rows from the quiz workbook.",
    "warning",
  );

  // Broken answer keys
  const brokenKeys = pool.filter((question) => {
    const answers = question.correctAnswer ?? [];
    if (answers.length === 0) return true;
    if (question.type === "multiple_choice") {
      const choices = (question.choices ?? []).map(normalise);
      return answers.some((answer) => !choices.includes(normalise(answer)));
    }
    return false;
  });
  add(
    "answer-keys",
    "Answer keys",
    brokenKeys.length === 0,
    `${brokenKeys.length} question${brokenKeys.length === 1 ? " has" : "s have"} an answer that is not one of its options.`,
    "Learners are marked wrong for a correct answer.",
    "Fix the answer column in the quiz workbook and re-import.",
  );

  // Try It
  const tryIt =
    pack.getPracticeActivities(topicId).length +
    pack.getRecallQuestions(topicId).length +
    (pack.getRealWorldScenario(topicId) ? 1 : 0);
  add(
    "try-it",
    "Try It activities",
    tryIt > 0,
    "No practice, recall or scenario work for this topic.",
    "Learners read but never apply.",
    "Import the Try It workbook for this topic.",
    "warning",
  );

  // Labs, only where the topic has any
  const labs = pack.labs.filter((lab) => lab.topicId === topicId);
  const brokenLabs = labs.filter((lab) => (lab.instructions ?? []).length === 0 || (lab.checklist ?? []).length === 0);
  add(
    "labs",
    "Labs",
    brokenLabs.length === 0,
    `${brokenLabs.length} lab${brokenLabs.length === 1 ? " has" : "s have"} no steps or no checklist.`,
    "The optional hands-on work cannot be completed.",
    "Fix the lab workbook rows for this topic.",
    "warning",
    labs.length === 0 ? "No lab for this topic, which is allowed." : "Present and valid.",
  );

  // Sources
  const reading = pack.resources.reading[topicId];
  const videos = pack.resources.videos[topicId] ?? [];
  const urls = [reading?.url, ...videos.map((video) => video.url)].filter((url): url is string => Boolean(url));
  const invalid = urls.filter((url) => !/^https:\/\/[^\s]+\.[^\s]+/i.test(url));
  add(
    "sources",
    "Sources",
    urls.length > 0 && invalid.length === 0,
    urls.length === 0 ? "No reading or video source for this topic." : `${invalid.length} source link is not a valid address.`,
    "Learners cannot check the material against a real source.",
    "Add or correct the source for this topic, then re-run the link check.",
    "warning",
  );
  const uniqueUrls = new Set(urls);
  add(
    "duplicate-sources",
    "No duplicate sources",
    uniqueUrls.size === urls.length,
    "The same source is listed more than once.",
    "The reading list repeats itself.",
    "Remove the repeated source.",
    "warning",
  );

  // Concept mappings / remediation targets
  const validSections = new Set(lessonConceptSections(topicId, pack.getDeepLesson(topicId)).map((section) => section.id));
  const unmapped = pool.filter((question) => !question.lessonSectionId);
  const brokenMapping = pool.filter(
    (question) => question.lessonSectionId && !validSections.has(question.lessonSectionId),
  );
  add(
    "concept-mapping",
    "Concept mappings",
    unmapped.length === 0,
    `${unmapped.length} question${unmapped.length === 1 ? " has" : "s have"} no lesson section mapping.`,
    `"Review this concept" has nowhere to send the learner.`,
    "Fill the lesson-section column in the quiz workbook.",
    "warning",
  );
  add(
    "remediation-targets",
    "Remediation targets",
    brokenMapping.length === 0,
    `${brokenMapping.length} question${brokenMapping.length === 1 ? " points" : " point"} at a lesson section that does not exist.`,
    "Review links open nothing.",
    "Correct the lesson-section column, or add the missing lesson part.",
  );

  // Assessment material that was not taught. Concept coverage decides this:
  // different wording from the lesson is fine and wanted; untaught technical
  // knowledge is not.
  const judged = topicCoverage(pack, topicId, options.courseVocabulary ?? courseVocabulary(pack));
  const flagged = judged.filter((finding) => finding.verdict !== "pass");
  const failing = flagged.filter((finding) => finding.verdict === "fail");
  const reviewing = flagged.filter((finding) => finding.verdict === "review");
  add(
    "taught",
    "Only what was taught",
    failing.length === 0,
    `${failing.length} question${failing.length === 1 ? " needs" : "s need"} knowledge this topic never teaches: ${failing
      .slice(0, 3)
      .map((finding) => finding.missingKnowledge.slice(0, 4).join(", "))
      .join("; ")}.`,
    "Learners are tested on material this topic never covered.",
    "Teach the concept in the lesson where it belongs, or move or replace the question.",
  );
  // Only genuinely undertaught coverage is worth the owner's attention. A
  // question that leans on a concept another topic teaches is a normal
  // cross-topic link and is reported, not warned about.
  const indirect = reviewing.filter((finding) => finding.reviewKind !== "elsewhere");
  const elsewhere = reviewing.length - indirect.length;
  add(
    "taught-review",
    "Concept coverage review",
    indirect.length === 0,
    `${indirect.length} question${indirect.length === 1 ? " leans" : "s lean"} on coverage this lesson only implies.`,
    "A beginner may have to infer something this lesson only implies.",
    "Read the coverage list and either say it plainly once, or link the prerequisite.",
    "warning",
    elsewhere === 0
      ? "Every question rests on concepts this topic or its prerequisites teach."
      : `${elsewhere} question${elsewhere === 1 ? " builds" : "s build"} on a concept taught in another topic, which is fine.`,
  );


  // Prerequisites resolve
  const known = new Set(pack.sections.map((section) => section.id));
  const missingPrereqs = (topic.prerequisiteTopicIds ?? []).filter((id) => !known.has(id));
  add(
    "prerequisites",
    "Prerequisites",
    missingPrereqs.length === 0,
    `Unknown prerequisite${missingPrereqs.length === 1 ? "" : "s"}: ${missingPrereqs.join(", ")}.`,
    "The topic can never unlock.",
    "Point the prerequisite at a topic that exists.",
  );

  // Findings from the existing quality pipeline, kept authoritative.
  const mine = (options.findings ?? []).filter(
    (finding) => finding.subjectId === `topic:${topicId}` || pool.some((q) => finding.subjectId === `question:${q.id}`),
  );
  if (mine.length > 0) {
    const blocking = mine.filter((finding) => finding.severity === "blocking");
    checks.push(
      check({
        id: `content:${topicId}:quality-audit`,
        label: "Quality audit",
        state: blocking.length > 0 ? "failed" : "warning",
        detail: `${mine.length} finding${mine.length === 1 ? "" : "s"}: ${mine.slice(0, 5).map((f) => `${f.ruleId} — ${f.detail}`).join("; ")}`,
        affects: blocking.length > 0 ? "This topic is not fit to publish." : "Worth fixing, but nothing is blocked.",
        action: "Open the topic report and fix each rule listed.",
        subjectId: topicId,
        lastRunAt: ranAt,
      }),
    );
  } else if (options.findings) {
    checks.push(
      check({
        id: `content:${topicId}:quality-audit`,
        label: "Quality audit",
        state: "healthy",
        detail: "The deterministic quality rules found nothing.",
        affects: "",
        action: "Nothing to do.",
        subjectId: topicId,
        lastRunAt: ranAt,
      }),
    );
  }

  return checks;
}

export interface TopicHealth {
  topicId: string;
  title: string;
  state: "healthy" | "warning" | "failed";
  failed: number;
  warnings: number;
  checks: HealthCheck[];
}

export function contentHealth(pack: CoursePack, options: TopicHealthOptions = {}): TopicHealth[] {
  const vocabulary = options.courseVocabulary ?? courseVocabulary(pack);
  return pack.sections.map((topic) => {
    const checks = topicHealthChecks(pack, topic.id, { ...options, courseVocabulary: vocabulary });
    const failed = checks.filter((item) => item.state === "failed").length;
    const warnings = checks.filter((item) => item.state === "warning").length;
    return {
      topicId: topic.id,
      title: topic.title,
      state: failed > 0 ? "failed" : warnings > 0 ? "warning" : "healthy",
      failed,
      warnings,
      checks,
    };
  });
}
