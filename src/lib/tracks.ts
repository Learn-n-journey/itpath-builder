/**
 * Public certification track pages.
 *
 * One page per certificate, built from the same curriculum the app teaches.
 * Everything on them is real: the sections that exist, the exam objectives on
 * record and the free guides behind them.
 */
import { certificationObjectives, certifications, topics } from "@/data/static-content";
import type { Certification, CertificationObjective, Topic } from "@/lib/app-data/types";

export const TRACK_BASE_URL = "https://it-path.net";

export function trackSlug(certificationId: string): string {
  return certificationId.replace(/^cert-/, "");
}

export function trackUrl(certificationId: string): string {
  return `${TRACK_BASE_URL}/tracks/${trackSlug(certificationId)}`;
}

export function certificationForSlug(slug: string): Certification | undefined {
  return certifications.find((cert) => trackSlug(cert.id) === slug);
}

export function trackTopics(certificationId: string): Topic[] {
  return topics
    .filter((topic) => topic.certificationId === certificationId)
    .slice()
    .sort((a, b) => a.month - b.month || a.week - b.week);
}

/** Exam domains on record for this certificate, with how many objectives each holds. */
export function trackDomains(certificationId: string): Array<{ domain: string; count: number }> {
  const counts = new Map<string, number>();
  for (const objective of certificationObjectives as CertificationObjective[]) {
    if (objective.certificationId !== certificationId) continue;
    const domain = objective.domain?.trim();
    if (!domain) continue;
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

/** Certificates with enough material to publish a track page. */
export function publishedTracks(): Certification[] {
  return certifications.filter((cert) => trackTopics(cert.id).length > 0);
}

/** Certificates that also have a free practice test page. */
/**
 * Practice tests exist for any qualification track the live subject publishes
 * objectives for, so a new subject gets them without a code change.
 */
export function hasPracticeTest(certificationId: string): boolean {
  return certificationObjectives.some((objective) => objective.certificationId === certificationId);
}

/** The qualification the "free practice tests" links point at: the first one. */
export function firstPracticeTestCertId(): string {
  return certifications.find((item) => hasPracticeTest(item.id))?.id ?? certifications[0]?.id ?? "";
}
