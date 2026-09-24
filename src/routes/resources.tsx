import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Bookmark, ExternalLink, FileText, Search, SlidersHorizontal, Target, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { EmptyState, LearnerPageSkeleton, PageHeader } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bookmarkFor, notesFor } from "@/lib/annotations";
import { certifications, resources, topics } from "@/data/static-content";
import type { Resource } from "@/lib/app-data/types";
import { selectedCertification } from "@/lib/adaptive-path";
import { useAppState } from "@/state/app-state";
import { isStringPreference, useUiPreference } from "@/hooks/use-ui-preference";

export const Route = createFileRoute("/resources")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Resources | IT PATH" },
      { name: "description", content: "Search verified IT learning resources and save bookmarks and notes." },
      { property: "og:title", content: "Resources | IT PATH" },
      { property: "og:description", content: "Verified technical learning resources organized by topic and certification." },
    ],
  }),
  component: ResourcesPage,
});

type Filters = {
  topic: string;
  certification: string;
  kind: string;
  access: string;
};

const emptyFilters: Filters = { topic: "all", certification: "all", kind: "all", access: "all" };
const kindLabels: Record<Resource["kind"], string> = { course: "Course", article: "Article", docs: "Documentation", "learning-path": "Learning path", video: "Video" };

function ResourcesPage() {
  const { user, hydrated } = useAppState();
  const [query, setQuery] = useUiPreference("resources.search", "", isStringPreference);
  const [filters, setFilters] = useUiPreference<Filters>("resources.filters", { ...emptyFilters, certification: selectedCertification(user.settings).id }, (value): value is Filters => Boolean(value) && typeof value === "object" && ["topic", "certification", "kind", "access"].every((key) => typeof (value as Record<string, unknown>)[key] === "string"));
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const resourceTopics = resource.topicIds.map((id) => topics.find((topic) => topic.id === id)).filter((topic) => topic !== undefined);
      const certification = certifications.find((item) => item.id === resource.certificationId);
      const searchable = [resource.title, resource.provider, certification?.title ?? "", ...resourceTopics.map((topic) => topic.title)].join(" ").toLowerCase();
      return (!needle || searchable.includes(needle))
        && (filters.topic === "all" || resource.topicIds.includes(filters.topic))
        && (filters.certification === "all" || resource.certificationId === filters.certification)
        && (filters.kind === "all" || resource.kind === filters.kind)
        && (filters.access === "all" || resource.access === filters.access);
    });
  }, [filters, query]);

  const currentTopicId = user.activeTopicId;
  const currentTopic = topics.find((topic) => topic.id === currentTopicId);
  const currentTopicResources = currentTopicId
    ? filteredResources.filter((resource) => resource.topicIds.includes(currentTopicId)).slice(0, 3)
    : [];
  const featuredIds = new Set(currentTopicResources.map((resource) => resource.id));
  const libraryResources = filteredResources.filter((resource) => !featuredIds.has(resource.id));
  const hasFilters = query.length > 0 || Object.values(filters).some((value) => value !== "all");
  function clearFilters() { setQuery(""); setFilters(emptyFilters); }
  function updateFilter(key: keyof Filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={3} />;

  return (
    <>
      <PageHeader title="Resources" description="Verified references and training matched to your journey." />

      <section>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search resources" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, providers, topics, or certifications" className="pl-9 pr-10" />
          {query ? <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}><X /></Button> : null}
        </div>
        <details className="group mt-3 border-b border-border pb-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden"><SlidersHorizontal className="size-4 text-primary" />Filters</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResourceFilter label="Topic" allLabel="All topics" value={filters.topic} onChange={(value) => updateFilter("topic", value)} options={topics.map((topic) => ({ value: topic.id, label: topic.title }))} />
          <ResourceFilter label="Certification" allLabel="All certifications" value={filters.certification} onChange={(value) => updateFilter("certification", value)} options={certifications.map((certification) => ({ value: certification.id, label: certification.title }))} />
          <ResourceFilter label="Type" allLabel="All types" value={filters.kind} onChange={(value) => updateFilter("kind", value)} options={Object.entries(kindLabels).map(([value, label]) => ({ value, label }))} />
          <ResourceFilter label="Access" allLabel="All access" value={filters.access} onChange={(value) => updateFilter("access", value)} options={[{ value: "free", label: "Free" }, { value: "paid", label: "Paid" }]} />
        </div></details>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <QuickFilter active={filters.kind === "all"} onClick={() => updateFilter("kind", "all")}>All</QuickFilter>
          <QuickFilter active={filters.kind === "course" || filters.kind === "learning-path"} onClick={() => updateFilter("kind", filters.kind === "course" ? "learning-path" : "course")}>Courses</QuickFilter>
          <QuickFilter active={filters.kind === "docs"} onClick={() => updateFilter("kind", "docs")}>Docs</QuickFilter>
          <QuickFilter active={filters.kind === "video"} onClick={() => updateFilter("kind", "video")}>Videos</QuickFilter>
        </div>
        {hasFilters ? <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}><X />Clear filters</Button> : null}
      </section>

      {currentTopic && currentTopicResources.length > 0 ? (
        <section className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-3 sm:p-4" aria-label={`Resources for ${currentTopic.title}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Target className="size-5" aria-hidden /></span>
              <div className="min-w-0">
                <h2 className="truncate font-display text-base font-semibold">For {currentTopic.title}</h2>
                <p className="text-xs text-muted-foreground">{filteredResources.filter((resource) => resource.topicIds.includes(currentTopic.id)).length} verified resources</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {currentTopicResources.map((resource) => <ResourceCard key={resource.id} resource={resource} noteOpen={openNoteId === resource.id} onToggleNote={() => setOpenNoteId((current) => current === resource.id ? null : resource.id)} featured />)}
          </div>
        </section>
      ) : null}

      <section className="mt-5" aria-label="Resource results">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold">All resources</h2><p className="text-xs text-muted-foreground">{filteredResources.length} resources</p></div>
        </div>
        {filteredResources.length === 0 ? (
          <EmptyState icon={Search} title="No resources found" body="No verified resource matches the current search and filters.">
            <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
          </EmptyState>
        ) : libraryResources.length > 0 ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {libraryResources.map((resource) => <ResourceCard key={resource.id} resource={resource} noteOpen={openNoteId === resource.id} onToggleNote={() => setOpenNoteId((current) => current === resource.id ? null : resource.id)} />)}
          </div>
        ) : <p className="rounded-xl border border-border/60 py-6 text-center text-sm text-muted-foreground">All matching resources are shown above for your current topic.</p>}
      </section>
    </>
  );
}

