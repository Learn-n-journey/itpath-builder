import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resources } from "@/data/static-content";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Resources — IT PATH" },
      { name: "description", content: "Reference material and your saved bookmarks." },
      { property: "og:title", content: "Resources — IT PATH" },
      { property: "og:description", content: "Curated IT references plus your own bookmarks." },
    ],
  }),
  component: Resources,
});

function Resources() {
  const { user, actions } = useAppState();
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");

  function addBookmark() {
    if (!label.trim() || !href.trim()) {
      toast.error("Add both a name and a link.");
      return;
    }
    actions.addBookmark({
      id: crypto.randomUUID(),
      label: label.trim(),
      href: href.trim(),
      createdAt: new Date().toISOString(),
    });
    setLabel("");
    setHref("");
    toast.success("Bookmark saved.");
  }

  return (
    <>
      <PageHeader
        title="Resources"
        description="Curated references plus anything you want to keep handy."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Curated library" description={`${resources.length} items loaded.`}>
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No curated resources are loaded yet. Your own bookmarks still work.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {resources.map((r) => (
                <li key={r.id}>
                  <a className="text-primary hover:underline" href={r.url}>
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Add a bookmark">
          <div className="space-y-3">
            <div>
              <Label htmlFor="bm-label">Name</Label>
              <Input
                id="bm-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="bm-url">Link</Label>
              <Input
                id="bm-url"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="https://"
                className="mt-1.5"
              />
            </div>
            <Button onClick={addBookmark}>Save bookmark</Button>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title={`Your bookmarks (${user.bookmarks.length})`}>
        {user.bookmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {user.bookmarks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 py-2.5">
                <a
                  href={b.href}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-primary hover:underline"
                >
                  {b.label}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${b.label}`}
                  onClick={() => actions.removeBookmark(b.id)}
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
