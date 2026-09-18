import { staticContent } from "./data/static-content";
import { messerTopicVideos } from "./data/messer-topic-videos";
const { topics } = staticContent as any;
let cur = 0; const miss: string[] = [];
for (const t of topics) { if (messerTopicVideos[t.id]?.length) cur += 1; else miss.push(t.id); }
console.log("topics", topics.length, "curated", cur, "fallback", miss.length);
console.log(miss.join("\n"));
