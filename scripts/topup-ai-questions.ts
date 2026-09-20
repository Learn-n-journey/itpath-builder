/**
 * Widens thin question pools.
 *
 * Every section should have far more questions than a quiz draws, otherwise a
 * learner sees the same items again on the next attempt. This asks the model
 * for new questions for any short section, then keeps only the ones that pass
 * the same deterministic gate every other question passes. The model writes;
 * it never approves its own work.
 *
 * Run with: bun scripts/topup-ai-questions.ts
 * Env: TARGET (default 40), ROUNDS (default 2), CONCURRENCY (default 4)
 */
import { aiQuestionSeeds, type AiQuestionSeed } from "@/data/ai-question-bank";
import { getTopicQuestionPool } from "@/data/topic-quizzes";
import { lessons, topics } from "@/data/static-content";
import { getLearningModule } from "@/data/learning-content";
import { questionIssues } from "@/lib/question-quality";
import type { Question } from "@/lib/app-data/types";

const KEY = process.env["LOVABLE_API_KEY"];
if (!KEY) throw new Error("LOVABLE_API_KEY missing");

const TARGET = Number(process.env["TARGET"] ?? 40);
const ROUNDS = Number(process.env["ROUNDS"] ?? 2);
const CONCURRENCY = Number(process.env["CONCURRENCY"] ?? 4);
const MODEL = "openai/gpt-6-astra";

const SYSTEM = `You write exam style multiple choice questions for an IT and cybersecurity course, following professional item writing standards.
Rules:
- Use only the supplied section material. Never invent facts outside it.
- Exactly 4 options, exactly one defensible correct option.
- The question must be answerable with the options covered: state the whole situation in the question itself.
- Never restate the correct answer inside the question. No word repeated from the answer as a clue.
- All four options must be the same kind of thing, similar length, similar style and grammar. Never mix actions with explanations or with factual statements.
- Wrong options must be real mistakes a learner makes, not absurd or unrelated statements.
- No "all of the above", "none of the above", no negative or "except" wording, no absolutes (always, never, all, no).
- Never mention the section, lesson, module, course, objective or exam. Ask about the technical evidence or the decision.
- Test application, distinction, diagnosis or evidence based reasoning, not recognition of a heading.
- Give one short explanation of why the answer is right, teaching the reason rather than repeating the answer.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prompt", "choices", "answerIndex", "explanation", "mistakeCategory"],
        properties: {
          prompt: { type: "string" },
          choices: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          answerIndex: { type: "integer" },
          explanation: { type: "string" },
          mistakeCategory: { type: "string", enum: ["concept", "terminology", "diagnosis", "procedure"] },
        },
      },
    },
  },
} as const;

function context(topicId: string): string {
  const topic = topics.find((item) => item.id === topicId)!;
  const lesson = lessons.find((item) => item.topicId === topicId);
  const learning = getLearningModule(topicId);
  return [
    `Section: ${topic.title}`,
    `Summary: ${topic.summary}`,
    lesson ? `Key terms: ${lesson.keyTerms.map((t) => `${t.term} = ${t.meaning}`).join(" | ")}` : "",
    lesson ? `Misconceptions: ${lesson.commonMisconceptions.join(" | ")}` : "",
    learning ? `How it works: ${learning.howItWorks.join(" | ")}` : "",
    learning ? `Common problems: ${learning.commonProblems.join(" | ")}` : "",
    learning ? `Troubleshooting: ${learning.troubleshooting.join(" | ")}` : "",
    learning ? `Exam coverage: ${learning.examCoverage.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

/** Reads the streamed response and returns the joined answer text. */
async function askModel(user: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": KEY!, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
        { role: "user", content: [{ type: "input_text", text: user }] },
      ],
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      text: { format: { type: "json_schema", name: "question_batch", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`gateway ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as { type?: string; delta?: string };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
      } catch {
        // partial frame, ignore
      }
    }
  }
  return text;
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function words(value: string): Set<string> {
  return new Set(norm(value).split(" ").filter((word) => word.length > 3));
}

function tooSimilar(prompt: string, seen: Set<string>[]): boolean {
  const set = words(prompt);
  if (set.size === 0) return true;
  return seen.some((other) => {
    let shared = 0;
    for (const word of set) if (other.has(word)) shared += 1;
    return shared / Math.min(set.size, other.size || 1) > 0.7;
  });
}

async function topUp(topicId: string): Promise<AiQuestionSeed[]> {
  const topic = topics.find((item) => item.id === topicId)!;
  const existing = getTopicQuestionPool(topicId).map((question) => question.prompt);
  if (existing.length >= TARGET) return [];
  const seenPrompts = new Set(existing.map(norm));
  const seenWords = existing.map(words);
  const accepted: AiQuestionSeed[] = [];

  for (let round = 0; round < ROUNDS && existing.length + accepted.length < TARGET; round += 1) {
    const need = TARGET - existing.length - accepted.length + 4;
    let raw: string;
    try {
      raw = await askModel(
        `Write ${need} NEW questions as JSON for this section. None may repeat or paraphrase these:\n${[
          ...existing,
          ...accepted.map((seed) => seed.prompt),
        ].join("\n")}\n\n${context(topicId)}`,
      );
    } catch (error) {
      console.error(`${topicId}: ${(error as Error).message.slice(0, 160)}`);
      break;
    }
    let parsed: { questions?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim());
    } catch {
      continue;
    }
    for (const item of parsed.questions ?? []) {
      const prompt = String(item["prompt"] ?? "").trim();
      const choices = (item["choices"] as string[] | undefined)?.map((c) => String(c).trim()) ?? [];
      const answerIndex = Number(item["answerIndex"]);
      const explanation = String(item["explanation"] ?? "").trim();
      const category = String(item["mistakeCategory"] ?? "concept");
      if (choices.length !== 4) continue;
      if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) continue;
      const answer = choices[answerIndex];
      if (!answer) continue;
      if (seenPrompts.has(norm(prompt))) continue;
      if (tooSimilar(prompt, seenWords)) continue;

      const candidate: Question = {
        id: `question-ai-topup-${topicId}-${accepted.length}`,
        topicId,
        quizId: "quiz-generated-bank",
        certificationId: topic.certificationId,
        type: "multiple_choice",
        prompt,
        choices,
        correctAnswer: [answer],
        acceptableAnswers: [],
        explanation,
        difficulty: topic.difficulty,
        mistakeCategory: "concept",
        requiresReasoning: true,
      };
      if (questionIssues(candidate).length > 0) continue;

      seenPrompts.add(norm(prompt));
      seenWords.push(words(prompt));
      accepted.push({
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
  }
  console.log(`${topicId}: had ${existing.length}, added ${accepted.length}`);
  return accepted;
}

const queue = topics.map((topic) => topic.id);
const all: AiQuestionSeed[] = [...aiQuestionSeeds];

async function worker(): Promise<void> {
  for (;;) {
    const topicId = queue.shift();
    if (!topicId) return;
    all.push(...(await topUp(topicId)));
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const header = `/**
 * AI expanded question bank.
 *
 * These multiple choice questions were written with AI from the lesson content of
 * each section, then checked by the same quality gate every other question passes.
 * The file is generated by scripts/topup-ai-questions.ts, not edited by hand.
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
