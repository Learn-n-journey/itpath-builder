/**
 * Silent review pass that runs between an AI response and the learner.
 * It never surfaces its own errors: if the check fails for any reason,
 * the original, unchecked response is returned unchanged.
 */
import { z } from "zod";

import { runAi } from "@/lib/ai/run.server";
import { checkTechnicalClaims, technicalIssueBrief } from "@/lib/technical-validation";

/**
 * Risk-based self-checking: the review is a second paid call, so the layer only
 * spends it where a wrong answer would actually reach a learner as fact or as a
 * recorded mark. It runs on the cheap model, never blocks, and silently returns
 * the original answer if anything goes wrong.
 */
async function askJson(system: string, user: string, userId?: string): Promise<unknown | null> {
  const result = await runAi({
    feature: "self_check",
    ...(userId ? { userId } : {}),
    system,
    prompt: user,
    risk: "low",
    priority: "interactive",
    json: true,
    // The first call already paid the learner's daily allowance for this task.
    skipBudget: true,
  });
  if (!result.ok) return null;
  const raw = result.text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

const tutorReview = z.object({
  ok: z.boolean().default(true),
  issues: z.array(z.string()).default([]),
  revised: z.string().default(""),
});

/**
 * Re-reads a tutor answer for factual errors, invented commands and claims that
 * contradict the learner's own saved material. Returns the answer to show.
 */
export async function reviewTutorAnswer(input: {
  question: string;
  answer: string;
  knowledge?: string | undefined;
  userId?: string | undefined;
}): Promise<string> {
  // Arithmetic the reviewer does not have to trust itself on.
  const numberIssues = technicalIssueBrief(checkTechnicalClaims(input.answer));

  const system = [
    "You are a senior IT and cybersecurity reviewer checking another tutor's answer before a learner sees it.",
    "Look for: factual errors, commands or flags that do not exist, wrong file paths, unsafe advice, steps in an impossible order, and claims that contradict the learner's saved material.",
    "Do not rewrite for style, tone or length. Do not add padding. If the answer is correct, leave it alone.",
    numberIssues ? "A numeric check has already found errors and is authoritative. Set ok to false and return a revised answer with those numbers corrected." : "",
    "Write plain text only, no markdown symbols such as **, ## or backticks.",
    "Reply with one JSON object and nothing else:",
    '{"ok": true|false, "issues": ["short description of each real problem"], "revised": "the full corrected answer, or an empty string when ok is true"}',
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Learner asked:\n${input.question}`,
    input.knowledge ? `Learner's own saved material:\n${input.knowledge.slice(0, 12000)}` : "",
    `Tutor answer to review:\n${input.answer}`,
    numberIssues,
    "Return the JSON object now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const parsed = tutorReview.safeParse(await askJson(system, user, input.userId));
  if (!parsed.success) return input.answer;
  if (parsed.data.ok) return input.answer;
  const revised = parsed.data.revised.trim();
  return revised.length > 40 ? revised : input.answer;
}

export interface ReviewableGrade {
  score: number;
  verdict: string;
  strengths: string[];
  missed: string[];
  correctedAnswer: string;
  followUp: string;
}

const gradeReview = z.object({
  ok: z.boolean().default(true),
  score: z.number().optional(),
  verdict: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  missed: z.array(z.string()).optional(),
  correctedAnswer: z.string().optional(),
  followUp: z.string().optional(),
});

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Re-checks a mark before the learner sees it: the score must match the written
 * feedback, every "missed" point must genuinely be absent from their answer, and
 * the model answer must itself be correct.
 */
export async function reviewGrade(input: {
  topic: string;
  question: string;
  answer: string;
  modelAnswer?: string | undefined;
  expectedPoints?: string[] | undefined;
  grade: ReviewableGrade;
  userId?: string | undefined;
}): Promise<ReviewableGrade> {
  const system = [
    "You are a moderator checking an examiner's marking before the learner sees it.",
    "Check four things: the score matches the written feedback, every point listed as missed is genuinely absent from the learner's answer, every strength is genuinely present, and the model answer is factually correct.",
    "Mark the idea, not the wording. Do not make the marking harsher or softer for its own sake.",
    "Every field you return is shown straight to the learner as GAYL speaking. Write it in first person, addressing the learner as 'you'. Never comment on the examiner, the marking or the score itself, and never write 'the learner'.",
    "Write plain sentences with no long dashes. Plain text only, no markdown symbols.",
    "Reply with one JSON object and nothing else:",
    '{"ok": true|false, "score": number 0-100, "verdict": "one or two sentences", "strengths": ["..."], "missed": ["..."], "correctedAnswer": "corrected model answer", "followUp": "one short question"}',
    "When ok is true, return only the ok field. When ok is false, return the corrected values for the fields that were wrong.",
  ].join("\n");

  const user = [
    `Topic: ${input.topic}`,
    `Question or task:\n${input.question}`,
    input.modelAnswer ? `Reference answer:\n${input.modelAnswer}` : "",
    input.expectedPoints?.length ? `Points the answer should cover:\n- ${input.expectedPoints.join("\n- ")}` : "",
    `Learner's answer:\n${input.answer}`,
    `Examiner's marking:\n${JSON.stringify(input.grade)}`,
    "Return the JSON object now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const parsed = gradeReview.safeParse(await askJson(system, user, input.userId));
  if (!parsed.success || parsed.data.ok) return input.grade;

  const d = parsed.data;
  const clean = (list?: string[]) => list?.map((s) => s.trim()).filter(Boolean);
  return {
    score: typeof d.score === "number" ? clamp(d.score) : input.grade.score,
    verdict: d.verdict?.trim() || input.grade.verdict,
    strengths: clean(d.strengths)?.slice(0, 6) ?? input.grade.strengths,
    missed: clean(d.missed)?.slice(0, 8) ?? input.grade.missed,
    correctedAnswer: d.correctedAnswer?.trim() || input.grade.correctedAnswer,
    followUp: d.followUp?.trim() || input.grade.followUp,
  };
}

const explanationReview = z.object({
  ok: z.boolean().default(true),
  issues: z.array(z.string()).default([]),
  revised: z.string().default(""),
});

/**
 * Checks generated teaching text that is not a tutor reply: scenario briefs,
 * fault explanations, worked examples. Same contract as the tutor review, it
 * never blocks and returns the original text whenever anything goes wrong.
 *
 * When the deterministic number check has already found something, the review
 * always runs and those findings are treated as settled.
 */
export async function reviewExplanation(input: {
  context: string;
  text: string;
  userId?: string | undefined;
}): Promise<string> {
  const numberIssues = technicalIssueBrief(checkTechnicalClaims(input.text));

  const system = [
    "You are a senior IT and cybersecurity reviewer checking generated teaching text before a learner reads it.",
    "Look for: factual errors, invented commands, tools or file paths, wrong port numbers, wrong conversions, and steps that could not work in the order given.",
    "Do not rewrite for style, tone or length, and keep the same structure and roughly the same length.",
    numberIssues ? "A numeric check has already found errors and is authoritative. Set ok to false and correct those numbers." : "",
    "Write plain text only, no markdown symbols.",
    "Reply with one JSON object and nothing else:",
    '{"ok": true|false, "issues": ["short description of each real problem"], "revised": "the full corrected text, or an empty string when ok is true"}',
  ]
    .filter(Boolean)
    .join("\n");

  const user = [`Context:\n${input.context}`, `Text to review:\n${input.text}`, numberIssues, "Return the JSON object now."]
    .filter(Boolean)
    .join("\n\n");

  const parsed = explanationReview.safeParse(await askJson(system, user, input.userId));
  if (!parsed.success || parsed.data.ok) return input.text;
  const revised = parsed.data.revised.trim();
  return revised.length > 30 ? revised : input.text;
}

/** True when the deterministic checks found something worth a review pass. */
export function needsTechnicalReview(text: string): boolean {
  return checkTechnicalClaims(text).length > 0;
}
