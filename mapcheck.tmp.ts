import { coursePack } from "@/content/course-pack";
import { lessonConceptSections } from "@/lib/lesson-concepts";
let noMap = 0, bad = 0, ok = 0;
for (const topic of coursePack.sections) {
  const valid = new Set(lessonConceptSections(topic.id, coursePack.getDeepLesson(topic.id)).map((s) => s.id));
  for (const q of coursePack.sectionQuestionPool(topic.id)) {
    if (!q.lessonSectionId) noMap++;
    else if (!valid.has(q.lessonSectionId)) bad++;
    else ok++;
  }
}
console.log({ noMap, bad, ok });
