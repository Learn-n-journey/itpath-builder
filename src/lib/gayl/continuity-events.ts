/**
 * Deterministic continuity moments for GAYL.
 *
 * These are not diagnoses and they never mutate learning state. They compare
 * recorded work across time and surface only changes worth acknowledging.
 */
import type { UserData } from "@/lib/app-data/types";
import type { Intelligence } from "@/lib/intelligence/types";
import { evidenceStream } from "@/lib/learner-signals";
import type { GaylMessage } from "@/lib/gayl/insights";

const DAY = 86_400_000;
const RECENT_DAYS = 7;

function recent(iso: string, now: Date): boolean {
  const age = now.getTime() - new Date(iso).getTime();
  return Number.isFinite(age) && age >= 0 && age <= RECENT_DAYS * DAY;
}

function topicMessage(
  intel: Intelligence,
  topicId: string,
  id: string,
  title: string,
  text: string,
  why: string[],
): GaylMessage | null {
  const concept = intel.byTopic[topicId];
  if (!concept) return null;
  return {
    id,
    topicId,
    title,
    text,
    detail: null,
    route: concept.route,
    urgent: false,
    why,
  };
}

/**
 * One meaningful change, at most. Priority is recovery/retention first, then a
 * repeated pattern. This keeps GAYL observant without narrating every answer.
 */
export function gaylContinuityEvent(
  user: UserData,
  intel: Intelligence,
  now: Date = new Date(),
): GaylMessage | null {
  const resolved = user.mistakes
    .filter((mistake) => mistake.resolved && mistake.resolvedAt && recent(mistake.resolvedAt, now))
    .sort((a, b) => new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime())[0];

  if (resolved?.resolvedAt) {
    const concept = intel.byTopic[resolved.topicId];
    if (concept) {
      return topicMessage(
        intel,
        resolved.topicId,
        `continuity:resolved:${resolved.id}:${resolved.resolvedAt}`,
        "That cleared up",
        `There it is. ${concept.title} was giving you trouble earlier, and you cleared that mistake this time.`,
        [
          `The mistake was first recorded on ${new Date(resolved.createdAt).toLocaleDateString()}.`,
          `It was cleared on ${new Date(resolved.resolvedAt).toLocaleDateString()}.`,
        ],
      );
    }
  }

  const retained = [...user.reviewAttempts]
    .filter((attempt) => attempt.outcome === "pass" && attempt.intervalBefore >= 14 && recent(attempt.createdAt, now))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (retained) {
    const concept = intel.byTopic[retained.topicId];
    if (concept) {
      return topicMessage(
        intel,
        retained.topicId,
        `continuity:retained:${retained.id}`,
        "Still there",
        `You hadn't seen ${concept.title} for a while, and it still came back clean. That means more than getting it right again the next day.`,
        [
          `This review passed after a ${retained.intervalBefore}-day spacing interval.`,
          "The result came from a recorded review attempt.",
        ],
      );
    }
  }

  const stream = evidenceStream(user).filter(
    (signal) => typeof signal.correct === "boolean" || typeof signal.score === "number",
  );
  const byTopic = new Map<string, typeof stream>();
  for (const signal of stream) {
    const list = byTopic.get(signal.topicId) ?? [];
    list.push(signal);
    byTopic.set(signal.topicId, list);
  }

  for (const [topicId, signals] of byTopic) {
    const latest = signals[0];
    if (!latest || !recent(latest.at, now)) continue;
    const passed = latest.correct === true || (latest.score ?? 0) >= 0.7;
    if (!passed) continue;
    const older = signals.slice(1, 5);
    const earlierMisses = older.filter(
      (signal) => signal.correct === false || (typeof signal.score === "number" && signal.score < 0.7),
    );
    if (earlierMisses.length < 2) continue;
    const concept = intel.byTopic[topicId];
    if (!concept) continue;
    return topicMessage(
      intel,
      topicId,
      `continuity:recovery:${latest.id}`,
      "Better",
      `That's better. ${concept.title} had tripped you up more than once, and this time it held.`,
      [
        `The latest recorded check passed on ${new Date(latest.at).toLocaleDateString()}.`,
        `${earlierMisses.length} of the previous ${older.length} recorded checks missed.`,
      ],
    );
  }

  const repeated = user.mistakes
    .filter((mistake) => !mistake.resolved && recent(mistake.createdAt, now))
    .reduce((map, mistake) => {
      const list = map.get(mistake.topicId) ?? [];
      list.push(mistake);
      map.set(mistake.topicId, list);
      return map;
    }, new Map<string, typeof user.mistakes>());

  const repeatedEntry = [...repeated.entries()]
    .filter(([, mistakes]) => mistakes.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)[0];

  if (repeatedEntry) {
    const [topicId, mistakes] = repeatedEntry;
    const concept = intel.byTopic[topicId];
    const newest = [...mistakes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (concept && newest) {
      return topicMessage(
        intel,
        topicId,
        `continuity:repeat:${topicId}:${mistakes.length}:${newest.id}`,
        "Same spot again",
        `${concept.title} has tripped you up more than once. Another blind retry probably won't fix it. Go back to the idea underneath the misses first.`,
        [
          `${mistakes.length} unresolved mistakes are recorded here.`,
          "I'm only calling this out because the pattern repeated.",
        ],
      );
    }
  }

  return null;
}
