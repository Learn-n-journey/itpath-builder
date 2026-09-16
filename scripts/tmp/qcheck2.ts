import { topics } from "@/data/static-content";
import { getTopicQuestionPool, getSectionQuizQuestions } from "@/data/topic-quizzes";
const sizes = topics.map(t=>getTopicQuestionPool(t.id).length).sort((a,b)=>a-b);
console.log("pool sizes min/med/max", sizes[0], sizes[Math.floor(sizes.length/2)], sizes.at(-1));
const t = topics[0]!.id;
const sets = [0,1,2,3].map(i=>getSectionQuizQuestions(t,i).map(q=>q.id));
console.log(sets.map((s,i)=> i===0?20:s.filter(id=>sets[0]!.includes(id)).length));
