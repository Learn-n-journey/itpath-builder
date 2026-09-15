/**
 * Post-quiz diagnostic.
 *
 * Deterministic. It turns a scored attempt into per-question evidence (skill,
 * question type, chosen answer, correct answer, difficulty, likely mistake
 * cause), aggregates that into strongest and weakest skills, separates recall
 * from applied work, and uses the existing prerequisite and review engines to
 * name the concept worth reviewing instead of reporting a percentage.
 */
import { getSkill, getSkillByTopic, type SkillNode } from "@/data/prerequisite-graph";
import { topics } from "@/data/static-content";
import type {
  Difficulty,
  MistakeCause,
  Question,
  QuestionType,
  QuizQuestionResult,
  UserData,
} from "@/lib/app-data/types";
import {
  causeFromQuestionCategory,
  mistakeCauseLabels,
  recommendReview,
  type Recommendation,
} from "@/lib/mistake-engine";

/** Question types and categories that test using the idea rather than recalling it. */
const APPLIED_TYPES: QuestionType[] = ["scenario", "troubleshooting", "command"];

export interface QuestionDiagnostic {
  questionId: string;
  topicId: string;
  topicTitle: string;
  skillId?: string;
  skillTitle: string;
  type: QuestionType;
  difficulty: Difficulty;
  applied: boolean;
  correct: boolean;
  selectedAnswer: string[];
  correctAnswer: string[];
  cause: MistakeCause;
  causeLabel: string;
}

export interface SkillOutcome {
  skillId?: string;
  title: string;
  topicId?: string;
  total: number;
  correct: number;
  accuracy: number;
  recallTotal: number;
  recallCorrect: number;
  appliedTotal: number;
  appliedCorrect: number;
}

export interface QuizDiagnostic {
  items: QuestionDiagnostic[];
  missed: QuestionDiagnostic[];
  skills: SkillOutcome[];
  strongest: SkillOutcome[];
  weakest: SkillOutcome[];
  topCauses: Array<{ cause: MistakeCause; label: string; count: number }>;
  /** GAYL reading the pattern out loud, not a score. */
  explanation: string;
  /** GAYL guiding the next move, in the same voice. */
  guidance: string;
  recommendation: Recommendation | null;
  recommendedTitles: string[];
}

function topicTitle(topicId: string): string {
  return topics.find((topic) => topic.id === topicId)?.title ?? topicId;
}

function skillFor(question: Question): SkillNode | undefined {
  return getSkillByTopic(question.topicId);
}

function isApplied(question: Question): boolean {
  return (
    APPLIED_TYPES.includes(question.type) ||
    question.mistakeCategory === "diagnosis" ||
    question.mistakeCategory === "procedure" ||
    question.mistakeCategory === "command_syntax" ||
    question.requiresReasoning
  );
}

function severityRank(outcome: SkillOutcome): number {
  // Weakness ranks on accuracy first, with more attempted questions breaking ties.
  return outcome.accuracy * 100 - Math.min(outcome.total, 5);
}

/** GAYL speaking: what I can see in this attempt. */
function buildExplanation(input: {
  strongest: SkillOutcome[];
  weakest: SkillOutcome[];
  missed: QuestionDiagnostic[];
  total: number;
  correct: number;
}): string {
  const { strongest, weakest, missed, total, correct } = input;
  if (total === 0) return "I don't have any scored answers from this one, so there's nothing I can read yet.";
  if (missed.length === 0) {
    return strongest[0]
      ? `That all held together, ${strongest[0].title.toLowerCase()} included. One clean run is a snapshot though, so I'd rather check it again later than call it finished.`
      : "That all held together. One clean run is a snapshot though, so I'd rather check it again later than call it finished.";
  }
  if (missed.length === total && !strongest[0]) {
    return "None of these landed, and I read that as not enough time with the material yet rather than anything about you. We start from the bottom of it and build up.";
  }

  const weak = weakest[0];
  const strong = strongest.find((entry) => entry.title !== weak?.title);

  const weakPhrase = (() => {
    if (!weak) return "";
    const appliedGap = weak.appliedTotal > 0 && weak.appliedCorrect / weak.appliedTotal < 0.6;
    const recallOk = weak.recallTotal > 0 && weak.recallCorrect / weak.recallTotal >= 0.6;
    if (appliedGap && recallOk) {
      return `you're struggling to apply ${weak.title.toLowerCase()} in scenarios`;
    }
    if (appliedGap) return `using ${weak.title.toLowerCase()} in a scenario is where it comes apart`;
    return `${weak.title.toLowerCase()} is where the misses sat`;
  })();

  if (strong && weak) {
    const strongPhrase =
      strong.appliedTotal > 0 && strong.appliedCorrect === strong.appliedTotal
        ? `you can use ${strong.title.toLowerCase()} in context`
        : `you understand ${strong.title.toLowerCase()}`;
    return `Here's what I can see: ${strongPhrase}, but ${weakPhrase}. Those are two different things, and only the second one needs work.`;
  }
  if (weak) {
    return `Here's what I can see: ${correct} of ${total} landed, and ${weakPhrase}. That looks like one specific gap rather than the whole subject.`;
  }
  return `${correct} of ${total} landed, and the misses were spread around rather than sitting in one place. That usually points at recall slipping, not misunderstanding.`;
}

