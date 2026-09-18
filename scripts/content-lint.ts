/**
 * Post-processing content linter.
 *
 * Run with: bun run lint:content
 *
 * Parses the generated curriculum and reports, without touching anything:
 *  - number and fact discrepancies (storage, subnets, ports, arithmetic)
 *  - quiz questions that cannot be answered as written
 *  - lesson text that repeats another lesson closely enough to look copied
 *
 * Exits non zero when anything is found, so a pipeline can stop on it.
 */
import { lessons, questions as storedQuestions, topics } from "@/data/static-content";
import { getStageExamQuestions, stageExams } from "@/data/stage-exams";
import { getSectionQuizQuestions } from "@/data/topic-quizzes";
import { buildReference, checkOriginality } from "@/lib/originality";
import { checkTechnicalClaims } from "@/lib/technical-validation";

interface Finding {
  area: string;
  where: string;
  detail: string;
}

const findings: Finding[] = [];

// Everything a learner can actually be asked: stored items, the generated
// section quizzes (two rotations each) and the stage exams.
const questions = [
  ...storedQuestions,
  ...topics.flatMap((topic) => [...getSectionQuizQuestions(topic.id, 0), ...getSectionQuizQuestions(topic.id, 1)]),
  ...stageExams.flatMap((exam) => getStageExamQuestions(exam.id)),
];

function lessonText(topicId: string): string {
  const lesson = lessons.find((item) => item.topicId === topicId);
  if (!lesson) return "";
  return [
    lesson.body,
    lesson.definition,
    lesson.whyItMatters,
    lesson.summary,
    ...lesson.realWorldExamples,
    ...lesson.commonMisconceptions,
    ...lesson.keyTerms.map((term) => `${term.term}: ${term.meaning}`),
  ].join("\n");
}

// 1. Numbers and facts.
for (const topic of topics) {
  for (const issue of checkTechnicalClaims(lessonText(topic.id))) {
    findings.push({ area: "numbers", where: topic.title, detail: `${issue.claim.trim()} -> ${issue.problem}` });
  }
}
for (const question of questions) {
  const text = `${question.prompt} ${question.correctAnswer.join(" ")} ${question.explanation ?? ""}`;
  for (const issue of checkTechnicalClaims(text)) {
    findings.push({ area: "numbers", where: question.id, detail: `${issue.claim.trim()} -> ${issue.problem}` });
  }
}

// 2. Questions that cannot be answered as written.
for (const question of questions) {
  const options = question.choices ?? [];
  const correct = question.correctAnswer ?? [];
  if (question.prompt.trim().length < 15) {
    findings.push({ area: "questions", where: question.id, detail: "The question is too short to answer." });
  }
  if (options.length > 0) {
    const missing = correct.filter((answer) => !options.includes(answer));
    if (missing.length) {
      findings.push({ area: "questions", where: question.id, detail: `Correct answer is not one of the choices: ${missing.join(", ")}` });
    }
    const unique = new Set(options.map((option) => option.trim().toLowerCase()));
    if (unique.size !== options.length) {
      findings.push({ area: "questions", where: question.id, detail: "Two choices are the same." });
    }
  }
  if (correct.length === 0) {
    findings.push({ area: "questions", where: question.id, detail: "No correct answer recorded." });
  }
  if (!question.explanation || question.explanation.trim().length < 20) {
    findings.push({ area: "questions", where: question.id, detail: "No usable explanation." });
  }
}

// 3. Lessons that repeat each other.
for (const topic of topics) {
  const text = lessonText(topic.id);
  if (text.length < 400) continue;
  const others = topics.filter((other) => other.id !== topic.id).map((other) => lessonText(other.id));
  const result = checkOriginality(text, buildReference(others), { threshold: 0.2 });
  if (result.flagged) {
    findings.push({
      area: "originality",
      where: topic.title,
      detail: `${Math.round(result.overlap * 100)}% of this lesson matches other lessons word for word. Longest run: "${result.matches[0]?.slice(0, 120) ?? ""}"`,
    });
  }
}

const byArea = findings.reduce<Record<string, number>>((acc, finding) => {
  acc[finding.area] = (acc[finding.area] ?? 0) + 1;
  return acc;
}, {});

console.log(`Checked ${topics.length} sections and ${questions.length} questions.`);
if (findings.length === 0) {
  console.log("No content problems found.");
  process.exit(0);
}

console.log(`\n${findings.length} problems found:`, byArea);
for (const finding of findings.slice(0, 200)) {
  console.log(`- [${finding.area}] ${finding.where}: ${finding.detail}`);
}
if (findings.length > 200) console.log(`...and ${findings.length - 200} more.`);
process.exit(1);
