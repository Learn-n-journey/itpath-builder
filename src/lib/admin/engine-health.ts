/**
 * Learning engine diagnostics.
 *
 * Everything here is a pure read of the course material and the static
 * prerequisite graph. Nothing in this file touches a learner's saved state,
 * so running these checks can never change anyone's mastery or progress.
 */
import type { CoursePack } from "@/content/pack-contract";
import { lessonConceptSections } from "@/lib/lesson-concepts";
import type { HealthCheck } from "./types";

function check(part: Omit<HealthCheck, "area">): HealthCheck {
  return { area: "engine", ...part };
}

/** Every cycle in a directed graph of ids, reported once each. */
export function findCycles(edges: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const seen = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();

  const walk = (node: string) => {
    if (onStack.has(node)) {
      const start = stack.indexOf(node);
      if (start >= 0) {
        const cycle = [...stack.slice(start), node];
        const key = [...new Set(cycle)].sort().join(">");
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      }
      return;
    }
    if (stack.includes(node)) return;
    stack.push(node);
    onStack.add(node);
    for (const next of edges.get(node) ?? []) walk(next);
    stack.pop();
    onStack.delete(node);
  };

  for (const node of edges.keys()) walk(node);
  return cycles;
}

export function engineHealthChecks(pack: CoursePack, ranAt: string | null = null): HealthCheck[] {
  const checks: HealthCheck[] = [];
  const add = (
    id: string,
    label: string,
    ok: boolean,
    failDetail: string,
    affects: string,
    action: string,
    severity: "failed" | "warning" = "failed",
    okDetail = "No problems found.",
  ) =>
    checks.push(
      check({
        id: `engine:${id}`,
        label,
        state: ok ? "healthy" : severity,
        detail: ok ? okDetail : failDetail,
        affects,
        action: ok ? "Nothing to do." : action,
        lastRunAt: ranAt,
      }),
    );

  const sections = pack.sections;
  const known = new Set(sections.map((section) => section.id));

  // Topic prerequisite cycles
  const topicEdges = new Map(sections.map((section) => [section.id, (section.prerequisiteTopicIds ?? []).filter((id) => known.has(id))]));
  const topicCycles = findCycles(topicEdges);
  add(
    "topic-cycles",
    "Topic prerequisite loops",
    topicCycles.length === 0,
    `${topicCycles.length} loop${topicCycles.length === 1 ? "" : "s"}: ${topicCycles.slice(0, 3).map((cycle) => cycle.join(" → ")).join("; ")}`,
    "Every topic in the loop stays locked forever.",
    "Remove one prerequisite from each loop.",
  );

  // Skill graph cycles
  const skillEdges = new Map(pack.prerequisites.map((skill) => [skill.id, skill.prerequisiteSkillIds ?? []]));
  const skillCycles = findCycles(skillEdges);
  add(
    "skill-cycles",
    "Skill prerequisite loops",
    skillCycles.length === 0,
    `${skillCycles.length} loop${skillCycles.length === 1 ? "" : "s"}: ${skillCycles.slice(0, 3).map((cycle) => cycle.join(" → ")).join("; ")}`,
    "Review recommendations can chase their own tail.",
    "Break the loop in the skill graph.",
  );

  // Missing prerequisites
  const missing = sections.flatMap((section) =>
    (section.prerequisiteTopicIds ?? []).filter((id) => !known.has(id)).map((id) => `${section.id} → ${id}`),
  );
  add(
    "missing-prerequisites",
    "Prerequisites all exist",
    missing.length === 0,
    `${missing.length} prerequisite${missing.length === 1 ? "" : "s"} point at nothing: ${missing.slice(0, 5).join(", ")}`,
    "Those topics can never unlock.",
    "Correct the prerequisite ids.",
  );

  const missingSkillLinks = pack.prerequisites.flatMap((skill) =>
    (skill.prerequisiteSkillIds ?? []).filter((id) => !skillEdges.has(id)).map((id) => `${skill.id} → ${id}`),
  );
  add(
    "missing-skills",
    "Skill links all exist",
    missingSkillLinks.length === 0,
    `${missingSkillLinks.length} skill link${missingSkillLinks.length === 1 ? "" : "s"} point at nothing: ${missingSkillLinks.slice(0, 5).join(", ")}`,
    "Weak-area recommendations skip those skills.",
    "Correct the skill graph ids.",
    "warning",
  );

  // Impossible progression: a learner can enter the topic but can never pass it.
  const required = pack.assessmentSizes.sectionQuiz;
  const impossible = sections.filter((section) => pack.sectionQuestionPool(section.id).length < required);
  add(
    "impossible-progression",
    "Every topic can be completed",
    impossible.length === 0,
    `${impossible.length} topic${impossible.length === 1 ? "" : "s"} cannot reach a full quiz: ${impossible.slice(0, 5).map((section) => section.id).join(", ")}`,
    "Learners can open those topics but can never pass them.",
    "Import more quiz questions for those topics.",
  );

  // Concept ids and remediation destinations
  let orphanConcepts = 0;
  let brokenRemediation = 0;
  let unmapped = 0;
  for (const section of sections) {
    const validSections = new Set(lessonConceptSections(section.id, pack.getDeepLesson(section.id)).map((item) => item.id));
    for (const question of pack.sectionQuestionPool(section.id)) {
      const conceptId = pack.conceptId(question);
      if (!conceptId.startsWith(`${question.topicId}:`)) orphanConcepts += 1;
      if (!question.lessonSectionId) unmapped += 1;
      else if (!validSections.has(question.lessonSectionId)) brokenRemediation += 1;
    }
  }
  add(
    "concept-ids",
    "Concept ids anchored",
    orphanConcepts === 0,
    `${orphanConcepts} question${orphanConcepts === 1 ? " has" : "s have"} a concept id that is not anchored to its topic.`,
    "Weakness tracking attributes answers to the wrong topic.",
    "Re-import those questions so their topic and concept agree.",
  );
  add(
    "remediation-destinations",
    "Remediation destinations",
    brokenRemediation === 0,
    `${brokenRemediation} review link${brokenRemediation === 1 ? "" : "s"} point at a lesson section that does not exist.`,
    `"Review this concept" opens nothing.`,
    "Correct the lesson-section mapping.",
  );
  add(
    "assessment-evidence",
    "Assessment evidence mapped",
    unmapped === 0,
    `${unmapped} assessment item${unmapped === 1 ? " has" : "s have"} no lesson mapping.`,
    "A missed question cannot point back at what to re-read.",
    "Fill the lesson-section column for those questions.",
    "warning",
  );

  return checks;
}