/** GAYL guiding the next move, from the same evidence. */
function buildGuidance(input: {
  weakest: SkillOutcome[];
  missed: QuestionDiagnostic[];
  recommendedTitles: string[];
  topCause?: MistakeCause;
}): string {
  const { weakest, missed, recommendedTitles, topCause } = input;
  if (missed.length === 0) {
    return "Nothing needs fixing right now, so keep moving forward and I'll bring this back later to check it stuck.";
  }

  const focus = recommendedTitles[0] ?? weakest[0]?.title;
  const weak = weakest[0];
  const appliedGap = weak ? weak.appliedTotal > 0 && weak.appliedCorrect / weak.appliedTotal < 0.6 : false;

  const how = (() => {
    if (appliedGap) return "work through a scenario or a lab on it rather than more recall questions, since the facts are already there";
    if (topCause === "didnt_know_fact") return "a short read and a recall pass should be enough, this is information that hasn't settled yet";
    if (topCause === "rushed" || topCause === "misread_question") return "slow the reading down on the next set, the knowledge looked fine where you took your time";
    if (topCause === "prerequisite_gap") return "go one step underneath it first, that's usually what makes the rest click";
    if (topCause === "command_knowledge_gap") return "practise the commands in the simulator, typing them beats reading them";
    return "reread the explanation before retrying the questions, repeating them cold tends to lock the same idea in";
  })();

  if (!focus) return `For the next step, ${how}.`;
  return `So here's what I'd do next: start with ${focus}, and ${how}.`;
}

export function buildQuizDiagnostic(
  user: UserData,
  questions: Question[],
  results: QuizQuestionResult[],
): QuizDiagnostic {
  const items: QuestionDiagnostic[] = results.flatMap((result) => {
    const question = questions.find((entry) => entry.id === result.questionId);
    if (!question) return [];
    const skill = skillFor(question);
    const cause = causeFromQuestionCategory(question.mistakeCategory, question.requiresReasoning);
    return [
      {
        questionId: question.id,
        topicId: question.topicId,
        topicTitle: topicTitle(question.topicId),
        ...(skill ? { skillId: skill.id } : {}),
        skillTitle: skill?.title ?? topicTitle(question.topicId),
        type: question.type,
        difficulty: question.difficulty,
        applied: isApplied(question),
        correct: result.correct,
        selectedAnswer: result.response,
        correctAnswer: question.correctAnswer,
        cause,
        causeLabel: mistakeCauseLabels[cause],
      },
    ];
  });

  const grouped = new Map<string, SkillOutcome>();
  for (const item of items) {
    const key = item.skillId ?? item.topicId;
    const existing =
      grouped.get(key) ??
      ({
        ...(item.skillId ? { skillId: item.skillId } : {}),
        title: item.skillTitle,
        topicId: item.topicId,
        total: 0,
        correct: 0,
        accuracy: 0,
        recallTotal: 0,
        recallCorrect: 0,
        appliedTotal: 0,
        appliedCorrect: 0,
      } satisfies SkillOutcome);
    existing.total += 1;
    if (item.correct) existing.correct += 1;
    if (item.applied) {
      existing.appliedTotal += 1;
      if (item.correct) existing.appliedCorrect += 1;
    } else {
      existing.recallTotal += 1;
      if (item.correct) existing.recallCorrect += 1;
    }
    existing.accuracy = existing.correct / existing.total;
    grouped.set(key, existing);
  }

  const skills = [...grouped.values()].sort((a, b) => b.accuracy - a.accuracy);
  const strongest = skills.filter((entry) => entry.accuracy >= 0.7);
  const weakest = [...skills]
    .filter((entry) => entry.accuracy < 0.7)
    .sort((a, b) => severityRank(a) - severityRank(b));

  const causeCounts = new Map<MistakeCause, number>();
  const missed = items.filter((item) => !item.correct);
  for (const item of missed) causeCounts.set(item.cause, (causeCounts.get(item.cause) ?? 0) + 1);

  const target = weakest[0];
  const recommendation = target
    ? recommendReview(user, {
        ...(target.skillId ? { skillId: target.skillId } : {}),
        ...(target.topicId ? { topicId: target.topicId } : {}),
      })
    : null;

  const recommendedTitles = recommendation
    ? [
        ...recommendation.skillIds.map((id) => getSkill(id)?.title).filter((title): title is string => Boolean(title)),
        ...recommendation.topicIds.map((id) => topicTitle(id)),
      ].filter((title, index, list) => list.indexOf(title) === index)
    : [];

  return {
    items,
    missed,
    skills,
    strongest,
    weakest,
    topCauses: [...causeCounts.entries()]
      .map(([cause, count]) => ({ cause, label: mistakeCauseLabels[cause], count }))
      .sort((a, b) => b.count - a.count),
    explanation: buildExplanation({
      strongest,
      weakest,
      missed,
      total: items.length,
      correct: items.filter((item) => item.correct).length,
    }),
    recommendation,
    recommendedTitles,
  };
}
