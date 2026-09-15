/**
 * GAYL's wording layer.
 *
 * Read-only. It turns what the Learning Intelligence Engine already calculated
 * into short, plain sentences. No scoring, no decisions and no state changes
 * happen here, the engine stays exactly as it is.
 *
 * Tone rule: describe what happened and what it may mean. Never describe the
 * learner. Grades aren't your legacy.
 */
import { DIAGNOSIS_LABEL } from "@/lib/intelligence/types";
import { STATE_LABEL, STATE_MEANING } from "@/lib/intelligence/states";
import type { ConceptIntel, Intelligence } from "@/lib/intelligence/types";

export interface GaylInsight {
  message: string;
  why?: string[];
}

function evidenceLines(concept: ConceptIntel): string[] {
  const lines = [concept.evidence];
  lines.push(`Read as: ${DIAGNOSIS_LABEL[concept.diagnosis].toLowerCase()}.`);
  if (concept.attempts > 0) {
    lines.push(`Based on ${concept.attempts} recorded attempt${concept.attempts === 1 ? "" : "s"}.`);
  }
  if (concept.certainty < 0.6) {
    lines.push("There isn't much evidence yet, so this is a starting guess rather than a conclusion.");
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
    message: `${opener}${top.title} looks like the one worth attention next, ${top.instruction.toLowerCase()}`,
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
        "Nothing recorded here yet. Read through, then try the recall questions, that gives me something real to work from instead of guessing.",
    };
  }

  const why = evidenceLines(concept);

  switch (concept.diagnosis) {
    case "fading":
    case "retrieval_failure":
      return {
        message:
          "You've had this before, so it isn't new learning, it just needs bringing back. A short review pass should be enough.",
        why,
      };
    case "misconception":
    case "confident_but_wrong":
      return {
        message:
          "Some answers here went wrong quickly, which usually means an idea is being remembered slightly differently than it works. Worth slowing down on the explanation rather than repeating the questions.",
        why,
      };
    case "prerequisite_gap":
      return {
        message: `Something underneath this is still unproven${
          concept.prerequisiteGaps[0] ? `, ${concept.prerequisiteGaps[0].title}` : ""
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
          "The facts are here, but the fault-finding process is where it comes apart. An incident or scenario is the better next step.",
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

  let message: string;
  if (total === 0) {
    message = "No questions were scored in this attempt.";
  } else if (score >= 85 && spread === 0) {
    message =
      "A strong run across the board. One good result is a snapshot rather than proof it will stick, so I'll check this again later rather than mark it finished.";
  } else if (score >= 85) {
    message = `Mostly comfortable, with ${spread === 1 ? "one topic" : `${spread} topics`} standing out from the rest. That pattern usually points at a specific gap, not general difficulty.`;
  } else if (score >= 60) {
    message =
      spread <= 1
        ? "A mixed result concentrated in one area, that's usually one idea to clear up rather than the whole subject."
        : `Misses spread across ${spread} topics. That often means recall is fading rather than the material being misunderstood.`;
  } else {
    message =
      "A low score here is information, not a verdict. It usually means the material hasn't had enough exposure yet, or something underneath it is still shaky.";
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
      : `The strongest part of this was ${best[0]}. The step costing you most was ${worst[0]}, that's process, not knowledge, and process is quick to change.`;

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
  if (due.length > 0) parts.push(`${due.length} past the point where recall usually starts slipping`);
  if (fading.length > 0) parts.push(`${fading.length} fading since the last correct answer`);
  if (errors.length > 0) parts.push(`${errors.length} with a mistake still open`);

  return {
    message: `These are back because of timing and open mistakes, not because you did badly: ${parts.join(", ")}.`,
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
    message: `Most of your work sits at "${STATE_LABEL[top[0]]}" right now, ${STATE_MEANING[top[0]].toLowerCase()} About ${Math.round(
      intel.pathFunctional * 100,
    )}% of ${intel.certificationTitle} is functional or better.`,
    why: present.map(([state, count]) => `${STATE_LABEL[state]}: ${count} concept${count === 1 ? "" : "s"}`),
  };
}

/** My Path: why the recommended order looks the way it does. */
export function pathInsight(intel: Intelligence): GaylInsight | null {
  if (!intel.hasEvidence) return null;
  const top = intel.queue[0];
  if (!top) return null;

  const reason = top.isDiagnostic
    ? "a short check to work out what's actually going on before spending time on the wrong fix"
    : top.evidence;

  return {
    message: `Your order changed because of what you recorded, not a fixed curriculum. ${top.title} moved up: ${reason}`,
    why: intel.queue.slice(0, 4).map((concept) => `${concept.title}: ${concept.instruction}`),
  };
}
