import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Compass, Library, Newspaper, Search, Sparkles, Video, X } from "lucide-react";
import { useMemo } from "react";

import { EmptyState, LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentRow, SectionHeading } from "@/components/learner-ui";
import { resources, topics } from "@/data/static-content";
import { adaptivePath } from "@/lib/adaptive-path";
import { useAppState } from "@/state/app-state";
import { isStringPreference, useUiPreference } from "@/hooks/use-ui-preference";

export const Route = createFileRoute("/learn")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Learn | IT PATH" },
      { name: "description", content: "Explore topics, verified resources, videos and technology news without changing your curriculum progress." },
      { property: "og:title", content: "Learn | IT PATH" },
      { property: "og:description", content: "A free-exploration space for learning beyond your structured path." },
    ],
  }),
  component: Learn,
});

function Learn() {
  const { user, hydrated } = useAppState();
  const [query, setQuery] = useUiPreference("learn.search", "", isStringPreference);
  const path = useMemo(() => adaptivePath(user), [user]);
  const needle = query.trim().toLowerCase();

  const matchingTopics = useMemo(() => {
    if (!needle) return topics;
    return topics.filter((topic) =>
      [topic.title, topic.summary, ...topic.learningObjectives].join(" ").toLowerCase().includes(needle),
    );
  }, [needle]);

  const currentTopic = path.recommendedTopic;
  const relatedResources = useMemo(() => {
    if (!currentTopic) return [];
    return resources.filter((resource) => resource.topicIds.includes(currentTopic.id)).slice(0, 3);
  }, [currentTopic]);

  const suggestedTopics = useMemo(() => {
    const pool = matchingTopics.filter((topic) => topic.id !== currentTopic?.id);
    return (currentTopic ? [currentTopic, ...pool] : pool).slice(0, needle ? 12 : 6);
  }, [currentTopic, matchingTopics, needle]);

  if (!hydrated) return <LearnerPageSkeleton rows={7} metrics={3} />;

  return (
    <>
      <PageHeader
        title="Learn something new"
        description="Explore anything that interests you. Your structured progress stays in My Path."
      />

      <section className="rounded-2xl border border-primary/25 bg-card/90 p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Compass className="size-5" aria-hidden /></span>
          <div>
            <h2 className="font-display text-lg font-semibold">What do you want to learn about?</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Browse freely. Exploring here does not skip prerequisites or award mastery.</p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search what you want to learn" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search networking, hardware, security, cloud…" className="h-11 pl-9 pr-10" />
          {query ? <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}><X className="size-4" /></Button> : null}
        </div>
      </section>

      {!needle ? (
        <section className="mt-5">
          <SectionHeading title="Discover" meta="More ways to explore" className="mb-2" />
          <div className="grid gap-2 sm:grid-cols-3">
            <DiscoveryCard to="/resources" icon={Library} title="Verified resources" description="Official documentation, courses and references." />
            <DiscoveryCard to="/tech-videos" icon={Video} title="Tech videos" description="Watch technology explainers and demonstrations." />
            <DiscoveryCard to="/tech-news" icon={Newspaper} title="Tech news" description="See what is happening across technology now." />
          </div>
        </section>
      ) : null}

      {currentTopic && !needle ? (
        <Panel className="mt-5 border-primary/25 bg-primary/5" title="Related to your path">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{currentTopic.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">Explore this subject without changing your official lesson progress.</p>
              <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/topics/$topicId" params={{ topicId: currentTopic.id }}>Explore topic <ArrowRight /></Link></Button>
            </div>
          </div>
          {relatedResources.length > 0 ? <div className="mt-4 border-t border-border/60 pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Official material</p><div className="space-y-2">{relatedResources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm font-medium hover:bg-muted/30">{resource.title}<span className="block text-xs font-normal text-muted-foreground">{resource.provider}</span></a>)}</div></div> : null}
        </Panel>
      ) : null}

      <section className="mt-5">
        <SectionHeading title={needle ? `Results for “${query.trim()}”` : "Explore topics"} meta={`${matchingTopics.length} available`} className="mb-1" />
        {suggestedTopics.length === 0 ? (
          <EmptyState icon={Search} title="Nothing found" body="Try another subject or a broader search."><Button variant="outline" onClick={() => setQuery("")}>Clear search</Button></EmptyState>
        ) : (
          <div className="divide-y divide-border/70">
            {suggestedTopics.map((topic) => (
              <Link key={topic.id} to="/topics/$topicId" params={{ topicId: topic.id }} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ContentRow icon={BookOpen} eyebrow={topic.id === currentTopic?.id ? "Related to your path" : "Explore"} title={topic.title} description={topic.summary} metadata={topic.difficulty === "gentle" ? "Foundation" : topic.difficulty === "standard" ? "Core" : "Advanced"} />
              </Link>
            ))}
          </div>
        )}
        {!needle && matchingTopics.length > suggestedTopics.length ? <p className="mt-3 text-center text-xs text-muted-foreground">Search above to explore all {matchingTopics.length} topics.</p> : null}
      </section>
    </>
  );
}

function DiscoveryCard({ to, icon: Icon, title, description }: { to: string; icon: typeof Library; title: string; description: string }) {
  return (
    <Link to={to as never} className="group rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/35 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Icon className="size-5 text-primary" aria-hidden />
      <p className="mt-3 font-display text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
    </Link>
  );
}
