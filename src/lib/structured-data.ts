/**
 * JSON-LD builders for the public pages.
 *
 * Search engines read these to understand the learning hierarchy: each
 * certificate is a course, each section guide is a learning resource inside
 * it, and the guide index is the list that ties them together.
 */
import { GUIDE_BASE_URL, certificationTitle, guideSlug } from "@/lib/public-guides";
import type { Topic } from "@/lib/app-data/types";
import { domain } from "@/domain/active";

const ORGANISATION = {
  "@type": "Organization",
  name: domain.appName,
  url: GUIDE_BASE_URL,
} as const;

export function guideUrl(topicId: string): string {
  return `${GUIDE_BASE_URL}/guides/${guideSlug(topicId)}`;
}

/** A certificate track, described as a course. */
export function courseJsonLd(certificationId: string, topics: Topic[]): Record<string, unknown> {
  const name = certificationTitle(certificationId);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${name} study track`,
    description: `Free ${name} study guides covering ${topics.length} sections, from the basics to exam level.`,
    provider: ORGANISATION,
    url: `${GUIDE_BASE_URL}/guides`,
    isAccessibleForFree: true,
    inLanguage: "en",
    teaches: topics.slice(0, 40).map((topic) => topic.title),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT2H",
    },
  };
}

/** One section guide, described as an article and a learning resource. */
export function guideJsonLd(topic: Topic, keyTerms: string[]): Array<Record<string, unknown>> {
  const url = guideUrl(topic.id);
  const title = `${topic.title} Study Guide for Beginners`;
  const subject = certificationTitle(topic.certificationId);

  return [
    {
      "@context": "https://schema.org",
      "@type": ["Article", "LearningResource"],
      headline: title,
      description: topic.summary,
      about: subject,
      educationalLevel: "Beginner",
      learningResourceType: "Study guide",
      teaches: keyTerms.slice(0, 12),
      inLanguage: "en",
      isAccessibleForFree: true,
      mainEntityOfPage: url,
      url,
      publisher: ORGANISATION,
      isPartOf: {
        "@type": "Course",
        name: `${subject} study track`,
        url: `${GUIDE_BASE_URL}/guides`,
        provider: ORGANISATION,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Study guides", item: `${GUIDE_BASE_URL}/guides` },
        { "@type": "ListItem", position: 2, name: subject, item: `${GUIDE_BASE_URL}/guides` },
        { "@type": "ListItem", position: 3, name: topic.title, item: url },
      ],
    },
  ];
}

/** The guide index: the full list of section guides. */
export function guideIndexJsonLd(topics: Topic[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${domain.field} study guides`,
    description: `Free study guides for ${topics.length} ${domain.field} ${domain.vocabulary.sections}, grouped by ${domain.vocabulary.qualification}.`,
    url: `${GUIDE_BASE_URL}/guides`,
    publisher: ORGANISATION,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: topics.length,
      itemListElement: topics.slice(0, 128).map((topic, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: topic.title,
        url: guideUrl(topic.id),
      })),
    },
  };
}
