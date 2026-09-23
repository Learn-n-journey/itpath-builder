/**
 * Three standing curriculum checks that run with the rest of the health
 * system:
 *
 *  1. Cross-lesson contradictions — the same fact taught two different ways.
 *  2. Coverage gaps — certification objectives that are named but not taught.
 *  3. Difficulty and progression — knowledge a lesson leans on that the
 *     curriculum has not taught yet.
 *
 * Everything here is deterministic: it reads the course material and reports.
 * Nothing rewrites a lesson, changes a question, or touches learner records.
 */
import type { CoursePack } from "@/content/pack-contract";
import type { CertificationObjective, Topic } from "@/lib/app-data/types";
import { courseVocabulary, requiredKnowledge, topicTeachingMaterial, type TaughtVocabulary } from "./concept-coverage";
import type { HealthCheck } from "./types";

/* ------------------------------------------------------------------ shared */

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9/.\-_ ]+/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[./\-_]+|[./\-_]+$/g, ""))
    .filter(Boolean);
}

function sentencesOf(parts: string[]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    for (const sentence of part.split(/(?<=[.!?])\s+|\n+/)) {
      const trimmed = sentence.trim();
      if (trimmed.length >= 20) out.push(trimmed);
    }
  }
  return out;
}

/** Course order: stage (month) first, then the order the pack lists them in. */
export function courseOrder(pack: CoursePack): Topic[] {
  return pack.sections
    .map((topic, index) => ({ topic, index }))
    .sort((a, b) => a.topic.month - b.topic.month || a.topic.week - b.topic.week || a.index - b.index)
    .map((entry) => entry.topic);
}

