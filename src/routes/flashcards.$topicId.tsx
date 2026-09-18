import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { getTopic } from "@/lib/app-data/selectors";
import {
  applyAnswer,
  deckCounts,
  dueCards,
  flashcardKindLabels,
  topicFlashcards,
  type Flashcard,
} from "@/lib/flashcards";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/flashcards/$topicId")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const topic = getTopic(params.topicId);
    const title = topic ? `${topic.title} flashcards | IT PATH` : "Flashcards | IT PATH";
    const description = topic
      ? `Spaced repetition cards for ${topic.title}, built from the key terms, quick reference and exam traps in the lesson.`
      : "Spaced repetition flashcards for IT PATH sections.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: FlashcardRunner,
});

function FlashcardRunner() {
  const { topicId } = Route.useParams();
  const { user, updateUser } = useAppState();
  const topic = getTopic(topicId);

  const allCards = useMemo(() => topicFlashcards(topicId), [topicId]);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [started, setStarted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);

  // Built after mount so the first paint matches the server render.
  useEffect(() => {
    const due = dueCards(allCards, user);
    setQueue(due.length > 0 ? due : allCards);
    setStarted(true);
    setFlipped(false);
    setDone(0);
    // The queue is fixed when the deck opens, so answering does not reshuffle it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, allCards]);

  const counts = useMemo(() => deckCounts(allCards, user), [allCards, user]);
  const card = queue[done];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!topic) {
    return (
      <>
        <PageHeader title="Section not found" description="This section does not exist." />
        <Button asChild>
          <Link to="/flashcards">Back to flashcards</Link>
        </Button>
      </>
    );
  }

  function answer(result: "known" | "unknown") {
    if (!card) return;
    updateUser((current) => applyAnswer(current, card, result));
    setFlipped(false);
    setDone((value) => value + 1);
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3">
        <Link to="/flashcards">
          <ArrowLeft aria-hidden />
          All decks
        </Link>
      </Button>

      <PageHeader
        title={`${topic.title} flashcards`}
        description="Tap the card or press space to turn it over, then say whether you had it."
      />

      {allCards.length === 0 ? (
        <EmptyState
          title="No cards for this section yet"
          body="Cards are built from the key terms, quick reference and exam traps in the lesson."
        />
      ) : !started ? null : !card ? (
        <Panel title="Deck finished" description="Everything in this run has been answered.">
          <p className="text-sm text-muted-foreground">
            {counts.known} known, {counts.learning} still learning, {counts.due} available.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setQueue(allCards);
                setDone(0);
                setFlipped(false);
              }}
            >
              <RotateCcw aria-hidden />
              Run the whole deck again
            </Button>
            <Button asChild variant="secondary">
              <Link to="/topics/$topicId" params={{ topicId: topic.id }}>
                Back to the section
              </Link>
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground tabular-nums">
            Card {done + 1} of {queue.length} · {flashcardKindLabels[card.kind]}
          </p>

          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            className="panel flex min-h-[15rem] w-full flex-col items-center justify-center gap-4 p-6 text-center sm:min-h-[18rem]"
          >
            <span className="text-base font-medium leading-relaxed sm:text-lg">{card.front}</span>
            {flipped ? (
              <span className="max-w-2xl border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {card.back}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Tap to turn it over</span>
            )}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="h-14"
              disabled={!flipped}
              onClick={() => answer("unknown")}
            >
              <X aria-hidden />
              Not yet
            </Button>
            <Button size="lg" className="h-14" disabled={!flipped} onClick={() => answer("known")}>
              <Check aria-hidden />
              Got it
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            A card you know comes back later, a card you miss comes back tomorrow. Turn the card over
            before answering so the result means something.
          </p>
        </>
      )}
    </>
  );
}
