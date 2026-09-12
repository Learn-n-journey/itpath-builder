/**
 * Conceptual answer matching.
 *
 * Written answers are graded on the idea, not on an exact string. An answer
 * counts when it contains enough of the meaningful words of an accepted
 * answer, so wording, order and small typos do not fail a correct response.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "in", "on", "at", "is", "are", "was", "were", "be", "being", "been",
  "it", "its", "this", "that", "these", "those", "and", "or", "but", "for", "with", "without",
  "from", "by", "as", "into", "than", "then", "so", "if", "when", "which", "you", "your", "can",
  "will", "would", "should", "could", "do", "does", "did", "has", "have", "had", "not", "no",
  "there", "their", "they", "we", "i", "my", "me", "us", "he", "she", "his", "her", "each", "any",
  "all", "some", "more", "most", "other", "also", "very", "just", "up", "out", "about", "over",
]);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(word: string): string {
  return word
    .replace(/(ing|ed|es|s)$/u, "")
    .replace(/-+$/u, "");
}

export function keywords(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map(stem)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);
  for (let i = 1; i < rows; i += 1) {
    const current = [i, ...Array<number>(cols - 1).fill(0)];
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] as number) + 1,
        (previous[j] as number) + 1,
        (previous[j - 1] as number) + cost,
      );
    }
    previous = current;
  }
  return previous[cols - 1] as number;
}

/** True when two words are the same idea, allowing a small spelling slip. */
function wordMatches(needle: string, haystack: string[]): boolean {
  if (haystack.includes(needle)) return true;
  return haystack.some((word) => {
    if (word.includes(needle) || needle.includes(word)) return needle.length > 3 && word.length > 3;
    const tolerance = needle.length > 7 ? 2 : needle.length > 4 ? 1 : 0;
    return tolerance > 0 && levenshtein(needle, word) <= tolerance;
  });
}

/** Share (0–1) of an expected idea's meaningful words present in the response. */
export function conceptCoverage(expected: string, response: string): number {
  const expectedWords = [...new Set(keywords(expected))];
  if (expectedWords.length === 0) return 0;
  const responseWords = keywords(response);
  if (responseWords.length === 0) return 0;
  const hits = expectedWords.filter((word) => wordMatches(word, responseWords)).length;
  return hits / expectedWords.length;
}

/** True when the response expresses the idea behind any accepted answer. */
export function matchesConcept(
  response: string,
  acceptedAnswers: readonly string[],
  threshold = 0.6,
): boolean {
  if (!response.trim() || acceptedAnswers.length === 0) return false;
  return acceptedAnswers.some((accepted) => conceptCoverage(accepted, response) >= threshold);
}

/** How many of several expected ideas the response covers. */
export function coveredConcepts(
  response: string,
  expectedConcepts: readonly string[],
  threshold = 0.6,
): string[] {
  return expectedConcepts.filter((concept) => conceptCoverage(concept, response) >= threshold);
}
