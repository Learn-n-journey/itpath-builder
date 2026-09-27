/**
 * GAYL's wording layer.
 *
 * Read-only. It turns what the Learning Intelligence Engine already calculated
 * into short, plain sentences. No scoring, no decisions and no state changes
 * happen here, the engine stays exactly as it is.
 *
 * Tone rule: observe what happened, say only what the evidence supports, then
 * give the smallest useful next move. Never turn performance into identity.
 * Warm without cheerleading, direct without judgement. Grades aren't your legacy.
 */
import { DIAGNOSIS_LABEL } from "@/lib/intelligence/types";
import { STATE_LABEL, STATE_MEANING } from "@/lib/intelligence/states";
import type { ConceptIntel, Intelligence } from "@/lib/intelligence/types";
import type { UserData } from "@/lib/app-data/types";

export interface GaylInsight {
  message: string;
  why?: string[];
}

/**
 * Stable variation makes deterministic GAYL feel less canned without randomness,
 * network calls or hidden state. The same evidence always selects the same line,
 * and changed evidence can naturally change how she phrases the observation.
 */
function stableVariant(key: string, options: readonly string[]): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return options[hash % options.length] ?? options[0] ?? "";
}

function evidenceKey(concept: ConceptIntel): string {
  return [concept.topicId, concept.diagnosis, concept.state, concept.attempts, concept.unresolvedMistakes, Math.round(concept.certainty * 10)].join(":");
}

/** Plain reason clause, written to follow the word "because". */
function becauseClause(concept: ConceptIntel): string {
  switch (concept.diagnosis) {
    case "never_learned":
      return "I do not have enough completed work here yet to judge it";
    case "prerequisite_gap":
      return concept.prerequisiteGaps[0]
        ? `${concept.prerequisiteGaps[0].title} needs more work first`
        : "one of the skills it depends on needs more work first";
    case "retrieval_failure":
      return "you answered this correctly before, but a recent answer was missed";
    case "misconception":
      return "the same misunderstanding has appeared more than once";
    case "confident_but_wrong":
      return "some answers were given confidently but were incorrect";
    case "application_failure":
      return "your explanation is stronger than your hands-on application";
    case "troubleshooting_failure":
      return "your knowledge checks are stronger than your troubleshooting work";
    case "fading":
      return "recent recall is weaker than your earlier results";
    case "solid":
      return "your recent work is holding up well, so a harder check would be useful";
  }
}

function evidenceLines(concept: ConceptIntel): string[] {
  const lines = [concept.evidence];
  if (concept.attempts > 0) {
    lines.push(`This comes from ${concept.attempts} answer${concept.attempts === 1 ? "" : "s"} you have recorded here.`);
  }
  if (concept.certainty < 0.6) {
    lines.push("There is not much recorded yet, so treat this as a first read rather than a conclusion.");
  }
  return lines;
}

/** Dashboard: one occasional note about what is going well or needs attention. */
export function dashboardInsight(intel: Intelligence): GaylInsight | null {
  if (!intel.hasEvidence) return null;
  const top = intel.queue[0];
  const steady = intel.concepts.filter(
    (concept) => concept.state === "reliable" || concept.state === "retained" || concept.state === "transferable",
  );

  if (!top) {
    return {
      message:
        steady.length > 0
          ? `Nothing is asking for attention right now. ${steady.length} concept${steady.length === 1 ? " is" : "s are"} holding up on their own.`
          : "Nothing is flagged right now. Record some work and I'll have more to go on.",
    };
  }

  const opener =
    steady.length > 0
      ? `${steady.length} concept${steady.length === 1 ? " is" : "s are"} holding steady. `
      : "";

  return {
    message: `${opener}${top.title} is the one I would look at next, because ${becauseClause(top)}. ${top.instruction}`,
    why: evidenceLines(top),
  };
}

