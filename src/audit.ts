import { topics, lessons, certifications, certificationObjectives } from "@/data/static-content";
import { learningModules } from "@/data/learning-content";
import { getSectionQuizQuestions, getTopicQuestionPool } from "@/data/topic-quizzes";
import { stageExams, getStageExamQuestions } from "@/data/stage-exams";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// 1. Lesson population
let thin = 0;
for (const t of topics) {
  const l = lessons.find(x => x.topicId === t.id);
  const m = learningModules.find(x => x.topicId === t.id);
  const problems: string[] = [];
  if (!l) problems.push("no lesson");
  if (!m) problems.push("no module");
  if (l) {
    const words = JSON.stringify(l).split(/\s+/).length;
    if (words < 250) problems.push(`lesson thin (${words} words)`);
  }
  if (m) {
    const f: any = m;
    for (const k of ["howItWorks","whereYouSeeIt","howItFails","practicalKnowledge","troubleshooting","commonProblems","keyTerms","misconceptions"]) {
      const v = f[k];
      if (!v || (Array.isArray(v) && v.length < 2)) problems.push(`${k}<2`);
    }
  }
  if (problems.length) { thin++; console.log("TOPIC", t.id, "|", problems.join(", ")); }
}
console.log(`--- topics ${topics.length}, with issues ${thin}`);

// 2. Quiz quality per topic
let qIssues = 0, totalQ = 0;
for (const t of topics) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const qs = getSectionQuizQuestions(t.id, attempt) as any[];
    if (qs.length !== 20) { console.log("QCOUNT", t.id, attempt, qs.length); qIssues++; }
    for (const q of qs) {
      totalQ++;
      const ch: string[] = q.choices ?? [];
      const ans: string[] = q.correctAnswer ?? [];
      const probs: string[] = [];
      if (q.type === "multiple_choice" || q.type === "multiple_response") {
        if (ch.length !== 4) probs.push(`choices=${ch.length}`);
        if (new Set(ch.map(norm)).size !== ch.length) probs.push("dup choices");
        for (const a of ans) if (!ch.some(c => norm(c) === norm(a))) probs.push("answer not in choices");
        if (q.type === "multiple_choice" && ans.length !== 1) probs.push(`answers=${ans.length}`);
        if (q.type === "multiple_response" && !/select all|choose (two|three|all)/i.test(q.prompt)) probs.push("multi not signposted");
      }
      if (!q.prompt || q.prompt.length < 20) probs.push("prompt short");
      if (!/[?.:]$/.test((q.prompt ?? "").trim())) probs.push("prompt not a question");
      if (!q.explanation || q.explanation.length < 15) probs.push("no explanation");
      if (probs.length) { qIssues++; if (qIssues < 40) console.log("Q", t.id, "|", probs.join(","), "|", String(q.prompt).slice(0,90)); }
    }
  }
}
console.log(`--- questions checked ${totalQ}, issues ${qIssues}`);

// 3. Stage exams
for (const e of stageExams) {
  const qs = getStageExamQuestions(e.id) as any[];
  const tset = new Set(qs.map(q => q.topicId));
  const mc = qs.filter(q => q.type === "multiple_choice").length;
  const written = qs.filter(q => q.type === "short_answer").length;
  const stageTopics = topics.filter(t => t.month >= e.from && t.month <= e.to);
  const missing = stageTopics.filter(t => !tset.has(t.id)).map(t => t.id);
  console.log(`EXAM ${e.id} count=${qs.length} topics=${tset.size}/${stageTopics.length} mc=${mc} written=${written} uncovered=${missing.length}`);
  if (missing.length) console.log("   uncovered:", missing.join(", "));
}

// 4. Certification objective coverage
for (const c of certifications) {
  const objs = certificationObjectives.filter((o: any) => o.certificationId === c.id);
  const noTopics = objs.filter((o: any) => !o.topicIds || o.topicIds.length === 0);
  const badIds = objs.flatMap((o: any) => (o.topicIds ?? []).filter((id: string) => !topics.some(t => t.id === id)));
  const certTopics = topics.filter(t => t.certificationId === c.id || (t as any).certificationIds?.includes(c.id));
  console.log(`CERT ${c.id} objectives=${objs.length} unmapped=${noTopics.length} badIds=${badIds.length} topics=${certTopics.length}`);
  if (badIds.length) console.log("   bad:", badIds.join(", "));
}
