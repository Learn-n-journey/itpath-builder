import { topics, lessons, certifications } from "@/lib/app-data/storage";
import { getSectionQuizQuestions } from "@/data/topic-quizzes";
const ids = new Set(topics.map(t => t.id));
let bad = 0;
for (const t of topics) for (const p of t.prerequisiteTopicIds) if (!ids.has(p)) { console.log("BAD PREREQ", t.id, p); bad++; }
const dup = topics.length - ids.size;
console.log("topics", topics.length, "dupes", dup, "badPrereq", bad, "lessons", lessons.length);
for (const c of certifications) {
  const missing = c.id ? [] : [];
  console.log(c.title, c.code);
}
const cert = certifications.find(c => c.id === "cert-comptia-a-plus")!;
// quiz sanity for new topics
const news = topics.filter(t => /wireless-standards|cabling|windows-security-settings|boot-and-crash|scripting-basics|active-directory|client-virtualization|programming-and-dev|data-and-database|software-applications|security-fundamentals-cia/.test(t.id));
console.log("new topics:", news.length);
for (const t of news) {
  const q = { questions: getSectionQuizQuestions(t.id, 0) };
  let issues = 0;
  for (const item of q.questions) {
    const opts = item.options ?? [];
    if (new Set(opts.map(o=>o.trim().toLowerCase())).size !== opts.length) { console.log("DUP OPT", t.id, item.prompt); issues++; }
    const correct = (item as any).correctIndexes ?? [(item as any).correctIndex];
    if (!correct || correct.length === 0) { console.log("NO ANSWER", t.id); issues++; }
  }
  console.log(t.id, q.questions.length, "issues", issues);
}
