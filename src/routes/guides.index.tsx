import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { certifications } from "@/data/static-content";
import { GUIDE_BASE_URL, guidePath, guideTopics } from "@/lib/public-guides";

const TITLE = "IT and Cybersecurity Study Guides";
const DESCRIPTION =
  "Free plain-English study guides for every CompTIA section covered by IT PATH, from computer hardware basics to advanced security.";
const URL = `${GUIDE_BASE_URL}/guides`;

export const Route = createFileRoute("/guides/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: `${TITLE} | IT PATH` },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      // The full list of guides, plus one course entry per certificate, so a
      // crawler can see how the sections hang together.
      { type: "application/ld+json", children: JSON.stringify(guideIndexJsonLd(guideTopics())) },
      ...certifications
        .map((cert) => guideTopics().filter((topic) => topic.certificationId === cert.id))
        .filter((certTopics) => certTopics.length > 0)
        .map((certTopics) => ({
          type: "application/ld+json",
          children: JSON.stringify(courseJsonLd(certTopics[0]!.certificationId, certTopics)),
        })),
    ],
  }),
  component: GuidesIndexPage,
});

function GuidesIndexPage() {
  const topics = guideTopics();

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/auth">Create a free account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/practice-tests/$certId" params={{ certId: "cert-comptia-a-plus" }}>
            Free practice tests
          </Link>
        </Button>
      </div>
      <div className="space-y-6">
        {certifications.map((cert) => {
          const certTopics = topics.filter((topic) => topic.certificationId === cert.id);
          if (certTopics.length === 0) return null;
          return (
            <Panel key={cert.id} title={cert.title} description={cert.description ?? ""}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {certTopics.map((topic) => (
                  <li key={topic.id}>
                    <Link
                      to="/guides/$slug"
                      params={{ slug: guidePath(topic.id).replace("/guides/", "") }}
                      className="text-sm text-primary hover:underline"
                    >
                      {topic.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
