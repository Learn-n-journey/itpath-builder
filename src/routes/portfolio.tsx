import { createFileRoute } from "@tanstack/react-router";
import { Download, FlaskConical, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { topics } from "@/data/static-content";
import type { Difficulty, PortfolioProject } from "@/lib/app-data/types";
import {
  availableLabEvidence,
  downloadFile,
  emptyProject,
  parseList,
  portfolioToMarkdown,
  projectFromLabAttempt,
  projectToMarkdown,
} from "@/lib/portfolio-engine";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "IT Portfolio Evidence — IT PATH" },
      { name: "description", content: "Record the problem, approach, skills, tools, result and evidence for every piece of IT work you finish." },
      { property: "og:title", content: "IT Portfolio Evidence — IT PATH" },
      { property: "og:description", content: "Turn completed labs and real projects into exportable IT work evidence." },
    ],
  }),
  component: Portfolio,
});

const difficulties: Difficulty[] = ["gentle", "standard", "challenging"];

function Portfolio() {
  const { user, actions } = useAppState();
  const [draft, setDraft] = useState<PortfolioProject | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [openId, setOpenId] = useState<string | null>(null);

  const labEvidence = useMemo(() => availableLabEvidence(user), [user]);
  const topicTitle = (id: string) => topics.find((t) => t.id === id)?.title;

  function startCreate(prefill?: PortfolioProject) {
    setDraft(prefill ?? emptyProject());
    setMode("create");
  }

  function startEdit(project: PortfolioProject) {
    setDraft({ ...project });
    setMode("edit");
    setOpenId(project.id);
  }

  function patch(values: Partial<PortfolioProject>) {
    setDraft((current) => (current ? { ...current, ...values } : current));
  }

  function save() {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Give the project a name.");
      return;
    }
    if (!draft.problem.trim() || !draft.result.trim()) {
      toast.error("Describe the problem and the result.");
      return;
    }
    const record: PortfolioProject = {
      ...draft,
      title: draft.title.trim(),
      summary: draft.summary.trim() || draft.problem.trim().slice(0, 160),
      updatedAt: new Date().toISOString(),
    };
    if (mode === "create") {
      actions.addPortfolioProject(record);
      toast.success("Project added.");
    } else {
      actions.updatePortfolioProject(record);
      toast.success("Project updated.");
    }
    setDraft(null);
    setOpenId(record.id);
  }

  function remove(project: PortfolioProject) {
    actions.removePortfolioProject(project.id);
    if (openId === project.id) setOpenId(null);
    if (draft?.id === project.id) setDraft(null);
    toast.success("Project removed.");
  }

  function exportAll(format: "md" | "json") {
    if (user.portfolio.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    if (format === "md") {
      downloadFile("it-path-portfolio.md", portfolioToMarkdown(user.portfolio), "text/markdown");
    } else {
      downloadFile(
        "it-path-portfolio.json",
        JSON.stringify(user.portfolio, null, 2),
        "application/json",
      );
    }
    toast.success("Portfolio exported.");
  }

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Evidence beats claims. Record the problem, what you did, and what it produced — only for work you actually finished."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportAll("md")}>
              <Download className="size-4" /> Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAll("json")}>
              <Download className="size-4" /> JSON
            </Button>
            <Button size="sm" onClick={() => startCreate()}>
              <Plus className="size-4" /> New project
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        {labEvidence.length > 0 ? (
          <Panel
            title="Completed labs ready for your portfolio"
            description="Pre-populated from labs you actually completed. Review and edit before saving."
          >
            <ul className="divide-y divide-border">
              {labEvidence.map(({ lab, attempt }) => (
                <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">{lab.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Scored {attempt.score} of {attempt.maxScore} · {lab.difficulty}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startCreate(projectFromLabAttempt(lab, attempt))}
                  >
                    <FlaskConical className="size-4" /> Use as project
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {draft ? (
          <Panel
            title={mode === "create" ? "New project" : "Edit project"}
            description="Every field is your own record of real work. Nothing is auto-completed for you."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="p-title">Project</Label>
                <Input id="p-title" className="mt-1.5" value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-problem">Problem</Label>
                <Textarea id="p-problem" rows={3} className="mt-1.5" value={draft.problem} onChange={(e) => patch({ problem: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-approach">Approach</Label>
                <Textarea id="p-approach" rows={4} className="mt-1.5" value={draft.approach} onChange={(e) => patch({ approach: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-skills">Skills (comma separated)</Label>
                <Input id="p-skills" className="mt-1.5" value={draft.skills.join(", ")} onChange={(e) => patch({ skills: parseList(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="p-tools">Tools (comma separated)</Label>
                <Input id="p-tools" className="mt-1.5" value={draft.tools.join(", ")} onChange={(e) => patch({ tools: parseList(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-result">Result</Label>
                <Textarea id="p-result" rows={3} className="mt-1.5" value={draft.result} onChange={(e) => patch({ result: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-evidence">Evidence</Label>
                <Textarea id="p-evidence" rows={2} className="mt-1.5" value={draft.evidence} onChange={(e) => patch({ evidence: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-date">Date</Label>
                <Input id="p-date" type="date" className="mt-1.5" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-difficulty">Difficulty</Label>
                <select
                  id="p-difficulty"
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.difficulty}
                  onChange={(e) => patch({ difficulty: e.target.value as Difficulty })}
                >
                  {difficulties.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={save}>{mode === "create" ? "Add project" : "Save changes"}</Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                <X className="size-4" /> Cancel
              </Button>
            </div>
          </Panel>
        ) : null}

        <Panel title={`Your projects (${user.portfolio.length})`}>
          {user.portfolio.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              body="Finish a lab or record real work you have done, and it will appear here as evidence you can export."
            />
          ) : (
            <ul className="divide-y divide-border">
              {user.portfolio.map((p) => {
                const open = openId === p.id;
                return (
                  <li key={p.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{p.title}</p>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          <Badge variant="outline">{p.date}</Badge>
                          <Badge variant="secondary">{p.difficulty}</Badge>
                          {p.source === "lab" ? <Badge>Completed lab evidence</Badge> : null}
                          {p.topicIds.map((id) =>
                            topicTitle(id) ? (
                              <Badge key={id} variant="outline">
                                {topicTitle(id)}
                              </Badge>
                            ) : null,
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setOpenId(open ? null : p.id)}>
                          {open ? "Hide" : "View"}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Edit ${p.title}`} onClick={() => startEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Export ${p.title}`}
                          onClick={() => {
                            downloadFile(`${p.title.replace(/\s+/g, "-").toLowerCase() || "project"}.md`, projectToMarkdown(p), "text/markdown");
                            toast.success("Project exported.");
                          }}
                        >
                          <Download className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Remove ${p.title}`} onClick={() => remove(p)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {open ? (
                      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field label="Problem" value={p.problem} wide />
                        <Field label="Approach" value={p.approach} wide />
                        <Field label="Skills" value={p.skills.join(", ")} />
                        <Field label="Tools" value={p.tools.join(", ")} />
                        <Field label="Result" value={p.result} wide />
                        <Field label="Evidence" value={p.evidence} wide />
                      </dl>
                    ) : null}
                    {open ? (
                      <AnnotationPanel
                        className="mt-4"
                        target={{ kind: "project", id: p.id, label: p.title, href: "/portfolio" }}
                        title="Project notes and bookmark"
                        description="Notes and bookmarks for this project, saved with the rest of your work."
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || "—"}</dd>
    </div>
  );
}
