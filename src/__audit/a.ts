import { deepLessons } from "../data/deep-lessons";
import { expansionTopics as allTopics } from "../data/curriculum";
const byId = new Map((allTopics as any[]).map((t:any)=>[t.id,t]));
const rows = (deepLessons as any[]).map((l) => ({
  topic: l.topicId,
  title: (byId.get(l.topicId)?.title) ?? "?",
  sections: l.sections.length,
  depth: l.depth ? 1 : 0,
  words: JSON.stringify(l).split(/\s+/).length,
})).sort((a,b)=>a.words-b.words);
console.log("lessons", rows.length, "topics", (allTopics as any[]).length);
rows.forEach(r=>console.log(r.words, "s"+r.sections, "d"+r.depth, r.title));
const missing = (allTopics as any[]).filter((t:any)=>!(deepLessons as any[]).some((l:any)=>l.topicId===t.id));
console.log("MISSING LESSONS:", missing.length, missing.map((t:any)=>t.title).join(" | "));
