import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { reviewGrade } from "@/lib/ai-self-check.server";

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
  aiMarked: true;
}

export type GradeReply = { ok: true; grade: WrittenGrade } | { ok: false; error: string };

const responseShape = z.object({
  score: z.number(),
  verdict: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  missed: z.array(z.string()).default([]),
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

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export const gradeWrittenAnswer = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<GradeReply> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI marking is not configured." };

    const system = [
      "You are a strict but fair IT and cybersecurity examiner marking a learner's written answer.",
      "Mark the idea, not the wording. Synonyms, informal phrasing and different order are all acceptable.",
      "Do not award credit for content the learner did not write. Do not invent facts.",
      "Be specific: name the exact point missed, not vague advice.",
      "Write plain text only. No markdown symbols such as **, ## or backticks.",
      "Reply with a single JSON object and nothing else, using this shape:",
      '{"score": number 0-100, "verdict": "one or two sentences", "strengths": ["..."], "missed": ["..."], "correctedAnswer": "a full model answer in 3-8 sentences", "followUp": "one short question that checks the weakest point", "criteria": [{"id": "criterion id", "correct": true|false, "feedback": "one sentence"}]}',
      "Include every supplied criterion id in criteria, exactly once. If no criteria are supplied, return an empty criteria array.",
      "If the learner's own saved material is supplied, use it: when their answer matches something they saved, mention it in strengths as coming from their own material, and when their saved material is wrong or incomplete on this point, say so in missed.",
    ].join("\n");

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
      data.knowledge ? `The learner's own saved material (theirs, not course content):\n${data.knowledge}` : "",
      `Learner's answer:\n${data.answer}`,
      "Return the JSON object now.",
    ].filter(Boolean);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: parts.join("\n\n") },
          ],
        }),
      });

      if (res.status === 429)
        return { ok: false, error: "The marker is busy right now — try again in a moment." };
      if (res.status === 402) return { ok: false, error: "AI usage limit reached for this app." };
      if (!res.ok) return { ok: false, error: `AI marking failed (${res.status}).` };

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content?.trim();
      if (!raw) return { ok: false, error: "The marker returned an empty reply." };

      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return { ok: false, error: "The marker returned an unreadable reply." };

      const parsed = responseShape.safeParse(JSON.parse(raw.slice(start, end + 1)));
      if (!parsed.success) return { ok: false, error: "The marker returned an unexpected format." };

      const score = clamp(parsed.data.score);
      const supplied = new Set((data.criteria ?? []).map((c) => c.id));
      const criteria = parsed.data.criteria
        .filter((c) => supplied.has(c.id))
        .map((c) => ({ id: c.id, correct: c.correct, feedback: c.feedback.trim() }));

      // Silent self-check: marking drives progress, so every mark is moderated.
      const reviewed = await reviewGrade({
        topic: data.topic,
        question: data.question,
        answer: data.answer,
        modelAnswer: data.modelAnswer,
        expectedPoints: data.expectedPoints,
        grade: {
          score,
          verdict: parsed.data.verdict.trim(),
          strengths: parsed.data.strengths.map((s) => s.trim()).filter(Boolean).slice(0, 6),
          missed: parsed.data.missed.map((s) => s.trim()).filter(Boolean).slice(0, 8),
          correctedAnswer: parsed.data.correctedAnswer.trim(),
          followUp: parsed.data.followUp.trim(),
        },
      });

      return {
        ok: true,
        grade: {
          ...reviewed,
          correct: reviewed.score >= 70,
          criteria,
          aiMarked: true,
        },
      };
    } catch {
      return { ok: false, error: "Could not reach the AI marker. Your answer was still saved." };
    }
  });
