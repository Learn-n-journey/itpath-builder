/**
 * The deterministic checks a package has to survive beyond its shape.
 *
 * `package-audit.ts` proves a package is well formed: ids resolve, nothing is
 * orphaned, counts agree. These checks ask the harder question a schema can
 * never answer — is the material actually fit to teach? They are arithmetic,
 * set logic and string comparison only. No AI is consulted, and nothing here
 * knows what subject is being taught.
 */
import { questionIssues } from "@/lib/question-quality";
import { checkTechnicalClaims } from "@/lib/technical-validation";
import { getRule } from "@/lib/quality/rules";
import type { Finding } from "@/lib/quality/types";
import type { DomainLesson, DomainPackage, DomainQuestion } from "@/domain/package";
import type { Question } from "@/lib/app-data/types";

function note(out: Finding[], ruleId: string, subjectId: string, detail: string): void {
  const rule = getRule(ruleId);
  out.push({ ruleId, severity: rule?.severity ?? "blocking", subjectId, detail });
}

/** Hosts that can never be a real reference, whatever the subject. */
const PLACEHOLDER_HOSTS = [
  "example.com",
  "example.org",
  "example.net",
  "localhost",
  "127.0.0.1",
  "test.invalid",
  "your-site-here",
  "todo",
];

const FILLER_MARKERS = /\b(lorem ipsum|tbd|to be determined|coming soon|placeholder|todo|xxx+|fill me in|insert text here)\b/i;

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "their", "there", "these", "those",
  "which", "when", "what", "will", "have", "been", "used", "using", "each", "such", "them", "they",
  "about", "other", "than", "then", "also", "more", "most", "some", "only", "over", "does", "your",
]);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP.has(word)),
  );
}

function shares(a: Set<string>, b: Set<string>): boolean {
  for (const word of a) if (b.has(word)) return true;
  return false;
}

/** A package question read as the multiple choice item the app would show. */
export function asRuntimeQuestion(question: DomainQuestion): Question {
  return {
    id: question.id,
    topicId: question.sectionId,
    type: "multiple_choice",
    prompt: question.prompt,
    choices: question.choices,
    correctAnswer: [question.choices[question.answerIndex] ?? ""],
    explanation: question.explanation,
    difficulty: "core",
  } as unknown as Question;
}

/** Everything a section teaches, as one block of text. */
export function packageLessonText(lesson: DomainLesson): string {
  return [lesson.title, lesson.definition, lesson.body, lesson.whyItMatters, lesson.summary]
    .filter(Boolean)
    .join("\n");
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 12);
}

export function checkLessons(pkg: DomainPackage): Finding[] {
  const findings: Finding[] = [];
  const objectiveText = new Map<string, string>();
  for (const qualification of pkg.qualifications) {
    for (const objective of qualification.objectives) objectiveText.set(objective.id, `${objective.domain} ${objective.text}`);
  }

  for (const lesson of pkg.lessons) {
    const subject = `lesson:${lesson.sectionId}`;
    const text = packageLessonText(lesson);

    if (FILLER_MARKERS.test(text)) {
      note(findings, "content.no-filler", subject, "The lesson still contains placeholder text.");
    }
    if (lesson.body.trim().length < 120) {
      note(findings, "content.no-filler", subject, `The lesson body is only ${lesson.body.trim().length} characters.`);
    }
    const lines = sentences(lesson.body);
    if (lines.length >= 3 && new Set(lines).size <= Math.floor(lines.length / 2)) {
      note(findings, "content.no-filler", subject, "The lesson repeats the same sentences instead of teaching.");
    }

    for (const issue of checkTechnicalClaims(text)) {
      note(findings, "content.lesson-numbers-hold-up", subject, `${issue.claim.trim()} -> ${issue.problem}`);
    }

    const section = pkg.sections.find((item) => item.id === lesson.sectionId);
    // A section may name objectives by id or spell them out; both are read.
    const claimed = (section?.objectiveIds ?? []).map((id) => objectiveText.get(id) ?? id).filter(Boolean);
    if (claimed.length > 0) {
      const taught = words(text);
      const matched = claimed.some((objective) => shares(words(objective), taught));
      if (!matched) {
        note(
          findings,
          "content.lesson-matches-objectives",
          subject,
          "The lesson shares no subject matter with any objective the section claims to teach.",
        );
      }
    }
  }
  return findings;
}

