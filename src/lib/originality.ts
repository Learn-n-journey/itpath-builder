/**
 * Originality check.
 *
 * Deterministic overlap detection, no outside service. Text is reduced to
 * overlapping runs of words (shingles) and compared against a reference
 * corpus. Two uses:
 *
 * 1. Published guide and lesson text must not repeat itself across sections.
 * 2. Nothing may mirror protected exam wording that is pasted in as reference.
 *
 * It measures containment, not similarity: what share of the new text already
 * appears in the reference. That is the right measure for "is this copied".
 */

const SHINGLE = 8;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function shingles(text: string, size = SHINGLE): Set<string> {
  const list = words(text);
  const out = new Set<string>();
  for (let i = 0; i + size <= list.length; i += 1) {
    out.add(list.slice(i, i + size).join(" "));
  }
  return out;
}

export interface OriginalityResult {
  /** 0 to 1. 1 means nothing in the text was found in the reference. */
  originality: number;
  /** Share of the text that already appears in the reference. */
  overlap: number;
  /** The longest runs of copied wording, for a human to look at. */
  matches: string[];
  /** True when the overlap is high enough to need a rewrite. */
  flagged: boolean;
}

export interface OriginalityOptions {
  /** Overlap above this is flagged. Default 0.2. */
  threshold?: number;
  shingleSize?: number;
}

/** Builds a reference index once, so many texts can be checked against it. */
export function buildReference(texts: string[], shingleSize = SHINGLE): Set<string> {
  const index = new Set<string>();
  for (const text of texts) {
    for (const shingle of shingles(text, shingleSize)) index.add(shingle);
  }
  return index;
}

export function checkOriginality(
  text: string,
  reference: Set<string>,
  options: OriginalityOptions = {},
): OriginalityResult {
  const size = options.shingleSize ?? SHINGLE;
  const threshold = options.threshold ?? 0.2;
  const own = [...shingles(text, size)];
  if (own.length === 0) {
    return { originality: 1, overlap: 0, matches: [], flagged: false };
  }

  const hits = own.filter((shingle) => reference.has(shingle));
  const overlap = hits.length / own.length;

  // Stitch neighbouring hits back into readable runs.
  const matches: string[] = [];
  let run: string[] = [];
  for (const shingle of own) {
    if (reference.has(shingle)) {
      run.push(shingle);
    } else if (run.length) {
      matches.push(joinRun(run, size));
      run = [];
    }
  }
  if (run.length) matches.push(joinRun(run, size));

  return {
    originality: Number((1 - overlap).toFixed(4)),
    overlap: Number(overlap.toFixed(4)),
    matches: matches.sort((a, b) => b.length - a.length).slice(0, 5),
    flagged: overlap > threshold,
  };
}

function joinRun(run: string[], size: number): string {
  const first = run[0] ?? "";
  const rest = run.slice(1).map((shingle) => shingle.split(" ")[size - 1] ?? "");
  return [first, ...rest].join(" ").trim();
}
