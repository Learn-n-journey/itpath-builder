import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { guidePath } from "@/lib/public-guides";
import { courseJsonLd } from "@/lib/structured-data";
import {
  TRACK_BASE_URL,
  certificationForSlug,
  hasPracticeTest,
  trackDomains,
  trackTopics,
  trackUrl,
} from "@/lib/tracks";

export const Route = createFileRoute("/tracks/$slug")({
  staticData: { sitemap: true },
  head: ({ params }) => {
    const cert = certificationForSlug(params.slug);
    if (!cert) {
      return {
        meta: [
          { title: "Track not found | IT PATH" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const sections = trackTopics(cert.id);
    const title = `${cert.title} study track${cert.code ? ` (${cert.code})` : ""}`;
    const description = `Free ${cert.title} study track: ${sections.length} sections with plain-English guides, practice questions and mastery checks, from the basics to exam level.`;
    const url = trackUrl(cert.id);
    return {
      meta: [
        { title: `${title} | IT PATH` },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(courseJsonLd(cert.id, sections)) },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "IT PATH", item: `${TRACK_BASE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Certification tracks", item: `${TRACK_BASE_URL}/tracks` },
              { "@type": "ListItem", position: 3, name: title, item: url },
            ],
          }),
        },
      ],
    };
  },
  loader: ({ params }) => {
    if (!certificationForSlug(params.slug)) throw notFound();
    return null;
  },
  notFoundComponent: TrackNotFound,
  errorComponent: TrackNotFound,
  component: TrackPage,
});

function TrackNotFound() {
  return (
    <>
      <PageHeader
        title="That track does not exist"
        description="The certification you asked for is not one of the tracks taught here."
      />
      <Button asChild>
        <Link to="/tracks">See every track</Link>
      </Button>
    </>
  );
}

function TrackPage() {
  const { slug } = Route.useParams();
  const cert = certificationForSlug(slug);
  if (!cert) return <TrackNotFound />;

  const sections = trackTopics(cert.id);
  const domains = trackDomains(cert.id);

  return (
    <>
      <PageHeader
        title={`${cert.title} study track`}
        description={
          cert.description ??
          `A complete, free route through ${cert.title}, section by section, written in plain English.`
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/auth">Start free</Link>
        </Button>
        {hasPracticeTest(cert.id) ? (
          <Button asChild variant="outline">
            <Link to="/practice-tests/$certId" params={{ certId: cert.id }}>
              Free practice test
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost">
          <Link to="/guides">All study guides</Link>
        </Button>
      </div>

      <Panel title="What this exam is" className="mb-4">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Provider</dt>
            <dd className="mt-1 text-sm font-medium">{cert.provider}</dd>
          </div>
          {cert.code ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Exam code</dt>
              <dd className="mt-1 text-sm font-medium">{cert.code}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sections here</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">{sections.length}</dd>
          </div>
        </dl>
      </Panel>

      {domains.length > 0 ? (
        <Panel
          title="Exam domains covered"
          description="The objective areas this track maps its sections to."
          className="mb-4"
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {domains.map((entry) => (
              <li key={entry.domain} className="text-sm">
                {entry.domain}
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                  {entry.count} objective{entry.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel
        title="Every section, in order"
        description="Each one has a free written guide. The lessons, quizzes, labs and mastery checks are in the app."
        className="mb-4"
      >
        <ol className="grid gap-2 sm:grid-cols-2">
          {sections.map((topic, index) => (
            <li key={topic.id} className="text-sm">
              <span className="mr-2 text-xs text-muted-foreground tabular-nums">{index + 1}.</span>
              <Link
                to="/guides/$slug"
                params={{ slug: guidePath(topic.id).replace("/guides/", "") }}
                className="text-primary hover:underline"
              >
                {topic.title}
              </Link>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="How the studying works" className="mb-4">
        <ul className="grid gap-2 text-sm text-muted-foreground">
          <li>Read the section, then answer from memory with nothing in front of you.</li>
          <li>Apply it to a described situation and work a fault through to its cause.</li>
          <li>Explain it back in your own words, then sit the section quiz.</li>
          <li>A delayed check the next day proves it stuck before the next section opens.</li>
          <li>Flashcards and spaced review bring the weak parts back until they hold.</li>
        </ul>
      </Panel>

      <Panel
        title="Ready to work through it?"
        description="An account is free, and your progress is only ever built from work you actually do."
      >
        <Button asChild>
          <Link to="/auth">Create a free account</Link>
        </Button>
      </Panel>
    </>
  );
}