export function checkQuestions(pkg: DomainPackage): Finding[] {
  const findings: Finding[] = [];
  const seenPrompts = new Map<string, string>();

  for (const question of pkg.questions) {
    const subject = `question:${question.id}`;
    const key = question.prompt.trim().toLowerCase().replace(/\s+/g, " ");
    const first = seenPrompts.get(key);
    if (first && first !== question.id) {
      note(findings, "questions.not-repeated", subject, `The same question is already asked as ${first}.`);
    } else {
      seenPrompts.set(key, question.id);
    }

    // Only choice-bearing items are judged as multiple choice. Open recall
    // prompts are checked by the package auditor's own recall rule.
    if (question.kind !== "recall" && question.choices.length >= 2) {
      for (const issue of questionIssues(asRuntimeQuestion(question))) {
        note(findings, "questions.multiple-choice-sound", subject, issue);
      }
    }
    for (const issue of checkTechnicalClaims(`${question.prompt}\n${question.choices.join("\n")}\n${question.explanation}`)) {
      note(findings, "questions.numbers-hold-up", subject, `${issue.claim.trim()} -> ${issue.problem}`);
    }
  }
  return findings;
}

/** A course whose prerequisites loop can never be started. */
export function checkPrerequisiteCycles(pkg: DomainPackage): Finding[] {
  const findings: Finding[] = [];
  const edges = new Map<string, string[]>();
  for (const link of pkg.prerequisites) {
    if (link.sectionId === link.requiresSectionId) {
      note(findings, "structure.prerequisites-acyclic", `prerequisite:${link.sectionId}`, "A section requires itself.");
      continue;
    }
    edges.set(link.sectionId, [...(edges.get(link.sectionId) ?? []), link.requiresSectionId]);
  }

  const state = new Map<string, "open" | "done">();
  const reported = new Set<string>();
  const walk = (node: string, trail: string[]): void => {
    if (state.get(node) === "done") return;
    if (state.get(node) === "open") {
      const loop = [...trail.slice(trail.indexOf(node)), node].join(" -> ");
      if (!reported.has(loop)) {
        reported.add(loop);
        note(findings, "structure.prerequisites-acyclic", `prerequisite:${node}`, `Prerequisites form a loop: ${loop}.`);
      }
      return;
    }
    state.set(node, "open");
    for (const next of edges.get(node) ?? []) walk(next, [...trail, node]);
    state.set(node, "done");
  };
  for (const node of edges.keys()) walk(node, []);
  return findings;
}

/** A paper may only ask for objectives some section in this package teaches. */
export function checkAssessmentCoverage(pkg: DomainPackage): Finding[] {
  const findings: Finding[] = [];
  const taught = new Set<string>();
  for (const section of pkg.sections) for (const id of section.objectiveIds) taught.add(id);
  const sectionsByQualification = new Map<string, number>();
  for (const section of pkg.sections) {
    sectionsByQualification.set(section.qualificationId, (sectionsByQualification.get(section.qualificationId) ?? 0) + 1);
  }

  for (const assessment of pkg.assessments) {
    const subject = `assessment:${assessment.id}`;
    for (const objectiveId of assessment.objectiveIds) {
      if (!taught.has(objectiveId)) {
        note(findings, "papers.covers-taught-material", subject, `The paper tests objective ${objectiveId}, which no section teaches.`);
      }
    }
    for (const qualificationId of assessment.coversQualificationIds) {
      if (!sectionsByQualification.get(qualificationId)) {
        note(findings, "papers.covers-taught-material", subject, `The paper proves ${qualificationId}, which has no sections teaching it.`);
      }
    }
  }
  return findings;
}

export function checkSources(pkg: DomainPackage): Finding[] {
  const findings: Finding[] = [];
  for (const source of pkg.sources) {
    const subject = `source:${source.sectionId}`;
    if (!/^https:\/\/[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(source.url)) {
      note(findings, "content.sources-usable", subject, `"${source.url}" is not a plain https web address.`);
      continue;
    }
    const host = source.url.replace(/^https:\/\//i, "").split("/")[0]?.toLowerCase() ?? "";
    if (PLACEHOLDER_HOSTS.some((bad) => host === bad || host.endsWith(`.${bad}`))) {
      note(findings, "content.sources-usable", subject, `"${source.url}" points at a placeholder address, not a real reference.`);
    }
    if (!source.label || source.label.trim().length < 4) {
      note(findings, "content.sources-usable", subject, `A source for this section has no usable label.`);
    }
  }
  return findings;
}

/** Every extra check, in one pass. */
export function extraPackageFindings(pkg: DomainPackage): Finding[] {
  return [
    ...checkLessons(pkg),
    ...checkQuestions(pkg),
    ...checkPrerequisiteCycles(pkg),
    ...checkAssessmentCoverage(pkg),
    ...checkSources(pkg),
  ];
}
