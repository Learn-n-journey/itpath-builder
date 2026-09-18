import { staticContent } from "./data/static-content";
import { readingForTopic } from "./data/topic-reading";
const { topics } = staticContent as any;
for (const t of topics) console.log(t.title, "=>", readingForTopic(t).map((r: any) => r.key).join(", "));
