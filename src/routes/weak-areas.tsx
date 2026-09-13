import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generatedQuestions } from "@/data/question-bank";
import { questions as staticQuestions, topics } from "@/data/static-content";
import { missedQuestions } from "@/lib/missed-questions";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";
import type { Question, Quiz } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/weak-areas")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Weak Areas Quiz — IT PATH" },
      {
        name: "description",
        content: "A quiz built from the questions and topics you have actually got wrong, so retakes clear your review list.",
      },
      { property: "og:title", content: "Weak Areas Quiz — IT PATH" },
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

  /** Topics you have got something wrong in, strongest signal first. */
  const weakTopicIds = useMemo(() => {
    const counts = new Map<string, number>();
    const add = (id?: string) => {
      if (!id) return;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    };
    for (const mistake of user.mistakes) {
      if (mistake.resolved) continue;
      add(mistake.topicId);
    }
    for (const item of missed) {
      if (item.kind === "quiz") add(item.question.topicId);
      if (item.kind === "recall") add(item.recall.topicId);
      if (item.kind === "practice") add(item.assignment.topicId);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [missed, user.mistakes]);

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

  const weakTopics = weakTopicIds
    .map((id) => topics.find((topic) => topic.id === id))
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  return (
    <>
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
        <StatCard label="Weak topics" value={weakTopics.length} />
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

        {weakTopics.length > 0 ? (
          <Panel title="Topics in this set" description="Where your open mistakes are concentrated.">
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((topic) => (
                <Badge key={topic.id} variant="outline">
                  {topic.title}
                </Badge>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
