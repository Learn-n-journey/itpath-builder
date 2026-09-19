import { autoRepairPackage as p } from "@/content/packs/auto-repair/1.0.0/package";
import { questionIssues } from "@/lib/question-quality";
const bad:string[]=[];
for (const q of p.questions){
  const issues = questionIssues({id:q.id,topicId:q.sectionId,type:"multiple_choice",prompt:q.prompt,choices:q.choices,correctAnswer:[q.choices[q.answerIndex]??""],explanation:q.explanation,difficulty:"core"} as never);
  if(issues.length) bad.push(`${q.kind} ${q.id}: ${issues.join("; ")}`);
}
console.log("questions",p.questions.length,"bad",bad.length);
console.log(bad.slice(0,10).join("\n"));
console.log("sources", JSON.stringify(p.sources.slice(0,3),null,1));
console.log("assessments", JSON.stringify(p.assessments,null,1).slice(0,900));
console.log("sectionObjectives", p.sections.slice(0,2).map(s=>s.objectiveIds));
console.log("lessonLens", p.lessons.map(l=>l.body.length).slice(0,6));
