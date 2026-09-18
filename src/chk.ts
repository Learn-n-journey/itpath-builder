import { getSectionQuizQuestions } from "@/data/topic-quizzes";
const qs = getSectionQuizQuestions("topic-wireless-standards-and-soho-networks", 0);
console.log(JSON.stringify(qs.slice(0,4), null, 1));
let bad=0;
for (const q of qs as any[]) {
  const ch = q.choices ?? q.options ?? [];
  if (new Set(ch.map((c:any)=>String(c).toLowerCase().trim())).size !== ch.length) { bad++; console.log("DUP", q.prompt); }
}
console.log("total", qs.length, "dupOptionSets", bad);
