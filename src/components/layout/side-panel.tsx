/**
 * Second Brain side panel.
 *
 * Opens beside whatever you are reading so you can ask your own saved material
 * a question without leaving the lesson.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Highlighter, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { prependKnowledgeCache } from "@/hooks/use-knowledge";
import { saveKnowledge, searchKnowledge } from "@/lib/knowledge.functions";
import { cn } from "@/lib/utils";

const MAX_QUICK_NOTE_LENGTH = 200_000;

function selectedPageText(): string {
  if (typeof window === "undefined") return "";
  return window.getSelection()?.toString().trim() ?? "";
}

function pageSourceUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.href.slice(0, 2_000);
}

function pageTitle(): string {
  if (typeof document === "undefined") return "this page";
  return document.title.trim() || "this page";
}

export function SidePanel({ className }: { className?: string }) {
  const ask = useServerFn(searchKnowledge);
  const save = useServerFn(saveKnowledge);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<{ id: string; title: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [selectionReady, setSelectionReady] = useState(false);

  function addSelectionToQuickNote() {
    const selection = selectedPageText();
    if (!selection) {
      toast.error("Highlight some text on the page first.");
      return;
    }
    setQuickNote((current) => {
      const next = current.trim() ? `${current.trim()}\n\n${selection}` : selection;
      return next.slice(0, MAX_QUICK_NOTE_LENGTH);
    });
    setQuickTitle((current) => current.trim() || `Highlight from ${pageTitle()}`);
    setSelectionReady(true);
  }

  function captureSelectionBeforeOpen() {
    const selection = selectedPageText();
    if (!selection) return;
    setQuickNote((current) => current.trim() || selection.slice(0, MAX_QUICK_NOTE_LENGTH));
    setQuickTitle((current) => current.trim() || `Highlight from ${pageTitle()}`);
    setSelectionReady(true);
  }

  async function onQuickSave() {
    const body = quickNote.trim();
    if (!body) {
      toast.error("Write a note or highlight text before saving.");
      return;
    }
    setQuickSaving(true);
    try {
      const sourceUrl = pageSourceUrl();
      const reply = await save({
        data: {
          kind: "note",
          title: quickTitle.trim() || "Quick note",
          ...(sourceUrl ? { sourceUrl } : {}),
          text: body,
        },
      });
      if (!reply.ok) {
        toast.error(reply.error);
        return;
      }
      prependKnowledgeCache(reply.item);
      toast.success("Saved to your Second Brain.");
      setQuickTitle("");
      setQuickNote("");
      setSelectionReady(false);
    } catch {
      toast.error("Could not save that note. Try again.");
    } finally {
      setQuickSaving(false);
    }
  }

  async function onAsk() {
    const question = query.trim();
    if (question.length < 2) return;
    setBusy(true);
    setAnswer(null);
    setSources([]);
    setError(null);
    try {
      const reply = await ask({ data: { query: question } });
      if (reply.ok) {
        setAnswer(reply.answer);
        setSources(reply.matches.map((match) => ({ id: match.id, title: match.title })));
        setQuery("");
      } else {
        setError(reply.error);
      }
    } catch {
      setError("Could not reach your material just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ask your own notes (Second Brain)"
          title="Second Brain: ask your own saved notes"
          onPointerDown={captureSelectionBeforeOpen}
          className={cn(
            "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-40 flex size-12 items-center justify-center rounded-full border border-primary/40 bg-background/80 text-primary shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:border-primary/70 hover:bg-primary/10 active:scale-95 sm:right-4 lg:bottom-6 lg:right-6",
            className,
          )}
        >
          <img
            src="/ChatGPT%20Image%20Sep%2027%2C%202026%2C%2010_08_55%20PM.png"
            alt=""
            className="size-9 object-contain"
            aria-hidden
          />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader className="p-0">
          <SheetTitle>Ask your own material</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">
          Your saved notes, articles and transcripts, right beside the page you are on.
        </p>
        <Textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What do my notes say about 32 bit versus 64 bit?"
          rows={3}
        />
        <Button onClick={onAsk} disabled={busy || query.trim().length < 2}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
          {busy ? "Reading your material" : "Ask"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {answer ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
            {sources.length > 0 ? (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">From</p>
                <ul className="mt-1 space-y-0.5">
                  {sources.map((source) => (
                    <li key={source.id}>{source.title}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <section
          className="space-y-3 rounded-xl border border-border/70 bg-card/30 p-3"
          aria-labelledby="quick-add-note-title"
        >
          <div>
            <h2 id="quick-add-note-title" className="text-sm font-semibold">
              Quick add note
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Save a thought here, or highlight text before opening this panel and bring it in.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="second-brain-quick-note-title">Title (optional)</Label>
            <Input
              id="second-brain-quick-note-title"
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              placeholder="Quick note"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="second-brain-quick-note-body">Note</Label>
            <Textarea
              id="second-brain-quick-note-body"
              value={quickNote}
              onChange={(event) => {
                setQuickNote(event.target.value.slice(0, MAX_QUICK_NOTE_LENGTH));
                setSelectionReady(false);
              }}
              placeholder="Write a quick note in your own words…"
              rows={5}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addSelectionToQuickNote}>
              {selectionReady ? <Check aria-hidden /> : <Highlighter aria-hidden />}
              {selectionReady ? "Selection added" : "Add highlighted text"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void onQuickSave()}
              disabled={quickSaving || !quickNote.trim()}
            >
              {quickSaving ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Save aria-hidden />
              )}
              {quickSaving ? "Saving…" : "Save note"}
            </Button>
          </div>
        </section>
        <Link
          to="/knowledge"
          onClick={() => setOpen(false)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Open the full Second Brain
        </Link>
      </SheetContent>
    </Sheet>
  );
}
