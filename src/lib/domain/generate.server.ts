/**
 * The generator.
 *
 * Turns a plain brief into a draft subject: the domain definition, the
 * qualification tracks with their objectives, the sections with their lessons,
 * recall practice, practice question and scenario, and the outside sources.
 *
 * It generates. It does not judge its own work: `validate.ts` does that
 * independently, and `correctSection` is only ever called with findings that
 * the auditor produced.
 */
import { runAi } from "@/lib/ai/run.server";
import type { Finding } from "@/lib/quality/types";
import { getRule } from "@/lib/quality/rules";
import type { TopicSeed } from "@/data/curriculum/builder";
import { questionIssues } from "@/lib/question-quality";
import type { Question } from "@/lib/app-data/types";
import type { DomainBrief, DomainDraft, DraftQualification } from "./brief";
import type { DomainDefinition } from "@/domain/types";

const AUTHOR_SYSTEM = [
  "You are writing course material for a study platform.",
  "Everything you write is original. Never copy exam wording, question banks or copyrighted text.",
  "Be concrete and factual. Never invent a standard, part number, tool, measurement or source link you are not confident exists.",
  "Reply with one JSON object and nothing else. No prose, no markdown fences.",
].join("\n");

/** A short fingerprint of the prompt, so a reworded prompt never reuses an old answer. */
function fingerprint(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash * 33) ^ value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}

async function askJson<T>(prompt: string, cacheParts: string[]): Promise<T> {
  const result = await runAi({
    feature: "scenario",
    system: AUTHOR_SYSTEM,
    prompt,
    risk: "medium",
    priority: "background",
    json: true,
    skipBudget: true,
    cache: { parts: [...cacheParts, fingerprint(AUTHOR_SYSTEM + prompt)], scope: "domain-generate" },
  });
  if (!result.ok) throw new Error(result.error ?? "The generator could not produce this part.");
  const text = result.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  return JSON.parse(text) as T;
}

/** Step one: the words the subject is described in. */
export async function generateDefinition(brief: DomainBrief): Promise<DomainDefinition> {
  const raw = await askJson<Partial<DomainDefinition>>(
    [
      `Subject: ${brief.field}.`,
      brief.awardingBody ? `Awarding body: ${brief.awardingBody}.` : "There is no awarding body.",
      `Qualification tracks, in learning order: ${brief.qualifications.join(", ")}.`,
      brief.notes ? `Author notes: ${brief.notes}` : "",
      "",
      "Return this exact shape:",
      '{"appName":"", "summary":"one sentence", "sourceNote":"where the material comes from", "defaultGoal":"a realistic first job title", "vocabulary":{"qualification":"","qualifications":"","section":"","sections":"","lab":"","ticket":"","exam":""}}',
      "Every vocabulary word is lowercase and is the natural word this trade uses.",
    ]
      .filter(Boolean)
      .join("\n"),
    [brief.id, "definition"],
  );

  return {
    id: brief.id,
    appName: raw.appName?.trim() || brief.field,
    field: brief.field,
    awardingBody: brief.awardingBody,
    summary: raw.summary?.trim() || `${brief.field} study from the basics through to qualification level.`,
    sourceNote: raw.sourceNote?.trim() || `Written to the published ${brief.field} objectives.`,
    defaultQualification: brief.qualifications[0] ?? "",
    defaultGoal: raw.defaultGoal?.trim() || "",
    vocabulary: {
      qualification: raw.vocabulary?.qualification || "qualification",
      qualifications: raw.vocabulary?.qualifications || "qualifications",
      section: raw.vocabulary?.section || "section",
      sections: raw.vocabulary?.sections || "sections",
      lab: raw.vocabulary?.lab || "lab",
      ticket: raw.vocabulary?.ticket || "job",
      exam: raw.vocabulary?.exam || "exam",
    },
    feeds: { jobs: false, news: false, videos: false },
  };
}

