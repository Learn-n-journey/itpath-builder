/**
 * Tops up sections that ended up with fewer than 20 quiz questions.
 * Run with: bun scripts/topup-ai-questions.ts
 */
import { aiQuestionSeeds, type AiQuestionSeed } from "@/data/ai-question-bank";
import { getTopicQuestionPool } from "@/data/topic-quizzes";
import { lessons, topics } from "@/data/static-content";
import { getLearningModule } from "@/data/learning-content";

const KEY = process.env["GEMINI_API_KEY"];
if (!KEY) throw new Error("GEMINI_API_KEY missing");

const SYSTEM = `You write exam style multiple choice questions for an IT and cybersecurity course.
Rules:
- Use only the supplied section material. Never invent facts outside it.
- Every question is multiple choice with exactly 4 options and exactly one correct option.
- Wrong options must be plausible, same subject area, similar length and style. No joke or obviously silly options.
- Questions must read as a complete, sensible question a tutor would ask.
- Mix recall, applied judgement and first troubleshooting step.
- Keep subsystems distinct. Never claim that evidence about one subsystem (power delivery, cooling, processing, memory, storage, networking) proves, establishes or guarantees the condition of another, and never write options declaring two subsystems equivalent or interchangeable.
Return JSON only: {"questions":[{"prompt":"","choices":["","","",""],"answerIndex":0,"explanation":"","mistakeCategory":"concept|terminology|diagnosis|procedure"}]}`;

function context(topicId: string): string {
  const topic = topics.find((item) => item.id === topicId)!;
  const lesson = lessons.find((item) => item.topicId === topicId);
  const module = getLearningModule(topicId);
  return [
    `Section: ${topic.title}`,
    `Summary: ${topic.summary}`,
    lesson ? `Key terms: ${lesson.keyTerms.map((t) => `${t.term} = ${t.meaning}`).join(" | ")}` : "",
    module ? `How it works: ${module.howItWorks.join(" | ")}` : "",
    module ? `Common problems: ${module.commonProblems.join(" | ")}` : "",
    module ? `Troubleshooting: ${module.troubleshooting.join(" | ")}` : "",
    module ? `Exam coverage: ${module.examCoverage.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

async function ask(topicId: string, count: number, existing: string[]): Promise<AiQuestionSeed[]> {
  const topic = topics.find((item) => item.id === topicId)!;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "gemini-3.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Write ${count} NEW questions as JSON for this section. Do not repeat any of these existing questions:\n${existing.join("\n")}\n\n${context(topicId)}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`${topicId}: ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  let parsed: { questions?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse((data.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|```$/g, "").trim());
  } catch {
    return [];
  }
  const out: AiQuestionSeed[] = [];
  for (const item of parsed.questions ?? []) {
    const prompt = String(item["prompt"] ?? "").trim();
    const choices = (item["choices"] as string[] | undefined)?.map((c) => String(c).trim()) ?? [];
    const answerIndex = Number(item["answerIndex"]);
    const explanation = String(item["explanation"] ?? "").trim();
    const category = String(item["mistakeCategory"] ?? "concept");
    if (choices.length !== 4) continue;
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) continue;
    if (prompt.length < 20 || !prompt.includes("?")) continue;
    if (new Set(choices.map((c) => c.toLowerCase())).size !== 4) continue;
    if (choices.some((c) => !c || c.length > 240)) continue;
    if (!explanation) continue;
    out.push({
      topicId,
      certificationId: topic.certificationId,
      prompt,
      choices,
      answerIndex,
      explanation,
      difficulty: topic.difficulty,
      mistakeCategory: (["concept", "terminology", "diagnosis", "procedure"].includes(category)
        ? category
        : "concept") as AiQuestionSeed["mistakeCategory"],
    });
  }
  return out;
}

const all: AiQuestionSeed[] = [...aiQuestionSeeds];
const TARGET = 60;
for (const topic of topics) {
  const pool = getTopicQuestionPool(topic.id);
  if (pool.length >= TARGET) continue;
  const existing = pool.map((q) => q.prompt);
  let added = 0;
  while (pool.length + added < TARGET) {
    const batch = await ask(topic.id, 15, existing.slice(-40));
    if (!batch.length) break;
    all.push(...batch);
    existing.push(...batch.map((q) => q.prompt));
    added += batch.length;
  }
  console.log(`${topic.id}: had ${pool.length}, added ${added}`);
}

const header = `/**
 * AI expanded question bank.
 *
 * These multiple choice questions were written with AI from the lesson content of
 * each section, then checked by the same quality gate every other question passes.
 * The file is generated by scripts/gen-ai-questions.ts, not edited by hand.
 */
import type { Question } from "@/lib/app-data/types";

export interface AiQuestionSeed {
  topicId: string;
  certificationId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Question["difficulty"];
  mistakeCategory: Question["mistakeCategory"];
}

export const aiQuestionSeeds: AiQuestionSeed[] = ${JSON.stringify(all, null, 2)} as AiQuestionSeed[];

export const aiQuestions: Question[] = aiQuestionSeeds.map((seed, index) => ({
  id: \`question-ai-\${index + 1}\`,
  topicId: seed.topicId,
  quizId: "quiz-generated-bank",
  certificationId: seed.certificationId,
  type: "multiple_choice",
  prompt: seed.prompt,
  choices: seed.choices,
  correctAnswer: [seed.choices[seed.answerIndex] ?? ""],
  acceptableAnswers: [],
  explanation: seed.explanation,
  difficulty: seed.difficulty,
  mistakeCategory: seed.mistakeCategory,
  requiresReasoning: seed.mistakeCategory === "diagnosis" || seed.mistakeCategory === "procedure",
}));
`;

await Bun.write("src/data/ai-question-bank.ts", header);
console.log(`total ${all.length} seeds`);
