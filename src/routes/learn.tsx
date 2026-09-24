import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { useMemo } from "react";

import { EmptyState, LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { topics } from "@/data/static-content";
import { adaptivePath, focusedTopicsFirst } from "@/lib/adaptive-path";
import { useAppState } from "@/state/app-state";
import { ContentRow, SectionHeading } from "@/components/learner-ui";
import { topicScopeProgress } from "@/lib/scope-progress";
import { isStringPreference, useUiPreference } from "@/hooks/use-ui-preference";

export const Route = createFileRoute("/learn")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Learn | IT PATH" },
      { name: "description", content: "Lessons and your personal study notes in one place." },
      { property: "og:title", content: "Learn | IT PATH" },
      { property: "og:description", content: "Work through lessons and keep your own notes." },
    ],
  }),
  component: Learn,
});

function Learn() {
  const { user, hydrated } = useAppState();
  const [query, setQuery] = useUiPreference("learn.search", "", isStringPreference);
  const path = useMemo(() => adaptivePath(user), [user]);
  const filteredTopics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ordered = focusedTopicsFirst(user);
    if (!needle) return ordered;
    return ordered.filter((topic) => {
      return [topic.title, topic.summary, ...topic.learningObjectives]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, user]);

  if (!hydrated) return <LearnerPageSkeleton rows={7} metrics={3} />;

  return (
    <>
      <PageHeader
        title="Learn"
        description="Choose a topic, build understanding, and apply the knowledge."
      />
      {path.recommendedTopic ? (
        <Panel className="mb-4 border border-primary/45 bg-card px-3 pb-3 pt-3" title="Recommended next">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{path.recommendedTopic.title}</p><p className="truncate text-xs text-muted-foreground">Recommended next topic</p></div>
            <Button asChild size="sm"><Link to="/topics/$topicId" params={{ topicId: path.recommendedTopic.id }}>Start <ArrowRight /></Link></Button>
          </div>
        </Panel>
      ) : null}
      <section>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search topics" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics or objectives" className="pl-9 pr-10" />
          {query ? <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}><X className="size-4" /></Button> : null}
        </div>
        <SectionHeading title={`${filteredTopics.length} topics`} meta="Recommended first" className="mb-1" />
        {filteredTopics.length === 0 ? (
          <EmptyState icon={Search} title="No topics found" body={`No available topic matches “${query}”.`}><Button variant="outline" onClick={() => setQuery("")}>Clear search</Button></EmptyState>
        ) : (
          <div className="divide-y divide-border/70">
            {filteredTopics.map((topic) => {
                    const progress = topicScopeProgress(user, topic.id).overall;
              return <Link key={topic.id} to="/topics/$topicId" params={{ topicId: topic.id }} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ContentRow icon={BookOpen} eyebrow={topic.id === path.recommendedTopic?.id ? "Recommended" : undefined} title={topic.title} description={topic.summary} metadata={topic.difficulty === "gentle" ? "Foundation" : topic.difficulty === "standard" ? "Core" : "Advanced"} progress={progress} /></Link>;
            })}
          </div>
        )}
      </section>
    </>
  );
}