/** Step two: the qualification tracks and the objectives they are measured against. */
export async function generateQualifications(brief: DomainBrief): Promise<DraftQualification[]> {
  const out: DraftQualification[] = [];
  for (const title of brief.qualifications) {
    const id = `cert-${slugify(title)}`;
    const raw = await askJson<{ summary?: string; objectives?: Array<{ domain?: string; text?: string }> }>(
      [
        `Subject: ${brief.field}. Qualification: ${title}.`,
        "List the published objective areas this qualification is measured against, and the objectives inside each area.",
        "Only list areas you are confident are genuinely part of it. Do not pad.",
        'Return: {"summary":"one sentence", "objectives":[{"domain":"area name","text":"one objective"}]}',
      ].join("\n"),
      [brief.id, "qualification", title],
    );
    out.push({
      id,
      title,
      summary: raw.summary?.trim() || title,
      objectives: (raw.objectives ?? [])
        .filter((row) => row.text)
        .map((row, index) => ({
          id: `${id}-obj-${index + 1}`,
          domain: row.domain?.trim() || "General",
          text: row.text!.trim(),
        })),
    });
  }
  return out;
}

/**
 * Step three: the sections themselves, one qualification at a time.
 *
 * A single request reliably returns far fewer sections than asked for once the
 * per-section shape is large, so the work is asked for in small batches and the
 * titles already written are handed back each round. The loop stops when the
 * brief's count is reached, or when a round adds nothing new.
 */
export async function generateSections(
  brief: DomainBrief,
  qualification: DraftQualification,
  startMonth: number,
): Promise<TopicSeed[]> {
  const target = Math.max(1, brief.sectionsPerQualification);
  const batchSize = 2;
  const rows: Array<Record<string, unknown>> = [];
  const taken = new Set<string>();

  for (let round = 0; rows.length < target && round < target * 2; round += 1) {
    const remaining = target - rows.length;
    const ask = Math.min(batchSize, remaining);
    const written = rows.map((row) => `${String(row["slug"] ?? "")}: ${String(row["title"] ?? "")}`);

    let batch: Array<Record<string, unknown>> = [];
    try {
      const raw = await askJson<{ sections?: unknown[] }>(
        [
          `Subject: ${brief.field}. Qualification: ${qualification.title}.`,
          `Objectives, each with the id it must be cited by:\n${qualification.objectives
            .map((o) => `${o.id} | ${o.domain} | ${o.text}`)
            .join("\n")}`,
          `This qualification is being written as exactly ${target} sections in teaching order, covering those objectives with no gaps and no overlap.`,
          written.length
            ? `Already written, do not repeat or restate any of these:\n${written.join("\n")}`
            : "Nothing has been written yet; start at the beginning of the teaching order.",
          `Write the next ${ask} section${ask === 1 ? "" : "s"} only. Return exactly ${ask}.`,
          "Each section teaches one coherent idea and can be studied in one sitting.",
          'The "objectives" array holds one or more objective ids copied exactly from the list above, and only ids this section genuinely teaches. Never invent an id and never write objective prose there.',
          "Return:",
          '{"sections":[{"slug":"lowercase-hyphenated","title":"","summary":"","objectives":["objective id"],"prereqs":["slug of an earlier section already written, or nothing"],"lesson":{"title":"","body":"a real introduction of at least 120 words","definition":"","whyItMatters":"","keyTerms":[["term","meaning"]],"examples":[""],"misconceptions":[""],"summary":"","nextSteps":[""]},"module":{"howItWorks":[""],"whereYouSeeIt":[""],"commonProblems":[""],"howItFails":[""],"troubleshooting":[""],"practicalKnowledge":[""],"examCoverage":[""],"interviewQuestions":[""]},"recall":[["question",["accepted answer"],"explanation"],["second question",["accepted answer"],"explanation"]],"practice":{"title":"","prompt":"","choices":["","","",""],"answerIndex":0,"explanation":""},"scenario":{"title":"","situation":"","decisionPrompt":"","expectedConcepts":[""],"guidance":""}}]}',
          "keyTerms holds at least four real terms from this section, each with its own meaning.",
          "examples, misconceptions, nextSteps and every module list hold at least two entries.",
          "recall holds exactly two entries, each one [prompt, [accepted answers], explanation]. Two is the minimum and the maximum; a section with one recall question is rejected.",
          "The practice question has exactly one correct choice, and the three wrong choices are believable answers to that same question, not answers from another section.",

          brief.notes ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        [brief.id, "sections", qualification.id, String(round)],
      );
      batch = (raw.sections ?? []) as Array<Record<string, unknown>>;
    } catch {
      batch = [];
    }

    let added = 0;
    for (const row of batch) {
      const slug = String(row?.["slug"] ?? "").trim();
      if (!slug || taken.has(slug) || rows.length >= target) continue;
      taken.add(slug);
      rows.push(row);
      added += 1;
    }
    if (!added) break;
  }

  return rows.map((row, index) =>
    normaliseSeed(row, qualification.id, startMonth + Math.floor(index / 4), (index % 4) + 1),
  );
}


/** One batch of extra practice questions for a section. */
export type BankQuestion = { prompt: string; choices: string[]; answerIndex: number; explanation: string };

/**
 * Step three and a half: a real question bank for a section.
 *
 * The section itself only carries one practice question, which is far too thin
 * to examine anybody on. This asks for the rest in batches, handing back the
 * prompts already written so a round never repeats itself.
 */
/** Two prompts that carry the same idea in different words. */
function tooClose(a: string, b: string): boolean {
  const words = (value: string) =>
    new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 3));
  const left = words(a);
  const right = words(b);
  if (left.size === 0 || right.size === 0) return false;
  let shared = 0;
  for (const word of right) if (left.has(word)) shared += 1;
  return shared / Math.min(left.size, right.size) > 0.8;
}

