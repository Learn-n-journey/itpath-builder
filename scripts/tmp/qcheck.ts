import { topics } from "@/data/static-content";
import { getSectionQuizQuestions, getTopicQuestionPool } from "@/data/topic-quizzes";
let short = 0, overlapTotal = 0;
for (const t of topics) {
  const pool = getTopicQuestionPool(t.id);
  const a = getSectionQuizQuestions(t.id, 0).map(q=>q.id);
  const b = getSectionQuizQuestions(t.id, 1).map(q=>q.id);
  const overlap = a.filter(id=>b.includes(id)).length;
  overlapTotal += overlap;
  if (a.length < 20) { short++; console.log("SHORT", t.id, a.length, "pool", pool.length); }
}
console.log("topics", topics.length, "short", short, "avg overlap attempt0/1", (overlapTotal/topics.length).toFixed(1));
const s = getSectionQuizQuestions(topics[0]!.id, 0);
s.slice(0,6).forEach(q=>console.log("-", q.prompt.slice(0,110)));
