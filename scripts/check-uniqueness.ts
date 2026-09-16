/** Verifies repeat runs never reuse items until a pool is exhausted. */
import { topics } from "@/data/static-content";
import { masteryCheckPool, masteryCheckSet, CHECK_SIZE, type MasteryCheckKind } from "@/data/mastery-checks";
import { getSectionQuizQuestions } from "@/data/topic-quizzes";

const KINDS: MasteryCheckKind[] = ["recall", "understanding", "application", "troubleshooting"];
const problems: string[] = [];

for (const topic of topics) {
  for (const kind of KINDS) {
    const pool = masteryCheckPool(topic.id, kind);
    if (!pool.length) continue;
    const size = Math.min(CHECK_SIZE[kind], pool.length);
    const runs = Math.max(1, Math.floor(pool.length / size));
    const used: string[] = [];
    for (let run = 0; run < runs; run += 1) {
      const set = masteryCheckSet(topic.id, kind, used, 1000 + run);
      if (new Set(set.map((i) => i.id)).size !== set.length)
        problems.push(`${topic.id}/${kind} run ${run + 1}: duplicate inside one run`);
      const repeat = set.filter((i) => used.includes(i.id));
      if (repeat.length)
        problems.push(`${topic.id}/${kind} run ${run + 1}: repeats ${repeat.map((i) => i.id).join(", ")}`);
      used.push(...set.map((i) => i.id));
    }
  }

  const seen: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const qs = getSectionQuizQuestions(topic.id, attempt);
    if (qs.length < 20) problems.push(`${topic.id} quiz attempt ${attempt + 1}: only ${qs.length} questions`);
    if (new Set(qs.map((q) => q.id)).size !== qs.length)
      problems.push(`${topic.id} quiz attempt ${attempt + 1}: duplicate inside one set`);
    const overlap = qs.filter((q) => seen.includes(q.id)).length;
    if (overlap) problems.push(`${topic.id} quiz attempt ${attempt + 1}: ${overlap} repeated questions`);
    seen.push(...qs.map((q) => q.id));
  }
}

console.log(problems.length ? problems.slice(0, 40).join("\n") : "All sets unique across retakes.");
console.log("total problems:", problems.length, "topics:", topics.length);
