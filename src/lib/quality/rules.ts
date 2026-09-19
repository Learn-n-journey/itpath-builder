/**
 * The rule book.
 *
 * Every standard the material has to meet is written here once, in the open,
 * with a stable id so a result can be pointed at the exact rule that produced
 * it. Nothing in here looks at the material itself; it only says what the
 * standards are and how serious each one is. The audit applies them.
 */

export type Severity = "blocking" | "warning";

export interface QualityRule {
  /** Never changes once published, so history stays comparable. */
  id: string;
  area: "structure" | "content" | "questions" | "papers" | "concepts";
  severity: Severity;
  /** What the rule demands, in plain words. */
  says: string;
}

export const qualityRules: QualityRule[] = [
  {
    id: "structure.topic-has-lesson",
    area: "structure",
    severity: "blocking",
    says: "Every section has a lesson with real teaching text behind it.",
  },
  {
    id: "structure.prerequisites-resolve",
    area: "structure",
    severity: "blocking",
    says: "Every prerequisite a section names is a section that exists.",
  },
  {
    id: "content.lesson-numbers-hold-up",
    area: "content",
    severity: "blocking",
    says: "Numbers and facts stated in a lesson survive a deterministic check.",
  },
  {
    id: "content.lesson-has-substance",
    area: "content",
    severity: "blocking",
    says: "A lesson carries enough teaching text to stand on its own.",
  },
  {
    id: "content.lesson-instructionally-sound",
    area: "content",
    severity: "blocking",
    says: "A lesson uses observable objectives, meaningful definitions, distinct examples and complete worked instruction.",
  },
  {
    id: "questions.sound",
    area: "questions",
    severity: "blocking",
    says: "A question has one correct answer and wrong options that belong to the same subject.",
  },
  {
    id: "questions.numbers-hold-up",
    area: "questions",
    severity: "blocking",
    says: "Numbers in a question, its answer and its explanation survive a deterministic check.",
  },
  {
    id: "questions.explained",
    area: "questions",
    severity: "warning",
    says: "A question tells the learner why the answer is the answer.",
  },
  {
    id: "papers.section-quiz-whole",
    area: "papers",
    severity: "blocking",
    says: "A section quiz holds exactly the number of sound, unique questions the subject declares, all from that section.",
  },
  {
    id: "papers.stage-exam-whole",
    area: "papers",
    severity: "blocking",
    says: "A stage exam holds exactly the number of sound, unique questions the subject declares, all from that stage.",
  },
  {
    id: "concepts.stable-id",
    area: "concepts",
    severity: "blocking",
    says: "A question keeps the same concept id every time it is asked, inside its own section.",
  },
  {
    id: "domain.definition-complete",
    area: "structure",
    severity: "blocking",
    says: "A subject names its field, its starting qualification and what its parts are called.",
  },
  {
    id: "domain.qualification-has-objectives",
    area: "structure",
    severity: "blocking",
    says: "Every qualification lists the published objectives it is measured against.",
  },
  {
    id: "domain.qualification-has-sections",
    area: "structure",
    severity: "blocking",
    says: "Every qualification has sections that teach towards it.",
  },
  {
    id: "domain.section-id-unique",
    area: "structure",
    severity: "blocking",
    says: "Every section has an id that is used once in the subject.",
  },
  {
    id: "domain.section-belongs-to-qualification",
    area: "structure",
    severity: "blocking",
    says: "Every section belongs to a qualification that exists in the subject.",
  },
  {
    id: "domain.section-has-recall",
    area: "questions",
    severity: "blocking",
    says: "Every section carries recall practice with accepted answers.",
  },
  {
    id: "domain.section-has-sources",
    area: "content",
    severity: "warning",
    says: "Every section points at outside material that can be checked.",
  },
  {
    id: "structure.prerequisites-acyclic",
    area: "structure",
    severity: "blocking",
    says: "Prerequisites never form a loop, so every section can be reached by learning in order.",
  },
  {
    id: "questions.not-repeated",
    area: "questions",
    severity: "warning",
    says: "The same question is never asked twice in one subject.",
  },
  {
    id: "content.lesson-matches-objectives",
    area: "content",
    severity: "warning",
    says: "A lesson teaches the objectives its section claims to cover.",
  },
  {
    id: "papers.covers-taught-material",
    area: "papers",
    severity: "warning",
    says: "A paper only tests objectives that some section in the subject actually teaches.",
  },
  {
    id: "content.no-filler",
    area: "content",
    severity: "warning",
    says: "A lesson carries real teaching text, not placeholders or repeated sentences.",
  },
  {
    id: "questions.semantic-consistency",
    area: "questions",
    severity: "blocking",
    says: "Answer choices match the semantic and grammatical format requested by the question prompt.",
  },
  {
    id: "questions.multiple-choice-sound",
    area: "questions",
    severity: "warning",
    says: "A multiple choice item inside a subject package has one correct answer and fair wrong options.",
  },
  {
    id: "content.sources-usable",
    area: "content",
    severity: "blocking",
    says: "Every cited source is a labelled https address that is not a placeholder.",
  },
];

const byId = new Map(qualityRules.map((rule) => [rule.id, rule] as const));

export function getRule(id: string): QualityRule | undefined {
  return byId.get(id);
}
