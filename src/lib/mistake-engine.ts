import {
  getPrerequisiteChain,
  getSkill,
  getSkillByTopic,
  skillNodes,
  type SkillNode,
} from "@/data/prerequisite-graph";
import type {
  Mistake,
  MistakeActivity,
  MistakeCategory,
  MistakeCause,
  MistakeSeverity,
  UserData,
} from "@/lib/app-data/types";

export const mistakeCauseLabels: Record<MistakeCause, string> = {
  didnt_know_fact: "Didn't know fact",
  misunderstood_concept: "Misunderstood concept",
  misread_question: "Misread question",
  rushed: "Rushed",
  confused_concepts: "Confused concepts",
  scenario_recognition_failure: "Scenario recognition failure",
  command_knowledge_gap: "Command knowledge gap",
  reasoning_error: "Reasoning error",
  prerequisite_gap: "Prerequisite gap",
};

export const mistakeActivityLabels: Record<MistakeActivity, string> = {
  quiz: "Quiz",
  recall: "Recall",
  practice: "Practice",
  assignment: "Assignment",
  lab: "Lab",
  scenario: "Real-world scenario",
};

const severityWeight: Record<MistakeSeverity, number> = { low: 1, medium: 2, high: 3 };

/** Maps the question's authored knowledge category onto a learner-error cause. */
export function causeFromQuestionCategory(
  category: MistakeCategory,
  requiresReasoning = false,
): MistakeCause {
  if (requiresReasoning && (category === "concept" || category === "professional_judgment")) {
    return "reasoning_error";
  }
  switch (category) {
    case "terminology":
      return "didnt_know_fact";
    case "concept":
      return "misunderstood_concept";
    case "diagnosis":
      return "scenario_recognition_failure";
    case "command_syntax":
      return "command_knowledge_gap";
    case "procedure":
      return "reasoning_error";
    case "professional_judgment":
      return "reasoning_error";
    default:
      return "misunderstood_concept";
  }
}

export interface SkillWeakness {
  skill: SkillNode;
  score: number;
  openMistakes: number;
  weak: boolean;
}

const WEAK_THRESHOLD = 2;

/** Weakness is evidence-based: unresolved mistakes plus untouched or unfinished topic progress. */
export function scoreSkill(user: UserData, skill: SkillNode): SkillWeakness {
  const open = user.mistakes.filter(
    (mistake) =>
      !mistake.resolved &&
      (mistake.skillId === skill.id || (skill.topicId && mistake.topicId === skill.topicId)),
  );
  let score = open.reduce((sum, mistake) => sum + severityWeight[mistake.severity], 0);
  if (skill.topicId) {
    const progress = user.topicProgress[skill.topicId];
    if (!progress || progress.status === "not_started") score += 2;
    else if (progress.status === "in_progress") score += 1;
    else if (progress.status === "mastered") score -= 1;
  }
  return { skill, score, openMistakes: open.length, weak: score >= WEAK_THRESHOLD };
}

export function scoreAllSkills(user: UserData): SkillWeakness[] {
  return skillNodes.map((skill) => scoreSkill(user, skill));
}

export interface Recommendation {
  skillIds: string[];
  topicIds: string[];
  reason: "prerequisite_gap" | "same_topic";
  explanation: string;
}

/**
 * Recommends what to review after a mistake. Prefers the deepest weak prerequisite
 * (root cause) and never suggests a skill that builds on the failed one.
 */
export function recommendReview(
  user: UserData,
  input: { topicId?: string; skillId?: string },
  limit = 2,
): Recommendation {
  const target = input.skillId
    ? getSkill(input.skillId)
    : input.topicId
      ? getSkillByTopic(input.topicId)
      : undefined;

  if (!target) {
    const topicIds = input.topicId ? [input.topicId] : [];
    return {
      skillIds: [],
      topicIds,
      reason: "same_topic",
      explanation: "Review this topic again before moving on.",
    };
  }

  // Deepest first: fixing the foundation before the material that sits on top of it.
  const weakPrerequisites = getPrerequisiteChain(target.id)
    .map((skill) => scoreSkill(user, skill))
    .filter((entry) => entry.weak)
    .reverse()
    .slice(0, limit);

  if (weakPrerequisites.length > 0) {
    return {
      skillIds: weakPrerequisites.map((entry) => entry.skill.id),
      topicIds: weakPrerequisites
        .map((entry) => entry.skill.topicId)
        .filter((id): id is string => Boolean(id)),
      reason: "prerequisite_gap",
      explanation: `${target.title} depends on ${weakPrerequisites
        .map((entry) => entry.skill.title)
        .join(" and ")}, which still shows weakness.`,
    };
  }

  return {
    skillIds: [target.id],
    topicIds: target.topicId ? [target.topicId] : [],
    reason: "same_topic",
    explanation: `Prerequisites for ${target.title} look solid, so review ${target.title} itself.`,
  };
}

export interface MistakeInput {
  topicId: string;
  activity: MistakeActivity;
  category: MistakeCause;
  severity?: MistakeSeverity;
  skillId?: string;
  attemptId?: string;
  questionId?: string;
  assignmentId?: string;
  assignmentAttemptId?: string;
  quizAttemptId?: string;
  createdAt?: string;
}

/** Single centralized constructor. Every activity records mistakes through this. */
export function buildMistake(user: UserData, input: MistakeInput): Mistake {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const recommendation = recommendReview(user, {
    topicId: input.topicId,
    skillId: input.skillId,
  });
  const category: MistakeCause =
    recommendation.reason === "prerequisite_gap" && input.category === "misunderstood_concept"
      ? "prerequisite_gap"
      : input.category;
  return {
    id: crypto.randomUUID(),
    topicId: input.topicId,
    skillId: input.skillId ?? getSkillByTopic(input.topicId)?.id,
    activity: input.activity,
    attemptId: input.attemptId,
    questionId: input.questionId,
    assignmentId: input.assignmentId,
    assignmentAttemptId: input.assignmentAttemptId,
    quizAttemptId: input.quizAttemptId,
    category,
    severity: input.severity ?? "medium",
    recommendedTopicIds: recommendation.topicIds,
    recommendedSkillIds: recommendation.skillIds,
    createdAt,
    resolved: false,
  };
}

export interface MistakeSummary {
  total: number;
  open: number;
  byCategory: Array<{ category: MistakeCause; count: number }>;
  byTopic: Array<{ topicId: string; count: number }>;
  recommendedSkills: SkillWeakness[];
}

export function summarizeMistakes(user: UserData): MistakeSummary {
  const open = user.mistakes.filter((mistake) => !mistake.resolved);
  const categoryCounts = new Map<MistakeCause, number>();
  const topicCounts = new Map<string, number>();
  for (const mistake of open) {
    categoryCounts.set(mistake.category, (categoryCounts.get(mistake.category) ?? 0) + 1);
    topicCounts.set(mistake.topicId, (topicCounts.get(mistake.topicId) ?? 0) + 1);
  }
  const recommendedIds = new Set(open.flatMap((mistake) => mistake.recommendedSkillIds));
  return {
    total: user.mistakes.length,
    open: open.length,
    byCategory: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    byTopic: [...topicCounts.entries()]
      .map(([topicId, count]) => ({ topicId, count }))
      .sort((a, b) => b.count - a.count),
    recommendedSkills: [...recommendedIds]
      .map((id) => getSkill(id))
      .filter((skill): skill is SkillNode => Boolean(skill))
      .map((skill) => scoreSkill(user, skill))
      .sort((a, b) => b.score - a.score),
  };
}
