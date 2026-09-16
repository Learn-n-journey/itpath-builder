import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { measureGuideBySlug, measureGuides } from "@/lib/measure-guides";

export const Route = createFileRoute("/measures/$measure")({
  staticData: { sitemap: true },
  loader: ({ params }) => {
    const guide = measureGuideBySlug(params.measure);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Measure not found | IT PATH" }, { name: "robots", content: "noindex" }] };
    }
    const { guide } = loaderData;
    const title = `${guide.label}: how to raise it | IT PATH`;
    return {
      meta: [
        { title },
        { name: "description", content: guide.meaning },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { property: "og:title", content: title },
        { property: "og:description", content: guide.meaning },
      ],
    };
  },
  component: MeasurePage,
});

function MeasurePage() {
  const { guide } = Route.useLoaderData();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link to="/progress">
          <ArrowLeft className="size-4" /> Back to progress
        </Link>
      </Button>

      <PageHeader title={guide.label} description={guide.meaning} />

      <Panel className="mt-6" title="What counts towards it">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {guide.counts.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4" title="How to get the number up">
        <ul className="divide-y divide-border">
          {guide.raise.map((step) => (
            <li key={step.text}>
              <Link
                to={step.to}
                className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-primary"
              >
                <span>{step.text}</span>
                <ArrowRight className="size-4 shrink-0 opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4" title="Worth knowing">
        <p className="text-sm text-muted-foreground">{guide.note}</p>
      </Panel>

      <Panel className="mt-4" title="The other measures">
        <div className="flex flex-wrap gap-2">
          {measureGuides
            .filter((other) => other.slug !== guide.slug)
            .map((other) => (
              <Button key={other.slug} asChild variant="outline" size="sm">
                <Link to="/measures/$measure" params={{ measure: other.slug }}>
                  {other.label}
                </Link>
              </Button>
            ))}
        </div>
      </Panel>
    </div>
  );
}
