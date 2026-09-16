import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, CircleDot, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { MasteryChecklist } from "@/components/learning/mastery-checklist";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { topics } from "@/data/static-content";
import {
  CHECK_LABELS,
  masteryCheckPool,
  masteryCheckSet,
  type MasteryCheckKind,
  type MasteryItem,
} from "@/data/mastery-checks";
import { matchesConcept } from "@/lib/fuzzy-match";
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";

const KINDS: MasteryCheckKind[] = ["recall", "understanding", "application", "troubleshooting"];
const PASS = 80;

const findTopic = (topicId: string) => topics.find((topic) => topic.id === topicId);

export const Route = createFileRoute("/mastery-check/$topicId")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const topic = findTopic(params.topicId);
    const title = topic ? `${topic.title} mastery checks | IT PATH` : "Mastery checks | IT PATH";
    const description = topic
      ? `Prove ${topic.title} on its own terms: recall, teach back, application and troubleshooting, with new questions every run.`
      : "Prove a section on its own terms, separately from lesson practice.";
    return {
      meta: [
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  loader: ({ params }) => {
    if (!findTopic(params.topicId)) throw notFound();
    return null;
  },
  component: MasteryCheckPage,
});

function MasteryCheckPage() {
  const { topicId } = Route.useParams();
  const topic = findTopic(topicId);
  if (!topic) return null;
  const available = KINDS.filter((kind) => masteryCheckPool(topicId, kind).length > 0);

  return (
    <>
      <PageHeader
        title={`${topic.title}: mastery checks`}
        description="These are separate from the practice in the lesson. Practice is where you learn with help. These runs are the proof, each one stands on its own, and the questions are new every time."
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {available.map((kind) => (
            <CheckCard key={kind} topicId={topicId} kind={kind} />
          ))}
        </div>
        <div className="space-y-5">
          <MasteryChecklist topicId={topicId} />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link to="/topics/$topicId" params={{ topicId }}>
                Back to the lesson
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/section-quiz/$topicId" params={{ topicId }}>
                Section quiz
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function grade(item: MasteryItem, response: string): boolean {
  if (item.choices.length) return response === item.answer;
  const written = response.trim();
  if (written.length < 12) return false;
  return matchesConcept(written, item.concepts, 0.45);
}

function CheckCard({ topicId, kind }: { topicId: string; kind: MasteryCheckKind }) {
  const { user, actions } = useAppState();
  const { title, blurb } = CHECK_LABELS[kind];
  const attempts = useMemo(
    () =>
      (user.masteryCheckAttempts ?? [])
        .filter((row) => row.topicId === topicId && row.kind === kind)
        .slice()
        .reverse(),
    [user.masteryCheckAttempts, topicId, kind],
  );
  const best = attempts.length ? Math.max(...attempts.map((row) => row.score)) : 0;
  const passed = best >= PASS;

  const [items, setItems] = useState<MasteryItem[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; correct: number } | null>(null);

  function start() {
    const used = attempts.flatMap((row) => row.itemIds);
    const set = masteryCheckSet(topicId, kind, used, Date.now());
    setItems(set);
    setResponses({});
    setResult(null);
  }

  function submit() {
    if (!items.length) return;
    const unanswered = items.filter((item) => !(responses[item.id] ?? "").trim());
    if (unanswered.length) {
      toast("Answer every question first, then submit.");
      return;
    }
    const correct = items.filter((item) => grade(item, responses[item.id] ?? "")).length;
    const score = Math.round((correct / items.length) * 100);
    actions.addMasteryCheckAttempt({
      id: crypto.randomUUID(),
      topicId,
      kind,
      score,
      correct,
      total: items.length,
      itemIds: items.map((item) => item.id),
      createdAt: new Date().toISOString(),
    });
    setResult({ score, correct });
    toast(score >= PASS ? `${title} passed at ${score}%.` : `${score}%. Have another run when you are ready.`);
  }

  return (
    <Panel title={title} description={blurb}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full border",
            passed ? "border-primary bg-primary/15 text-primary" : "border-destructive/60 text-destructive",
          )}
          aria-hidden
        >
          {passed ? <Check className="size-3" /> : <CircleDot className="size-3" />}
        </span>
        <span className={passed ? "text-foreground" : "text-destructive"}>
          {passed ? `Passed at ${best}%` : attempts.length ? `Best so far ${best}%, 80% to pass` : "Not taken yet"}
        </span>
        {attempts.length ? (
          <span className="text-muted-foreground">
            {attempts.length} {attempts.length === 1 ? "run" : "runs"}
          </span>
        ) : null}
      </div>

      {!items.length ? (
        <Button className="mt-4" onClick={start}>
          {attempts.length ? <RotateCcw /> : null}
          {attempts.length ? "Run it again, new questions" : "Start the check"}
        </Button>
      ) : (
        <div className="mt-5 space-y-5">
          {items.map((item, index) => {
            const response = responses[item.id] ?? "";
            const right = result ? grade(item, response) : false;
            return (
              <div key={item.id} className="rounded-md border border-border p-4">
                <p className="text-sm font-medium">
                  {index + 1}. {item.prompt}
                </p>
                {item.choices.length ? (
                  <div className="mt-3 space-y-2">
                    {item.choices.map((choice) => (
                      <label
                        key={choice}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-md border p-3 text-sm",
                          response === choice ? "border-primary bg-primary/5" : "border-border",
                        )}
                      >
                        <input
                          type="radio"
                          name={item.id}
                          className="mt-1"
                          checked={response === choice}
                          disabled={Boolean(result)}
                          onChange={() => setResponses((current) => ({ ...current, [item.id]: choice }))}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    className="mt-3"
                    rows={4}
                    aria-label={item.prompt}
                    value={response}
                    disabled={Boolean(result)}
                    placeholder="Your own words."
                    onChange={(event) =>
                      setResponses((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                  />
                )}
                {result ? (
                  <p className={cn("mt-3 text-sm", right ? "text-success" : "text-destructive")}>
                    {right ? "That holds up. " : "Not quite yet. "}
                    <span className="text-muted-foreground">{item.explanation}</span>
                  </p>
                ) : null}
              </div>
            );
          })}

          {result ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">
                {result.correct} of {items.length}, {result.score}%.{" "}
                {result.score >= PASS ? "That one is proven." : "Another run gives you a fresh set."}
              </p>
              <Button variant="secondary" onClick={start}>
                <RotateCcw /> New questions
              </Button>
            </div>
          ) : (
            <Button onClick={submit}>
              <Send /> Submit
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}