export async function generateQuestionBank(
  brief: DomainBrief,
  seed: TopicSeed,
  target: number,
  /** A top-up run passes what the section already asks, and its own cache key. */
  options: { existing?: string[]; nonce?: string } = {},
): Promise<BankQuestion[]> {
  const out: BankQuestion[] = [];
  const rejected: string[] = [];
  const existing = options.existing ?? [];
  const seen = new Set<string>([
    seed.practice.prompt.toLowerCase(),
    ...existing.map((prompt) => prompt.toLowerCase()),
  ]);
  const batchSize = 10;

  for (let round = 0; out.length < target && round < Math.ceil(target / batchSize) + 2; round += 1) {
    const ask = Math.min(batchSize, target - out.length);
    let batch: BankQuestion[] = [];
    try {
      const raw = await askJson<{ questions?: Array<Partial<BankQuestion>> }>(
        [
          `Subject: ${brief.field}. Section: ${seed.title}. ${seed.summary}`,
          `What this section teaches:\n${seed.lesson.body}`,
          seed.module.troubleshooting.length
            ? `Diagnostic steps taught here:\n${seed.module.troubleshooting.join("\n")}`
            : "",
          [...existing, ...out.map((q) => q.prompt)].length
            ? `Already written, do not repeat:\n${[...existing, ...out.map((q) => q.prompt)].join("\n")}`
            : "",
          rejected.length
            ? `These were rejected for being generic, recognition-only or too easy to eliminate. Do not write anything like them:\n${rejected.slice(-10).join("\n")}`
            : "",
          `Write ${ask} more multiple-choice questions on this section only.`,
          "Never ask a question that restates the section title, tests only whether a word is recognised, or can be answered without studying this material. Each one makes the learner apply, distinguish, diagnose or reason from evidence given in the question.",
          "No wrong option may be an absolute claim ('always', 'never', 'all'), an obviously false statement or an answer from an unrelated subject. Each wrong option is a mistake a real beginner makes here.",
          "Every question states its own situation in full: the symptom, the reading or the setting it is about. A question that says 'what next' without describing the problem is rejected.",
          "Exactly one choice is correct. The other three are believable mistakes a learner makes on this same material, never answers from another section.",
          "Only test what this section teaches. Never invent a figure, code or specification you are not confident about.",
          '{"questions":[{"prompt":"","choices":["","","",""],"answerIndex":0,"explanation":"why the right answer is right"}]}',
          brief.notes ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
        [brief.id, "bank", seed.slug, String(round), options.nonce ?? ""],
      );
      batch = (raw.questions ?? []) as BankQuestion[];
    } catch {
      batch = [];
    }

    let added = 0;
    for (const row of batch) {
      const prompt = text(row?.prompt);
      const choices = list(row?.choices);
      const index = typeof row?.answerIndex === "number" ? row.answerIndex : -1;
      const key = prompt.toLowerCase();
      if (!prompt || choices.length !== 4 || index < 0 || index > 3 || seen.has(key)) continue;
      if (new Set(choices.map((choice) => choice.toLowerCase())).size !== 4) continue;
      // The same gate the course itself applies: a generic, recognition-only or
      // giveaway question is thrown back to be written again rather than kept.
      const answer = choices[index] as string;
      const issues = questionIssues({
        id: `draft-${seed.slug}-${out.length}`,
        topicId: seed.slug,
        prompt,
        type: "multiple_choice",
        choices,
        correctAnswer: [answer],
        acceptableAnswers: [answer],
        explanation: text(row.explanation),
        quizId: `draft-${seed.slug}`,
        certificationId: brief.id,
        difficulty: "standard",
        mistakeCategory: "concept",
        requiresReasoning: true,
      } satisfies Question);
      if (issues.length > 0) {
        rejected.push(prompt);
        continue;
      }
      // Nothing that only rewords a question already in this section.
      if ([...existing, ...out.map((q) => q.prompt)].some((kept) => tooClose(kept, prompt))) {
        rejected.push(prompt);
        continue;
      }
      seen.add(key);
      out.push({ prompt, choices, answerIndex: index, explanation: text(row.explanation) });
      added += 1;
      if (out.length >= target) break;
    }
    if (!added) break;
  }

  return out;
}

/** Step four: outside material for each section. */
export async function generateSources(
  brief: DomainBrief,
  seeds: TopicSeed[],
): Promise<DomainDraft["sources"]> {
  const sources: DomainDraft["sources"] = {};
  for (const seed of seeds) {
    try {
      const raw = await askJson<{ sources?: Array<{ label?: string; url?: string; kind?: string }> }>(
        [
          `Subject: ${brief.field}. Section: ${seed.title}. ${seed.summary}`,
          "Name up to three outside references that teach this exact section: official documentation, a standards body, a manufacturer manual or a well known training channel.",
          "Only give links you are confident exist at that address. Never guess a deep link; use the stable home of the document.",
          '{"sources":[{"label":"","url":"https://...","kind":"video|reading"}]}',
        ].join("\n"),
        [brief.id, "sources", seed.slug],
      );
      sources[seed.slug] = (raw.sources ?? [])
        .filter((row) => row.url?.startsWith("https://") && row.label)
        .map((row) => ({ label: row.label!.trim(), url: row.url!.trim(), kind: row.kind === "video" ? "video" : "reading" }));
    } catch {
      sources[seed.slug] = [];
    }
  }
  return sources;
}

/**
 * The correction pass. Given one section and only the findings against it, it
 * rewrites that section. Nothing else in the subject is touched.
 */
export async function correctSection(
  brief: DomainBrief,
  seed: TopicSeed,
  findings: Finding[],
  attempt: number,
): Promise<TopicSeed> {
  const complaints = findings
    .map((finding) => `${finding.ruleId}: ${getRule(finding.ruleId)?.says ?? ""} Problem found: ${finding.detail}`)
    .join("\n");

  const raw = await askJson<Record<string, unknown>>(
    [
      `Subject: ${brief.field}.`,
      "An independent reviewer rejected this section. Fix exactly what is listed and change nothing else.",
      "",
      "WHAT FAILED",
      complaints,
      "",
      "THE SECTION",
      JSON.stringify(seed),
      "",
      "Return the corrected section as the same JSON object, with the same slug.",
    ].join("\n"),
    [brief.id, "correct", seed.slug, String(attempt)],
  );

  return normaliseSeed(raw, seed.cert, seed.month, seed.week);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Forces whatever came back into the shape the engine builds from. */
export function normaliseSeed(
  row: Record<string, unknown>,
  cert: string,
  month: number,
  week: number,
): TopicSeed {
  const lesson = (row["lesson"] ?? {}) as Record<string, unknown>;
  const module = (row["module"] ?? {}) as Record<string, unknown>;
  const practice = (row["practice"] ?? {}) as Record<string, unknown>;
  const scenario = (row["scenario"] ?? {}) as Record<string, unknown>;
  const keyTerms = Array.isArray(lesson["keyTerms"]) ? (lesson["keyTerms"] as unknown[]) : [];
  const recall = Array.isArray(row["recall"]) ? (row["recall"] as unknown[]) : [];

  return {
    slug: slugify(text(row["slug"]) || text(row["title"])),
    title: text(row["title"]),
    summary: text(row["summary"]),
    cert,
    month,
    week,
    difficulty: "standard",
    prereqs: list(row["prereqs"]).map(slugify),
    minutes: 45,
    objectives: list(row["objectives"]),
    lesson: {
      title: text(lesson["title"]) || text(row["title"]),
      body: text(lesson["body"]),
      definition: text(lesson["definition"]),
      whyItMatters: text(lesson["whyItMatters"]),
      keyTerms: keyTerms
        .map((pair) => (Array.isArray(pair) ? [text(pair[0]), text(pair[1])] : ["", ""]))
        .filter(([term, meaning]) => term && meaning) as Array<[string, string]>,
      examples: list(lesson["examples"]),
      misconceptions: list(lesson["misconceptions"]),
      summary: text(lesson["summary"]),
      nextSteps: list(lesson["nextSteps"]),
    },
    module: {
      howItWorks: list(module["howItWorks"]),
      whereYouSeeIt: list(module["whereYouSeeIt"]),
      commonProblems: list(module["commonProblems"]),
      howItFails: list(module["howItFails"]),
      troubleshooting: list(module["troubleshooting"]),
      practicalKnowledge: list(module["practicalKnowledge"]),
      examCoverage: list(module["examCoverage"]),
      interviewQuestions: list(module["interviewQuestions"]),
    },
    recall: recall
      .map((entry) => {
        if (!Array.isArray(entry)) return null;
        const prompt = text(entry[0]);
        const accepted = list(entry[1]);
        return prompt && accepted.length ? ([prompt, accepted, text(entry[2])] as [string, string[], string]) : null;
      })
      .filter((entry): entry is [string, string[], string] => entry !== null),
    practice: {
      title: text(practice["title"]) || "Check yourself",
      prompt: text(practice["prompt"]),
      choices: list(practice["choices"]),
      answerIndex: typeof practice["answerIndex"] === "number" ? (practice["answerIndex"] as number) : 0,
      explanation: text(practice["explanation"]),
    },
    scenario: {
      title: text(scenario["title"]) || text(row["title"]),
      situation: text(scenario["situation"]),
      decisionPrompt: text(scenario["decisionPrompt"]),
      expectedConcepts: list(scenario["expectedConcepts"]),
      guidance: text(scenario["guidance"]),
    },
  };
}
