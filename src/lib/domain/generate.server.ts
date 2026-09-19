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
import type { Finding } from "@/lib/quality/audit";
import { getRule } from "@/lib/quality/rules";
import type { TopicSeed } from "@/data/curriculum/builder";
import type { DomainBrief, DomainDraft, DraftQualification } from "./brief";
import type { DomainDefinition } from "@/domain/types";

const AUTHOR_SYSTEM = [
  "You are writing course material for a study platform.",
  "Everything you write is original. Never copy exam wording, question banks or copyrighted text.",
  "Be concrete and factual. Never invent a standard, part number, tool, measurement or source link you are not confident exists.",
  "Reply with one JSON object and nothing else. No prose, no markdown fences.",
].join("\n");

async function askJson<T>(prompt: string, cacheParts: string[]): Promise<T> {
  const result = await runAi({
    feature: "scenario",
    system: AUTHOR_SYSTEM,
    prompt,
    risk: "medium",
    priority: "background",
    json: true,
    skipBudget: true,
    cache: { parts: cacheParts, scope: "domain-generate" },
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

/** Step three: the sections themselves, one qualification at a time. */
export async function generateSections(
  brief: DomainBrief,
  qualification: DraftQualification,
  startMonth: number,
): Promise<TopicSeed[]> {
  const raw = await askJson<{ sections?: unknown[] }>(
    [
      `Subject: ${brief.field}. Qualification: ${qualification.title}.`,
      `Objectives:\n${qualification.objectives.map((o) => `${o.domain}: ${o.text}`).join("\n")}`,
      `Write ${brief.sectionsPerQualification} sections that together cover those objectives with no gaps and no overlap, in teaching order.`,
      "Each section teaches one coherent idea and can be studied in one sitting.",
      "Return:",
      '{"sections":[{"slug":"lowercase-hyphenated","title":"","summary":"","objectives":["",""],"prereqs":["slug of an earlier section in this list, or nothing"],"lesson":{"title":"","body":"a real introduction of at least 120 words","definition":"","whyItMatters":"","keyTerms":[["term","meaning"]],"examples":[""],"misconceptions":[""],"summary":"","nextSteps":[""]},"module":{"howItWorks":[""],"whereYouSeeIt":[""],"commonProblems":[""],"howItFails":[""],"troubleshooting":[""],"practicalKnowledge":[""],"examCoverage":[""],"interviewQuestions":[""]},"recall":[["question",["accepted answer"],"explanation"],["second question",["accepted answer"],"explanation"]],"practice":{"title":"","prompt":"","choices":["","","",""],"answerIndex":0,"explanation":""},"scenario":{"title":"","situation":"","decisionPrompt":"","expectedConcepts":[""],"guidance":""}}]}',
      "recall holds exactly two entries, each one [prompt, [accepted answers], explanation]. Two is the minimum and the maximum; a section with one recall question is rejected.",
      "The practice question has exactly one correct choice, and the three wrong choices are believable answers to that same question, not answers from another section.",
      brief.notes ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
    [brief.id, "sections", qualification.id],
  );

  return (raw.sections ?? []).map((row, index) =>
    normaliseSeed(row as Record<string, unknown>, qualification.id, startMonth + Math.floor(index / 4), (index % 4) + 1),
  );
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
