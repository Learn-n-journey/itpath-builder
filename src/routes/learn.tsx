import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Compass, ExternalLink, Library, Newspaper, Search, Video, X } from "lucide-react";
import { useMemo } from "react";

import { EmptyState, LearnerPageSkeleton, PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resources, topics } from "@/data/static-content";
import { isStringPreference, useUiPreference } from "@/hooks/use-ui-preference";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/learn")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Learn | IT PATH" },
      { name: "description", content: "Explore technology topics, verified sources, videos and news without changing your curriculum progress." },
      { property: "og:title", content: "Learn | IT PATH" },
      { property: "og:description", content: "A free-exploration space for curious learners." },
    ],
  }),
  component: Learn,
});

function Learn() {
  const { user, hydrated } = useAppState();
  const [query, setQuery] = useUiPreference("learn.search", "", isStringPreference);
  const needle = query.trim().toLowerCase();

  const currentTopicId = useMemo(() => {
    const progress = Object.values(user.topicProgress).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const reading = Object.values(user.readingPositions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return reading && (!progress || reading.updatedAt > progress.updatedAt) ? reading.topicId : progress?.topicId;
  }, [user.readingPositions, user.topicProgress]);

  const currentTopic = topics.find((topic) => topic.id === currentTopicId);

  const matchingTopics = useMemo(() => {
    const pool = needle
      ? topics.filter((topic) => [topic.title, topic.summary, ...topic.learningObjectives].join(" ").toLowerCase().includes(needle))
      : topics;
    if (!currentTopicId) return pool.slice(0, 8);
    return [...pool].sort((a, b) => Number(b.id === currentTopicId) - Number(a.id === currentTopicId)).slice(0, 8);
  }, [currentTopicId, needle]);

  const matchingResources = useMemo(() => {
    const pool = resources.filter((resource) => {
      if (resource.status !== "verified") return false;
      if (!needle) return true;
      const topicNames = resource.topicIds
        .map((id) => topics.find((topic) => topic.id === id)?.title ?? "")
        .join(" ");
      return [resource.title, resource.provider, topicNames].join(" ").toLowerCase().includes(needle);
    });
    if (!currentTopicId || needle) return pool.slice(0, 6);
    return [...pool]
      .sort((a, b) => Number(b.topicIds.includes(currentTopicId)) - Number(a.topicIds.includes(currentTopicId)))
      .slice(0, 6);
  }, [currentTopicId, needle]);

  if (!hydrated) return <LearnerPageSkeleton rows={7} metrics={3} />;

  return (
    <>
      <PageHeader
        title="Learn something new"
        description="Explore freely. What you read here can support your studies, but it never skips prerequisites or changes mastery in My Path."
      />

      <section className="rounded-2xl border border-primary/25 bg-card p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary" aria-hidden />
          <Input
            aria-label="What do you want to learn about?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you want to learn about?"
            className="h-12 bg-background/70 pl-10 pr-10 text-base"
          />
          {query ? (
            <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        {!needle && currentTopic ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Since you have been working on <span className="font-semibold text-foreground">{currentTopic.title}</span>, related material is shown first.
          </p>
        ) : null}
      </section>

      <section className="mt-5 grid gap-2 sm:grid-cols-3">
        <Link to="/resources" className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/20">
          <Library className="size-5 text-primary" aria-hidden />
          <h2 className="mt-2 font-display font-semibold">Sources & resources</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Browse the verified references behind the learning material.</p>
        </Link>
        <Link to="/tech-videos" className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/20">
          <Video className="size-5 text-primary" aria-hidden />
          <h2 className="mt-2 font-display font-semibold">Videos</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Discover technical videos when you want to see a concept explained another way.</p>
        </Link>
        <Link to="/tech-news" className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/20">
          <Newspaper className="size-5 text-primary" aria-hidden />
          <h2 className="mt-2 font-display font-semibold">News</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">See what is changing in technology without mixing headlines into your Path.</p>
        </Link>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{needle ? "Search results" : "Explore topics"}</p>
            <h2 className="font-display text-xl font-bold">{needle ? `Topics about “${query.trim()}”` : "Follow your curiosity"}</h2>
          </div>
          <Compass className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        {matchingTopics.length === 0 ? (
          <EmptyState icon={Search} title="No topics found" body="Try a broader word or browse the verified resources below." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {matchingTopics.map((topic) => {
              const topicResources = resources.filter((resource) => resource.status === "verified" && resource.topicIds.includes(topic.id)).slice(0, 2);
              return (
                <article key={topic.id} className="rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-4.5" aria-hidden /></span>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-foreground">{topic.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{topic.summary}</p>
                    </div>
                  </div>
                  {topicResources.length > 0 ? (
                    <div className="mt-3 border-t border-border/50 pt-2">
                      {topicResources.map((resource) => (
                        <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted/30">
                          <span className="min-w-0 truncate">{resource.title} <span className="font-normal text-muted-foreground">· {resource.provider}</span></span>
                          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">More supplemental material can be added here without unlocking the curriculum lesson.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{needle ? "Verified material" : "Recommended reading"}</p>
          <h2 className="font-display text-xl font-bold">{needle ? "Sources that match" : "Go a little deeper"}</h2>
        </div>
        {matchingResources.length > 0 ? (
          <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card px-3">
            {matchingResources.map((resource) => (
              <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="flex min-h-16 items-center justify-between gap-3 px-1 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary">{resource.provider}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{resource.title}</p>
                </div>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </a>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">No verified source matches that search yet.</p>
        )}
        <Button asChild variant="outline" className="mt-3">
          <Link to="/resources">Browse all resources</Link>
        </Button>
      </section>
    </>
  );
}
