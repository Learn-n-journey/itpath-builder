import { topics } from "@/data/static-content";
import { getTopicQuestionPool } from "@/data/topic-quizzes";
const STOP=new Set(["that","this","with","from","when","what","which","your","into","than","then","they","them","have","will","been","each","more","most","some","such","only","also","over","does","make","makes","used","using","there","these","those","their","about","after","before","other","would","could","should","while","where","every","still","being"]);
const tok=(s:string)=>new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>3&&!STOP.has(w)));
const ov=(a:Set<string>,b:Set<string>)=>{if(a.size<3||b.size<3)return 0;let i=0;for(const w of a)if(b.has(w))i++;return i/Math.min(a.size,b.size);};
let n=0;
for(const t of topics)for(const q of getTopicQuestionPool(t.id)){
  const c=q.correctAnswer[0]??""; const w=q.choices.filter(x=>x!==c);
  const hit=w.filter(x=>ov(tok(x),tok(c))>0.4);
  if(hit.length){n++;if(n<=15)console.log(`[${q.id}] ${q.prompt}\n  A: ${c}\n  ~: ${hit.join(" | ")}\n`);}
}
console.log("flagged",n);
