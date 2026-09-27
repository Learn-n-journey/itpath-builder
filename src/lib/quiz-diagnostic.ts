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
  AnswerConfidence,
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
  /** What the learner said about this answer, when they said anything. */
  confidence?: AnswerConfidence;
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

/**
 * How well the learner's own sense of certainty matched the marking.
 *
 * Seeing "you were sure on four and three of those missed" is one of the few
 * things that reliably breaks the feeling of knowing something you do not, so
 * it is reported back rather than kept inside the engine.
 */
export interface Calibration {
  /** Answers where the learner said how sure they were. */
  rated: number;
  sureTotal: number;
  sureWrong: number;
  unsureTotal: number;
  unsureRight: number;
  guessTotal: number;
  guessRight: number;
  /** GAYL reading the match between certainty and outcome. Empty when too thin. */
  note: string;
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
  calibration: Calibration;
}

/** Deterministic: counts stated certainty against the marking, nothing inferred. */
function buildCalibration(items: QuestionDiagnostic[]): Calibration {
  const rated = items.filter((item) => item.confidence);
  const sure = rated.filter((item) => item.confidence === "sure");
  const unsure = rated.filter((item) => item.confidence === "unsure");
  const guess = rated.filter((item) => item.confidence === "guess");
  const sureWrong = sure.filter((item) => !item.correct).length;
  const unsureRight = unsure.filter((item) => item.correct).length;
  const guessRight = guess.filter((item) => item.correct).length;

  const note = (() => {
    if (rated.length < 3) return "";
    if (sureWrong >= 2) {
      return `You marked ${sure.length} as sure and ${sureWrong} of those missed. You felt good about those, but they didn't hold up. I'd check them again instead of skipping past them.`;
    }
    if (sureWrong === 0 && sure.length >= 2) {
      return `Everything you marked as sure came back right this time. Good read. I'll keep an eye on whether that keeps holding.`;
    }
    if (guessRight >= 2) {
      return `You guessed on ${guessRight} and got them right. They count, but I'm not sold on them yet. I'll bring them back later and see if you still have them.`;
    }
    if (unsureRight >= 2) {
      return `You got ${unsureRight} right that you were not sure about. You knew more than you thought you did on those. I'll keep that in mind, but we'll check them again.`;
    }
    return "";
  })();

  return {
    rated: rated.length,
    sureTotal: sure.length,
    sureWrong,
    unsureTotal: unsure.length,
    unsureRight,
    guessTotal: guess.length,
    guessRight,
    note,
  };
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
    return "None of these landed. I wouldn't move on yet. Go back to the basics underneath this, then we'll check it again.";
  }

  const weak = weakest[0];
  const strong = strongest.find((entry) => entry.title !== weak?.title);

  const weakPhrase = (() => {
    if (!weak) return "";
    const appliedGap = weak.appliedTotal > 0 && weak.appliedCorrect / weak.appliedTotal < 0.6;
    const recallOk = weak.recallTotal > 0 && weak.recallCorrect / weak.recallTotal >= 0.6;
    if (appliedGap && recallOk) {
      return `you know ${weak.title.toLowerCase()}, but you're getting hung up when you have to use it in a scenario`;
    }
    if (appliedGap) return `using ${weak.title.toLowerCase()} in a real situation is where you're getting stuck`;
    return `most of the trouble came from ${weak.title.toLowerCase()}`;
  })();

  if (strong && weak) {
    const strongPhrase =
      strong.appliedTotal > 0 && strong.appliedCorrect === strong.appliedTotal
        ? `you can use ${strong.title.toLowerCase()} in context`
        : `you understand ${strong.title.toLowerCase()}`;
    return `Here's what I'm seeing: ${strongPhrase}, but ${weakPhrase}. So that's where I'd spend the time.`;
  }
  if (weak) {
    return `Here's what I'm seeing: ${correct} of ${total} landed, and ${weakPhrase}. I'd work there first.`;
  }
  return `${correct} of ${total} landed, and the misses were spread around rather than sitting in one place. They're scattered enough that I can't pin this on one specific mix-up. Give it a recall pass and let's see what happens next.`;
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
    return "Nothing I'd stop you for here. Keep moving and I'll bring this back later to make sure it sticks.";
  }

  const focus = recommendedTitles[0] ?? weakest[0]?.title;
  const weak = weakest[0];
  const appliedGap = weak ? weak.appliedTotal > 0 && weak.appliedCorrect / weak.appliedTotal < 0.6 : false;

  const how = (() => {
    if (appliedGap) return "try a scenario or lab instead of more recall questions. You already know the facts";
    if (topCause === "didnt_know_fact") return "give it a short read and one recall pass. It just hasn't settled yet";
    if (topCause === "rushed" || topCause === "misread_question") return "slow down on the next set. You did fine when you took your time";
    if (topCause === "prerequisite_gap") return "go one step underneath it first. There's something there we need to clear up";
    if (topCause === "command_knowledge_gap") return "practice the commands in the simulator. Typing them will do more for you than reading them again";
    return "reread the explanation before you retry. Another blind run is likely to give you the same misses";
  })();

  if (!focus) return `For the next step, ${how}.`;
  return `I'd start with ${focus}. Then ${how}.`;
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
        ...(result.confidence ? { confidence: result.confidence } : {}),
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

  const topCauses = [...causeCounts.entries()]
    .map(([cause, count]) => ({ cause, label: mistakeCauseLabels[cause], count }))
    .sort((a, b) => b.count - a.count);

  return {
    items,
    missed,
    skills,
    strongest,
    weakest,
    topCauses,
    explanation: buildExplanation({
      strongest,
      weakest,
      missed,
      total: items.length,
      correct: items.filter((item) => item.correct).length,
    }),
    guidance: buildGuidance({
      weakest,
      missed,
      recommendedTitles,
      ...(topCauses[0] ? { topCause: topCauses[0].cause } : {}),
    }),
    recommendation,
    recommendedTitles,
    calibration: buildCalibration(items),
  };
}