/** Lesson pages: review, move on, or stretch. */
export function lessonInsight(intel: Intelligence, topicId: string): GaylInsight | null {
  const concept = intel.byTopic[topicId];
  if (!concept) return null;

  if (concept.attempts === 0) {
    return {
      message:
        "Nothing recorded here yet. Read through, then try the recall questions. That gives me something real to work from instead of guessing.",
    };
  }

  const why = evidenceLines(concept);

  switch (concept.diagnosis) {
    case "fading":
    case "retrieval_failure":
      return {
        message:
          "You've had this before, so it isn't new learning. It just needs bringing back. A short review pass should be enough.",
        why,
      };
    case "misconception":
    case "confident_but_wrong":
      return {
        message:
          "A few answers here came back as quick misses, which usually means an idea is being remembered slightly differently than it works. Worth slowing down on the explanation rather than repeating the questions.",
        why,
      };
    case "prerequisite_gap":
      return {
        message: `Something underneath this is still unproven${
          concept.prerequisiteGaps[0] ? `: ${concept.prerequisiteGaps[0].title}` : ""
        }. Shoring that up first usually makes this one much easier.`,
        why,
      };
    case "application_failure":
      return {
        message:
          "The explanation side is landing; using it in a task is where it's slipping. Hands-on work will tell us more than another quiz.",
        why,
      };
    case "troubleshooting_failure":
      return {
        message:
          "The facts are here, but the fault-finding process is the part that needs work. An incident or scenario is the better next step.",
        why,
      };
    case "solid":
      return {
        message:
          concept.difficulty === "advanced"
            ? "This is holding up well. Something harder would tell us more than repeating what already works."
            : "This is looking solid. You can move forward; I'll bring it back later to check it stuck.",
        why,
      };
    default:
      return { message: `${concept.instruction} ${concept.evidence}`, why };
  }
}

/** Question results: what a score may indicate, rather than right or wrong. */
export function quizResultInsight(input: {
  score: number;
  correct: number;
  total: number;
  weakTopicTitles: string[];
}): GaylInsight {
  const { score, correct, total, weakTopicTitles } = input;
  const spread = weakTopicTitles.length;

  const retake = "Go back over the section, then run the whole quiz again. A full second run shows me more than any single question can.";

  let message: string;
  if (total === 0) {
    message = "No questions were scored in this attempt.";
  } else if (score > 80) {
    message = "That run held together. There is nothing to fix from this attempt. I'll bring some of it back later to see whether it still holds.";
  } else if (score >= 60) {
    message =
      spread <= 1
        ? `A mixed result, mostly sitting in one area. ${retake}`
        : `The misses are spread across ${spread} topics rather than sitting in one place. ${retake}`;
  } else {
    message = `This attempt shows the material is not holding consistently yet. ${retake}`;
  }

  return {
    message,
    why: [
      `${correct} of ${total} correct (${score}%).`,
      spread === 0
        ? "No single topic accounted for the misses."
        : `Misses clustered in: ${weakTopicTitles.join(", ")}.`,
      "Scores feed the model as evidence; they are never stored as a label.",
    ],
  };
}

/** Troubleshooting: feedback about reasoning and process, not just the score. */
export function troubleshootingInsight(scores: {
  diagnosticChoices: number;
  technicalAccuracy: number;
  reasoning: number;
  efficiency: number;
  verification: number;
  documentation: number;
}): GaylInsight {
  const entries: Array<[string, number]> = [
    ["choosing diagnostics", scores.diagnosticChoices],
    ["technical accuracy", scores.technicalAccuracy],
    ["explaining your reasoning", scores.reasoning],
    ["working efficiently", scores.efficiency],
    ["verifying the fix", scores.verification],
    ["documenting it", scores.documentation],
  ];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;

  const message =
    best[1] - worst[1] < 15
      ? `Your work was even across the whole process, no single step is dragging the rest down.`
      : `The strongest part of this was ${best[0]}. The step costing you most was ${worst[0]}. That points to process rather than a broad knowledge gap. Work on that step first.`;

  return {
    message,
    why: entries.map(([label, value]) => `${label}: ${value}%`),
  };
}

/** Review: why these topics are coming back. */
export function reviewInsight(intel: Intelligence): GaylInsight | null {
  if (!intel.hasEvidence) return null;
  const due = intel.queue.filter((concept) => concept.daysOverdue > 0);
  const fading = intel.concepts.filter((concept) => concept.diagnosis === "fading");
  const errors = intel.concepts.filter((concept) => concept.unresolvedMistakes > 0);

  if (due.length === 0 && fading.length === 0 && errors.length === 0) {
    return {
      message:
        "Nothing is overdue. Topics come back here when the timing says recall is slipping, or when the same mistake is still open, not on a fixed schedule.",
    };
  }

  const parts: string[] = [];
  if (due.length > 0) parts.push(`${due.length} you have not seen for a while`);
  if (fading.length > 0) parts.push(`${fading.length} where your answers have slipped since you last got them right`);
  if (errors.length > 0) parts.push(`${errors.length} where a mistake is still unfixed`);

  return {
    message: `These came back because of timing and mistakes still open, not as a judgement of your work. There ${due.length + fading.length + errors.length === 1 ? "is" : "are"} ${parts.join(", ")}.`,
    why: intel.queue
      .slice(0, 4)
      .map((concept) => `${concept.title}: ${concept.evidence}`),
  };
}

