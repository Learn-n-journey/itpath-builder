import type { CoursePack } from "@/content/pack-contract";
import type { HealthCheck } from "./types";
import { topicHealthChecks } from "./content-health";

export interface QualityChallengeResult {
  id: string;
  label: string;
  expectedCheck: string;
  detected: boolean;
  detail: string;
}

function pickTopic(pack: CoursePack) {
  return pack.sections.find((topic) => pack.sectionQuestionPool(topic.id).length > 0) ?? pack.sections[0];
}

function result(id: string, label: string, expectedCheck: string, checks: HealthCheck[]): QualityChallengeResult {
  const hit = checks.find((check) => check.id.endsWith(`:${expectedCheck}`));
  return {
    id,
    label,
    expectedCheck,
    detected: Boolean(hit && hit.state !== "healthy"),
    detail: hit?.detail ?? "Expected production check did not report the injected defect.",
  };
}

/**
 * Challenges the production topic-health rules with controlled mutations.
 * Every mutation exists only in memory. Nothing is written to learner data,
 * imported workbooks, Supabase, or the live course pack.
 */
export function runQualityCheckerChallenge(pack: CoursePack): QualityChallengeResult[] {
  const topic = pickTopic(pack);
  if (!topic) return [];

  const basePool = pack.sectionQuestionPool(topic.id);
  const first = basePool[0];
  const ranAt = new Date().toISOString();
  const run = (mutated: CoursePack) => topicHealthChecks(mutated, topic.id, { ranAt });

  const placeholderPack: CoursePack = {
    ...pack,
    lessonText: (topicId) => topicId === topic.id ? `${pack.lessonText(topicId)}\n\nTODO: placeholder` : pack.lessonText(topicId),
  };

  const missingObjectivesPack: CoursePack = {
    ...pack,
    sections: pack.sections.map((item) => item.id === topic.id ? { ...item, learningObjectives: [] } : item),
  };

  const duplicatePack: CoursePack = {
    ...pack,
    sectionQuestionPool: (topicId) => topicId === topic.id && first
      ? [...basePool, { ...first, id: `${first.id}-qa-duplicate` }]
      : pack.sectionQuestionPool(topicId),
  };

  const brokenKeyPack: CoursePack = {
    ...pack,
    sectionQuestionPool: (topicId) => topicId === topic.id && first
      ? basePool.map((question, index) => index === 0
          ? { ...question, type: "multiple_choice", correctAnswer: ["__QA_NOT_A_REAL_CHOICE__"] }
          : question)
      : pack.sectionQuestionPool(topicId),
  };

  const brokenMappingPack: CoursePack = {
    ...pack,
    sectionQuestionPool: (topicId) => topicId === topic.id && first
      ? basePool.map((question, index) => index === 0
          ? { ...question, lessonSectionId: "__qa_missing_lesson_section__" }
          : question)
      : pack.sectionQuestionPool(topicId),
  };

  return [
    result("placeholder", "Placeholder lesson text", "placeholder", run(placeholderPack)),
    result("objectives", "Missing learning objectives", "objectives", run(missingObjectivesPack)),
    result("duplicate", "Duplicate quiz question", "duplicate-questions", run(duplicatePack)),
    result("answer-key", "Broken answer key", "answer-keys", run(brokenKeyPack)),
    result("mapping", "Broken remediation mapping", "remediation-targets", run(brokenMappingPack)),
  ];
}
