import { certifications, topics } from "@/data/static-content";
import { certificationTopics } from "@/lib/cert-path";
import { deepLessons } from "@/data/deep-lessons";
const withDeep = new Set(Object.keys(deepLessons as any));
for (const c of certifications) {
  const t = certificationTopics(c.id);
  const deep = t.filter(x => withDeep.has(x.id));
  console.log(c.title.padEnd(22), "topics", String(t.length).padStart(2), "deep", String(deep.length).padStart(2), "|", t.map(x=>x.title).join("; ").slice(0,140));
}
console.log("total topics", topics.length, "deep", withDeep.size);
