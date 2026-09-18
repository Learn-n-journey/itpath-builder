import { topics, certifications, certificationObjectives } from "@/data/static-content";
import { getSectionQuizQuestions } from "@/data/topic-quizzes";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
let issues = 0, total = 0;
const kinds: Record<string, number> = {};
for (const t of topics) for (let a = 0; a < 3; a++) {
  const qs = getSectionQuizQuestions(t.id, a) as any[];
  if (qs.length !== 20) { console.log("QCOUNT", t.id, a, qs.length); }
  for (const q of qs) {
    total++;
    const ch: string[] = q.choices ?? [];
    const ans: string[] = q.correctAnswer ?? [];
    const p: string[] = [];
    if (ch.length !== 4) p.push(`choices=${ch.length}`);
    if (new Set(ch.map(norm)).size !== ch.length) p.push("dup choices");
    for (const x of ans) if (!ch.some(c => norm(c) === norm(x))) p.push("answer missing");
    if (q.type === "multiple_choice" && ans.length !== 1) p.push(`answers=${ans.length}`);
    if (ans.length > 1 && !/\b(two|three|all that apply|select all)\b/i.test(q.prompt)) p.push("multi not signposted");
    if (!q.prompt || q.prompt.length < 25) p.push("prompt short");
    if (!q.explanation || q.explanation.length < 15) p.push("no explanation");
    if (p.length) { issues++; for (const k of p) kinds[k] = (kinds[k] ?? 0) + 1; if (issues <= 25) console.log("Q", t.id, "|", p.join(","), "|", String(q.prompt).slice(0,100), "|", ch.join(" / ").slice(0,160)); }
  }
}
console.log("questions", total, "issues", issues, JSON.stringify(kinds));
for (const c of certifications) {
  const objs = certificationObjectives.filter((o: any) => o.certificationId === c.id);
  for (const o of objs as any[]) if (!o.topicIds?.length) console.log("UNMAPPED", c.id, o.code ?? o.id, o.title ?? o.description);
}
