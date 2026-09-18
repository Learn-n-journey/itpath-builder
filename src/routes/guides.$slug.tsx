import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import {
  GUIDE_BASE_URL,
  certificationTitle,
  guideSlug,
  lessonForTopic,
  topicForSlug,
} from "@/lib/public-guides";

export const Route = createFileRoute("/guides/$slug")({
  staticData: { sitemap: true },
  head: ({ params }) => {
    const topic = topicForSlug(params.slug);
    if (!topic) {
      return {
        meta: [{ title: "Guide not found | IT PATH" }, { name: "robots", content: "noindex" }],
      };
    }
    const url = `${GUIDE_BASE_URL}/guides/${guideSlug(topic.id)}`;
    const title = `${topic.title}: a beginner's guide`;
    const description = topic.summary;
    return {
      meta: [
        { title: `${title} | IT PATH` },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            description,
            about: certificationTitle(topic.certificationId),
            mainEntityOfPage: url,
            publisher: { "@type": "Organization", name: "IT PATH", url: GUIDE_BASE_URL },
          }),
        },
      ],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { slug } = Route.useParams();
  const topic = topicForSlug(slug);

  if (!topic) {
    return (
      <>
        <PageHeader title="Guide not found" description="This study guide does not exist." />
        <EmptyState
          icon={BookOpen}
          title="No guide at this address"
          body="Browse the full list of study guides instead."
        >
          <Button asChild>
            <Link to="/guides">All study guides</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const lesson = lessonForTopic(topic.id);

  return (
    <article className="space-y-6">
      <PageHeader
        title={topic.title}
        description={`${certificationTitle(topic.certificationId)} study guide`}
      />

      <Panel title="What this covers">
        <p className="text-sm text-muted-foreground">{topic.summary}</p>
        {lesson?.definition ? (
          <p className="mt-3 text-sm text-muted-foreground">{lesson.definition}</p>
        ) : null}
      </Panel>

      {topic.learningObjectives.length > 0 ? (
        <Panel title="What you will be able to do">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {topic.learningObjectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {lesson?.whyItMatters ? (
        <Panel title="Why it matters on the job">
          <p className="text-sm text-muted-foreground">{lesson.whyItMatters}</p>
        </Panel>
      ) : null}

      {lesson && lesson.keyTerms.length > 0 ? (
        <Panel title="Key terms">
          <dl className="space-y-2 text-sm">
            {lesson.keyTerms.map((term) => (
              <div key={term.term}>
                <dt className="font-medium text-foreground">{term.term}</dt>
                <dd className="text-muted-foreground">{term.meaning}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      ) : null}

      {lesson && lesson.realWorldExamples.length > 0 ? (
        <Panel title="Real examples">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {lesson.realWorldExamples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {lesson && lesson.commonMisconceptions.length > 0 ? (
        <Panel title="Common mix-ups">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {lesson.commonMisconceptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel
        title="Study this section in IT PATH"
        description="Lessons, recall practice, quizzes and mastery checks for this section are part of the full path."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/topics/$topicId" params={{ topicId: topic.id }}>
              Open the full section
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/guides">All study guides</Link>
          </Button>
        </div>
      </Panel>
    </article>
  );
}
