import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import {
  GUIDE_BASE_URL,
  certificationTitle,
  deepLessonForTopic,
  guidePath,
  guideSearchReady,
  guideSlug,
  guideTopics,
  lessonForTopic,
  topicForSlug,
} from "@/lib/public-guides";
import { guideJsonLd } from "@/lib/structured-data";

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
    const subject = certificationTitle(topic.certificationId);
    const title = `${topic.title} Study Guide for Beginners`;
    const description = `${topic.summary} Free ${subject} study guide with key terms, examples and practical next steps.`;
    const searchReady = guideSearchReady(topic.id);
    return {
      meta: [
        { title: `${title} | IT PATH` },
        { name: "description", content: description },
        ...(!searchReady ? [{ name: "robots", content: "noindex,follow" }] : []),
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      // Article plus learning resource, tied to its certificate course, with
      // breadcrumbs so the hierarchy is explicit.
      scripts: guideJsonLd(
        topic,
        (lessonForTopic(topic.id)?.keyTerms ?? []).map((term) => term.term),
      ).map((entry) => ({ type: "application/ld+json", children: JSON.stringify(entry) })),
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
  const deepLesson = deepLessonForTopic(topic.id);
  const certificationTopics = guideTopics().filter(
    (candidate) => candidate.certificationId === topic.certificationId,
  );
  const currentIndex = certificationTopics.findIndex((candidate) => candidate.id === topic.id);
  const relatedTopics = [
    currentIndex > 0 ? certificationTopics[currentIndex - 1] : undefined,
    currentIndex >= 0 && currentIndex < certificationTopics.length - 1
      ? certificationTopics[currentIndex + 1]
      : undefined,
    ...certificationTopics.filter(
      (candidate) =>
        candidate.id !== topic.id &&
        candidate.id !== certificationTopics[currentIndex - 1]?.id &&
        candidate.id !== certificationTopics[currentIndex + 1]?.id,
    ),
  ]
    .filter((candidate): candidate is (typeof certificationTopics)[number] => Boolean(candidate))
    .slice(0, 4);

  return (
    <article className="space-y-6">
      <PageHeader
        title={topic.title}
        description={`Free ${certificationTitle(topic.certificationId)} study guide for beginners`}
      />

      <Panel title="What this covers">
        <p className="text-sm text-muted-foreground">{topic.summary}</p>
        {lesson?.definition ? (
          <p className="mt-3 text-sm text-muted-foreground">{lesson.definition}</p>
        ) : null}
      </Panel>

      {lesson?.body ? (
        <Panel title={lesson.title || `Understanding ${topic.title}`}>
          <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{lesson.body}</p>
        </Panel>
      ) : null}

      {deepLesson ? (
        <>
          <Panel title="In plain words">
            <p className="text-sm leading-7 text-muted-foreground">
              {deepLesson.plain?.plainIntro ?? deepLesson.intro}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              <span className="font-medium text-foreground">Where you meet it: </span>
              {deepLesson.whereYouMeetIt}
            </p>
          </Panel>

          {deepLesson.sections.map((section) => (
            <Panel key={section.id ?? section.heading} title={section.heading}>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Panel>
          ))}
        </>
      ) : null}

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

      {lesson?.summary ? (
        <Panel title="What to remember">
          <p className="text-sm leading-7 text-muted-foreground">{lesson.summary}</p>
        </Panel>
      ) : null}

      {lesson && lesson.nextSteps.length > 0 ? (
        <Panel title="Try it next">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {lesson.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Panel>
      ) : null}

      {relatedTopics.length > 0 ? (
        <Panel
          title="Related study guides"
          description={`Keep building through the ${certificationTitle(topic.certificationId)} track.`}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {relatedTopics.map((related) => (
              <li key={related.id}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: guidePath(related.id).replace("/guides/", "") }}
                  className="font-medium text-primary hover:underline"
                >
                  {related.title}
                </Link>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{related.summary}</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel
        title="Practise this section in IT PATH"
        description="Create a free account to work through the guided lesson, recall practice, labs, quizzes and the mastery check for this section."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/auth">Create a free account</Link>
          </Button>
          <Button asChild variant="outline">
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
