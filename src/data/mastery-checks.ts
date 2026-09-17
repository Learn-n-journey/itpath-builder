/**
 * Mastery checks.
 *
 * These are deliberately separate from the practice work inside a lesson.
 * Practice is where you learn with help. A mastery check is the proof: it is
 * built from the section's own material, it is never the same set twice, and
 * each kind of proof stands on its own.
 *
 *   Recall          written, from memory, nothing in front of you
 *   Teach back      explain it in your own words
 *   Application     pick the right move in a described situation
 *   Troubleshooting work a fault through in the documented order
 *
 * Every item carries a stable id, so a set can skip everything the learner has
 * already been asked. When a pool runs out it starts again from the items seen
 * longest ago, rather than repeating the most recent set.
 */
import { learningModules } from "@/data/learning-content";
import { lessons, topics } from "@/data/static-content";

export type MasteryCheckKind = "recall" | "understanding" | "application" | "troubleshooting";

export interface MasteryItem {
  id: string;
  kind: MasteryCheckKind;
  prompt: string;
  /** Empty for a written item. */
  choices: string[];
  /** The correct choice for a multiple choice item. */
  answer?: string;
  /** Ideas a written answer has to express. */
  concepts: string[];
  explanation: string;
}

export const CHECK_SIZE: Record<MasteryCheckKind, number> = {
  recall: 4,
  understanding: 2,
  application: 4,
  troubleshooting: 4,
};

export const CHECK_LABELS: Record<MasteryCheckKind, { title: string; blurb: string }> = {
  recall: {
    title: "Recall, no help",
    blurb: "Answer from memory, with the lesson closed. Written answers, marked on meaning.",
  },
  understanding: {
    title: "Teach back",
    blurb: "Explain it in your own words, as if to someone who has never met it.",
  },
  application: {
    title: "Application",
    blurb: "A situation, and the right move to make in it.",
  },
  troubleshooting: {
    title: "Troubleshooting",
    blurb: "Work a fault through in a sensible order instead of guessing.",
  },
};

const sentence = (text: string) => {
  const trimmed = text.trim();
  return trimmed.endsWith(".") || trimmed.endsWith("?") ? trimmed : `${trimmed}.`;
};

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** A short, specific cue drawn from a line so a prompt names what it is asking about. */
function cueFrom(text: string, terms: readonly string[]): string {
  const clean = text.trim().replace(/\.$/, "").replace(/^(a|an|the)\s+/i, "");
  const match = [...terms]
    .sort((a, b) => b.length - a.length)
    .find((term) => term.length > 2 && clean.toLowerCase().includes(term.toLowerCase()));
  if (match) return match;
  const words = clean.split(/\s+/).slice(0, 5).join(" ").replace(/[,;:]$/, "");
  return words.length < clean.length ? `${words}...` : words;
}


function hash(value: string): number {
  let out = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    out ^= value.charCodeAt(index);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

function seeded(seed: number) {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return value / 0xffffffff;
  };
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const next = seeded(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    const a = copy[index] as T;
    copy[index] = copy[swap] as T;
    copy[swap] = a;
  }
  return copy;
}

/** Plausible wrong options: real sentences of the same kind, from other sections. */
function distractors(topicId: string, pick: (module: (typeof learningModules)[number]) => string[], seed: string, exclude: string[]): string[] {
  const pool = learningModules
    .filter((item) => item.topicId !== topicId)
    .flatMap(pick)
    .map((text) => sentence(text))
    .filter((text) => text.length > 20 && text.length < 200 && !exclude.includes(text));
  const unique = [...new Set(pool)];
  return shuffled(unique, hash(seed)).slice(0, 3);
}

function mcq(
  id: string,
  kind: MasteryCheckKind,
  prompt: string,
  correct: string,
  wrong: string[],
  explanation: string,
): MasteryItem | undefined {
  if (wrong.length < 3) return undefined;
  const answer = sentence(correct);
  const choices = shuffled([answer, ...wrong.slice(0, 3)], hash(id));
  return { id, kind, prompt, choices, answer, concepts: [], explanation };
}

