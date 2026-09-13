import type { KnowledgeItem } from "@/lib/knowledge.functions";

/**
 * Builds a compact digest of the learner's own saved material for AI prompts.
 * Items linked to the current topic come first; everything is trimmed so the
 * digest stays well inside the prompt budget.
 */
export function knowledgeDigest(
  items: KnowledgeItem[],
  topicId?: string | undefined,
  limit = 8,
): string {
  if (items.length === 0) return "";
  const ranked = [...items].sort((a, b) => {
    const aHit = topicId && a.topicIds.includes(topicId) ? 1 : 0;
    const bHit = topicId && b.topicIds.includes(topicId) ? 1 : 0;
    if (aHit !== bHit) return bHit - aHit;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return ranked
    .slice(0, limit)
    .map((item) =>
      [
        `Title: ${item.title}`,
        item.sourceUrl ? `Source: ${item.sourceUrl}` : "",
        item.summary ? `Summary: ${item.summary}` : "",
        item.concepts.length ? `Concepts: ${item.concepts.join(", ")}` : "",
        item.notes ? `Learner's notes: ${item.notes.slice(0, 800)}` : "",
        item.content ? `Text: ${item.content.slice(0, 1500)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n---\n")
    .slice(0, 28000);
}
