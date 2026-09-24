import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Brain, Clock3, RefreshCw, Sparkles, Target, Trophy } from "lucide-react";
import { useMemo } from "react";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { PageHeader } from "@/components/page-kit";
import { QuizRunner, quizQuestions } from "@/components/quiz/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { quizzes, topics } from "@/data/static-content";
import { getCertQuizQuestions, getCertQuizzes } from "@/data/cert-quizzes";
import { selectedCertification } from "@/lib/adaptive-path";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/quiz-me")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { quiz?: string } =>
    typeof search["quiz"] === "string" && search["quiz"] ? { quiz: search["quiz"] } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "IT Knowledge Quiz | IT PATH" },
      { name: "description", content: "Take randomized IT quizzes with saved results and targeted review." },
      { property: "og:title", content: "IT Knowledge Quiz | IT PATH" },
      { property: "og:description", content: "Reasoning-focused IT quizzes with explanations and immutable attempt history." },
    ],
  }),
  component: QuizMe,
});

function QuizMe() {
  const { user } = useAppState();
  const [seed, reshuffle] = useShuffleSeed();
  const focus = selectedCertification(user.settings);
  const focusTopicIds = useMemo(
    () => new Set(topics.filter((topic) => topic.certificationId === focus.id).map((topic) => topic.id)),
    [focus.id],
  );
  const available = useMemo(() => {
    const general = [...quizzes, ...getCertQuizzes()].filter((item) => item.kind !== "assessment");
    const focused = general.filter((quiz) => quiz.topicIds.some((id) => focusTopicIds.has(id)));
    return focused.length > 0 ? focused : general;
  }, [focusTopicIds]);
  const { quiz: requestedQuizId } = Route.useSearch();
  const quiz = useMemo(() => {
    const requested = requestedQuizId
      ? [...quizzes, ...getCertQuizzes()].find((item) => item.id === requestedQuizId)
      : undefined;
    return requested ?? shuffleWithSeed(available, seed)[0];
  }, [available, seed, requestedQuizId]);
  const pool = useMemo(() => (quiz ? quizQuestions(quiz, getCertQuizQuestions()) : []), [quiz]);

  if (!quiz) return null;

  const attempts = user.quizAttempts.filter(
    (attempt) => attempt.quizId === quiz.id && attempt.status === "submitted",
  );
  const best = attempts.reduce((value, item) => Math.max(value, item.score), 0);
  const reasoning = pool.filter((item) => item.requiresReasoning).length;
  const topicNames = quiz.topicIds
    .map((id) => topics.find((topic) => topic.id === id)?.title)
    .filter((title): title is string => Boolean(title));
  const focusLabel = topicNames[0] ?? "Mixed knowledge";
  const estimatedMinutes = Math.max(3, Math.ceil(pool.length * 0.6));

  return (
    <div>
      <PageHeader
        title="Quiz Me"
        description="Test what you know with an on-demand knowledge challenge."
      />

      <section className="relative mt-2 overflow-hidden rounded-2xl border border-primary/45 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-lg">
        <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="size-4" aria-hidden />Ready to test yourself?
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold">{quiz.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{focusLabel}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline"><Brain className="mr-1 size-3" />{pool.length} questions</Badge>
            <Badge variant="outline"><Clock3 className="mr-1 size-3" />~{estimatedMinutes} min</Badge>
            <Badge variant="outline"><Target className="mr-1 size-3" />{reasoning > 0 ? "Mixed reasoning" : "Knowledge check"}</Badge>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Selected from your current learning focus. Question and choice order change with each attempt.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={reshuffle}>
            <RefreshCw className="size-4" /> Pick another
          </Button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-border py-3" aria-label="Quiz statistics">
        <QuizStat value={pool.length} label="Questions" />
        <QuizStat value={attempts.length} label="Attempts" />
        <QuizStat value={attempts.length ? `${best}%` : "—"} label="Best" />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Current challenge</p>
            <h2 className="mt-1 font-display text-lg font-semibold">{focusLabel}</h2>
          </div>
          <ArrowRight className="size-5 text-primary" aria-hidden />
        </div>
        <QuizRunner quiz={quiz} questions={pool} startLabel="Start Quiz" />
      </section>

      {attempts.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border/70 bg-card/70 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" aria-hidden />
            <h2 className="font-display text-base font-semibold">Performance</h2>
          </div>
          <div className="mt-3 grid grid-cols-2 divide-x divide-border">
            <QuizStat value={`${attempts[0]?.score ?? 0}%`} label="Last attempt" />
            <QuizStat value={`${best}%`} label="Personal best" />
          </div>
        </section>
      ) : null}

      <div className="mt-6">
        <AnnotationPanel
          target={{ kind: "quiz", id: quiz.id, label: quiz.title, href: "/quiz-me" }}
          title="Quiz notes and bookmark"
          description="Record what you got wrong here; it appears in your Bookmarks view."
        />
      </div>
    </div>
  );
}

function QuizStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-[0.625rem] text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}
