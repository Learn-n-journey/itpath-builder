import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lessons, topics } from "@/data/static-content";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — IT PATH" },
      { name: "description", content: "Lessons and your personal study notes in one place." },
      { property: "og:title", content: "Learn — IT PATH" },
      { property: "og:description", content: "Work through lessons and keep your own notes." },
    ],
  }),
  component: Learn,
});

function Learn() {
  const { user, updateUser } = useAppState();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function addNote() {
    if (!title.trim()) {
      toast.error("Give your note a title.");
      return;
    }
    const now = new Date().toISOString();
    updateUser((c) => ({
      ...c,
      notes: [
        { id: crypto.randomUUID(), title: title.trim(), body: body.trim(), createdAt: now, updatedAt: now },
        ...c.notes,
      ],
    }));
    setTitle("");
    setBody("");
    toast.success("Note saved.");
  }

  function removeNote(id: string) {
    updateUser((c) => ({ ...c, notes: c.notes.filter((n) => n.id !== id) }));
  }

  return (
    <>
      <PageHeader
        title="Learn"
        description="Lessons appear here as your curriculum is added. Your notes are saved on this device."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Lessons" description={`${lessons.length} lessons across ${topics.length} topics.`}>
          {lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lessons are loaded yet, so nothing is marked complete.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lessons.map((l) => (
                <li key={l.id}>{l.title}</li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="New note">
          <div className="space-y-3">
            <div>
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Subnetting basics"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="note-body">Note</Label>
              <Textarea
                id="note-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mt-1.5"
              />
            </div>
            <Button onClick={addNote}>Save note</Button>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title={`Your notes (${user.notes.length})`}>
        {user.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {user.notes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete note ${n.title}`}
                  onClick={() => removeNote(n.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
