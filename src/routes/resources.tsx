import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, ExternalLink, FileText, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { certifications, resources, topics } from "@/data/static-content";
import type { Difficulty, Resource } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Resources — IT PATH" },
      { name: "description", content: "Search verified IT learning resources and save bookmarks and notes." },
      { property: "og:title", content: "Resources — IT PATH" },
      { property: "og:description", content: "Verified technical learning resources organized by topic and certification." },
    ],
  }),
  component: ResourcesPage,
});

type Filters = {
  topic: string;
  certification: string;
  kind: string;
  difficulty: string;
  access: string;
};

const emptyFilters: Filters = { topic: "all", certification: "all", kind: "all", difficulty: "all", access: "all" };
const difficultyLabels: Record<Difficulty, string> = { gentle: "Beginner", standard: "Intermediate", challenging: "Advanced" };
const kindLabels: Record<Resource["kind"], string> = { course: "Course", article: "Article", docs: "Documentation", "learning-path": "Learning path" };

function ResourcesPage() {
  const { user, actions } = useAppState();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
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
        && (filters.difficulty === "all" || resource.difficulty === filters.difficulty)
        && (filters.access === "all" || resource.access === filters.access);
    });
  }, [filters, query]);

  const hasFilters = query.length > 0 || Object.values(filters).some((value) => value !== "all");
  function clearFilters() { setQuery(""); setFilters(emptyFilters); }
  function updateFilter(key: keyof Filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }

  return (
    <>
      <PageHeader title="Resources" description="Verified references and training matched to your curriculum." />

      <Panel title="Find resources" description={`${filteredResources.length} of ${resources.length} resources shown`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search resources" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, providers, topics, or certifications" className="pl-9 pr-10" />
          {query ? <Button aria-label="Clear search" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}><X /></Button> : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResourceFilter label="Topic" allLabel="All topics" value={filters.topic} onChange={(value) => updateFilter("topic", value)} options={topics.map((topic) => ({ value: topic.id, label: topic.title }))} />
          <ResourceFilter label="Certification" allLabel="All certifications" value={filters.certification} onChange={(value) => updateFilter("certification", value)} options={certifications.map((certification) => ({ value: certification.id, label: certification.title }))} />
          <ResourceFilter label="Type" allLabel="All types" value={filters.kind} onChange={(value) => updateFilter("kind", value)} options={Object.entries(kindLabels).map(([value, label]) => ({ value, label }))} />
          <ResourceFilter label="Difficulty" allLabel="All difficulties" value={filters.difficulty} onChange={(value) => updateFilter("difficulty", value)} options={Object.entries(difficultyLabels).map(([value, label]) => ({ value, label }))} />
          <ResourceFilter label="Access" allLabel="All access" value={filters.access} onChange={(value) => updateFilter("access", value)} options={[{ value: "free", label: "Free" }, { value: "paid", label: "Paid" }]} />
        </div>
        {hasFilters ? <Button variant="ghost" className="mt-4" onClick={clearFilters}><X />Clear all filters</Button> : null}
      </Panel>

      <section className="mt-4" aria-label="Resource results">
        {filteredResources.length === 0 ? (
          <EmptyState icon={Search} title="No resources found" body="No verified resource matches the current search and filters.">
            <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
          </EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredResources.map((resource) => <ResourceCard key={resource.id} resource={resource} noteOpen={openNoteId === resource.id} onToggleNote={() => setOpenNoteId((current) => current === resource.id ? null : resource.id)} />)}
          </div>
        )}
      </section>
    </>
  );
}

function ResourceFilter({ label, allLabel, value, onChange, options }: { label: string; allLabel: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-1.5" aria-label={`${label} filter`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{allLabel}</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

function ResourceCard({ resource, noteOpen, onToggleNote }: { resource: Resource; noteOpen: boolean; onToggleNote: () => void }) {
  const { user, actions } = useAppState();
  const bookmark = user.bookmarks.find((item) => item.resourceId === resource.id);
  const savedNote = user.notes.find((item) => item.resourceId === resource.id);
  const [noteBody, setNoteBody] = useState(savedNote?.body ?? "");
  const certification = certifications.find((item) => item.id === resource.certificationId);
  const resourceTopics = resource.topicIds.map((id) => topics.find((topic) => topic.id === id)).filter((topic) => topic !== undefined);

  function toggleBookmark() {
    if (bookmark) { actions.removeBookmark(bookmark.id); toast.success("Resource bookmark removed."); return; }
    actions.addBookmark({ id: crypto.randomUUID(), label: resource.title, href: resource.url, resourceId: resource.id, createdAt: new Date().toISOString() });
    toast.success("Resource bookmarked.");
  }

  function saveNote() {
    const body = noteBody.trim();
    if (!body) { toast.error("Write a note before saving."); return; }
    const now = new Date().toISOString();
    if (savedNote) actions.updateNote({ ...savedNote, body, updatedAt: now });
    else actions.addNote({ id: crypto.randomUUID(), resourceId: resource.id, title: `${resource.title} notes`, body, createdAt: now, updatedAt: now });
    toast.success("Resource note saved.");
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="text-xs font-medium text-primary">{resource.provider}</p><h2 className="mt-1 font-display text-base font-semibold">{resource.title}</h2></div>
        <Badge variant={resource.status === "verified" ? "secondary" : "outline"}>{resource.status === "verified" ? "Verified" : "Unavailable"}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">{certification?.title ?? "General IT"}</Badge><Badge variant="outline">{kindLabels[resource.kind]}</Badge><Badge variant="outline">{difficultyLabels[resource.difficulty]}</Badge><Badge variant="outline">{resource.access === "free" ? "Free" : "Paid"}</Badge>
      </div>
      <div className="mt-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Topics</p><p className="mt-1 text-sm text-muted-foreground">{resourceTopics.map((topic) => topic.title).join(" · ")}</p></div>
      <p className="mt-4 text-xs text-muted-foreground">Last verified: <time dateTime={resource.lastVerified}>{resource.lastVerified}</time></p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild><a href={resource.url} target="_blank" rel="noreferrer">Open resource<ExternalLink /></a></Button>
        <Button variant={bookmark ? "secondary" : "outline"} onClick={toggleBookmark}>{bookmark ? <BookmarkCheck /> : <Bookmark />}{bookmark ? "Bookmarked" : "Bookmark"}</Button>
        <Button variant="outline" onClick={onToggleNote}><FileText />{savedNote ? "Edit note" : "Add note"}</Button>
      </div>
      {noteOpen ? <div className="mt-5 border-t border-border pt-5"><Label htmlFor={`note-${resource.id}`}>Resource notes</Label><Textarea id={`note-${resource.id}`} className="mt-2" rows={4} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} /><Button className="mt-3" onClick={saveNote}>Save note</Button></div> : null}
    </article>
  );
}