/**
 * One off generator: writes src/data/ai-question-bank.ts from the lesson content
 * of every section, using Google Gemini. Run with:
 *   bun scripts/gen-ai-questions.ts
 */
import { lessons, topics } from "@/data/static-content";
import { getLearningModule } from "@/data/learning-content";
import { questionIssues } from "@/lib/question-quality";
import type { Question } from "@/lib/app-data/types";

const KEY = process.env["GEMINI_API_KEY"];
if (!KEY) throw new Error("GEMINI_API_KEY missing");

const PER_TOPIC = 8;

interface Seed {
  topicId: string;
  certificationId: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  difficulty: string;
  mistakeCategory: string;
}

function context(topicId: string): string {
  const topic = topics.find((item) => item.id === topicId)!;
  const lesson = lessons.find((item) => item.topicId === topicId);
  const module = getLearningModule(topicId);
  return [
    `Section: ${topic.title}`,
    `Summary: ${topic.summary}`,
    lesson ? `Definition: ${lesson.definition}` : "",
    lesson ? `Key terms: ${lesson.keyTerms.map((t) => `${t.term} = ${t.meaning}`).join(" | ")}` : "",
    lesson ? `Misconceptions: ${lesson.commonMisconceptions.join(" | ")}` : "",
    module ? `How it works: ${module.howItWorks.join(" | ")}` : "",
    module ? `Common problems: ${module.commonProblems.join(" | ")}` : "",
    module ? `Troubleshooting: ${module.troubleshooting.join(" | ")}` : "",
    module ? `Exam coverage: ${module.examCoverage.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

const SYSTEM = `You write exam style multiple choice questions for an IT and cybersecurity course.
Rules:
- Use only the supplied section material. Never invent facts outside it.
- Every question is multiple choice with exactly 4 options and exactly one correct option.
- Wrong options must be plausible, same subject area, similar length and style. No joke or obviously silly options.
- Every option must answer the exact kind of question asked. Action questions need four actions; why/how questions need four explanations; identification questions need four names of the same kind. Never mix response formats.
- Questions must read as a complete, sensible question a tutor would ask. No template fragments.
- Never mention the section name, lesson, module, course, learning objective or what the exam expects. Ask about the actual technical evidence or decision.
- Do not invent a colleague, new starter or customer merely to ask for a definition.
- Mix recall, applied judgement and first troubleshooting step.
- Keep subsystems distinct. Never claim that evidence about one subsystem (power delivery, cooling, processing, memory, storage, networking) proves, establishes or guarantees the condition of another, and never write options declaring two subsystems equivalent or interchangeable. Relate subsystems only through real cause and effect stated in the supplied material.
- Write one short explanation of why the answer is right.
Answer choices must match the question type: Term questions must have short term choices; Action questions must have action choices; Why/How questions must have complete explanation choices. Return JSON only: {"questions":[{"prompt":"","choices":["","","",""],"answerIndex":0,"explanation":"","mistakeCategory":"concept|terminology|diagnosis|procedure"}]}`;

async function ask(topicId: string): Promise<Seed[]> {
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
          content: `Write ${PER_TOPIC} questions as JSON for this section.\n\n${context(topicId)}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`${topicId}: ${res.status} ${await res.text()}`);
    return [];
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  let parsed: { questions?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim());
  } catch {
    console.error(`${topicId}: unparsable response`);
    return [];
  }
  const out: Seed[] = [];
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
    const answer = choices[answerIndex] ?? "";
    const issues = questionIssues({
      id: `generated-${topicId}-${out.length}`,
      topicId,
      quizId: `section-quiz-${topicId}`,
      certificationId: topic.certificationId,
      prompt,
      type: "multiple_choice",
      choices,
      correctAnswer: [answer],
      acceptableAnswers: [answer],
      explanation,
      difficulty: topic.difficulty,
      mistakeCategory: "concept",
      requiresReasoning: true,
    } satisfies Question);
    if (issues.length > 0) continue;
    out.push({
      topicId,
      certificationId: topic.certificationId,
      prompt,
      choices,
      answerIndex,
      explanation,
      difficulty: topic.difficulty,
      mistakeCategory: ["concept", "terminology", "diagnosis", "procedure"].includes(category)
        ? category
        : "concept",
    });
  }
  return out;
}

const all: Seed[] = [];
for (const topic of topics) {
  const seeds = await ask(topic.id);
  console.log(`${topic.id}: ${seeds.length}`);
  all.push(...seeds);
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
console.log(`total ${all.length} questions`);