function shorten(text: string, limit = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1)}…`;
}

/* --------------------------------------------------- 1. contradiction check */

/**
 * Wording that says a difference is deliberate: platform, version, vendor or
 * situation. A sentence carrying one of these is describing a legitimate
 * difference, not contradicting another lesson.
 */
const QUALIFIED =
  /\b(on windows|on linux|on macos|on a mac|in windows|in linux|older|legacy|deprecated|prior to|before version|after version|since version|depending|depends|varies|some |many |certain |unless|when configured|if configured|by default|historically|originally|used to|in practice|for example|e\.g\.|such as|typically|often|sometimes|may |might |can be|could be)\b/i;

export interface ContradictionFinding {
  /** What the two lessons disagree about, in plain words. */
  subject: string;
  first: { topicId: string; topicTitle: string; value: string; quote: string };
  second: { topicId: string; topicTitle: string; value: string; quote: string };
}

interface Fact {
  key: string;
  subject: string;
  value: string;
  quote: string;
  topicId: string;
  topicTitle: string;
}

const PATTERNS: Array<{
  label: (subject: string) => string;
  regex: RegExp;
  subject: (match: RegExpMatchArray) => string;
  value: (match: RegExpMatchArray) => string;
}> = [
  {
    // "SSH uses port 22", "HTTPS listens on TCP port 443"
    regex: /\b([A-Za-z][A-Za-z0-9 .+\-/]{1,28}?)\s+(?:uses|use|runs on|listens on|operates on|is on|communicates on)\s+(?:tcp |udp |tcp\/udp )?port\s+(\d{1,5})\b/gi,
    subject: (match) => (match[1] ?? "").trim(),
    value: (match) => `port ${match[2]}`,
    label: (subject) => `which port ${subject} uses`,
  },
  {
    // "a switch operates at layer 2"
    regex: /\b([A-Za-z][A-Za-z0-9 .+\-/]{1,28}?)\s+(?:operates|works|runs|sits|lives)\s+at\s+(?:osi\s+)?layer\s+(\d)\b/gi,
    subject: (match) => (match[1] ?? "").trim(),
    value: (match) => `layer ${match[2]}`,
    label: (subject) => `which OSI layer ${subject} works at`,
  },
  {
    // "the default lease time is 8 hours"
    regex: /\bthe\s+(?:default|standard|maximum|minimum)\s+([a-z][a-z \-]{2,28}?)\s+(?:is|of)\s+(\d[\d,.]*)\s*([a-z%]{0,12})/gi,
    subject: (match) => (match[1] ?? "").trim(),
    value: (match) => `${match[2]}${match[3] ? ` ${match[3]}` : ""}`,
    label: (subject) => `the stated ${subject}`,
  },
];

/** Stop words that make a "subject" meaningless to compare on. */
const WEAK_SUBJECT = /^(it|this|that|they|these|those|the|a|an|one|each|every|which|what|there|here|traffic|data)$/i;

function factsFor(topic: Topic, sentences: string[]): Fact[] {
  const facts: Fact[] = [];
  for (const sentence of sentences) {
    if (QUALIFIED.test(sentence)) continue;
    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      for (const match of sentence.matchAll(pattern.regex)) {
        const rawSubject = pattern.subject(match);
        const head = words(rawSubject).slice(-2).join(" ");
        if (!head || WEAK_SUBJECT.test(head)) continue;
        facts.push({
          key: `${pattern.label("")}|${head}`,
          subject: pattern.label(rawSubject),
          value: pattern.value(match).toLowerCase(),
          quote: shorten(sentence),
          topicId: topic.id,
          topicTitle: topic.title,
        });
      }
    }
  }
  return facts;
}

/** Acronyms whose expansion differs between two lessons. */
function acronymConflicts(
  entries: Array<{ topic: Topic; vocabulary: TaughtVocabulary }>,
): ContradictionFinding[] {
  const seen = new Map<string, { topic: Topic; expansion: string[] }>();
  const out: ContradictionFinding[] = [];
  for (const { topic, vocabulary } of entries) {
    for (const [acronym, expansion] of vocabulary.acronyms) {
      if (expansion.length < 2) continue;
      const first = seen.get(acronym);
      if (!first) {
        seen.set(acronym, { topic, expansion });
        continue;
      }
      const overlap = expansion.filter((word) => first.expansion.includes(word)).length;
      if (overlap > 0) continue;
      out.push({
        subject: `what ${acronym.toUpperCase()} stands for`,
        first: {
          topicId: first.topic.id,
          topicTitle: first.topic.title,
          value: first.expansion.join(" "),
          quote: `${acronym.toUpperCase()} = ${first.expansion.join(" ")}`,
        },
        second: {
          topicId: topic.id,
          topicTitle: topic.title,
          value: expansion.join(" "),
          quote: `${acronym.toUpperCase()} = ${expansion.join(" ")}`,
        },
      });
    }
  }
  return out;
}

/** Every place two lessons teach the same fact differently. */
export function contradictionFindings(pack: CoursePack): ContradictionFinding[] {
  const order = courseOrder(pack);
  const byKey = new Map<string, Fact[]>();
  for (const topic of order) {
    const sentences = sentencesOf(topicTeachingMaterial(pack, topic.id));
    for (const fact of factsFor(topic, sentences)) {
      const list = byKey.get(fact.key) ?? [];
      list.push(fact);
      byKey.set(fact.key, list);
    }
  }

  const findings: ContradictionFinding[] = [];
  for (const facts of byKey.values()) {
    const values = new Map<string, Fact>();
    for (const fact of facts) if (!values.has(fact.value)) values.set(fact.value, fact);
    if (values.size < 2) continue;
    const [first, second] = [...values.values()];
    if (!first || !second || first.topicId === second.topicId) continue;
    findings.push({
      subject: first.subject,
      first: { topicId: first.topicId, topicTitle: first.topicTitle, value: first.value, quote: first.quote },
      second: { topicId: second.topicId, topicTitle: second.topicTitle, value: second.value, quote: second.quote },
    });
  }
  return findings;
}

/* --------------------------------------------------- 2. coverage gap check */

export type CoverageLevel = "covered" | "partial" | "missing";

export interface ObjectiveCoverage {
  objectiveId: string;
  code: string;
  title: string;
  certificationId: string;
  topicIds: string[];
  level: CoverageLevel;
  /** Key ideas in the objective the material explains properly. */
  taught: string[];
  /** Key ideas mentioned once or twice but never explained. */
  thin: string[];
  /** Key ideas the mapped material never mentions. */
  missing: string[];
  /** A sentence from the material that shows the teaching, when there is one. */
  evidence: string;
  reason: string;
  action: string;
}

/** How many sentences have to discuss an idea before it counts as taught. */
const TAUGHT_SENTENCES = 2;

function mentionCount(sentences: string[], term: string): { count: number; quote: string } {
  const needle = term.toLowerCase();
  let count = 0;
  let quote = "";
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(needle)) {
      count += 1;
      if (!quote) quote = shorten(sentence);
    }
  }
  return { count, quote };
}

export function objectiveCoverage(pack: CoursePack): ObjectiveCoverage[] {
  const course = courseVocabulary(pack);
  const sentenceCache = new Map<string, string[]>();
  const sentencesForTopic = (topicId: string): string[] => {
    const cached = sentenceCache.get(topicId);
    if (cached) return cached;
    const value = sentencesOf(topicTeachingMaterial(pack, topicId));
    sentenceCache.set(topicId, value);
    return value;
  };

  const out: ObjectiveCoverage[] = [];
  for (const objective of pack.objectives as CertificationObjective[]) {
    const topicIds = (objective.topicIds ?? []).filter((id) => pack.sections.some((section) => section.id === id));
    const terms = requiredKnowledge(objective.title).filter((term) => !course.general.has(term) && term.length > 2);
    const sentences = topicIds.flatMap(sentencesForTopic);

    const taught: string[] = [];
    const thin: string[] = [];
    const missing: string[] = [];
    let evidence = "";

    for (const term of terms) {
      const { count, quote } = mentionCount(sentences, term);
      if (count >= TAUGHT_SENTENCES) {
        taught.push(term);
        if (!evidence) evidence = quote;
      } else if (count === 1) {
        thin.push(term);
        if (!evidence) evidence = quote;
      } else {
        missing.push(term);
      }
    }

    let level: CoverageLevel;
    let reason: string;
    let action: string;
    if (topicIds.length === 0) {
      level = "missing";
      reason = "No topic is mapped to this objective, so nothing teaches it.";
      action = "Point this objective at the topic that should teach it, or write that topic.";
    } else if (terms.length === 0) {
      level = "covered";
      reason = "The objective is broad wording with no specific idea to check.";
      action = "Nothing to do.";
    } else if (missing.length === terms.length) {
      level = "missing";
      reason = `The mapped material never mentions ${missing.slice(0, 4).join(", ")}.`;
      action = "Teach this objective properly in the mapped topic, or map it to the topic that does teach it.";
    } else if (missing.length > 0 || thin.length > taught.length) {
      level = "partial";
      reason = [
        missing.length > 0 ? `Never mentioned: ${missing.slice(0, 4).join(", ")}.` : "",
        thin.length > 0 ? `Named once but not explained: ${thin.slice(0, 4).join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      action = "Add real teaching for the parts listed — explanation and an example, never filler wording.";
    } else {
      level = "covered";
      reason = `Explained across ${sentences.length} sentences of teaching.`;
      action = "Nothing to do.";
    }

    out.push({
      objectiveId: objective.id,
      code: objective.code,
      title: objective.title,
      certificationId: objective.certificationId,
      topicIds,
      level,
      taught,
      thin,
      missing,
      evidence,
      reason,
      action,
    });
  }
  return out;
}

