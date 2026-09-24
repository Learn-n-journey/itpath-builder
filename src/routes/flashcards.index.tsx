import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Layers, Sparkles } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/static-content";
import { deckCounts, deckFor, topicFlashcards } from "@/lib/flashcards";
import { journeyTopics } from "@/lib/journey-order";
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flashcards/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Flashcards | IT PATH" },
      { name: "description", content: "Spaced repetition flashcards built from the material in every IT PATH section." },
      { property: "og:title", content: "Flashcards | IT PATH" },
      { property: "og:description", content: "Fast mobile revision from the material in your sections, spaced so it sticks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlashcardsIndex,
});

type DeckFilter = "all" | "due" | "learning" | "mastered";

function FlashcardsIndex() {
  const { user } = useAppState();
  const [filter, setFilter] = useState<DeckFilter>("all");

  const decks = useMemo(() => {
    const sections = journeyTopics(user);
    const list = sections.length > 0 ? sections : topics;
    return list
      .map((topic) => {
        const cards = topicFlashcards(topic.id);
        return { topic, counts: deckCounts(cards, user) };
      })
      .filter((entry) => entry.counts.total > 0);
  }, [user]);

  const overall = useMemo(
    () => deckCounts(deckFor(decks.map((deck) => deck.topic.id)), user),
    [decks, user],
  );

  const filteredDecks = useMemo(
    () =>
      decks.filter(({ counts }) => {
        if (filter === "due") return counts.due > 0;
        if (filter === "learning") return counts.learning > 0;
        if (filter === "mastered") return counts.known > 0;
        return true;
      }),
    [decks, filter],
  );

  const firstReady = decks.find(({ counts }) => counts.due > 0) ?? decks[0];

  return (
    <>
      <PageHeader
        title="Flashcards"
        description="Build recall with short, focused review sessions from the material you are learning."
      />

      {decks.length === 0 ? (
        <EmptyState title="No cards yet" body="Cards appear as soon as your learning path has sections with written material." />
      ) : (
        <>
          <div className="border-y border-border/70">
            <div className="grid grid-cols-4 divide-x divide-border/70">
              <FlashStat value={overall.total} label="Total" />
              <FlashStat value={overall.known} label="Known" />
              <FlashStat value={overall.learning} label="Learning" />
              <FlashStat value={overall.unseen} label="New" />
            </div>
          </div>

          {firstReady ? (
            <section className="mt-6 overflow-hidden rounded-xl border border-primary/40 bg-card/40">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="size-4" aria-hidden />
                  Ready to study
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold">
                  {overall.due > 0 ? `${overall.due} cards are ready for review` : "Start with a fresh set of cards"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {overall.due > 0
                    ? "Jump back into cards that are ready now, or choose a specific topic below."
                    : "Nothing is scheduled yet. Pick a topic and start building your recall."}
                </p>
                <Button asChild className="mt-5">
                  <Link to="/flashcards/$topicId" params={{ topicId: firstReady.topic.id }}>
                    <Layers className="size-4" aria-hidden />
                    {overall.due > 0 ? "Start review" : "Start studying"}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </section>
          ) : null}

          <section className="mt-7">
            <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">Your decks</h2>
                <p className="mt-1 text-xs text-muted-foreground">{decks.length} topics with flashcards</p>
              </div>
              <div className="grid grid-cols-4 rounded-lg border border-border/70 bg-card/30 p-1">
                {(["all", "due", "learning", "mastered"] as const).map((item) => (
                  <button key={item} type="button" onClick={() => setFilter(item)}
                    className={cn("rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors sm:text-sm",
                      filter === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {filteredDecks.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No decks match this view yet.</div>
            ) : (
              <div className="grid gap-3 pt-4 md:grid-cols-2">
                {filteredDecks.map(({ topic, counts }) => {
                  const progress = counts.total > 0 ? (counts.known / counts.total) * 100 : 0;
                  return (
                    <Link key={topic.id} to="/flashcards/$topicId" params={{ topicId: topic.id }}
                      className="group rounded-xl border border-border/70 bg-card/30 p-4 transition-colors hover:border-primary/50 hover:bg-card/60 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold leading-snug group-hover:text-primary">{topic.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {counts.total} cards · {counts.known} known
                            {counts.learning > 0 ? ` · ${counts.learning} learning` : ""}
                          </p>
                        </div>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                      </div>
                      <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{counts.due > 0 ? `${counts.due} ready now` : "Review anytime"}</span>
                        <span className="font-medium text-primary">Study</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function FlashStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 px-2 py-3 text-center sm:px-4 sm:py-4">
      <p className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}
