/**
 * Independent QA for a generated subject.
 *
 * This never talks to the generator and never trusts it. It reads the draft as
 * data, applies the same rule book the live material is held to, and returns
 * findings with a stable rule id and a stable subject id on every line, so the
 * corrector can be pointed at exactly one broken item instead of rewriting the
 * whole subject.
 */
import type { Finding } from "@/lib/quality/types";
import { getRule } from "@/lib/quality/rules";
import { questionIssues } from "@/lib/question-quality";
import { checkTechnicalClaims } from "@/lib/technical-validation";
import type { Question } from "@/lib/app-data/types";
import type { DomainDraft } from "./brief";
import type { TopicSeed } from "@/data/curriculum/builder";
import { lessonQualityIssues } from "@/lib/lesson-quality";

function note(out: Finding[], ruleId: string, subjectId: string, detail: string): void {
  const rule = getRule(ruleId);
  if (!rule) throw new Error(`Unknown rule: ${ruleId}`);
  out.push({ ruleId, severity: rule.severity, subjectId, detail });
}

/** Everything a seed teaches, as one block of text. */
export function seedText(seed: TopicSeed): string {
  return [
    seed.summary,
    seed.lesson.body,
    seed.lesson.definition,
    seed.lesson.whyItMatters,
    seed.lesson.summary,
    ...seed.lesson.keyTerms.map(([term, meaning]) => `${term}: ${meaning}`),
    ...seed.lesson.examples,
    ...seed.lesson.misconceptions,
    ...seed.module.howItWorks,
    ...seed.module.commonProblems,
    ...seed.module.troubleshooting,
  ].join("\n");
}

/** The draft's practice item, shaped as a question so the usual checks apply. */
function practiceAsQuestion(seed: TopicSeed): Question {
  const correct = seed.practice.choices[seed.practice.answerIndex] ?? "";
  return {
    id: `practice-${seed.slug}`,
    topicId: `topic-${seed.slug}`,
    type: "multiple_choice",
    prompt: seed.practice.prompt,
    choices: seed.practice.choices,
    correctAnswer: [correct],
    explanation: seed.practice.explanation,
    difficulty: seed.difficulty,
  } as Question;
}

export interface DraftAudit {
  findings: Finding[];
  blocking: number;
  warnings: number;
  passed: boolean;
  scope: { qualifications: number; sections: number };
}

