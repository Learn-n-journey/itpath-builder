/**
 * Marking without AI.
 *
 * Many written answers can be judged confidently from the reference answer and
 * the expected points alone: a clearly complete answer, or an answer that is
 * plainly too short to contain anything. Those cases are marked here so no AI
 * call is made at all; everything in between still goes to the AI marker, which
 * reads for meaning and for whether the steps described would actually work.
 */
import { conceptCoverage } from "@/lib/fuzzy-match";

export type GradeStatus = "correct" | "almost" | "not_yet";

export interface OfflineGrade {
  score: number;
  verdict: string;
  strengths: string[];
  missed: string[];
  correctedAnswer: string;
  followUp: string;
  status: GradeStatus;
  /** Short nudges telling the learner what to add, rather than a flat fail. */
  hints: string[];
}

export interface OfflineGradeInput {
  question: string;
  answer: string;
  modelAnswer?: string | undefined;
  expectedPoints?: string[] | undefined;
}

const COVERED = 0.6;

function hintFor(point: string): string {
  return `Add the step about ${point.charAt(0).toLowerCase()}${point.slice(1)}`;
}

/**
 * Returns a mark when the answer is unambiguous, or null when the AI marker
 * should decide. Anything partly right is left to the AI marker, so a sound
 * answer worded differently is never failed on word overlap alone.
 */
export function offlineGrade(input: OfflineGradeInput): OfflineGrade | null {
  const answer = input.answer.trim();
  const reference = input.modelAnswer?.trim() ?? "";
  const points = (input.expectedPoints ?? []).map((p) => p.trim()).filter(Boolean);

  // Plainly empty or a token response: no AI needed to see there is nothing to mark.
  if (answer.length < 12 || answer.split(/\s+/).length < 3) {
    return {
      score: 0,
      status: "not_yet",
      verdict: "There is not enough here for me to mark. Write out your reasoning in full sentences.",
      strengths: [],
      missed: points.length ? points : reference ? ["A full answer to the question"] : [],
      hints: points.slice(0, 4).map(hintFor),
      correctedAnswer: reference,
      followUp: "Try again in your own words: what is the first thing you would check, and why?",
    };
  }

  if (points.length === 0 && !reference) return null;

  const covers = points.map((point) => ({ point, coverage: conceptCoverage(point, answer) }));
  const referenceCoverage = reference ? conceptCoverage(reference, answer) : 0;

  // Clearly complete: every expected point is present, and the answer tracks the
  // reference closely. Nothing an AI marker would change.
  const allCovered = points.length > 0 && covers.every((c) => c.coverage >= COVERED);
  const strongReference = reference ? referenceCoverage >= 0.5 : true;
  if (allCovered && strongReference) {
    return {
      score: 100,
      status: "correct",
      verdict: "Correct, your answer covers every point I was looking for here.",
      strengths: covers.map((c) => c.point).slice(0, 6),
      missed: [],
      hints: [],
      correctedAnswer: reference,
      followUp: "Can you explain why that approach works, not just what it is?",
    };
  }

  // Clearly off: not one word of the reference or any expected point appears, and
  // the answer is too short to be saying the same thing another way.
  const nothingLanded =
    (points.length === 0 || covers.every((c) => c.coverage < 0.08)) && referenceCoverage < 0.08;
  if (nothingLanded && answer.split(/\s+/).length < 25) {
    return {
      score: 20,
      status: "not_yet",
      verdict: "I cannot see this question being answered here yet. Have a look at how I would answer it, then try again.",
      strengths: [],
      missed: points.length ? points : ["The point of the question"],
      hints: points.slice(0, 4).map(hintFor),
      correctedAnswer: reference,
      followUp: "In one sentence, what is the question actually asking you to do?",
    };
  }

  // Everything else, partly right, differently worded, arguable, goes to AI.
  return null;
}
