import { staticTopics } from "./data/static-content";
import { messerTopicVideos } from "./data/messer-topic-videos";
const missing = staticTopics.filter((t: any) => !(messerTopicVideos[t.id]?.length));
console.log("topics", staticTopics.length, "withVideos", staticTopics.length - missing.length);
console.log(missing.map((t: any) => `${t.id} :: ${t.title} :: ${t.certificationId ?? ""}`).join("\n"));