/** Audit a whole draft subject. */
export function auditDomainDraft(draft: DomainDraft): DraftAudit {
  const findings: Finding[] = [];
  const slugs = new Set(draft.seeds.map((seed) => seed.slug));
  const qualificationIds = new Set(draft.qualifications.map((q) => q.id));
  const seen = new Set<string>();

  if (draft.definition.field.trim().length < 3) {
    note(findings, "domain.definition-complete", "domain:definition", "The field is missing or too short.");
  }
  if (!draft.definition.defaultQualification || !draft.qualifications.some((q) => q.title === draft.definition.defaultQualification)) {
    note(
      findings,
      "domain.definition-complete",
      "domain:definition",
      "The starting qualification is not one of the qualifications in this subject.",
    );
  }
  for (const word of Object.values(draft.definition.vocabulary)) {
    if (!word || word !== word.toLowerCase()) {
      note(findings, "domain.definition-complete", "domain:vocabulary", `Vocabulary word "${word}" must be lowercase and present.`);
    }
  }

  for (const qualification of draft.qualifications) {
    if (qualification.objectives.length < 3) {
      note(
        findings,
        "domain.qualification-has-objectives",
        `qualification:${qualification.id}`,
        `${qualification.title} has ${qualification.objectives.length} objectives, which is not enough to build a blueprint from.`,
      );
    }
    const covered = draft.seeds.filter((seed) => seed.cert === qualification.id);
    if (covered.length === 0) {
      note(
        findings,
        "domain.qualification-has-sections",
        `qualification:${qualification.id}`,
        `${qualification.title} has no sections.`,
      );
    }
  }

  for (const seed of draft.seeds) {
    const id = `section:${seed.slug}`;
    if (seen.has(seed.slug)) {
      note(findings, "domain.section-id-unique", id, "Two sections share this id.");
    }
    seen.add(seed.slug);

    if (!qualificationIds.has(seed.cert)) {
      note(findings, "domain.section-belongs-to-qualification", id, `Names a qualification that does not exist: ${seed.cert}.`);
    }
    for (const prereq of seed.prereqs) {
      if (!slugs.has(prereq)) {
        note(findings, "structure.prerequisites-resolve", id, `Prerequisite ${prereq} is not a section in this subject.`);
      }
      if (prereq === seed.slug) {
        note(findings, "structure.prerequisites-resolve", id, "A section cannot require itself.");
      }
    }

    const text = seedText(seed);
    if (text.length < 600) {
      note(findings, "content.lesson-has-substance", id, `Only ${text.length} characters of teaching text.`);
    }
    if (seed.objectives.length === 0) {
      note(findings, "structure.topic-has-lesson", id, "No learning objectives.");
    }
    if (!seed.lesson.body || seed.lesson.body.length < 80) {
      note(findings, "structure.topic-has-lesson", id, "The lesson has no real introduction.");
    }
    if (seed.lesson.keyTerms.length < 3) {
      note(findings, "content.lesson-has-substance", id, "Fewer than three key terms.");
    }
    const lesson = {
      id: `lesson-${seed.slug}`,
      topicId: `topic-${seed.slug}`,
      title: seed.lesson.title,
      body: seed.lesson.body,
      definition: seed.lesson.definition,
      whyItMatters: seed.lesson.whyItMatters,
      keyTerms: seed.lesson.keyTerms.map(([term, meaning]) => ({ term, meaning })),
      realWorldExamples: seed.lesson.examples,
      commonMisconceptions: seed.lesson.misconceptions,
      summary: seed.lesson.summary,
      nextSteps: seed.lesson.nextSteps,
    };
    const topic = {
      id: `topic-${seed.slug}`,
      trackId: seed.cert,
      title: seed.title,
      summary: seed.summary,
      certificationId: seed.cert,
      year: 1 as const,
      month: seed.month,
      week: seed.week,
      difficulty: seed.difficulty,
      prerequisiteTopicIds: seed.prereqs.map((slug) => `topic-${slug}`),
      learningObjectives: seed.objectives,
      estimatedMinutes: seed.minutes,
    };
    for (const issue of lessonQualityIssues(topic, lesson)) {
      note(findings, "content.lesson-instructionally-sound", id, issue);
    }

    for (const issue of checkTechnicalClaims(text)) {
      note(findings, "content.lesson-numbers-hold-up", id, `${issue.problem} (${issue.claim})`);
    }

    if (seed.recall.length < 2) {
      note(findings, "domain.section-has-recall", id, "Fewer than two recall questions.");
    }
    for (const [index, row] of seed.recall.entries()) {
      const [prompt, accepted] = row;
      if (!prompt || prompt.trim().length < 12 || accepted.length === 0) {
        note(findings, "domain.section-has-recall", `${id}#recall-${index + 1}`, "Recall question has no prompt or no accepted answer.");
      }
    }

    const question = practiceAsQuestion(seed);
    for (const issue of questionIssues(question)) {
      note(findings, "questions.sound", `${id}#practice`, issue);
    }
    for (const issue of checkTechnicalClaims(`${question.prompt}\n${question.explanation ?? ""}`)) {
      note(findings, "questions.numbers-hold-up", `${id}#practice`, `${issue.problem} (${issue.claim})`);
    }
    if (!seed.practice.explanation || seed.practice.explanation.length < 20) {
      note(findings, "questions.explained", `${id}#practice`, "The practice answer is not explained.");
    }

    const sources = draft.sources[seed.slug] ?? [];
    if (sources.length === 0) {
      note(findings, "domain.section-has-sources", id, "No outside reference source.");
    }
    for (const source of sources) {
      if (!/^https:\/\/[^\s]+$/.test(source.url)) {
        note(findings, "domain.section-has-sources", id, `Source link is not a plain https address: ${source.url}`);
      }
    }
  }

  const blocking = findings.filter((f) => f.severity === "blocking").length;
  return {
    findings,
    blocking,
    warnings: findings.length - blocking,
    passed: blocking === 0,
    scope: { qualifications: draft.qualifications.length, sections: draft.seeds.length },
  };
}

/** The sections a set of findings blames, so only those get rewritten. */
export function failingSections(findings: Finding[]): string[] {
  return [
    ...new Set(
      findings
        .filter((finding) => finding.severity === "blocking" && finding.subjectId.startsWith("section:"))
        .map((finding) => finding.subjectId.slice("section:".length).split("#")[0] ?? "")
        .filter(Boolean),
    ),
  ];
}