export interface CoverageSummary {
  covered: number;
  partial: number;
  missing: number;
  rows: ObjectiveCoverage[];
}

export function coverageSummary(pack: CoursePack): CoverageSummary {
  const rows = objectiveCoverage(pack);
  return {
    rows,
    covered: rows.filter((row) => row.level === "covered").length,
    partial: rows.filter((row) => row.level === "partial").length,
    missing: rows.filter((row) => row.level === "missing").length,
  };
}

/** The objective coverage report as a spreadsheet the owner can work through. */
export function coverageReportCsv(rows: ObjectiveCoverage[]): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    ["Coverage", "Objective", "Code", "Topics", "Taught", "Thin", "Missing", "Why", "What to do", "Evidence"]
      .map(cell)
      .join(","),
  ];
  for (const row of rows) {
    lines.push(
      [
        row.level,
        row.title,
        row.code,
        row.topicIds.join(" "),
        row.taught.join(" "),
        row.thin.join(" "),
        row.missing.join(" "),
        row.reason,
        row.action,
        row.evidence,
      ]
        .map((value) => cell(String(value)))
        .join(","),
    );
  }
  return lines.join("\n");
}

/* --------------------------------------- 3. difficulty and progression check */

export type ProgressionKind = "unexplained" | "out-of-order" | "difficulty-jump";

export interface ProgressionFinding {
  kind: ProgressionKind;
  topicId: string;
  topicTitle: string;
  /** The knowledge the lesson leans on. */
  terms: string[];
  detail: string;
  action: string;
  /** Where the missing knowledge is taught, when the course teaches it later. */
  taughtLaterIn?: string;
}

/** A term used only in passing is a term the lesson never really explains. */
const EXPLAINED_SENTENCES = 2;

