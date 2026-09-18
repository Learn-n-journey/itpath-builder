/**
 * Every outside link the curriculum points learners at.
 *
 * The background crawler works from this list, so a link that stops working
 * is found by the app before a learner clicks it.
 */
import { messerTopicVideos } from "@/data/messer-topic-videos";
import { readingSources } from "@/data/topic-reading";

export interface ExternalLink {
  url: string;
  kind: "video" | "reading";
  label: string;
}

export function externalLinks(): ExternalLink[] {
  const byUrl = new Map<string, ExternalLink>();

  for (const [topicId, videos] of Object.entries(messerTopicVideos)) {
    for (const video of videos) {
      if (!byUrl.has(video.url)) {
        byUrl.set(video.url, { url: video.url, kind: "video", label: `${video.title} (${topicId})` });
      }
    }
  }

  for (const source of Object.values(readingSources)) {
    if (!byUrl.has(source.url)) {
      byUrl.set(source.url, { url: source.url, kind: "reading", label: `${source.title} (${source.provider})` });
    }
  }

  return [...byUrl.values()];
}
