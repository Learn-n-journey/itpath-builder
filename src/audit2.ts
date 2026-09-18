import { topics, lessons } from "@/data/static-content";
import { learningModules } from "@/data/learning-content";
const counts: Record<string, number[]> = {};
for (const t of topics) {
  const m: any = learningModules.find(x => x.topicId === t.id);
  const l: any = lessons.find(x => x.topicId === t.id);
  if (!m || !l) { console.log("MISSING", t.id); continue; }
  for (const k of ["howItWorks","whereYouSeeIt","commonProblems","howItFails","troubleshooting","practicalKnowledge","examCoverage","interviewQuestions"]) {
    (counts[k] ??= []).push((m[k] ?? []).length);
  }
  for (const k of Object.keys(l)) if (Array.isArray(l[k])) (counts["lesson."+k] ??= []).push(l[k].length);
}
for (const [k, v] of Object.entries(counts)) {
  v.sort((a,b)=>a-b);
  console.log(k.padEnd(28), "min", v[0], "median", v[Math.floor(v.length/2)], "max", v[v.length-1], "zeroOrOne", v.filter(n=>n<2).length);
}
const l0: any = lessons.find(x => x.topicId === "topic-wireless-standards-and-soho-networks");
console.log(JSON.stringify(l0, null, 1).slice(0, 1500));
