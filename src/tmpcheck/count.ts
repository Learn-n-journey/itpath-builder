import { topics, quizzes, labs, assignments, questions, tickets, incidents } from "@/data/static-content";
import { certQuizzes } from "@/data/cert-quizzes";
import { generatedQuestions } from "@/data/question-bank";
console.log("labs", labs.length, "tickets", tickets.length, "quizzes", quizzes.length + certQuizzes.length, "questions", questions.length + generatedQuestions.length, "assignments", assignments.length, "incidents", incidents.length);
const ids = new Set<string>();
for (const l of labs) { if (ids.has(l.id)) console.log("dup lab", l.id); ids.add(l.id); }
const tid = new Set<string>();
for (const t of tickets) { if (tid.has(t.id)) console.log("dup ticket", t.id); tid.add(t.id); }
const qid = new Set<string>();
for (const q of [...quizzes, ...certQuizzes]) { if (qid.has(q.id)) console.log("dup quiz", q.id); qid.add(q.id); }
console.log("tickets w/o correct dx", tickets.filter(t=>!t.diagnoses.some(d=>d.correct)).length);
console.log("tickets w/o correct res", tickets.filter(t=>!t.resolutions.some(d=>d.correct)).length);
console.log("labs w/o checklist", labs.filter(l=>l.checklist.length===0).length);
const perTrack = new Map<string,number>();
for (const t of tickets) perTrack.set(t.track,(perTrack.get(t.track)??0)+1);
console.log([...perTrack]);
console.log(JSON.stringify(tickets[8], null, 1).slice(0, 1800));