/** Progress: current learning state in plain language. */
export function progressInsight(intel: Intelligence): GaylInsight | null {
  if (!intel.hasEvidence) return null;
  const present = (Object.entries(intel.stateMix) as Array<[keyof typeof intel.stateMix, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = present[0];
  if (!top) return null;

  return {
    message: `Most of your topics are at the "${STATE_LABEL[top[0]]}" stage. That means: ${STATE_MEANING[top[0]].toLowerCase()} Across ${intel.certificationTitle}, about ${Math.round(
      intel.pathFunctional * 100,
    )}% of the topics now hold up in questions.`,
    why: present.map(([state, count]) => `${STATE_LABEL[state]}: ${count} concept${count === 1 ? "" : "s"}`),
  };
}

/**
 * My Path: why the recommended order looks the way it does.
 *
 * `preferredTopicId` is the section the journey map says you are on. When it is
 * given, GAYL talks about that one, so her note can never name a different
 * starting point to the one shown on the page.
 */
export function pathInsight(intel: Intelligence, preferredTopicId?: string): GaylInsight | null {
  if (!intel.hasEvidence) return null;
  const preferred = preferredTopicId ? intel.byTopic[preferredTopicId] : undefined;
  const top = preferred ?? intel.queue[0];
  if (!top) return null;

  const reason = top.isDiagnostic
    ? "I have not seen enough of your work there yet to know how it is landing, and a short check shows us where to go next"
    : becauseClause(top);

  const action =
    top.diagnosis === "application_failure"
      ? `Practice ${top.title} with a hands-on task next.`
      : top.diagnosis === "troubleshooting_failure"
        ? `Try a troubleshooting scenario for ${top.title} next.`
        : top.diagnosis === "retrieval_failure" || top.diagnosis === "fading"
          ? `Do a short review of ${top.title} next.`
          : top.diagnosis === "prerequisite_gap" && top.prerequisiteGaps[0]
            ? `Review ${top.prerequisiteGaps[0].title} before continuing with ${top.title}.`
            : top.instruction;

  return {
    message: `I recommend ${top.title} next because ${reason}. ${action}`,
    why: [top, ...intel.queue.filter((concept) => concept.topicId !== top.topicId)]
      .slice(0, 4)
      .map((concept) => `${concept.title}: ${concept.evidence}`),
  };
}

/** One named problem GAYL can point at, with the exact thing that is unresolved. */
export interface GaylProblem {
  topicId: string;
  title: string;
  /** What is unresolved, in plain words. */
  issue: string;
  /** The exact question or idea it keeps showing up on, when one is recorded. */
  detail: string | null;
  route: string;
}

/** One casual note from GAYL, as it would appear in a message thread. */
export interface GaylMessage {
  id: string;
  topicId: string;
  title: string;
  /** The note itself, written the way she would say it. */
  text: string;
  /** The exact question it keeps showing up on, when one is recorded. */
  detail: string | null;
  route: string;
  /** True when something recorded has slipped or is still open. */
  urgent: boolean;
  why: string[];
}

/** Names the exact problem on one topic, in plain words. */
function problemIssue(concept: ConceptIntel): string {
  if (concept.diagnosis === "retrieval_failure") {
    return "you had it earlier, then it slipped on a later answer";
  }
  if (concept.diagnosis === "fading") {
    return concept.daysOverdue >= 7
      ? `it has been a while since you worked on it, ${Math.round(concept.daysOverdue)} days past its review point, and recall has faded`
      : "recall here has faded since you last had it right";
  }
  if (concept.misconceptions[0]) {
    return `the same mix-up keeps coming back: ${concept.misconceptions[0].toLowerCase()}`;
  }
  if (concept.diagnosis === "confident_but_wrong") {
    return "some quick answers here did not quite land";
  }
  if (concept.unresolvedMistakes > 0) {
    return `${concept.unresolvedMistakes} answer${concept.unresolvedMistakes === 1 ? "" : "s"} here ${
      concept.unresolvedMistakes === 1 ? "is" : "are"
    } still unfixed`;
  }
  return "an idea here is being remembered differently to how it works";
}

/** The same thing, said the way GAYL would say it out loud. */
function casualText(concept: ConceptIntel): string {
  const count = concept.unresolvedMistakes;
  const plural = count === 1 ? "" : "s";
  const key = evidenceKey(concept);

  if (count > 0) {
    return stableVariant(key, [
      `${concept.title} has ${count} spot${plural} we haven't closed out yet. ${concept.instruction}`,
      `There ${count === 1 ? "is" : "are"} still ${count} open spot${plural} in ${concept.title}. ${concept.instruction}`,
      `I'm keeping ${concept.title} on the list because ${count} answer${plural} still need another look. ${concept.instruction}`,
    ]);
  }
  if (concept.diagnosis === "retrieval_failure") {
    return stableVariant(key, [
      `You had ${concept.title} earlier, then a later answer slipped. A short pass should tell us whether it was a one-off.`,
      `${concept.title} held before, but the latest check missed. Bring it back once and let's see whether it settles.`,
      `A later check on ${concept.title} didn't hold. Review it briefly, then try it again without leaning on the notes.`,
    ]);
  }
  if (concept.diagnosis === "fading") {
    return concept.daysOverdue >= 7
      ? stableVariant(key, [
          `It's been a while since ${concept.title} came back up, and recall has softened. Give it a short pass before we ask more of it.`,
          `${concept.title} is ${Math.round(concept.daysOverdue)} days past its review point. That's enough distance to make another recall check useful.`,
          `We left ${concept.title} alone for a while. Some recall has faded, so bring it back once and see what survived.`,
        ])
      : stableVariant(key, [
          `Recall on ${concept.title} has softened since the earlier work. A short pass is enough for now.`,
          `${concept.title} isn't holding quite as cleanly as it did. Bring it back once before moving past it.`,
        ]);
  }
  if (concept.misconceptions[0]) {
    return stableVariant(key, [
      `The same mix-up is showing up again in ${concept.title}: ${concept.misconceptions[0].toLowerCase()}. Clear that distinction before building on it.`,
      `I'm seeing the same idea trip you up in ${concept.title}: ${concept.misconceptions[0].toLowerCase()}. Another blind retry probably won't help; straighten that part out first.`,
    ]);
  }
  if (concept.diagnosis === "confident_but_wrong") {
    return stableVariant(key, [
      `A few answers in ${concept.title} came quickly and missed. Slow the next pass down and see whether the same pattern remains.`,
      `Your confidence ran ahead of the result on ${concept.title}. Check the reasoning before you answer the next set.`,
      `${concept.title} felt settled on a few answers that didn't hold. That's worth checking before we treat it as secure.`,
    ]);
  }
  if (concept.diagnosis === "prerequisite_gap") {
    const base = concept.prerequisiteGaps[0];
    return base
      ? stableVariant(key, [
          `Start with ${base.title} before you push on with ${concept.title}. It sits underneath it.`,
          `${concept.title} is leaning on ${base.title}, and that foundation still needs work. Fix that first.`,
        ])
      : `Something underneath ${concept.title} isn't solid yet. Work one level down before pushing forward.`;
  }
  if (concept.diagnosis === "application_failure") {
    return stableVariant(key, [
      `You can explain ${concept.title}; using it in a task is where the evidence drops. Do something hands-on next.`,
      `The recall side of ${concept.title} is ahead of the application side. A lab or scenario will tell us more than another quiz.`,
      `${concept.title} makes sense on paper. Now it needs to survive a real task. Go hands-on next.`,
    ]);
  }
  if (concept.diagnosis === "troubleshooting_failure") {
    return stableVariant(key, [
      `The facts on ${concept.title} are there. The fault-finding order is the weaker part, so use a scenario next.`,
      `You know more of ${concept.title} than the troubleshooting result shows. Work the diagnostic sequence next, not the definitions.`,
      `This isn't pointing at a broad ${concept.title} knowledge gap. It's pointing at how you narrow a fault. Practice that process.`,
    ]);
  }
  return stableVariant(key, [
    `Finish ${concept.title} before moving on. ${concept.instruction}`,
    `${concept.title} is already in motion. Close that loop before starting another one. ${concept.instruction}`,
  ]);
}

/**
 * Everything GAYL currently has to say, newest concern first.
 *
 * Read-only. It only rewords what the engine already worked out, so a note
 * exists here only when there is recorded evidence behind it.
 */
export function gaylMessages(
  intel: Intelligence,
  openDetail?: (topicId: string) => string | null,
): GaylMessage[] {
  if (!intel.hasEvidence) return [];

  const urgent = intel.concepts.filter(
    (concept) =>
      concept.unresolvedMistakes > 0 ||
      concept.diagnosis === "misconception" ||
      concept.diagnosis === "confident_but_wrong" ||
      (concept.attempts > 0 &&
        (concept.diagnosis === "fading" || concept.diagnosis === "retrieval_failure")),
  );

  // Work already started that would be worth finishing before moving on.
  const unfinished = intel.concepts.filter(
    (concept) =>
      !urgent.includes(concept) &&
      concept.attempts > 0 &&
      (concept.state === "emerging" || concept.state === "fragile"),
  );

  const ordered = [
    ...urgent.sort((a, b) => b.priority - a.priority),
    ...unfinished.sort((a, b) => b.priority - a.priority).slice(0, 4),
  ];

  return ordered.map((concept) => ({
    id: `${concept.topicId}:${concept.diagnosis}:${concept.unresolvedMistakes}:${concept.state}`,
    topicId: concept.topicId,
    title: concept.title,
    text: casualText(concept),
    detail: openDetail?.(concept.topicId) ?? null,
    route: concept.route,
    urgent: urgent.includes(concept),
    why: evidenceLines(concept),
  }));
}

/**
 * The only thing worth interrupting for.
 *
 * Returns a note when something already recorded looks like it is slipping or
 * staying unfixed, and nothing at all otherwise. No new scoring happens here,
 * it only reads what the engine already worked out. `openDetail` supplies the
 * exact question text behind a topic when the caller has the records to hand.
 */
export function alertInsight(
  intel: Intelligence,
  openDetail?: (topicId: string) => string | null,
): (GaylInsight & { id: string; problems: GaylProblem[] }) | null {
  const messages = gaylMessages(intel, openDetail).filter((message) => message.urgent);
  const first = messages[0];
  if (!first) return null;

  const concepts = messages
    .map((message) => intel.byTopic[message.topicId])
    .filter((concept): concept is ConceptIntel => Boolean(concept));

  const problems: GaylProblem[] = concepts.slice(0, 4).map((concept) => ({
    topicId: concept.topicId,
    title: concept.title,
    issue: problemIssue(concept),
    detail: openDetail?.(concept.topicId) ?? null,
    route: concept.route,
  }));

  const tail =
    messages.length > 1
      ? ` There ${messages.length - 1 === 1 ? "is" : "are"} ${messages.length - 1} other topic${
          messages.length - 1 === 1 ? "" : "s"
        } waiting too, they're all listed below.`
      : "";

  return {
    id: `${first.id}:${messages.length}`,
    message: `${first.text}${tail}`,
    problems,
    why: first.why,
  };
}




/**
 * A short welcome back after a few days away.
 *
 * Never urgent and never a guilt trip: it says what was last recorded and
 * what is waiting, then leaves the choice to the learner. Returns null unless
 * there is a real gap of three days or more after recorded study.
 */
export function checkInMessage(user: UserData, now: Date = new Date()): GaylMessage | null {
  let last: number | null = null;
  for (const session of user.studySessions) {
    const time = new Date(session.startedAt).getTime();
    if (!Number.isNaN(time) && (last === null || time > last)) last = time;
  }
  if (last === null) return null;

  const days = Math.floor((now.getTime() - last) / 86_400_000);
  if (days < 3) return null;

  const due = user.reviews.filter(
    (review) => review.status === "scheduled" && new Date(review.dueAt).getTime() <= now.getTime(),
  ).length;
  const lastLabel = new Date(last).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const text = due > 0
    ? `Welcome back. It's been ${days} days since your last session on ${lastLabel}. Nothing urgent is waiting. ${due} review${due === 1 ? " is" : "s are"} ready when you are.`
    : `Welcome back. It's been ${days} days since your last session on ${lastLabel}. Pick up where you left off and I'll keep track of the rest.`;

  return {
    id: `checkin:${days}:${lastLabel}`,
    topicId: "",
    title: "Welcome back",
    text,
    detail: null,
    route: "/",
    urgent: false,
    why: [`Last recorded session: ${lastLabel}.`, `Reviews currently due: ${due}.`],
  };
}
