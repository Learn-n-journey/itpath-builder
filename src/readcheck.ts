import { staticContent } from "./data/static-content";
const { topics } = staticContent as any;
for (const t of topics) console.log(t.id, "|", t.title);
