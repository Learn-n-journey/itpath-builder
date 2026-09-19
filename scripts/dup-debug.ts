import { buildSectionQuiz, getTaggedTopicPool, topicConceptLookup } from "@/data/topic-quizzes";
const topicId = "topic-network-hardening-and-physical-security";
const conceptOf = topicConceptLookup(topicId);
const quiz = buildSectionQuiz(topicId, 0.42);
console.log("quiz size", quiz.length);
const seen = new Map<string, string[]>();
for (const q of quiz) {
  const c = conceptOf(q.id);
  if (!seen.has(c)) seen.set(c, []);
  seen.get(c)!.push(q.id);
}
for (const [c, ids] of seen) if (ids.length > 1) console.log("REPEAT", c, ids);
const pool = getTaggedTopicPool(topicId);
console.log("pool size", pool.length);
const kinds = new Map<string, number>();
for (const item of pool) kinds.set(item.kind, (kinds.get(item.kind) ?? 0) + 1);
console.log([...kinds.entries()]);
