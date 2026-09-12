import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { certifications, topics } from "@/data/static-content";
import { adaptivePath, focusedTopicsFirst } from "@/lib/adaptive-path";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Learn — IT PATH" },
      { name: "description", content: "Lessons and your personal study notes in one place." },
      { property: "og:title", content: "Learn — IT PATH" },
      { property: "og:description", content: "Work through lessons and keep your own notes." },
    ],
  }),
  component: Learn,
});

function Learn() {
  const { user } = useAppState();
  const [query, setQuery] = useState("");
  const path = useMemo(() => adaptivePath(user), [user]);
  const filteredTopics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ordered = focusedTopicsFirst(user);
    if (!needle) return ordered;
    return ordered.filter((topic) => {
      const certification = certifications.find((item) => item.id === topic.certificationId);
      return [topic.title, topic.summary, certification?.title ?? "", ...topic.learningObjectives]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, user]);

  return (
    <>
      <PageHeader
        title="Learn"
        description="Choose a topic, build recall, apply the knowledge, and explain your reasoning."
      />
      {path.recommendedTopic ? (
        <Panel className="mb-4" title={`${path.certification.title}: your recommended start`} description={`${path.startLabel} based on your experience setting.`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{path.recommendedTopic.title}</p>
            <Button asChild size="sm"><Link to="/topics/$topicId" params={{ topicId: path.recommendedTopic.id }}>Start here <ArrowRight /></Link></Button>
          </div>
        </Panel>
      ) : null}
      <Panel title="Available topics" description={`${filteredTopics.length} of ${topics.length} topics shown`}>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search topics" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, objectives, or certifications" className="pl-9 pr-10" />
          {query ? <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}><X className="size-4" /></Button> : null}
        </div>
        {filteredTopics.length === 0 ? (
          <EmptyState icon={Search} title="No topics found" body={`No available topic matches “${query}”.`}><Button variant="outline" onClick={() => setQuery("")}>Clear search</Button></EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredTopics.map((topic) => {
              const certification = certifications.find((item) => item.id === topic.certificationId);
              return <Link key={topic.id} to="/topics/$topicId" params={{ topicId: topic.id }} className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-4"><BookOpen className="mt-0.5 size-5 shrink-0 text-primary" /><ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" /></div>
                <h2 className="mt-4 font-display text-base font-semibold">{topic.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{topic.summary}</p>
                <p className="mt-4 text-xs font-medium text-muted-foreground">{certification?.title ?? "General IT"}{topic.id === path.recommendedTopic?.id ? " · Recommended start" : ""}</p>
              </Link>;
            })}
          </div>
        )}
      </Panel>
    </>
  );
}
