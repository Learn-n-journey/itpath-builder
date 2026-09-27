import { certifications, lessons, topics } from "@/data/static-content";
import { getDeepLesson } from "@/data/deep-lessons";
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

/** Rich, topic-specific teaching already used by the learner experience. */
export function deepLessonForTopic(topicId: string) {
  return getDeepLesson(topicId);
}


function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Search-quality gate for public guides. A page must contain enough genuinely
 * topic-specific teaching to deserve a sitemap/indexing signal. This does not
 * hide the guide from learners; it only keeps thin pages out of search until
 * their authored lesson is ready.
 */
export function guideSearchReady(topicId: string): boolean {
  const topic = topics.find((candidate) => candidate.id === topicId);
  const lesson = lessonForTopic(topicId);
  const deep = deepLessonForTopic(topicId);
  if (!topic || !lesson) return false;

  const deepText = deep
    ? [
        deep.intro,
        deep.whereYouMeetIt,
        deep.plain?.plainIntro ?? "",
        ...deep.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
          ...(section.bullets ?? []),
        ]),
      ].join(" ")
    : "";

  const authoredText = [
    topic.summary,
    ...topic.learningObjectives,
    lesson.body,
    lesson.definition,
    lesson.whyItMatters,
    lesson.summary,
    ...lesson.keyTerms.flatMap((term) => [term.term, term.meaning]),
    ...lesson.realWorldExamples,
    ...lesson.commonMisconceptions,
    ...lesson.nextSteps,
    deepText,
  ].join(" ");

  const hasStructure =
    topic.summary.trim().length >= 40 &&
    topic.learningObjectives.length >= 1 &&
    lesson.definition.trim().length >= 40 &&
    lesson.whyItMatters.trim().length >= 40;

  return hasStructure && words(authoredText) >= 450;
}

export function certificationTitle(certificationId: string): string {
  return certifications.find((cert) => cert.id === certificationId)?.title ?? "IT PATH";
}

export function guidePath(topicId: string): string {
  return `/guides/${guideSlug(topicId)}`;
}