/** Every mastery item a section can ask for, by kind. */
export function masteryCheckPool(topicId: string, kind: MasteryCheckKind): MasteryItem[] {
  const topic = topics.find((item) => item.id === topicId);
  const learningModule = learningModules.find((item) => item.topicId === topicId);
  const lesson = lessons.find((item) => item.topicId === topicId);
  if (!topic || !learningModule) return [];
  const slug = topicId.replace(/^topic-/, "");
  const out: MasteryItem[] = [];
  const termList = (lesson?.keyTerms ?? []).map((term) => term.term);


  if (kind === "recall") {
    (lesson?.keyTerms ?? []).forEach((term, index) => {
      out.push({
        id: `mc-${slug}-recall-term-${index + 1}`,
        kind,
        prompt: `From memory: what is ${term.term}, and what is it for?`,
        choices: [],
        concepts: [term.meaning],
        explanation: term.meaning,
      });
    });
    learningModule.howItWorks.forEach((step, index) => {
      out.push({
        id: `mc-${slug}-recall-step-${index + 1}`,
        kind,
        prompt: `From memory, in one or two sentences: in ${topic.title}, what happens at the stage involving ${cueFrom(step, termList)}, and why does it matter?`,
        choices: [],
        concepts: [step],
        explanation: sentence(step),
      });
    });
    learningModule.howItFails.forEach((failure, index) => {
      out.push({
        id: `mc-${slug}-recall-fail-${index + 1}`,
        kind,
        prompt: `From memory: describe the problem involving ${cueFrom(failure, termList)}, and what a user would notice when it happens.`,
        choices: [],
        concepts: [failure],
        explanation: sentence(failure),
      });
    });
  }


  if (kind === "understanding") {
    (lesson?.commonMisconceptions ?? []).forEach((idea, index) => {
      out.push({
        id: `mc-${slug}-teach-myth-${index + 1}`,
        kind,
        prompt: `Someone tells you: "${idea}" Explain, in your own words, what is actually going on.`,
        choices: [],
        concepts: [idea, lesson?.definition ?? topic.summary],
        explanation: sentence(idea),
      });
    });
    learningModule.whereYouSeeIt.forEach((where, index) => {
      out.push({
        id: `mc-${slug}-teach-where-${index + 1}`,
        kind,
        prompt: `Explain to someone new why ${lower(topic.title)} matters here: ${sentence(where)} Use your own words.`,
        choices: [],
        concepts: [where, lesson?.whyItMatters ?? topic.summary],
        explanation: sentence(where),
      });
    });
    out.push({
      id: `mc-${slug}-teach-core`,
      kind,
      prompt: `Explain ${lower(topic.title)} to someone who has never met it. What is it, and why does it matter?`,
      choices: [],
      concepts: [lesson?.definition ?? topic.summary, lesson?.whyItMatters ?? topic.summary],
      explanation: lesson?.definition ?? topic.summary,
    });
  }

  if (kind === "application") {
    const steps = learningModule.troubleshooting;
    learningModule.commonProblems.forEach((problem, index) => {
      const correct = steps[0] ?? learningModule.practicalKnowledge[0];
      if (!correct) return;
      const item = mcq(
        `mc-${slug}-apply-problem-${index + 1}`,
        kind,
        `${sentence(problem)} What is the right move here?`,
        correct,
        distractors(topicId, (mod) => mod.troubleshooting, `${slug}-apply-${index}`, [sentence(correct)]),
        `On ${lower(topic.title)}, the documented order starts here: ${sentence(correct)}`,
      );
      if (item) out.push(item);
    });
    learningModule.practicalKnowledge.forEach((point, index) => {
      const item = mcq(
        `mc-${slug}-apply-practice-${index + 1}`,
        kind,
        `Working on ${lower(topic.title)} in real work, which of these is the right thing to rely on?`,
        point,
        distractors(topicId, (mod) => mod.practicalKnowledge, `${slug}-practice-${index}`, [sentence(point)]),
        sentence(point),
      );
      if (item) out.push(item);
    });
  }

  if (kind === "troubleshooting") {
    const steps = learningModule.troubleshooting;
    steps.forEach((step, index) => {
      const next = steps[index + 1];
      if (!next) return;
      const item = mcq(
        `mc-${slug}-fault-next-${index + 1}`,
        kind,
        `You are working a ${lower(topic.title)} fault and you have just done this: ${sentence(step)} What comes next?`,
        next,
        distractors(topicId, (mod) => mod.troubleshooting, `${slug}-fault-${index}`, [sentence(next), sentence(step)]),
        `The documented order puts this next: ${sentence(next)}`,
      );
      if (item) out.push(item);
    });
    learningModule.howItFails.forEach((failure, index) => {
      const cause = learningModule.commonProblems[index] ?? learningModule.commonProblems[0];
      if (!cause) return;
      const item = mcq(
        `mc-${slug}-fault-cause-${index + 1}`,
        kind,
        `A user reports this: ${sentence(failure)} Which cause fits the evidence best?`,
        cause,
        distractors(topicId, (mod) => mod.commonProblems, `${slug}-cause-${index}`, [sentence(cause)]),
        `${sentence(failure)} points at ${lower(sentence(cause))}`,
      );
      if (item) out.push(item);
    });
  }

  return out;
}

/** True when this section contains this kind of proof at all. */
export function hasMasteryCheck(topicId: string, kind: MasteryCheckKind): boolean {
  return masteryCheckPool(topicId, kind).length > 0;
}

/**
 * A fresh set. Anything already asked is skipped, so no run repeats a question
 * until the whole pool has been used, and then the oldest come back first.
 */
export function masteryCheckSet(
  topicId: string,
  kind: MasteryCheckKind,
  usedIds: string[],
  seed: number,
): MasteryItem[] {
  const pool = masteryCheckPool(topicId, kind);
  if (!pool.length) return [];
  const size = Math.min(CHECK_SIZE[kind], pool.length);
  const used = new Set(usedIds);
  const unseen = shuffled(pool.filter((item) => !used.has(item.id)), seed);
  if (unseen.length >= size) return unseen.slice(0, size);
  // Pool exhausted: bring back the ones seen longest ago, oldest first.
  const order = new Map(usedIds.map((id, index) => [id, index]));
  const recycled = pool
    .filter((item) => used.has(item.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return [...unseen, ...recycled].slice(0, size);
}
