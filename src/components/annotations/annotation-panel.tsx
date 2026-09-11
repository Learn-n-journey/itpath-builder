import { useState } from "react";
import { Bookmark as BookmarkIcon, BookmarkCheck, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/state/app-state";
import {
  bookmarkFor,
  buildBookmark,
  buildNote,
  notesFor,
  type AnnotationTarget,
} from "@/lib/annotations";
import { cn } from "@/lib/utils";

/**
 * The single notes and bookmark control used across lessons, resources, labs,
 * assignments, quizzes and portfolio projects. All records go to the same store.
 */
export function AnnotationPanel({
  target,
  className,
  title = "Notes and bookmark",
  description = "Saved on this device and linked to this item.",
}: {
  target: AnnotationTarget;
  className?: string;
  title?: string;
  description?: string;
}) {
  const { user, actions } = useAppState();
  const notes = notesFor(user, target);
  const bookmark = bookmarkFor(user, target);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  function toggleBookmark() {
    if (bookmark) {
      actions.removeBookmark(bookmark.id);
      toast.success("Bookmark removed.");
      return;
    }
    actions.addBookmark(buildBookmark(target));
    toast.success("Bookmarked.");
  }

  function addNote() {
    const body = draft.trim();
    if (!body) {
      toast.error("Write something before saving the note.");
      return;
    }
    actions.addNote(buildNote(target, body));
    setDraft("");
    toast.success("Note saved.");
  }

  function saveEdit(id: string) {
    const existing = notes.find((note) => note.id === id);
    const body = editingBody.trim();
    if (!existing) return;
    if (!body) {
      toast.error("A note cannot be empty. Delete it instead.");
      return;
    }
    actions.updateNote({ ...existing, body, updatedAt: new Date().toISOString() });
    setEditingId(null);
    toast.success("Note updated.");
  }

  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-5", className)}
      aria-label={`${title} for ${target.label}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          variant={bookmark ? "secondary" : "outline"}
          size="sm"
          onClick={toggleBookmark}
          aria-pressed={Boolean(bookmark)}
        >
          {bookmark ? <BookmarkCheck className="size-4" /> : <BookmarkIcon className="size-4" />}
          {bookmark ? "Bookmarked" : "Bookmark"}
        </Button>
      </div>

      <div className="mt-4">
        <Label htmlFor={`note-draft-${target.kind}-${target.id}`}>Add a note</Label>
        <Textarea
          id={`note-draft-${target.kind}-${target.id}`}
          className="mt-2"
          rows={4}
          value={draft}
          placeholder="What did you learn, get wrong, or want to come back to?"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button className="mt-3" size="sm" onClick={addNote}>
          <Save className="size-4" /> Save note
        </Button>
      </div>

      {notes.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-border pt-5">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-background/40 p-4">
              {editingId === note.id ? (
                <>
                  <Textarea
                    rows={4}
                    value={editingBody}
                    onChange={(event) => setEditingBody(event.target.value)}
                    aria-label="Edit note"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => saveEdit(note.id)}>
                      <Save className="size-4" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="size-4" /> Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{note.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(note.updatedAt).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditingBody(note.body);
                        }}
                      >
                        <Pencil className="size-4" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          actions.removeNote(note.id);
                          toast.success("Note deleted.");
                        }}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No notes on this item yet.</p>
      )}
    </section>
  );
}
