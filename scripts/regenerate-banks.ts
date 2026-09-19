/**
 * Rewrite every question bank in an existing subject under the current quality
 * checks, and write the result as a new version.
 *
 * The questions are the only thing that changes: lessons, sections, sources and
 * assessments are carried over exactly as they were approved. Nothing is edited
 * in place, so the old version stays on disk and the change is reversible.
 *
 * Run with: bun run scripts/regenerate-banks.ts auto-repair@3.0.0 3.1.0
 */
import { emitPackage } from "@/lib/domain/emit.server";
import { generateQuestionBank } from "@/lib/domain/generate.server";
import { auditPackage } from "@/lib/domain/package-audit";
import { findEntry } from "@/domain/registry";
import type { DomainPackage, DomainQuestion } from "@/domain/package";
import { questionIssues } from "@/lib/question-quality";
import type { TopicSeed } from "@/data/curriculum/builder";
import type { DomainBrief } from "@/lib/domain/brief";

const [, , key, nextVersion] = process.argv;
if (!key || !nextVersion) {
  console.error("Give me a package key and the new version: bun run scripts/regenerate-banks.ts auto-repair@3.0.0 3.1.0");
  process.exit(2);
}

const entry = findEntry(key);
if (!entry) {
  console.error(`No registered package called ${key}.`);
  process.exit(2);
}

const pkg: DomainPackage | undefined = entry.packageSync ?? (entry.load ? await entry.load() : undefined);
if (!pkg) {
  console.error(`${key} carries no package to read.`);
  process.exit(2);
}
const perSection = Number(process.env["QUESTIONS_PER_SECTION"] ?? 40);

const brief: DomainBrief = {
  id: pkg.definition.id,
  field: pkg.definition.field,
  qualifications: pkg.qualifications.map((qualification) => qualification.title),
};

const bankOf = (question: DomainQuestion) => question.kind === "practice" && question.id.includes("-bank-");

/** Everything the writer needs to ask about one section, taken from the package. */
function seedFor(sectionId: string): TopicSeed | null {
  const section = pkg.sections.find((row) => row.id === sectionId);
  const lesson = pkg.lessons.find((row) => row.sectionId === sectionId);
  if (!section || !lesson) return null;
  const detail = pkg.moduleDetails?.find((row) => row.sectionId === sectionId);
  const practice = pkg.questions.find((row) => row.sectionId === sectionId && !bankOf(row));
  return {
    slug: section.slug,
    title: section.title,
    summary: section.summary,
    cert: section.qualificationId,
    month: 1,
    week: 1,
    difficulty: "standard",
    prereqs: [],
    minutes: 45,
    objectives: section.objectiveIds,
    lesson: {
      title: lesson.title,
      body: lesson.body,
      definition: lesson.definition,
      whyItMatters: lesson.whyItMatters,
      keyTerms: [],
      examples: lesson.realWorldExamples ?? [],
      misconceptions: lesson.commonMisconceptions ?? [],
      summary: lesson.summary,
      nextSteps: lesson.nextSteps ?? [],
    },
    module: {
      howItWorks: [],
      whereYouSeeIt: detail?.whereYouSeeIt ?? [],
      commonProblems: detail?.commonProblems ?? [],
      howItFails: detail?.howItFails ?? [],
      troubleshooting: detail?.troubleshooting ?? [],
      practicalKnowledge: [],
      examCoverage: [],
      interviewQuestions: detail?.interviewQuestions ?? [],
    },
    recall: [],
    practice: {
      title: section.title,
      prompt: practice?.prompt ?? "",
      choices: practice?.choices ?? [],
      answerIndex: practice?.answerIndex ?? 0,
      explanation: practice?.explanation ?? "",
    },
  };
}

const limit = Number(process.env["SECTION_LIMIT"] ?? 0);
// A top-up run only revisits sections whose bank came out short, and keeps the
// questions that already passed.
const minBank = Number(process.env["MIN_BANK"] ?? 0);
const merge = process.env["MERGE"] === "1";
const bankCount = (sectionId: string) =>
  pkg.questions.filter((question) => bankOf(question) && question.sectionId === sectionId).length;
const all = pkg.sections
  .slice()
  .sort((a, b) => a.order - b.order)
  .filter((section) => (minBank > 0 ? bankCount(section.id) < minBank : true));
const sections = limit > 0 ? all.slice(0, limit) : all;
const written = new Map<string, DomainQuestion[]>();
const queue = [...sections];
let done = 0;

await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (;;) {
      const section = queue.shift();
      if (!section) return;
      const seed = seedFor(section.id);
      if (!seed) continue;
      const already = merge
        ? pkg.questions.filter((q) => bankOf(q) && q.sectionId === section.id).map((q) => q.prompt)
        : [];
      const bank = await generateQuestionBank(brief, seed, Math.max(0, perSection - already.length), {
        existing: already,
        nonce: merge ? nextVersion : "",
      });
      written.set(
        section.id,
        bank.map((row, index) => ({
          id: `${pkg.definition.id}:question:${section.slug}-bank-${(merge ? bankCount(section.id) : 0) + index + 1}`,
          sectionId: section.id,
          kind: "practice" as const,
          prompt: row.prompt,
          choices: row.choices,
          answerIndex: row.answerIndex,
          explanation: row.explanation,
        })),
      );
      done += 1;
      console.log(`[regenerate] ${section.slug}: ${bank.length} questions (${done}/${sections.length})`);
    }
  }),
);

const touched = new Set(sections.map((section) => section.id));
const kept = pkg.questions.filter(
  (question) => merge || !bankOf(question) || !touched.has(question.sectionId),
);
const questions = [...kept, ...sections.flatMap((section) => written.get(section.id) ?? [])];

// Nothing that fails the checks stays in the course, including questions this
// run did not rewrite.
const clean = questions.filter((question) => {
  const answer = question.choices[question.answerIndex];
  if (!answer) return false;
  return (
    questionIssues({
      id: question.id,
      topicId: question.sectionId,
      prompt: question.prompt,
      type: "multiple_choice",
      choices: question.choices,
      correctAnswer: [answer],
      acceptableAnswers: [answer],
      explanation: question.explanation,
      quizId: question.sectionId,
      certificationId: pkg.definition.id,
      difficulty: "standard",
      mistakeCategory: "concept",
      requiresReasoning: true,
    }) .length === 0
  );
});
console.log(`[sweep] removed ${questions.length - clean.length} questions that did not pass`);

const next: DomainPackage = {
  ...pkg,
  manifest: {
    ...pkg.manifest,
    version: nextVersion,
    key: `${pkg.manifest.id}@${nextVersion}`,
    status: "draft",
    producedAt: new Date().toISOString(),
    scope: { ...pkg.manifest.scope, questions: clean.length },
  },
  questions: clean,
};

const audit = auditPackage(next);
console.log(`[qa] package audit: ${audit.blocking} blocking, ${audit.warnings} warnings`);
const emitted = emitPackage({
  ...next,
  manifest: { ...next.manifest, status: audit.passed ? "approved" : "draft" },
});
console.log(`[write] ${emitted.folder}${emitted.registered ? " and registered" : ""}`);
console.log(
  audit.passed
    ? `Fit to activate: bun run domain:activate -- ${next.manifest.key}`
    : "Held back as a draft. Read the findings above before activating.",
);
