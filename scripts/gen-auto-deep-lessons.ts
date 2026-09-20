/**
 * Writes the deep teaching layer for the AUTO PATH course.
 *
 * For each section it first finds outside material specific to that topic
 * (searched, then fetched to prove the page is really there), then asks the
 * model to teach the topic in its own words using the section's own material
 * plus what those pages cover. The model writes; the deterministic checks in
 * this file and in lesson-quality decide what is allowed to ship.
 *
 * Results are written one file per section to /tmp/auto-deep so a long run can
 * be resumed. scripts/assemble-auto-deep-lessons.ts turns them into TS.
 *
 * Run with: bun scripts/gen-auto-deep-lessons.ts
 * Env: START (default 0), COUNT (default all), CONCURRENCY (default 3)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { autoRepairPackage as pkg } from "@/content/packs/auto-repair/3.7.0/package";
import type { DeepLesson } from "@/data/deep-lessons/types";

const KEY = process.env["LOVABLE_API_KEY"];
if (!KEY) throw new Error("LOVABLE_API_KEY missing");
const AGW_URL = process.env["AGW_URL"];
const AGW_TOKEN = process.env["AGW_TOKEN"];

const OUT = "/tmp/auto-deep";
mkdirSync(OUT, { recursive: true });

const MODEL = "openai/gpt-6-astra";
const START = Number(process.env["START"] ?? 0);
const COUNT = Number(process.env["COUNT"] ?? pkg.sections.length);
const CONCURRENCY = Number(process.env["CONCURRENCY"] ?? 3);

const SYSTEM = [
  "You write teaching material for an automotive repair course, for someone who has never worked on a car.",
  "Teach two things in every lesson: how the system actually works, and how a technician diagnoses and repairs it.",
  "Everything is in your own words. Never copy sentences from any source, manual or website.",
  "Be concrete and factual. Never invent a specification, torque value, part number, code or tool you are not confident exists.",
  "Where a real value varies by vehicle, say it is looked up in the service information rather than inventing a number.",
  "Plain language first, then the technical term. Keep sentences under 40 words and paragraphs under 180 words.",
  "Reply with one JSON object and nothing else.",
].join("\n");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readingMinutes", "intro", "whereYouMeetIt", "sections", "depth"],
  properties: {
    readingMinutes: { type: "integer" },
    intro: { type: "string" },
    whereYouMeetIt: { type: "string" },
    sections: {
      type: "array",
      minItems: 5,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "paragraphs"],
        properties: {
          heading: { type: "string" },
          paragraphs: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
        },
      },
    },
    depth: {
      type: "object",
      additionalProperties: false,
      required: ["keyIdeas", "walkthrough", "reference", "misconceptions", "examTraps", "checkYourself"],
      properties: {
        keyIdeas: { type: "array", minItems: 4, maxItems: 6, items: { type: "string" } },
        walkthrough: {
          type: "object",
          additionalProperties: false,
          required: ["title", "scenario", "steps", "outcome"],
          properties: {
            title: { type: "string" },
            scenario: { type: "string" },
            steps: {
              type: "array",
              minItems: 5,
              maxItems: 9,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["label", "detail"],
                properties: { label: { type: "string" }, detail: { type: "string" } },
              },
            },
            outcome: { type: "string" },
          },
        },
        reference: {
          type: "object",
          additionalProperties: false,
          required: ["heading", "rows"],
          properties: {
            heading: { type: "string" },
            rows: {
              type: "array",
              minItems: 6,
              maxItems: 12,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["term", "detail"],
                properties: { term: { type: "string" }, detail: { type: "string" } },
              },
            },
          },
        },
        misconceptions: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["claim", "correction"],
            properties: { claim: { type: "string" }, correction: { type: "string" } },
          },
        },
        examTraps: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
        checkYourself: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "answer"],
            properties: { question: { type: "string" }, answer: { type: "string" } },
          },
        },
      },
    },
  },
} as const;

interface FoundSource {
  label: string;
  url: string;
  text: string;
}

/** Search the live web for material about this exact topic. */
async function search(query: string): Promise<Array<{ title: string; url: string; text: string }>> {
  if (!AGW_URL || !AGW_TOKEN) return [];
  const res = await fetch(`${AGW_URL}/f/websearch/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${AGW_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, numResults: 8, contents: { text: true } }),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { results?: Array<{ title?: string; url?: string; text?: string }> };
  return (body.results ?? [])
    .filter((row) => row.url && row.title)
    .map((row) => ({ title: String(row.title), url: String(row.url), text: String(row.text ?? "").slice(0, 2500) }));
}

const BAD_HOST =
  /(?:pinterest|facebook|tiktok|instagram|amazon\.|ebay\.|quizlet|chegg|coursehero|studocu|ebookhub|dokumen|scribd|slideshare|pdfcoffee|vdoc|z-lib|libgen|reddit\.com\/user)/i;

/** Publishers a working technician would actually be sent to. */
const GOOD_HOST =
  /(?:\.gov$|\.edu$|\.org$|sae\.org|ase\.com|motor\.com|vehicleservicepros\.com|underhoodservice\.com|brakeandfrontend\.com|tomorrowstechnician\.com|babcox\.com|napaonline\.com|autozone\.com|haynes\.com|howacarworks\.com|edmunds\.com|motortrend\.com|caranddriver\.com|jdpower\.com|aaa\.com|carcarecouncil|alldata\.com|mitchell1\.com|snapon\.com|boschautoparts\.com|denso|gates\.com|dorman|federalmogul|delphi|toyota|ford\.com|gm\.com|honda|nissan|bmw|volkswagen)/i;

function hostRank(url: string): number {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.replace(/\/$/, "").split("/").filter(Boolean).length < 1) return -1;
    return GOOD_HOST.test(parsed.hostname) ? 2 : 0;
  } catch {
    return -1;
  }
}

/** Keep only pages that answer right now. A dead link teaches nobody. */
async function verify(url: string): Promise<boolean> {
  try {
    const host = new URL(url).hostname;
    if (BAD_HOST.test(host)) return false;
    const res = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 IT-PATH link check" } });
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

async function findSources(title: string, summary: string): Promise<FoundSource[]> {
  const queries = [
    `${title} automotive how it works explained`,
    `${title} diagnosis and repair procedure ${summary.split(/[.,]/)[0] ?? ""}`,
  ];
  const seen = new Set<string>();
  const found: FoundSource[] = [];
  for (const query of queries) {
    const rows = (await search(query)).filter((row) => hostRank(row.url) > 1);
    rows.sort((a, b) => hostRank(b.url) - hostRank(a.url));
    for (const row of rows) {
      if (found.length >= 3) break;
      const key = new URL(row.url).hostname + new URL(row.url).pathname;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!(await verify(row.url))) continue;
      found.push({ label: row.title.slice(0, 110), url: row.url, text: row.text });
    }
    if (found.length >= 3) break;
  }
  return found;
}

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
      text: { format: { type: "json_schema", name: "deep_lesson", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
        // partial frame
      }
    }
  }
  return text;
}

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const sentences = (value: string) =>
  value.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
const PLACEHOLDER = /\b(?:lorem ipsum|todo|tbd|placeholder|coming soon|to be (?:added|written))\b/i;

/** The deterministic gate. The model never decides whether its own work ships. */
function issues(lesson: DeepLesson): string[] {
  const out: string[] = [];
  const all = [
    lesson.intro,
    lesson.whereYouMeetIt,
    ...lesson.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...(lesson.depth?.keyIdeas ?? []),
  ].join("\n");
  if (PLACEHOLDER.test(all)) out.push("placeholder text");
  if (words(lesson.intro) < 25) out.push("intro too short");
  if (words(lesson.whereYouMeetIt) < 12) out.push("where-you-meet-it too short");
  if (lesson.sections.length < 5) out.push("too few teaching sections");
  const headings = lesson.sections.map((section) => section.heading.toLowerCase().trim());
  if (new Set(headings).size !== headings.length) out.push("repeated heading");
  for (const section of lesson.sections) {
    for (const paragraph of section.paragraphs) {
      if (words(paragraph) < 35) out.push("a teaching paragraph is too thin");
      if (words(paragraph) > 210) out.push("a teaching paragraph is too long");
      if (sentences(paragraph).some((sentence) => words(sentence) > 42)) out.push("a sentence is too long");
    }
  }
  const depth = lesson.depth;
  if (!depth) return [...new Set([...out, "no depth layer"])];
  if (depth.walkthrough.steps.length < 5) out.push("walkthrough has too few steps");
  if (words(depth.walkthrough.scenario) < 15) out.push("walkthrough scenario is too thin");
  if (words(depth.walkthrough.outcome) < 10) out.push("walkthrough has no verified outcome");
  const steps = depth.walkthrough.steps.map((step) => `${step.label} ${step.detail}`.toLowerCase());
  if (new Set(steps).size !== steps.length) out.push("walkthrough repeats a step");
  if (depth.checkYourself.length < 3) out.push("too few self-checks");
  if (depth.checkYourself.some((check) => words(check.question) < 5 || words(check.answer) < 4)) {
    out.push("a self-check is empty");
  }
  if (depth.misconceptions.some((row) => words(row.correction) < 8)) out.push("a correction says nothing");
  if (depth.reference.rows.some((row) => words(row.detail) < 3)) out.push("a reference row says nothing");
  return [...new Set(out)];
}

function prompt(sectionId: string, sources: FoundSource[]): string {
  const section = pkg.sections.find((row) => row.id === sectionId)!;
  const lesson = pkg.lessons.find((row) => row.sectionId === sectionId);
  const concepts = pkg.concepts.filter((row) => row.sectionId === sectionId);
  const skills = pkg.skills.filter((row) => row.sectionId === sectionId);
  return [
    `Section: ${section.title}`,
    `Summary: ${section.summary}`,
    lesson ? `Existing short lesson (expand on it, never contradict it): ${lesson.body}` : "",
    concepts.length ? `Terms this section owns: ${concepts.map((row) => `${row.term} = ${row.meaning}`).join(" | ")}` : "",
    skills.length ? `The learner must be able to: ${skills.map((row) => row.statement).join(" | ")}` : "",
    "",
    sources.length
      ? [
          "Reference material found for this exact topic. Use it to stay factually correct and to decide what matters.",
          "Write everything in your own words; never reuse their sentences.",
          ...sources.map((source, index) => `[${index + 1}] ${source.label} (${new URL(source.url).hostname})\n${source.text}`),
        ].join("\n")
      : "No outside material was available; rely on the section material above and standard practice.",
    "",
    "Write the JSON object. Section headings are plain titles with no numbering. The teaching sections must, in order, cover:",
    "1. what this system is and what job it does on the vehicle, in everyday words;",
    "2. how it works, part by part, following the flow of force, fluid, air, current or signal;",
    "3. how it fails and the symptoms a customer describes;",
    "4. how a technician diagnoses it, in the order the checks are actually done and why that order;",
    "5. how it is repaired and how the repair is verified, including the safety steps that apply;",
    "6. (optional) how it connects to the systems around it.",
    "Name real tools and real measurements where you are confident; otherwise say the value comes from the service information.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function build(sectionId: string): Promise<void> {
  const section = pkg.sections.find((row) => row.id === sectionId)!;
  const file = `${OUT}/${section.slug}.json`;
  if (existsSync(file)) return;
  const sources = await findSources(section.title, section.summary);
  let lastIssues: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let raw: string;
    try {
      raw = await askModel(
        attempt === 0
          ? prompt(sectionId, sources)
          : `${prompt(sectionId, sources)}\n\nYour previous attempt was rejected for: ${lastIssues.join("; ")}. Fix those exactly.`,
      );
    } catch (error) {
      console.error(`${section.slug}: ${(error as Error).message}`);
      return;
    }
    let parsed: DeepLesson;
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as DeepLesson;
    } catch {
      lastIssues = ["unreadable JSON"];
      continue;
    }
    const lesson: DeepLesson = { ...parsed, topicId: `topic-${section.slug}` };
    const problems = issues(lesson);
    if (problems.length === 0) {
      writeFileSync(file, JSON.stringify({ lesson, sources: sources.map(({ label, url }) => ({ label, url })) }, null, 2));
      console.log(`ok   ${section.slug} (${sources.length} sources)`);
      return;
    }
    lastIssues = problems;
  }
  console.log(`FAIL ${section.slug}: ${lastIssues.join("; ")}`);
}


const queue = pkg.sections.slice(START, START + COUNT).map((section) => section.id);
let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      const id = queue[index];
      if (!id) return;
      await build(id);
    }
  }),
);

const done = pkg.sections.filter((section) => existsSync(`${OUT}/${section.slug}.json`)).length;
console.log(`written ${done}/${pkg.sections.length}`);
void readFileSync;
