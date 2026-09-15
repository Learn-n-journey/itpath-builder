/**
 * Prompt and context compression.
 *
 * Tokens are the bill, so nothing is sent that the model does not need. All of
 * this is deterministic text work — no AI call is spent on shrinking a prompt.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are", "was", "were",
  "it", "this", "that", "be", "by", "as", "at", "from", "you", "your", "i", "my", "we", "they",
]);

/** Collapses runs of whitespace and blank lines without changing meaning. */
export function collapse(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Removes repeated lines, keeping the first occurrence and the order. */
export function dedupeLines(text: string): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const key = line.trim().toLowerCase();
    if (key.length > 0 && seen.has(key)) continue;
    if (key.length > 0) seen.add(key);
    kept.push(line);
  }
  return kept.join("\n");
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
}

/**
 * Keeps the parts of a long context that actually relate to the question.
 * Paragraphs are scored on shared terms with the query; the best ones are kept
 * in their original order until the character budget is spent.
 */
export function compressContext(text: string, query: string, maxChars: number): string {
  const cleaned = dedupeLines(collapse(text));
  if (cleaned.length <= maxChars) return cleaned;

  const queryTerms = new Set(words(query));
  const paragraphs = cleaned.split(/\n\s*\n/).filter((part) => part.trim().length > 0);

  const scored = paragraphs.map((paragraph, index) => {
    const terms = words(paragraph);
    const hits = terms.filter((term) => queryTerms.has(term)).length;
    const density = terms.length === 0 ? 0 : hits / Math.sqrt(terms.length);
    // Earlier paragraphs are usually titles and summaries, so nudge them up.
    return { paragraph, index, score: density + (index < 2 ? 0.15 : 0) };
  });

  const chosen: typeof scored = [];
  let used = 0;
  for (const item of [...scored].sort((a, b) => b.score - a.score)) {
    if (used + item.paragraph.length > maxChars) continue;
    chosen.push(item);
    used += item.paragraph.length + 2;
    if (used >= maxChars) break;
  }
  if (chosen.length === 0) return cleaned.slice(0, maxChars);

  return chosen
    .sort((a, b) => a.index - b.index)
    .map((item) => item.paragraph)
    .join("\n\n");
}

/** Joins prompt sections, dropping empty ones and collapsing the result. */
export function buildPrompt(parts: Array<string | false | null | undefined>): string {
  return collapse(parts.filter((part): part is string => Boolean(part && part.trim())).join("\n\n"));
}
