import { staticContent } from "./data/static-content";
const { topics, resources } = staticContent as any;
const counts = new Map<string, any[]>();
for (const r of resources) for (const id of r.topicIds ?? []) {
  const list = counts.get(id) ?? []; list.push(r); counts.set(id, list);
}
let noRead = 0, noVid = 0, genericRead = 0;
for (const t of topics) {
  const list = counts.get(t.id) ?? [];
  const reads = list.filter((r: any) => r.kind !== "video");
  const vids = list.filter((r: any) => r.kind === "video");
  if (!reads.length) { noRead += 1; console.log("NOREAD", t.id, t.certificationId); }
  if (!vids.length) noVid += 1;
}
console.log("topics", topics.length, "noRead", noRead, "noVideo", noVid);
