import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlan } from "@/lib/entitlement.server";
import { reviewGrade } from "@/lib/ai-self-check.server";
import { cacheKey as buildCacheKey, readExact, writeCache } from "@/lib/ai/cache.server";
import { compressContext } from "@/lib/ai/compress.server";
import { runAi } from "@/lib/ai/run.server";
import { offlineGrade, type GradeStatus } from "@/lib/offline-grade";

const criterionSchema = z.object({
  id: z.string().min(1).max(200),
  label: z.string().min(1).max(300),
  description: z.string().max(1000).default(""),
  expected: z.string().max(2000).optional(),
});

const inputSchema = z.object({
  topic: z.string().min(1).max(300),
  question: z.string().min(1).max(6000),
  answer: z.string().min(1).max(8000),
  modelAnswer: z.string().max(8000).optional(),
  expectedPoints: z.array(z.string().max(500)).max(20).optional(),
  criteria: z.array(criterionSchema).max(12).optional(),
  /** What the learner was asked to do, so the marker applies the right standard. */
  task: z.string().max(400).optional(),
  /** Digest of the learner's own saved material, from the Second Brain. */
  knowledge: z.string().max(20000).optional(),
});

export type GradeInput = z.infer<typeof inputSchema>;

export interface CriterionGrade {
  id: string;
  correct: boolean;
  feedback: string;
}

export interface WrittenGrade {
  score: number;
  verdict: string;
  correct: boolean;
  strengths: string[];
  missed: string[];
  correctedAnswer: string;
  followUp: string;
  criteria: CriterionGrade[];
  /** True when the marking came from the AI marker rather than the offline fallback. */
  aiMarked: boolean;
  /** "almost" means the thinking is sound but a step is missing, so it is not a fail. */
  status: GradeStatus;
  /** Short nudges naming the steps to add, shown instead of a flat fail. */
  hints: string[];
}

export type GradeReply = { ok: true; grade: WrittenGrade } | { ok: false; error: string };

const responseShape = z.object({
  score: z.number(),
  verdict: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  missed: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]),
  correctedAnswer: z.string().default(""),
  followUp: z.string().default(""),
  criteria: z
    .array(
      z.object({
        id: z.string(),
        correct: z.boolean(),
        feedback: z.string().default(""),
      }),
    )
    .default([]),
});

/** Sound thinking with a gap is an "almost", never a fail. */
function statusFor(score: number): GradeStatus {
  if (score >= 70) return "correct";
  if (score >= 45) return "almost";
  return "not_yet";
}


