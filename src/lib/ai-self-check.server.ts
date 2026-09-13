/**
 * Silent review pass that runs between an AI response and the learner.
 * It never surfaces its own errors: if the check fails for any reason,
 * the original, unchecked response is returned unchanged.
 */
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function askJson(system: string, user: string): Promise<unknown | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(raw.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

/** Cheap gate: only spend a second call where a mistake would actually matter. */
export function shouldSelfCheckTutorAnswer(answer: string): boolean {
  const text = answer.trim();
  if (text.length < 400) {
    // Short replies are usually a single question or clarification — skip unless
    // they hand the learner something to run.
    return /\b(sudo|ipconfig|ifconfig|netstat|systemctl|service|adb|nslookup|dig|chmod|chown|sfc|regedit|taskkill|Get-[A-Za-z]+|Set-[A-Za-z]+)\b|(^|\n)\s*\d+[.)]\s/i.test(text);
  }
  return true;
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
}): Promise<string> {
  const system = [
    "You are a senior IT and cybersecurity reviewer checking another tutor's answer before a learner sees it.",
    "Look for: factual errors, commands or flags that do not exist, wrong file paths, unsafe advice, steps in an impossible order, and claims that contradict the learner's saved material.",
    "Do not rewrite for style, tone or length. Do not add padding. If the answer is correct, leave it alone.",
    "Write plain text only, no markdown symbols such as **, ## or backticks.",
    "Reply with one JSON object and nothing else:",
    '{"ok": true|false, "issues": ["short description of each real problem"], "revised": "the full corrected answer, or an empty string when ok is true"}',
  ].join("\n");

  const user = [
    `Learner asked:\n${input.question}`,
    input.knowledge ? `Learner's own saved material:\n${input.knowledge.slice(0, 12000)}` : "",
    `Tutor answer to review:\n${input.answer}`,
    "Return the JSON object now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const parsed = tutorReview.safeParse(await askJson(system, user));
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
}): Promise<ReviewableGrade> {
  const system = [
    "You are a moderator checking an examiner's marking before the learner sees it.",
    "Check four things: the score matches the written feedback, every point listed as missed is genuinely absent from the learner's answer, every strength is genuinely present, and the model answer is factually correct.",
    "Mark the idea, not the wording. Do not make the marking harsher or softer for its own sake.",
    "Write plain text only, no markdown symbols.",
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

  const parsed = gradeReview.safeParse(await askJson(system, user));
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
