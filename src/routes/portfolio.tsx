import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Portfolio — IT PATH" },
      { name: "description", content: "Collect the projects that prove what you can do." },
      { property: "og:title", content: "Portfolio — IT PATH" },
      { property: "og:description", content: "Build evidence of your IT work as you study." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { user, actions } = useAppState();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  function addProject() {
    if (!title.trim()) {
      toast.error("Give the project a title.");
      return;
    }
    actions.addPortfolioProject({
      id: crypto.randomUUID(),
      title: title.trim(),
      summary: summary.trim(),
      topicIds: [],
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setSummary("");
    toast.success("Project added.");
  }

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Evidence beats claims. Record each project you finish, with what you actually did."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Add a project">
          <div className="space-y-3">
            <div>
              <Label htmlFor="p-title">Title</Label>
              <Input
                id="p-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="p-summary">What you did</Label>
              <Textarea
                id="p-summary"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={addProject}>Add project</Button>
          </div>
        </Panel>

        <Panel title={`Your projects (${user.portfolio.length})`}>
          {user.portfolio.length === 0 ? (
            <p className="text-sm text-muted-foreground">No portfolio projects yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {user.portfolio.map((p) => (
                <li key={p.id} className="flex min-w-0 items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">{p.title}</p>
                    {p.summary ? (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {p.summary}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${p.title}`}
                    onClick={() => actions.removePortfolioProject(p.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
