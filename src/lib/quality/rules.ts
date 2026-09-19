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
    severity: "warning",
    says: "A lesson carries enough teaching text to stand on its own.",
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
    says: "A section quiz holds exactly twenty sound, unique questions from that section.",
  },
  {
    id: "papers.stage-exam-whole",
    area: "papers",
    severity: "blocking",
    says: "A stage exam holds exactly fifty sound, unique questions from that stage.",
  },
  {
    id: "concepts.stable-id",
    area: "concepts",
    severity: "blocking",
    says: "A question keeps the same concept id every time it is asked, inside its own section.",
  },
];

const byId = new Map(qualityRules.map((rule) => [rule.id, rule] as const));

export function getRule(id: string): QualityRule | undefined {
  return byId.get(id);
}
