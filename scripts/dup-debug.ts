import { getTaggedTopicPool, topicConceptLookup } from "@/data/topic-quizzes";
const topicId = "topic-network-hardening-and-physical-security";
const conceptOf = topicConceptLookup(topicId);
const pool = getTaggedTopicPool(topicId);
const byConcept = new Map<string, string[]>();
for (const item of pool) {
  const c = conceptOf(item.question.id);
  if (!byConcept.has(c)) byConcept.set(c, []);
  byConcept.get(c)!.push(item.question.id.replace("section-topic-network-hardening-and-physical-security-", ""));
}
console.log("distinct concepts:", byConcept.size, "pool:", pool.length);
for (const [c, ids] of byConcept) if (ids.length > 1) console.log("multi:", c.replace(topicId + ":", ""), ids);