function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export const gradeWrittenAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<GradeReply> => {
    const denied = await requirePlan(context.supabase, context.userId, context.claims, "pro", "AI grading and feedback");
    if (denied) return denied;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI marking is not configured." };

    const allCriteria = (data.criteria ?? []).map((c) => ({
      id: c.id,
      correct: false,
      feedback: "",
    }));

    // 1. Clear-cut answers are marked here, with no AI call at all.
    if (!data.knowledge) {
      const offline = offlineGrade({
        question: data.question,
        answer: data.answer,
        modelAnswer: data.modelAnswer,
        expectedPoints: data.expectedPoints,
      });
      if (offline) {
        const passed = offline.status === "correct";
        return {
          ok: true,
          grade: {
            ...offline,
            correct: passed,
            criteria: allCriteria.map((c) => ({
              ...c,
              correct: passed,
              feedback: passed ? "Covered in your answer." : "Not covered in your answer yet.",
            })),
            aiMarked: false,
          },
        };
      }

    }

    // 2. The same answer to the same task is only ever paid for once. A mark
    //    must match the answer exactly, so this cache is exact, never fuzzy.
    const key = data.knowledge
      ? null
      : await buildCacheKey("grading", [
          data.topic,
          data.question,
          data.modelAnswer,
          (data.expectedPoints ?? []).join("|"),
          (data.criteria ?? []).map((c) => c.id).join("|"),
          data.answer,
        ]);
    if (key) {
      const cached = await readExact<WrittenGrade>(key);
      if (cached) return { ok: true, grade: cached };
    }

    const system = [
      `You are GAYL, the learning guide inside ${domain.appName}. You are reading a written answer and telling the learner what you can see in it.",
      "Write every sentence as yourself, in first person, speaking to the learner as 'you'. Never write 'the learner', 'the user' or 'the student', and never mention being an AI, a model or an examiner.",
      "Judge the work, never the person. Describe what the answer shows and what it leaves out.",
      "Mark on meaning and on whether the technical reasoning would actually work in practice. Never mark on keywords, exact terms, phrasing, spelling or the order things are written in.",
      "The reference answer and the expected points are one good way to answer, not the only way. If the answer reaches the same outcome by a different but technically sound route, that is fully correct, even when it shares almost no wording with the reference.",
      "Before scoring, ask yourself: if a working technician did exactly what this answer describes, would the problem be understood or fixed? Score that, not word overlap.",
      "Credit correct reasoning that is implied by the steps given. If a step only makes sense because the learner understood something, they understood it.",
      "Accept common abbreviations, vendor names, informal shop language and everyday words in place of textbook terms.",
      "When the answer is asked for a set number of items, only require that number. Do not require every possible valid item.",
      "Scoring: 70 or more when the answer would work, even if thin. 45 to 69 when the thinking is sound but a step is missing or unclear. Below 45 only when the answer would not work or does not address the question.",
      "In the 45 to 69 range, treat it as nearly there. Fill hints with one short instruction per missing step, in the form 'Add the check for ...' or 'Say what you would do after ...', so the answer can be finished rather than failed. Leave hints empty when the score is 70 or more.",
      "Do not award credit for content the learner did not write. Do not invent facts.",
      "Be specific: name the exact point missed, not vague advice.",
      "Write plain sentences with no long dashes. Plain text only, no markdown symbols such as **, ## or backticks.",
      "Reply with a single JSON object and nothing else, using this shape:",
      '{"score": number 0-100, "verdict": "one or two sentences", "strengths": ["..."], "missed": ["..."], "hints": ["..."], "correctedAnswer": "a full model answer in 3-8 sentences", "followUp": "one short question that checks the weakest point", "criteria": [{"id": "criterion id", "correct": true|false, "feedback": "one sentence"}]}',
      "Include every supplied criterion id in criteria, exactly once. If no criteria are supplied, return an empty criteria array.",
      "If the learner's own saved material is supplied, use it: when their answer matches something they saved, mention it in strengths as coming from their own material, and when their saved material is wrong or incomplete on this point, say so in missed.",
    ].join("\n");


    const knowledge = data.knowledge
      ? compressContext(data.knowledge, `${data.question}\n${data.answer}`, 6000)
      : undefined;

    const parts: string[] = [
      `Topic: ${data.topic}`,
      data.task ? `Task type: ${data.task}` : "",
      `Question or task:\n${data.question}`,
      data.modelAnswer ? `Reference answer:\n${data.modelAnswer}` : "",
      data.expectedPoints?.length ? `Points the answer should cover:\n- ${data.expectedPoints.join("\n- ")}` : "",
      data.criteria?.length
        ? `Marking criteria (mark each one):\n${data.criteria
            .map((c) => `id=${c.id} | ${c.label} | ${c.description}${c.expected ? ` | expected: ${c.expected}` : ""}`)
            .join("\n")}`
        : "",
      knowledge ? `The learner's own saved material (theirs, not course content):\n${knowledge}` : "",
      `Learner's answer:\n${data.answer}`,
      "Return the JSON object now.",
    ].filter(Boolean);

    // Marking changes recorded progress, so it is high risk: the layer routes it
    // to the stronger model and always moderates the result.
    const result = await runAi({
      feature: "grading",
      userId: context.userId,
      system,
      prompt: parts.join("\n\n"),
      risk: "high",
      priority: "interactive",
      json: true,
      needsEscalation: (text) => !text.includes("score"),
    });
    if (!result.ok) return { ok: false, error: result.error };

    const raw = result.text;
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return { ok: false, error: "The marker returned an unreadable reply." };

    let parsed: ReturnType<typeof responseShape.safeParse>;
    try {
      parsed = responseShape.safeParse(JSON.parse(raw.slice(start, end + 1)));
    } catch {
      return { ok: false, error: "The marker returned an unreadable reply." };
    }
    if (!parsed.success) return { ok: false, error: "The marker returned an unexpected format." };

    const score = clamp(parsed.data.score);
    const supplied = new Set((data.criteria ?? []).map((c) => c.id));
    const criteria = parsed.data.criteria
      .filter((c) => supplied.has(c.id))
      .map((c) => ({ id: c.id, correct: c.correct, feedback: c.feedback.trim() }));

    // Selective self-check: marking drives progress, so every mark is moderated.
    const reviewed = await reviewGrade({
      topic: data.topic,
      question: data.question,
      answer: data.answer,
      modelAnswer: data.modelAnswer,
      expectedPoints: data.expectedPoints,
      userId: context.userId,
      grade: {
        score,
        verdict: parsed.data.verdict.trim(),
        strengths: parsed.data.strengths.map((s) => s.trim()).filter(Boolean).slice(0, 6),
        missed: parsed.data.missed.map((s) => s.trim()).filter(Boolean).slice(0, 8),
        correctedAnswer: parsed.data.correctedAnswer.trim(),
        followUp: parsed.data.followUp.trim(),
      },
    });

    const status = statusFor(reviewed.score);
    const aiHints = parsed.data.hints.map((s) => s.trim()).filter(Boolean).slice(0, 5);
    const grade: WrittenGrade = {
      ...reviewed,
      correct: status === "correct",
      criteria,
      aiMarked: true,
      status,
      // Nearly there answers always carry something to add, even if the marker forgot.
      hints: status === "correct" ? [] : aiHints.length ? aiHints : reviewed.missed.slice(0, 4),
    };

    if (key) await writeCache({ key, feature: "grading", value: grade, model: result.model });
    return { ok: true, grade };
  });