export function progressionFindings(pack: CoursePack): ProgressionFinding[] {
  const order = courseOrder(pack);
  const course = courseVocabulary(pack);
  const position = new Map(order.map((topic, index) => [topic.id, index]));

  // Where each technical word is first properly explained.
  const sentencesByTopic = new Map<string, string[]>();
  const countsByTopic = new Map<string, Map<string, number>>();
  for (const topic of order) {
    const sentences = sentencesOf(topicTeachingMaterial(pack, topic.id));
    sentencesByTopic.set(topic.id, sentences);
    const counts = new Map<string, number>();
    for (const sentence of sentences) {
      for (const word of new Set(words(sentence))) counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    countsByTopic.set(topic.id, counts);
  }

  const explainedAt = new Map<string, string>();
  for (const topic of order) {
    for (const [word, count] of countsByTopic.get(topic.id) ?? []) {
      if (count >= EXPLAINED_SENTENCES && !explainedAt.has(word)) explainedAt.set(word, topic.id);
    }
  }

  // How widely used a word is: a word only one lesson ever says is usually a
  // one-off, not shared knowledge the curriculum owes an explanation for.
  const topicsUsing = new Map<string, number>();
  for (const topic of order) {
    for (const word of countsByTopic.get(topic.id)?.keys() ?? []) {
      topicsUsing.set(word, (topicsUsing.get(word) ?? 0) + 1);
    }
  }

  const findings: ProgressionFinding[] = [];
  const newTermCounts: number[] = [];
  const seen = new Set<string>();

  order.forEach((topic, index) => {
    const counts = countsByTopic.get(topic.id) ?? new Map();
    const unexplained: string[] = [];
    let newTerms = 0;

    for (const [word, count] of counts) {
      if (course.general.has(word)) continue;
      if (word.length < 3 || /^\d/.test(word)) continue;
      const known = seen.has(word);
      if (!known) newTerms += 1;
      if (known) continue;
      // Used in passing here, never explained here, and the course does teach
      // it — just later, or not properly at all.
      if (count >= EXPLAINED_SENTENCES) continue;
      if ((topicsUsing.get(word) ?? 0) < 3) continue;
      const home = explainedAt.get(word);
      if (home && (position.get(home) ?? 0) <= index) continue;
      unexplained.push(word);
    }

    newTermCounts.push(newTerms);

    if (unexplained.length > 0) {
      const sample = unexplained.slice(0, 6);
      const later = sample
        .map((word) => explainedAt.get(word))
        .find((home): home is string => Boolean(home && (position.get(home) ?? 0) > index));
      findings.push({
        kind: "unexplained",
        topicId: topic.id,
        topicTitle: topic.title,
        terms: sample,
        detail: `This lesson leans on ${sample.join(", ")} without explaining ${sample.length === 1 ? "it" : "them"}, and nothing earlier in the course does either.`,
        action: "Explain these in this lesson where they first come up, or teach them in an earlier topic.",
        ...(later ? { taughtLaterIn: later } : {}),
      });
    }

    // Prerequisites that sit later in the course than the topic needing them.
    const lateBefore = (topic.prerequisiteTopicIds ?? []).filter((id) => (position.get(id) ?? -1) > index);
    if (lateBefore.length > 0) {
      findings.push({
        kind: "out-of-order",
        topicId: topic.id,
        topicTitle: topic.title,
        terms: lateBefore,
        detail: `This topic needs ${lateBefore.join(", ")} first, but ${lateBefore.length === 1 ? "that topic comes" : "those topics come"} later in the course.`,
        action: "Move this topic after the ones it depends on, or drop the dependency.",
      });
    }

    for (const word of counts.keys()) seen.add(word);
  });

  // A sudden jump: far more brand new vocabulary than the course normally
  // introduces in one sitting.
  const sorted = [...newTermCounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  if (median > 0) {
    order.forEach((topic, index) => {
      const count = newTermCounts[index] ?? 0;
      if (count >= Math.max(60, median * 3)) {
        findings.push({
          kind: "difficulty-jump",
          topicId: topic.id,
          topicTitle: topic.title,
          terms: [],
          detail: `This lesson introduces ${count} new technical words at once; a typical lesson introduces about ${median}.`,
          action: "Split the lesson, or move some of the new ground into an earlier topic so it builds up.",
        });
      }
    });
  }

  return findings;
}

/* ------------------------------------------------------------ health checks */

function contentCheck(part: Omit<HealthCheck, "area">): HealthCheck {
  return { area: "content", ...part };
}

/** The three checks, as dashboard checks. */
export function curriculumChecks(pack: CoursePack, ranAt: string | null = null): HealthCheck[] {
  const checks: HealthCheck[] = [];

  // 1. Contradictions
  const contradictions = contradictionFindings(pack);
  if (contradictions.length === 0) {
    checks.push(
      contentCheck({
        id: "content:contradictions",
        label: "Lessons agree with each other",
        state: "healthy",
        detail: "No two lessons teach the same fact differently.",
        affects: "Nothing.",
        action: "Nothing to do.",
        lastRunAt: ranAt,
      }),
    );
  } else {
    for (const finding of contradictions) {
      checks.push(
        contentCheck({
          id: `content:contradiction:${finding.first.topicId}:${finding.second.topicId}:${finding.subject}`,
          label: `Lessons disagree about ${finding.subject}`,
          state: "warning",
          detail: `"${finding.first.quote}" (${finding.first.topicTitle}) against "${finding.second.quote}" (${finding.second.topicTitle}).`,
          affects: "Learners are taught two different answers to the same question.",
          action: "Read both lessons, decide which is right, and correct the other — or say plainly why they differ.",
          subjectId: finding.first.topicId,
          link: `/topics/${finding.first.topicId}#read-it`,
          linkLabel: "Open the first lesson",
          lastRunAt: ranAt,
        }),
      );
    }
  }

  // 2. Coverage gaps
  const coverage = coverageSummary(pack);
  if (coverage.rows.length === 0) {
    checks.push(
      contentCheck({
        id: "content:objective-coverage",
        label: "Certification coverage",
        state: "unknown",
        detail: "This course lists no certification objectives to check against.",
        affects: "Coverage cannot be judged.",
        action: "Add the objectives to the course if it is measured against a certificate.",
        lastRunAt: ranAt,
      }),
    );
  } else {
    checks.push(
      contentCheck({
        id: "content:objective-coverage",
        label: "Certification coverage",
        state: coverage.missing > 0 ? "failed" : coverage.partial > 0 ? "warning" : "healthy",
        detail: `${coverage.covered} objectives taught · ${coverage.partial} only partly taught · ${coverage.missing} not taught.`,
        affects:
          coverage.missing > 0
            ? "Learners can finish the course and still meet exam material they were never taught."
            : coverage.partial > 0
              ? "Some exam material is named but never explained well enough to use."
              : "Nothing.",
        action:
          coverage.missing + coverage.partial > 0
            ? "Open the Content tab and download the coverage report to see exactly what is thin or missing."
            : "Nothing to do.",
        lastRunAt: ranAt,
      }),
    );
    for (const row of coverage.rows.filter((entry) => entry.level === "missing").slice(0, 25)) {
      checks.push(
        contentCheck({
          id: `content:objective:${row.objectiveId}`,
          label: `Not taught: ${row.code} ${shorten(row.title, 60)}`,
          state: "failed",
          detail: row.reason,
          affects: "This exam objective has no teaching behind it.",
          action: row.action,
          ...(row.topicIds[0] ? { subjectId: row.topicIds[0], link: `/topics/${row.topicIds[0]}#read-it`, linkLabel: "Open the topic" } : {}),
          lastRunAt: ranAt,
        }),
      );
    }
  }

  // 3. Difficulty and progression
  const progression = progressionFindings(pack);
  if (progression.length === 0) {
    checks.push({
      area: "engine",
      id: "engine:progression",
      label: "Knowledge builds in order",
      state: "healthy",
      detail: "Every lesson explains what it leans on, or an earlier lesson does.",
      affects: "Nothing.",
      action: "Nothing to do.",
      lastRunAt: ranAt,
    });
  } else {
    for (const finding of progression.slice(0, 40)) {
      checks.push({
        area: "engine",
        id: `engine:progression:${finding.kind}:${finding.topicId}`,
        label:
          finding.kind === "out-of-order"
            ? `Comes before what it needs: ${finding.topicTitle}`
            : finding.kind === "difficulty-jump"
              ? `Steep jump: ${finding.topicTitle}`
              : `Assumed knowledge: ${finding.topicTitle}`,
        state: finding.kind === "out-of-order" ? "failed" : "warning",
        detail: finding.detail + (finding.taughtLaterIn ? ` It is explained later, in ${finding.taughtLaterIn}.` : ""),
        affects: "Beginners hit words they were never taught and stall.",
        action: finding.action,
        subjectId: finding.topicId,
        link: `/topics/${finding.topicId}#read-it`,
        linkLabel: "Open the lesson",
        lastRunAt: ranAt,
      });
    }
  }

  return checks;
}
