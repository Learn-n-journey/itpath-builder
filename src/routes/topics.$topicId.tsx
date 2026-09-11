import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { certifications, lessons, topics } from "@/data/static-content";
import { getCertification, getTopic } from "@/lib/app-data/selectors";

export const Route = createFileRoute("/topics/$topicId")({
  head: ({ params }) => {
    const topic = getTopic(params.topicId);
    const title = topic ? `${topic.title} — IT PATH` : "Topic not found — IT PATH";
    const description = topic?.summary ?? "The requested IT PATH curriculum topic could not be found.";
    return {
      meta: [
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: TopicPage,
});

const difficultyLabels = {
  gentle: "Beginner",
  standard: "Intermediate",
  challenging: "Advanced",
} as const;

function TopicPage() {
  const { topicId } = Route.useParams();
  const topic = getTopic(topicId);

  if (!topic) {
    return (
      <>
        <PageHeader title="Topic not found" description="This curriculum topic does not exist." />
        <EmptyState
          icon={BookOpen}
          title="No topic at this address"
          body="Return to My Path to choose one of the available curriculum topics."
        >
          <Button asChild>
            <Link to="/my-path">Return to My Path</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const topicLessons = lessons.filter((lesson) => lesson.topicId === topic.id);
  const certification = getCertification(topic.certificationId);
  const prerequisites = topic.prerequisiteTopicIds
    .map((id) => topics.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate !== undefined);

  return (
    <article>
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3">
        <Link to="/my-path">
          <ArrowLeft aria-hidden />
          My Path
        </Link>
      </Button>

      <PageHeader title={topic.title} description={topic.summary} />

      <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {[
          ["Certification", certification?.title ?? "General IT"],
          ["Schedule", `Year ${topic.year} · Month ${topic.month} · Week ${topic.week}`],
          ["Difficulty", difficultyLabels[topic.difficulty]],
          ["Study time", `${topic.estimatedMinutes} min`],
          ["Status", "Not started"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 bg-card p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="min-w-0 space-y-4">
          {topicLessons.map((lesson) => (
            <Panel key={lesson.id} title={lesson.title} description={lesson.body}>
              <div className="space-y-7 text-sm leading-7 text-muted-foreground">
                <section>
                  <h2 className="mb-2 text-base font-semibold text-foreground">Core concept</h2>
                  <p>{lesson.definition}</p>
                </section>

                <section>
                  <h2 className="mb-2 text-base font-semibold text-foreground">Why it matters</h2>
                  <p>{lesson.whyItMatters}</p>
                </section>

                <section>
                  <h2 className="mb-3 text-base font-semibold text-foreground">Key terms</h2>
                  <dl className="divide-y divide-border border-y border-border">
                    {lesson.keyTerms.map((item) => (
                      <div key={item.term} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                        <dt className="font-medium text-foreground">{item.term}</dt>
                        <dd>{item.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section>
                  <h2 className="mb-2 text-base font-semibold text-foreground">Real-world examples</h2>
                  <ul className="space-y-2">
                    {lesson.realWorldExamples.map((example) => (
                      <li key={example} className="flex gap-3">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="mb-2 text-base font-semibold text-foreground">Common misconceptions</h2>
                  <ul className="space-y-2">
                    {lesson.commonMisconceptions.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="font-mono text-primary" aria-hidden>—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="border-t border-border pt-6">
                  <h2 className="mb-2 text-base font-semibold text-foreground">Summary</h2>
                  <p>{lesson.summary}</p>
                </section>
              </div>
            </Panel>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel title="Learning objectives">
            <ul className="space-y-3">
              {topic.learningObjectives.map((objective) => (
                <li key={objective} className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Prerequisites">
            {prerequisites.length === 0 ? (
              <p className="text-sm text-muted-foreground">None. This topic starts from first principles.</p>
            ) : (
              <ul className="space-y-2">
                {prerequisites.map((prerequisite) => (
                  <li key={prerequisite.id}>
                    <Link
                      to="/topics/$topicId"
                      params={{ topicId: prerequisite.id }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {prerequisite.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {topicLessons.map((lesson) => (
            <Panel key={`${lesson.id}-next`} title="Next steps">
              <ol className="space-y-3 text-sm text-muted-foreground">
                {lesson.nextSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ))}
        </aside>
      </div>
    </article>
  );
}