import { certifications, lessons, topics } from "@/data/static-content";
import type { Lesson, Topic } from "@/lib/app-data/types";

/** Public, crawlable overview pages built from the static curriculum. */
export const GUIDE_BASE_URL = "https://it-path.net";

export function guideSlug(topicId: string): string {
  return topicId.replace(/^topic-/, "");
}

export function guideTopics(): Topic[] {
  return topics;
}

export function topicForSlug(slug: string): Topic | undefined {
  return topics.find((topic) => guideSlug(topic.id) === slug);
}

export function lessonForTopic(topicId: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.topicId === topicId);
}

export function certificationTitle(certificationId: string): string {
  return certifications.find((cert) => cert.id === certificationId)?.title ?? "IT PATH";
}

export function guidePath(topicId: string): string {
  return `/guides/${guideSlug(topicId)}`;
}
