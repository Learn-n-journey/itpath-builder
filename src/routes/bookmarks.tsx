import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bookmark as BookmarkIcon, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { annotationKindLabel, bookmarkViews, recordEntityId, recordKind } from "@/lib/annotations";
import type { AnnotationKind } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/bookmarks")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Bookmarks | IT PATH" },
      {
        name: "description",
        content: "Every lesson, resource, lab, assignment, quiz and project you have bookmarked.",
      },
      { property: "og:title", content: "Bookmarks | IT PATH" },
      {
        property: "og:description",
        content: "One place to find everything you marked to come back to, with your notes.",
      },
    ],
  }),
  component: BookmarksPage,
});

const kinds: AnnotationKind[] = [
  "lesson",
  "topic",
  "resource",
  "lab",
  "assignment",
  "quiz",
  "project",
];

function BookmarksPage() {
  const { user, actions } = useAppState();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<string>("all");

  const views = useMemo(() => bookmarkViews(user), [user]);
  const filtered = views.filter((view) => {
    const matchesKind = kind === "all" || view.kind === kind;
    const matchesQuery =
      query.trim() === "" || view.bookmark.label.toLowerCase().includes(query.trim().toLowerCase());
    return matchesKind && matchesQuery;
  });

  return (
    <>
      <PageHeader
        title="Bookmarks"
        description="Everything you bookmarked anywhere in IT PATH, with the notes attached to it."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Bookmarks" value={user.bookmarks.length} />
        <StatCard label="Notes" value={user.notes.length} />
        <StatCard label="Kinds used" value={new Set(views.map((view) => view.kind)).size} />
        <StatCard label="Shown" value={filtered.length} />
      </div>

      <Panel className="mt-6" title="Find a bookmark">
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <div>
            <Label htmlFor="bookmark-search">Search</Label>
            <Input
              id="bookmark-search"
              className="mt-1.5"
              value={query}
              placeholder="Search bookmark titles"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="mt-1.5" aria-label="Bookmark type filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {kinds.map((item) => (
                  <SelectItem key={item} value={item}>
                    {annotationKindLabel[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {query || kind !== "all" ? (
          <Button
            className="mt-4"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setKind("all");
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </Panel>

      <Panel className="mt-4" title={`Bookmarked items (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookmarkIcon}
            title={views.length === 0 ? "No bookmarks yet" : "No bookmarks match"}
            body={
              views.length === 0
                ? "Bookmark a lesson, resource, lab, assignment, quiz or project and it will show up here."
                : "Try a different search or type filter."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((view) => {
              const external = view.bookmark.href.startsWith("http");
              return (
                <li key={view.bookmark.id} className="flex flex-wrap items-start gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{view.bookmark.label}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{view.kindLabel}</Badge>
                      <Badge variant="secondary">
                        {view.noteCount} {view.noteCount === 1 ? "note" : "notes"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Saved {new Date(view.bookmark.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {external ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={view.bookmark.href} target="_blank" rel="noreferrer">
                          Open <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link to={view.bookmark.href}>Open</Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove bookmark ${view.bookmark.label}`}
                      onClick={() => {
                        actions.removeBookmark(view.bookmark.id);
                        toast.success("Bookmark removed.");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel className="mt-4" title={`All notes (${user.notes.length})`} description="Every note you have written, newest first.">
        {user.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have not written any notes yet. Notes you add on a lesson, resource, lab,
            assignment, quiz or project appear here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {[...user.notes]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((note) => {
                const noteKind = recordKind(note);
                return (
                  <li key={note.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{note.title}</p>
                      {noteKind ? (
                        <Badge variant="outline">{annotationKindLabel[noteKind]}</Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {note.body}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          actions.removeNote(note.id);
                          toast.success("Note deleted.");
                        }}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                      {recordEntityId(note) ? null : null}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </Panel>
    </>
  );
}
