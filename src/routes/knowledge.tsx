import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import {
  Brain,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Search,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
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
import { Textarea } from "@/components/ui/textarea";
import { topics, certifications } from "@/data/static-content";
import { useKnowledge } from "@/hooks/use-knowledge";
import {
  deleteKnowledge,
  getKnowledgeFileUrl,
  saveKnowledge,
  searchKnowledge,
  type KnowledgeItem,
  type KnowledgeKind,
} from "@/lib/knowledge.functions";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/knowledge")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Second Brain | IT PATH" },
      {
        name: "description",
        content:
          "Save notes, links, videos, screenshots and documents, and let IT PATH connect them to your topics, certifications and learner profile.",
      },
      { property: "og:title", content: "Second Brain | IT PATH" },
      {
        property: "og:description",
        content:
          "Your own IT knowledge library: saved material is read, connected to your certification topics and searchable in plain English.",
      },
    ],
  }),
  component: KnowledgePage,
});

const KIND_OPTIONS: { value: KnowledgeKind; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "link", label: "Link" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video (YouTube or other)" },
  { value: "screenshot", label: "Screenshot or image" },
  { value: "document", label: "Document (PDF or text)" },
  { value: "material", label: "Other IT material" },
];

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function kindIcon(kind: KnowledgeKind) {
  if (kind === "video") return Video;
  if (kind === "link" || kind === "article") return Link2;
  if (kind === "screenshot" || kind === "document") return FileText;
  return Brain;
}

function topicTitle(id: string): string {
  return topics.find((t) => t.id === id)?.title ?? id;
}

function certTitle(id: string): string {
  return certifications.find((c) => c.id === id)?.title ?? id;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 8192) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function KnowledgePage() {
  return (
    <>
      <PageHeader
        title="Second Brain"
        description="Save anything you study, notes, links, videos, screenshots, PDFs, and IT PATH reads it, pulls out the concepts and wires them into your topics, certifications and learner profile."
      />
      <ProGate feature="Second Brain">
        <KnowledgeWorkspace />
      </ProGate>
    </>
  );
}

