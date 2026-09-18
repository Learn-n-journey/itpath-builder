import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { TRACK_BASE_URL, publishedTracks, trackSlug, trackTopics } from "@/lib/tracks";

const TITLE = "CompTIA certification study tracks";
const DESCRIPTION =
  "Free study tracks for every CompTIA certification taught by IT PATH, each with its own sections, written guides and practice.";
const URL = `${TRACK_BASE_URL}/tracks`;

export const Route = createFileRoute("/tracks/")({
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
  }),
  component: TracksIndex,
});

function TracksIndex() {
  const tracks = publishedTracks();

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/auth">Start free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/guides">All study guides</Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tracks.map((cert) => (
          <Panel
            key={cert.id}
            title={cert.title}
            description={cert.description ?? `${trackTopics(cert.id).length} sections.`}
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {trackTopics(cert.id).length} sections
              {cert.code ? ` · exam ${cert.code}` : ""}
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/tracks/$slug" params={{ slug: trackSlug(cert.id) }}>
                Open the track
              </Link>
            </Button>
          </Panel>
        ))}
      </div>
    </>
  );
}
