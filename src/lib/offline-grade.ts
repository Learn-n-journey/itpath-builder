/**
 * Marking without AI.
 *
 * Many written answers can be judged confidently from the reference answer and
 * the expected points alone: a clearly complete answer, or an answer that is
 * plainly too short to contain anything. Those cases are marked here so no AI
 * call is made at all; everything in between still goes to the AI marker.
 */
import { conceptCoverage } from "@/lib/fuzzy-match";

export interface OfflineGrade {
  score: number;
  verdict: string;
  strengths: string[];
  missed: string[];
  correctedAnswer: string;
  followUp: string;
}

export interface OfflineGradeInput {
  question: string;
  answer: string;
  modelAnswer?: string | undefined;
  expectedPoints?: string[] | undefined;
}

const COVERED = 0.75;
const PARTIAL = 0.4;

/**
 * Returns a mark when the answer is unambiguous, or null when the AI marker
 * should decide.
 */
export function offlineGrade(input: OfflineGradeInput): OfflineGrade | null {
  const answer = input.answer.trim();
  const reference = input.modelAnswer?.trim() ?? "";
  const points = (input.expectedPoints ?? []).map((p) => p.trim()).filter(Boolean);

  // Plainly empty or a token response: no AI needed to see there is nothing to mark.
  if (answer.length < 12 || answer.split(/\s+/).length < 3) {
    return {
      score: 0,
      verdict: "There is not enough here to mark. Write out your reasoning in full sentences.",
      strengths: [],
      missed: points.length ? points : reference ? ["A full answer to the question"] : [],
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
  const strongReference = reference ? referenceCoverage >= 0.6 : true;
  if (allCovered && strongReference) {
    return {
      score: 100,
      verdict: "Correct — your answer covers every point expected here.",
      strengths: covers.map((c) => c.point).slice(0, 6),
      missed: [],
      correctedAnswer: reference,
      followUp: "Can you explain why that approach works, not just what it is?",
    };
  }

  // Clearly off: nothing from the reference or any expected point appears.
  const nothingLanded =
    (points.length === 0 || covers.every((c) => c.coverage < 0.12)) && referenceCoverage < 0.12;
  if (nothingLanded && answer.length < 400) {
    return {
      score: 0,
      verdict: "This does not answer the question asked. Read the reference answer and try again.",
      strengths: [],
      missed: points.length ? points : ["The point of the question"],
      correctedAnswer: reference,
      followUp: "In one sentence, what is the question actually asking you to do?",
    };
  }

  // Everything else — partly right, differently worded, arguable — goes to AI.
  void PARTIAL;
  return null;
}
