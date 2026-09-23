import { coursePack } from "@/content/course-pack";
const w=(s:string)=>s.trim().split(/\s+/).filter(Boolean).length;
for (const t of coursePack.sections) {
  const d = coursePack.getDeepLesson(t.id);
  for (const c of d?.depth?.checkYourself ?? []) {
    if (w(c.question) < 3 || w(c.answer) < 4) console.log(t.id, "|Q:", c.question, "|A:", c.answer);
  }
}
