/**
 * Milestones worth stopping for.
 *
 * Every milestone is derived from recorded work: answers held over time,
 * coverage across the path, or a real run of study days. Nothing here is a
 * projection, and each milestone fires once.
 */
import type { Intelligence } from "@/lib/intelligence/types";
import { freezesAvailable } from "@/lib/streak-freeze";
import { streakSummary } from "@/lib/streak-engine";
import type { UserData } from "@/lib/app-data/types";

export interface Milestone {
  /** Stable id used to remember this milestone was celebrated. */
  id: string;
  title: string;
  description: string;
  /** The evidence behind it, shown in small print. */
  detail: string;
}

const RELIABLE_STEPS = [1, 5, 10, 25, 50] as const;
const PATH_STEPS = [25, 50, 75, 100] as const;
const STREAK_STEPS = [7, 30] as const;

function solidCount(intel: Intelligence): number {
  return intel.concepts.filter(
    (concept) => concept.state === "reliable" || concept.state === "transferable" || concept.state === "retained",
  ).length;
}

/** Every milestone currently earned. The overlay decides which one to show. */
export function achievedMilestones(intel: Intelligence, user: UserData): Milestone[] {
  const out: Milestone[] = [];

  const solid = solidCount(intel);
  if (solid > 0) {
    for (const step of RELIABLE_STEPS) {
      if (solid >= step) {
        out.push({
          id: `reliable-${step}`,
          title: step === 1 ? "First concept holding steady" : `${step} concepts holding steady`,
          description:
            step === 1
              ? `${intel.concepts.find((concept) => concept.state === "reliable" || concept.state === "transferable" || concept.state === "retained")?.title ?? "A concept"} now holds up on its own: answered right, checked again later, still there. That held across separate checks. That's the evidence I was waiting for.`
              : `${solid} concepts now hold up on their own across ${intel.certificationTitle}. They answered right, came back later, and stayed right. That's stronger evidence than one good run.`,
          detail: `Counted from your recorded answers. Concepts reach this only on independent evidence spread over time.`,
        });
      }
    }
  }

  const percent = Math.round(intel.pathFunctional * 100);
  for (const step of PATH_STEPS) {
    if (percent >= step) {
      out.push({
        id: `path-${step}`,
        title: `${step}% of the path holding up`,
        description: `About ${percent}% of ${intel.certificationTitle} now holds up in questions. ${step >= 75 ? "The finish line is close; keep the reviews coming." : "The path is filling in from work you've actually completed."}`,
        detail: "Measured across every topic in the certification, from the answers you have actually recorded.",
      });
    }
  }

  const summary = streakSummary(user);
  for (const step of STREAK_STEPS) {
    if (summary.longest >= step) {
      out.push({
        id: `streak-${step}`,
        title: `${step} days in a row`,
        description: `A ${step}-day run of real study. You've kept returning to the work across separate days. That spacing gives the later checks more meaning.`,
        detail: `Longest recorded run: ${summary.longest} days. ${
          freezesAvailable(user) > 0 ? "You have a freeze banked if a day ever gets away from you." : ""
        }`,
      });
    }
  }

  // Show the most impressive one first.
  return out.reverse();
}
