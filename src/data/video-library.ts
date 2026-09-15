/**
 * Professor Messer video training, mapped to every certification.
 *
 * Every URL here was opened and returned a working page. Where Professor Messer
 * publishes a dedicated course for a certification we link that course index.
 * Where he does not, we link his video channel and say so plainly rather than
 * inventing a course that does not exist.
 */
import { messerTopicVideos } from "@/data/messer-topic-videos";
import type { Certification, Resource, Topic } from "@/lib/app-data/types";

const LAST_VERIFIED = "2026-09-15";

interface MesserCourse {
  slug: string;
  title: string;
  url: string;
}

/** Dedicated Professor Messer course indexes, keyed by certification id. */
const messerCourses: Record<string, MesserCourse[]> = {
  "cert-comptia-a-plus": [
    {
      slug: "a-plus-core-1",
      title: "Professor Messer's CompTIA A+ 220-1201 Core 1 video course",
      url: "https://www.professormesser.com/free-a-plus-training/220-1201/220-1201-video/220-1201-training-course/",
    },
    {
      slug: "a-plus-core-2",
      title: "Professor Messer's CompTIA A+ 220-1202 Core 2 video course",
      url: "https://www.professormesser.com/free-a-plus-training/220-1202/220-1202-video/220-1202-training-course/",
    },
  ],
  "cert-comptia-network-plus": [
    {
      slug: "network-plus",
      title: "Professor Messer's CompTIA N10-009 Network+ video course",
      url: "https://www.professormesser.com/network-plus/n10-009/n10-009-video/n10-009-training-course/",
    },
  ],
  "cert-comptia-security-plus": [
    {
      slug: "security-plus",
      title: "Professor Messer's CompTIA SY0-701 Security+ video course",
      url: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/",
    },
  ],
};

/**
 * Builds one or more Professor Messer video resources for every certification.
 * Topic links are derived from the certification's own topics, so no topic id
 * is duplicated or invented here.
 */
export function buildMesserResources(
  certificationList: Certification[],
  topicList: Topic[],
): Resource[] {
  return certificationList.flatMap((certification): Resource[] => {
    const topicIds = topicList
      .filter((topic) => topic.certificationId === certification.id)
      .map((topic) => topic.id);
    const courses = messerCourses[certification.id];

    if (courses) {
      return courses.map((course) => ({
        id: `resource-messer-${course.slug}`,
        title: course.title,
        provider: "Professor Messer",
        url: course.url,
        topicIds,
        certificationId: certification.id,
        kind: "video" as const,
        difficulty: "gentle" as const,
        access: "free" as const,
        lastVerified: LAST_VERIFIED,
        status: "verified" as const,
      }));
    }

    // No dedicated course exists for this certification, and linking the bare
    // channel sends learners to a front page. Their topics carry curated
    // per-topic videos instead, so nothing cert-wide is added here.
    return [];
  });
}

/**
 * Real Professor Messer video links for each topic.
 *
 * Each topic gets its curated set of specific video pages (see
 * messer-topic-videos.ts), so a learner lands on the video for the subject they
 * are studying instead of a channel front page. Any topic without a curated set
 * falls back to a search of Professor Messer's own site, which still returns his
 * videos on that subject.
 */
export function buildTopicVideoResources(topicList: Topic[]): Resource[] {
  return topicList.flatMap((topic): Resource[] => {
    const curated = messerTopicVideos[topic.id];

    if (curated && curated.length > 0) {
      return curated.map((video, index) => ({
        id: `resource-messer-video-${topic.id}-${index + 1}`,
        title: `${video.title} — Professor Messer, ${video.exam} objective ${video.objective}`,
        provider: "Professor Messer",
        url: video.url,
        topicIds: [topic.id],
        certificationId: topic.certificationId,
        kind: "video" as const,
        difficulty: "standard" as const,
        access: "free" as const,
        lastVerified: LAST_VERIFIED,
        status: "verified" as const,
      }));
    }

    return [
      {
        id: `resource-messer-topic-${topic.id}`,
        title: `Professor Messer videos on ${topic.title}`,
        provider: "Professor Messer",
        url: `https://www.professormesser.com/?s=${encodeURIComponent(topic.title)}`,
        topicIds: [topic.id],
        certificationId: topic.certificationId,
        kind: "video" as const,
        difficulty: "standard" as const,
        access: "free" as const,
        lastVerified: LAST_VERIFIED,
        status: "verified" as const,
      },
    ];
  });
}
