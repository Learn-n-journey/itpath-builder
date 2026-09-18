import { topics, resources } from "./data/static-content";
import { messerTopicVideos } from "./data/messer-topic-videos";
const byTopic = new Map<string, number>();
for (const r of resources as any[]) {
  const id = r.topicId ?? "";
  byTopic.set(id, (byTopic.get(id) ?? 0) + 1);
}
const noVideo = topics.filter((t: any) => !(messerTopicVideos[t.id]?.length));
const noRes = topics.filter((t: any) => !(byTopic.get(t.id)));
console.log("topics", topics.length, "noVideo", noVideo.length, "noResource", noRes.length);
console.log("NOVIDEO\n" + noVideo.map((t: any) => `${t.id} :: ${t.title} :: ${t.certificationId ?? ""}`).join("\n"));
console.log("NORES\n" + noRes.map((t: any) => t.id).join("\n"));
