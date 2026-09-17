import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generatedQuestions } from "@/data/question-bank";
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

function WeakAreas() {
  const { user, actions } = useAppState();
  const [seed, reshuffle] = useShuffleSeed();

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
      const bank = [...staticQuestions, ...generatedQuestions].filter(
        (question) => weakTopicIds.includes(question.topicId) && !chosenIds.has(question.id),
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
        description="A quiz assembled from your own mistakes. Nothing appears here until you have missed something."
        actions={
          <Button variant="outline" onClick={reshuffle} disabled={pool.length === 0}>
            <RefreshCw /> Rebuild set
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Open mistakes" value={missed.length} />
        <a href="#why-weak" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StatCard label="Weak topics" value={weakTopics.length} hint="Tap to see why" />
        </a>
        <StatCard label="Questions in set" value={pool.length} />
        <StatCard
          label="Cleared"
          value={user.mistakes.filter((mistake) => mistake.resolved).length}
        />
      </div>

      <div className="mt-6 space-y-4">
        {quiz ? (
          <QuizRunner quiz={quiz} questions={pool} startLabel="Start weak areas quiz" />
        ) : (
          <Panel
            title="Nothing to retake yet"
            description="This quiz is built from real mistakes, so it stays empty until you have missed a question."
          >
            <p className="text-sm text-muted-foreground">
              Take a quiz, work a practice task, or answer recall questions in a lesson. Anything you get wrong
              appears here and in Review.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/quiz-me">Go to Quiz Me</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/learn">Open a lesson</Link>
              </Button>
            </div>
          </Panel>
        )}

        {weakBreakdown.length > 0 ? (
          <Panel
            id="why-weak"
            title="Why these topics are flagged"
            description="Every topic here is on the list because of something you actually answered. Here is each one, and what it came from."
          >
            <div className="space-y-3">
              {weakBreakdown.map((group) => (
                <div key={group.topicId} className="rounded-xl border border-border/70 bg-secondary/25 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold">
                      {group.topic?.title ?? group.topicId}
                    </h3>
                    <Badge variant="outline">
                      {group.items.length} open {group.items.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {group.items.slice(0, 4).map((item) => (
                      <li key={item.mistake.id} className="text-sm text-muted-foreground">
                        <span className="text-xs uppercase tracking-wide text-primary">
                          {sourceLabel(item)}
                        </span>
                        <p className="mt-0.5 leading-6">{missedQuestionPrompt(item)}</p>
                      </li>
                    ))}
                    {group.items.length > 4 ? (
                      <li className="text-xs text-muted-foreground">
                        and {group.items.length - 4} more in Review.
                      </li>
                    ) : null}
                  </ul>
                  {group.topic ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/topics/$topicId" params={{ topicId: group.topic.id }}>
                          Open the lesson
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/review">See it in Review</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
