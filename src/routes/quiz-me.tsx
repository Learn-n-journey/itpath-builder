import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { PageHeader, StatCard } from "@/components/page-kit";
import { QuizRunner, quizQuestions } from "@/components/quiz/quiz-runner";
import { Button } from "@/components/ui/button";
import { quizzes, topics } from "@/data/static-content";
import { certQuizQuestions, certQuizzes } from "@/data/cert-quizzes";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";
import { selectedCertification } from "@/lib/adaptive-path";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/quiz-me")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { quiz?: string } =>
    typeof search['quiz'] === "string" && search['quiz'] ? { quiz: search['quiz'] } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "IT Foundations Quiz | IT PATH" },
      { name: "description", content: "Take randomized IT quizzes with saved results and targeted review." },
      { property: "og:title", content: "IT Foundations Quiz | IT PATH" },
      {
        property: "og:description",
        content: "Reasoning-focused IT quizzes with explanations and immutable attempt history.",
      },
    ],
  }),
  component: QuizMe,
});

function QuizMe() {
  const { user } = useAppState();
  const [seed, reshuffle] = useShuffleSeed();
  const focus = selectedCertification(user.settings);
  const focusTopicIds = useMemo(() => new Set(topics.filter((topic) => topic.certificationId === focus.id).map((topic) => topic.id)), [focus.id]);
  const available = useMemo(() => {
    const general = [...quizzes, ...certQuizzes].filter((item) => item.kind !== "assessment");
    const focused = general.filter((quiz) => quiz.topicIds.some((id) => focusTopicIds.has(id)));
    return focused.length > 0 ? focused : general;
  }, [focusTopicIds]);
  const { quiz: requestedQuizId } = Route.useSearch();
  const quiz = useMemo(() => {
    const requested = requestedQuizId
      ? [...quizzes, ...certQuizzes].find((item) => item.id === requestedQuizId)
      : undefined;
    return requested ?? shuffleWithSeed(available, seed)[0];
  }, [available, seed, requestedQuizId]);
  const pool = useMemo(() => (quiz ? quizQuestions(quiz, certQuizQuestions) : []), [quiz]);

  if (!quiz) return null;

  const attempts = user.quizAttempts.filter(
    (attempt) => attempt.quizId === quiz.id && attempt.status === "submitted",
  );
  const best = attempts.reduce((value, item) => Math.max(value, item.score), 0);
  const reasoning = pool.filter((item) => item.requiresReasoning).length;

  return (
    <>
      <PageHeader
        title="Quiz Me"
        description={`A ${focus.title} quiz is picked at random when available. Question and choice order change with every attempt.`}
        actions={
          <Button variant="outline" onClick={reshuffle}>
            <RefreshCw /> New quiz
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Questions" value={pool.length} />
        <StatCard
          label="Reasoning"
          value={pool.length ? `${Math.round((reasoning / pool.length) * 100)}%` : "-"}
        />
        <StatCard label="Attempts" value={attempts.length} />
        <StatCard label="Best score" value={attempts.length ? `${best}%` : "-"} />
      </div>
      <div className="mt-6 space-y-4">
        <QuizRunner quiz={quiz} questions={pool} />
        <AnnotationPanel
          target={{ kind: "quiz", id: quiz.id, label: quiz.title, href: "/quiz-me" }}
          title="Quiz notes and bookmark"
          description="Record what you got wrong here; it appears in your Bookmarks view."
        />
      </div>
    </>
  );
}
