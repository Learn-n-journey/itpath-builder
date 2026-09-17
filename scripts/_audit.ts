import { topics } from "@/data/static-content";
import { getTopicQuestionPool } from "@/data/topic-quizzes";

const tok = (s:string)=> new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>3));
const jac=(a:Set<string>,b:Set<string>)=>{const i=[...a].filter(x=>b.has(x)).length;return i/Math.max(1,new Set([...a,...b]).size);};

let total=0, nearDup=0, subjectInDistractor=0, lenSkew=0;
const samples:string[]=[];
for (const t of topics){
  for (const q of getTopicQuestionPool(t.id)){
    total++;
    const correct=q.correctAnswer[0]??"";
    const ct=tok(correct);
    const wrong=q.choices.filter(c=>c!==correct);
    let flagged=false;
    for (const w of wrong){
      if (jac(ct,tok(w))>0.5){nearDup++;flagged=true;}
    }
    // subject named in prompt
    const m=q.prompt.match(/about (the )?([a-z0-9 +.-]{3,30})\?|how (the )?([a-z0-9 +.-]{3,30}) works/i);
    const subj=(m?.[2]||m?.[4]||"").trim();
    if (subj && wrong.some(w=>w.toLowerCase().includes(subj.toLowerCase()))){subjectInDistractor++;flagged=true;}
    const lens=q.choices.map(c=>c.length);
    if (Math.max(...lens) > 3*Math.min(...lens)) {lenSkew++;flagged=true;}
    if (flagged && samples.length<12) samples.push(`[${t.id}] ${q.prompt}\n  A: ${correct}\n  W: ${wrong.join(" | ")}`);
  }
}
console.log({total,nearDup,subjectInDistractor,lenSkew});
console.log(samples.join("\n---\n"));
