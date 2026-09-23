import { coursePack } from "@/content/course-pack";
import { lessonConceptSections } from "@/lib/lesson-concepts";
const t = "topic-computer-hardware-basics";
const deep = coursePack.getDeepLesson(t);
console.log("sections:", lessonConceptSections(t, deep).map((s) => s.id));
const unmapped = coursePack.sectionQuestionPool(t).filter((q) => !q.lessonSectionId);
console.log(unmapped.length, unmapped.slice(0, 5).map((q) => q.prompt));
