import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { certifications, topics } from "@/data/static-content";
import { stageLabels, type StageId } from "@/lib/cert-path";
import type { Difficulty } from "@/lib/app-data/types";

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

const difficultyToStage: Record<Difficulty, StageId> = {
  gentle: "foundation",
  standard: "core",
  challenging: "advanced",
};

function Learn() {
  const [query, setQuery] = useState("");
  const filteredTopics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return topics;
    return topics.filter((topic) => {
      const certification = certifications.find((item) => item.id === topic.certificationId);
      return [topic.title, topic.summary, certification?.title ?? "", ...topic.learningObjectives]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query]);

  return (
    <>
      <PageHeader
        title="Learn"
        description="Choose a topic, build recall, apply the knowledge, and explain your reasoning."
      />
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
                <p className="mt-4 text-xs font-medium text-muted-foreground">{certification?.title ?? "General IT"} · {stageLabels[difficultyToStage[topic.difficulty]]}</p>
              </Link>;
            })}
          </div>
        )}
      </Panel>
    </>
  );
}
