import { resolveActivePack } from "@/content/course-pack";
import { lessonConceptSections } from "@/lib/lesson-concepts";
const pack = resolveActivePack();
let noMap = 0, bad = 0, ok = 0; const badIds = new Map<string, number>();
const perTopic: Array<[string, number, number]> = [];
for (const topic of pack.topics) {
  const deep = pack.getDeepLesson(topic.id);
  const valid = new Set(lessonConceptSections(topic.id, deep).map((s) => s.id));
  let t0 = 0, t1 = 0;
  for (const q of pack.sectionQuestionPool(topic.id)) {
    if (!q.lessonSectionId) { noMap++; t0++; }
    else if (!valid.has(q.lessonSectionId)) { bad++; t1++; badIds.set(q.lessonSectionId, (badIds.get(q.lessonSectionId) ?? 0) + 1); }
    else ok++;
  }
  if (t0 || t1) perTopic.push([topic.id, t0, t1]);
}
console.log({ noMap, bad, ok });
console.log("bad section ids sample:", [...badIds.entries()].slice(0, 10));
console.log(perTopic.slice(0, 15));
