import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Layers } from "lucide-react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/static-content";
import { deckCounts, deckFor, topicFlashcards } from "@/lib/flashcards";
import { journeyTopics } from "@/lib/journey-order";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/flashcards/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Flashcards | IT PATH" },
      {
        name: "description",
        content:
          "Spaced repetition flashcards built from the key terms, quick reference, exam traps and self checks in every IT PATH section.",
      },
      { property: "og:title", content: "Flashcards | IT PATH" },
      {
        property: "og:description",
        content: "Fast mobile revision from the material in your sections, spaced so it sticks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlashcardsIndex,
});

function FlashcardsIndex() {
  const { user } = useAppState();

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

  return (
    <>
      <PageHeader
        title="Flashcards"
        description="Every card comes from the material in your sections: key terms, quick reference, exam traps, common mix-ups and self checks."
      />

      {decks.length === 0 ? (
        <EmptyState
          title="No cards yet"
          body="Cards appear as soon as your certificate has sections with written material."
        />
      ) : (
        <>
          <Panel
            title="Due now"
            description={`${overall.due} card${overall.due === 1 ? "" : "s"} ready across ${decks.length} section${decks.length === 1 ? "" : "s"}.`}
            className="mb-6"
          >
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="tabular-nums">{overall.total} cards in total</span>
              <span className="text-muted-foreground tabular-nums">{overall.known} known</span>
              <span className="text-muted-foreground tabular-nums">{overall.learning} still learning</span>
              <span className="text-muted-foreground tabular-nums">{overall.unseen} not seen yet</span>
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2">
            {decks.map(({ topic, counts }) => (
              <Panel key={topic.id} title={topic.title} description={`${counts.total} cards`}>
                <p className="text-sm text-muted-foreground">
                  {counts.due > 0
                    ? `${counts.due} due now, ${counts.known} known.`
                    : `Nothing due right now. ${counts.known} known.`}
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/flashcards/$topicId" params={{ topicId: topic.id }}>
                    <Layers aria-hidden />
                    {counts.due > 0 ? "Study these" : "Review anyway"}
                  </Link>
                </Button>
              </Panel>
            ))}
          </div>
        </>
      )}
    </>
  );
}
