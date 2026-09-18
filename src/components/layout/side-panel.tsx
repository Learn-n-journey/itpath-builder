/**
 * Second Brain side panel.
 *
 * Opens beside whatever you are reading so you can ask your own saved material
 * a question without leaving the lesson.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { searchKnowledge } from "@/lib/knowledge.functions";
import { cn } from "@/lib/utils";

export function SidePanel({ className }: { className?: string }) {
  const ask = useServerFn(searchKnowledge);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<{ id: string; title: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          className={cn(
            "fixed bottom-4 right-4 z-40 flex size-12 items-center justify-center rounded-full border border-primary/40 bg-background/80 text-primary shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:border-primary/70 hover:bg-primary/10 active:scale-95 lg:bottom-6 lg:right-6",
            className,
          )}
        >
          <Brain className="size-5" aria-hidden />
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