function KnowledgeWorkspace() {
  const { items, loading, refresh } = useKnowledge();
  const { actions } = useAppState();
  const save = useServerFn(saveKnowledge);
  const remove = useServerFn(deleteKnowledge);
  const ask = useServerFn(searchKnowledge);
  const fileUrl = useServerFn(getKnowledgeFileUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<KnowledgeKind>("note");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [matches, setMatches] = useState<{ id: string; title: string; why: string }[]>([]);
  const [asked, setAsked] = useState<string | null>(null);

  const stats = useMemo(() => {
    const concepts = new Set<string>();
    const covered = new Set<string>();
    let gaps = 0;
    let conflicts = 0;
    for (const item of items) {
      item.concepts.forEach((c) => concepts.add(c.toLowerCase()));
      item.topicIds.forEach((t) => covered.add(t));
      gaps += item.gaps.length;
      conflicts += item.contradictions.length;
    }
    return { concepts: concepts.size, covered: covered.size, gaps, conflicts };
  }, [items]);

  async function onSave() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Give this item a title first.");
      return;
    }
    if (!sourceUrl.trim() && !notes.trim() && !text.trim() && !file) {
      toast.error("Add a link, some notes, pasted text or a file so there is something to read.");
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      toast.error("Files must be under 8 MB.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        kind,
        title: cleanTitle,
        ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(file
          ? {
              file: {
                name: file.name,
                mime: file.type || "application/octet-stream",
                base64: await fileToBase64(file),
              },
            }
          : {}),
      };
      const reply = await save({ data: payload });
      if (!reply.ok) {
        toast.error(reply.error);
        return;
      }
      // Feed the learner profile: saved material counts as light exposure.
      reply.item.topicIds.forEach((topicId) =>
        actions.addLearnerSignal({ topicId, kind: "knowledge" }),
      );
      toast.success(
        reply.item.topicIds.length
          ? `Saved and connected to ${reply.item.topicIds.length} topic${reply.item.topicIds.length === 1 ? "" : "s"}.`
          : "Saved to your Second Brain.",
      );
      setTitle("");
      setSourceUrl("");
      setNotes("");
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch {
      toast.error("Could not save that item. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const reply = await remove({ data: { id } });
    if (!reply.ok) {
      toast.error(reply.error);
      return;
    }
    await refresh();
  }

  async function onSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    // Clear the last answer straight away so a new question never sits under an
    // old one.
    setAnswer(null);
    setMatches([]);
    setAsked(q);
    setSearching(true);
    const reply = await ask({ data: { query: q } });
    setSearching(false);
    if (!reply.ok) {
      setAsked(null);
      toast.error(reply.error);
      return;
    }
    setAnswer(reply.answer);
    setMatches(reply.matches);
    setQuery("");
  }

  function clearAnswer() {
    setAnswer(null);
    setMatches([]);
    setAsked(null);
    setQuery("");
  }

  async function openFile(path: string) {
    const reply = await fileUrl({ data: { path } });
    if (!reply.ok) {
      toast.error(reply.error);
      return;
    }
    window.open(reply.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saved items" value={String(items.length)} />
        <StatCard label="Concepts extracted" value={String(stats.concepts)} />
        <StatCard label="Topics connected" value={String(stats.covered)} />
        <StatCard label="Gaps flagged" value={String(stats.gaps)} />
      </div>

      <Panel
        title="Ask your own material"
        description="Plain English. Answers come only from what you have saved, never from general AI knowledge."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSearch();
            }}
            placeholder="What did my notes say about subnetting a /26?"
          />
          <Button onClick={() => void onSearch()} disabled={searching || items.length === 0}>
            {searching ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
            Search
          </Button>
        </div>
        {answer ? (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              From your saved material
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{answer}</p>
            {matches.length ? (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {matches.map((m) => (
                  <li key={m.id}>
                    <span className="text-foreground">{m.title}</span>, {m.why}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Add to Knowledge"
        description="Anything counts: a link with a note, a pasted article, a screenshot of a lab, a PDF study guide."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="k-kind">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as KnowledgeKind)}>
              <SelectTrigger id="k-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="k-title">Title</Label>
            <Input
              id="k-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Professor Messer, DHCP process"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="k-url">Link (optional)</Label>
            <Input
              id="k-url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="k-notes">Your notes (optional)</Label>
            <Textarea
              id="k-notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you took away from it, in your own words."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="k-text">Pasted text (optional)</Label>
            <Textarea
              id="k-text"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the article, transcript or command output here."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="k-file">File (optional, image, PDF or text, under 8 MB)</Label>
            <Input
              id="k-file"
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf,text/plain,text/markdown"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void onSave()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            {saving ? "Reading and connecting…" : "Add to Knowledge"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Saving reads the material once and links it to your topics and certifications.
          </p>
        </div>
      </Panel>

      <Panel title="Your library" description="Everything you have saved, newest first.">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your material…</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="Nothing saved yet"
            body="Add your first note, link or screenshot above. Once it is in, the tutor, lessons and study plan can use it."
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onDelete={() => void onDelete(item.id)}
                onOpenFile={() => item.filePath && void openFile(item.filePath)}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function KnowledgeCard({
  item,
  onDelete,
  onOpenFile,
}: {
  item: KnowledgeItem;
  onDelete: () => void;
  onOpenFile: () => void;
}) {
  const Icon = kindIcon(item.kind);
  return (
    <li className="rounded-lg border border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <Icon className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{item.title}</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {item.kind}
            {item.status === "pending" ? " · not read yet" : ""}
            {item.status === "failed" ? " · could not be read" : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {item.sourceUrl ? (
            <Button asChild variant="ghost" size="icon" aria-label="Open source link">
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
              </a>
            </Button>
          ) : null}
          {item.filePath ? (
            <Button variant="ghost" size="icon" aria-label="Open file" onClick={onOpenFile}>
              <FileText aria-hidden />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" aria-label="Delete item" onClick={onDelete}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      {item.summary ? <p className="mt-3 text-sm text-muted-foreground">{item.summary}</p> : null}

      {item.concepts.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.concepts.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
        </div>
      ) : null}

      {item.topicIds.length ? (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">Connects to: </span>
          {item.topicIds.map((id, i) => (
            <span key={id}>
              {i > 0 ? ", " : ""}
              <Link
                to="/topics/$topicId"
                params={{ topicId: id }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {topicTitle(id)}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      {item.certIds.length ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Certifications: {item.certIds.map(certTitle).join(", ")}
        </p>
      ) : null}

      {item.gaps.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Still missing after this
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {item.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.contradictions.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-destructive">
            Check this, conflicts with standard practice
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {item.contradictions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
