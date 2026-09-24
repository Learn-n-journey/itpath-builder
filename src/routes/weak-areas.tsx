import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, ChevronRight, RefreshCw, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, Panel } from "@/components/page-kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bankQuestions } from "@/data/question-bank";
import { ownerTopicIds } from "@/lib/owner-question-store";
import { questions as staticQuestions, topics } from "@/data/static-content";
import {
  missedQuestionPrompt,
  missedQuestions,
  type MissedQuestion,
} from "@/lib/missed-questions";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";
import type { Question, Quiz } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";
import { SectionTabs, REVIEW_TABS } from "@/components/layout/section-tabs";

export const Route = createFileRoute("/weak-areas")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Weak Areas Quiz | IT PATH" },
      {
        name: "description",
        content: "A quiz built from the questions and topics you have actually got wrong, so retakes clear your review list.",
      },
      { property: "og:title", content: "Weak Areas Quiz | IT PATH" },
      {
        property: "og:description",
        content: "Retake the questions you missed and the topics behind them; correct answers clear them from Review.",
      },
    ],
  }),
  component: WeakAreas,
});

const TARGET = 12;

function WeakStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="font-display text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
      <p className="mt-1 truncate text-[0.625rem] text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function WeakAreas() {
  const { user, actions } = useAppState();
  const [seed, reshuffle] = useShuffleSeed();
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const missed = useMemo(() => missedQuestions(user), [user]);

  /**
   * Topics you have got something wrong in, strongest signal first, with the
   * actual items behind each one so the count can always be explained.
   */
  const weakBreakdown = useMemo(() => {
    const groups = new Map<string, MissedQuestion[]>();
    for (const item of missed) {
      const topicId =
        item.kind === "quiz"
          ? item.question.topicId
          : item.kind === "recall"
            ? item.recall.topicId
            : item.assignment.topicId;
      const list = groups.get(topicId) ?? [];
      list.push(item);
      groups.set(topicId, list);
    }
    return [...groups.entries()]
      .map(([topicId, items]) => ({
        topicId,
        topic: topics.find((candidate) => candidate.id === topicId),
        items,
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [missed]);

  const weakTopicIds = useMemo(() => weakBreakdown.map((group) => group.topicId), [weakBreakdown]);

  const pool = useMemo(() => {
    const missedQuiz = missed
      .filter((item): item is Extract<typeof item, { kind: "quiz" }> => item.kind === "quiz")
      .map((item) => item.question);
    const chosen: Question[] = [...missedQuiz];
    const chosenIds = new Set(chosen.map((question) => question.id));

    if (chosen.length < TARGET && weakTopicIds.length > 0) {
      const bank = [...staticQuestions, ...bankQuestions()].filter(
        (question) =>
          !ownerTopicIds().has(question.topicId) &&
          weakTopicIds.includes(question.topicId) &&
          !chosenIds.has(question.id),
      );
      for (const question of shuffleWithSeed(bank, seed)) {
        if (chosen.length >= TARGET) break;
        chosen.push(question);
        chosenIds.add(question.id);
      }
    }
    return shuffleWithSeed(chosen, seed);
  }, [missed, seed, weakTopicIds]);

  const quiz: Quiz | null = useMemo(() => {
    if (pool.length === 0) return null;
    return {
      id: `quiz-weak-areas-${pool.length}-${pool[0]?.id ?? "set"}`,
      title: "Weak areas quiz",
      description:
        "Every question here comes from something you got wrong, or from a topic you have missed questions in. Answer correctly and the matching item clears from Review.",
      topicIds: [...new Set(pool.map((question) => question.topicId))],
      questionIds: pool.map((question) => question.id),
      kind: "general",
    };
  }, [pool]);

  /** A correct answer on a retake clears the matching mistake. */
  useEffect(() => {
    if (!quiz) return;
    const attempt = user.quizAttempts.find(
      (item) => item.quizId === quiz.id && item.status === "submitted",
    );
    if (!attempt) return;
    const correctIds = new Set(
      attempt.results.filter((result) => result.correct).map((result) => result.questionId),
    );
    if (correctIds.size === 0) return;
    for (const mistake of user.mistakes) {
      if (mistake.resolved || !mistake.questionId) continue;
      if (correctIds.has(mistake.questionId)) actions.setMistakeResolved(mistake.id, true);
    }
  }, [actions, quiz, user.mistakes, user.quizAttempts]);

  const weakTopics = weakBreakdown
    .map((group) => group.topic)
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  function sourceLabel(item: MissedQuestion): string {
    if (item.kind === "quiz") return "Missed in a quiz";
    if (item.kind === "recall") return "Missed in a recall answer";
    return "Practice task scored under 70";
  }

  return (
    <>
      <SectionTabs tabs={REVIEW_TABS} />
      <PageHeader
        title="Weak Areas"
        description="Focus on the concepts that need another pass."
        actions={
          <Button variant="outline" size="sm" onClick={reshuffle} disabled={pool.length === 0}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-4 divide-x divide-border border-y border-border py-3" aria-label="Weak area summary">
        <WeakStat value={missed.length} label="Open" />
        <WeakStat value={weakTopics.length} label="Topics" />
        <WeakStat value={pool.length} label="Questions" />
        <WeakStat value={user.mistakes.filter((mistake) => mistake.resolved).length} label="Cleared" />
      </section>

      {weakBreakdown[0] ? (
        <section className="relative mt-5 overflow-hidden rounded-2xl border border-primary/45 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-lg">
          <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-4" aria-hidden />Next to fix
            </p>
            <h2 className="mt-3 font-display text-xl font-semibold sm:text-2xl">
              {weakBreakdown[0].topic?.title ?? weakBreakdown[0].topicId}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {missedQuestionPrompt(weakBreakdown[0].items[0]!)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{weakBreakdown[0].items.length} open {weakBreakdown[0].items.length === 1 ? "mistake" : "mistakes"}</Badge>
              <Badge variant="outline">{sourceLabel(weakBreakdown[0].items[0]!)}</Badge>
            </div>
            {weakBreakdown[0].topic ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/topics/$topicId" params={{ topicId: weakBreakdown[0].topic.id }}>
                    Review concept <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/practice">Practice it</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-5 space-y-5">
        {quiz ? (
          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Brain className="size-4" aria-hidden /></span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold">Test your weak areas</h2>
                <p className="mt-1 text-xs text-muted-foreground">{pool.length} {pool.length === 1 ? "question" : "questions"} · Built from your current open mistakes.</p>
              </div>
            </div>
            <QuizRunner quiz={quiz} questions={pool} startLabel="Start Quiz" />
          </section>
        ) : (
          <Panel
            title="Nothing to strengthen yet"
            description="This area is built from real mistakes, so it stays empty until you miss something."
          >
            <p className="text-sm text-muted-foreground">Take a quiz, work a practice task, or answer recall questions in a lesson to begin building targeted review.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild><Link to="/quiz-me">Go to Quiz Me</Link></Button>
              <Button asChild variant="outline"><Link to="/learn">Open a lesson</Link></Button>
            </div>
          </Panel>
        )}

        {weakBreakdown.length > 0 ? (
          <section id="why-weak">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Areas to strengthen</h2>
                <p className="mt-1 text-xs text-muted-foreground">{weakBreakdown.length} {weakBreakdown.length === 1 ? "topic needs" : "topics need"} attention</p>
              </div>
              <Target className="size-5 text-primary" aria-hidden />
            </div>
            <div className="space-y-2">
              {weakBreakdown.map((group) => {
                const expanded = expandedTopicId === group.topicId;
                return (
                  <div key={group.topicId} className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
                    <button type="button" aria-expanded={expanded} onClick={() => setExpandedTopicId(expanded ? null : group.topicId)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm font-semibold sm:text-base">{group.topic?.title ?? group.topicId}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Needs attention · {group.items.length} open {group.items.length === 1 ? "item" : "items"}</span>
                      </span>
                      <ChevronRight className={`size-4 shrink-0 text-primary transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden />
                    </button>
                    {expanded ? (
                      <div className="border-t border-border/70 bg-muted/20 px-4 py-4">
                        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-primary">What happened</p>
                        <div className="mt-3 space-y-3">
                          {group.items.slice(0, 4).map((item) => (
                            <div key={item.mistake.id}>
                              <p className="text-xs font-medium text-primary">{sourceLabel(item)}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{missedQuestionPrompt(item)}</p>
                            </div>
                          ))}
                        </div>
                        {group.items.length > 4 ? <p className="mt-2 text-xs text-muted-foreground">+ {group.items.length - 4} more in Review</p> : null}
                        {group.topic ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button asChild size="sm"><Link to="/topics/$topicId" params={{ topicId: group.topic.id }}>Review concept</Link></Button>
                            <Button asChild size="sm" variant="outline"><Link to="/practice">Practice it <ArrowRight /></Link></Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