function ResourceFilter({ label, allLabel, value, onChange, options }: { label: string; allLabel: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-1.5" aria-label={`${label} filter`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{allLabel}</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

function QuickFilter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" variant={active ? "default" : "outline"} size="sm" className="shrink-0 rounded-full px-4" onClick={onClick}>{children}</Button>;
}

function ResourceCard({ resource, noteOpen, onToggleNote, featured = false }: { resource: Resource; noteOpen: boolean; onToggleNote: () => void; featured?: boolean }) {
  const { user } = useAppState();
  const target = { kind: "resource" as const, id: resource.id, label: resource.title, href: resource.url };
  const bookmark = bookmarkFor(user, target);
  const savedNotes = notesFor(user, target);
  const certification = certifications.find((item) => item.id === resource.certificationId);
  const resourceTopics = resource.topicIds.map((id) => topics.find((topic) => topic.id === id)).filter((topic) => topic !== undefined);


  return (
    <article className={featured ? "rounded-xl border border-primary/25 bg-card/80 p-4 shadow-sm" : "border-b border-border/60 px-1 py-4 last:border-b-0"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            {resource.provider}
            {resource.status === "verified" ? <BadgeCheck className="size-3.5" aria-label="Verified" /> : null}
          </p>
          <h2 className="mt-1 font-display text-base font-semibold leading-snug">{resource.title}</h2>
        </div>
        {resource.status !== "verified" ? <Badge variant="outline">Unavailable</Badge> : null}
      </div>
      {resourceTopics.length > 0 ? <p className="mt-2 line-clamp-1 text-xs text-muted-foreground"><span className="font-medium text-foreground/75">Matches:</span> {resourceTopics.map((topic) => topic.title).join(" · ")}</p> : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="font-normal">{kindLabels[resource.kind]}</Badge>
        <Badge variant="outline" className="font-normal">{resource.access === "free" ? "Free" : "Paid"}</Badge>
        {certification ? <Badge variant="outline" className="max-w-44 truncate font-normal">{certification.title}</Badge> : null}
      </div>
      <div className="mt-3 flex items-center gap-1 border-t border-border/50 pt-3">
        <Button asChild variant="ghost" size="sm" className="px-2 text-primary hover:text-primary"><a href={resource.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open</a></Button>
        <Button variant="ghost" size="icon" aria-label={bookmark ? "Bookmarked" : "Bookmark available in notes"} onClick={onToggleNote}><Bookmark className={bookmark ? "fill-current text-primary" : ""} /></Button>
        <Button variant="ghost" size="icon" aria-label={noteOpen ? "Hide notes" : "Add note"} onClick={onToggleNote}><FileText /></Button>
        <span className="ml-auto text-[0.6875rem] text-muted-foreground">Verified <time dateTime={resource.lastVerified}>{new Date(resource.lastVerified).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</time></span>
      </div>
      {noteOpen ? <AnnotationPanel className="mt-4" target={target} title="Resource notes and bookmark" description="Saved on this device and shown in your Bookmarks view." /> : null}
    </article>
  );
}