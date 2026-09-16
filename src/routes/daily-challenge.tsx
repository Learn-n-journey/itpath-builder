import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Flame, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import type { Quiz } from "@/lib/app-data/types";
import { cn } from "@/lib/utils";
import {
  dailyChallenge,
  dailyDateKey,
  dailyKeyLabel,
  recentDailyKeys,
} from "@/data/daily-challenge";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/daily-challenge")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Daily Challenge | IT PATH" },
      {
        name: "description",
        content:
          "One short mixed quiz every day. The same set for everyone, compared to your own past attempts.",
      },
      { property: "og:title", content: "Daily Challenge | IT PATH" },
      {
        property: "og:description",
        content: "Five mixed questions a day, scored against your own record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyChallengePage,
});

function DailyChallengePage() {
  const { user } = useAppState();
  // The date is resolved after mount so the server render and the browser
  // always agree on which set today is.
  const [todayKey, setTodayKey] = useState<string | null>(null);
  useEffect(() => {
    setTodayKey(dailyDateKey());
  }, []);

  const challenge = useMemo(() => (todayKey ? dailyChallenge(todayKey) : null), [todayKey]);
  const historyKeys = useMemo(
    () => (todayKey ? recentDailyKeys(7, new Date(`${todayKey}T12:00:00`)) : []),
    [todayKey],
  );

  const submittedByDay = useMemo(() => {
    const map = new Map<string, { best: number; attempts: number }>();
    for (const attempt of user.quizAttempts) {
      if (!attempt.quizId.startsWith("daily-") || attempt.status !== "submitted") continue;
      const key = attempt.quizId.slice("daily-".length);
      const entry = map.get(key) ?? { best: 0, attempts: 0 };
      entry.attempts += 1;
      entry.best = Math.max(entry.best, attempt.score);
      map.set(key, entry);
    }
    return map;
  }, [user.quizAttempts]);

  const today = challenge ? submittedByDay.get(challenge.dateKey) : undefined;
  const allBest = [...submittedByDay.values()].reduce((best, entry) => Math.max(best, entry.best), 0);

  // Consecutive days ending today (or yesterday, if today is not done yet)
  // with a submitted daily challenge.
  const challengeStreak = useMemo(() => {
    let streak = 0;
    const start = today ? -1 : 0;
    if (!todayKey) return 0;
    for (let offset = start; offset > -400; offset -= 1) {
      const date = new Date(`${todayKey}T12:00:00`);
      date.setDate(date.getDate() + offset);
      const key = dailyDateKey(date);
      if (submittedByDay.has(key)) streak += 1;
      else break;
    }
    return streak;
  }, [submittedByDay, today, todayKey]);

  const quiz = useMemo(() => {
    if (!challenge) return null;
    return {
      id: challenge.id,
      title: `Daily Challenge · ${dailyKeyLabel(challenge.dateKey)}`,
      description:
        "Five mixed questions drawn from across the whole material. Same set for everyone today; your answers feed the same review and mistake engine as every other quiz.",
      topicIds: [...new Set(challenge.questions.map((question) => question.topicId))],
      questionIds: challenge.questions.map((question) => question.id),
    } satisfies Quiz;
  }, [challenge]);

  return (
    <>
      <PageHeader
        title="Daily Challenge"
        description="One short set, about three minutes. Come back tomorrow for a fresh one and keep the run going."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Today"
          value={today ? `${today.best}%` : "Not started"}
        />
        <StatCard label="Attempts today" value={today?.attempts ?? 0} />
        <StatCard label="Challenge streak" value={challengeStreak} />
        <StatCard label="Personal best" value={allBest > 0 ? `${allBest}%` : "-"} />
      </div>

      {quiz ? (
        <div className="mt-6 space-y-4">
          {challenge ? (
            <QuizRunner quiz={quiz} questions={challenge.questions} startLabel="Start today's challenge" />
          ) : (
            <QuizRunner quiz={quiz} startLabel="Start today's challenge" />
          )}
        </div>
      ) : (
        <Panel title="Loading today's set" description="One moment." />
      )}

      <Panel
        title="Your last seven days"
        description="Each box is one daily challenge. A filled box means you submitted it; the number is your best score that day."
      >
        <div className="grid grid-cols-7 gap-2">
          {historyKeys.map((key) => {
            const entry = submittedByDay.get(key);
            const isToday = key === todayKey;
            return (
              <div key={key} className="text-center">
                <div
                  className={cn(
                    "flex h-12 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-all",
                    entry
                      ? entry.best >= 80
                        ? "border-primary/50 bg-primary/20 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                        : "border-border bg-secondary text-foreground"
                      : "border-dashed border-border/70 text-muted-foreground",
                    isToday && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
                  )}
                  title={`${dailyKeyLabel(key)}: ${entry ? `${entry.best}% on attempt(s) ×${entry.attempts}` : "not done"}`}
                >
                  {entry ? entry.best : "-"}
                </div>
                <p
                  className={cn(
                    "mt-1.5 truncate text-[10px] uppercase tracking-wide",
                    isToday ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  {isToday ? "Today" : dailyKeyLabel(key).split(" ").slice(-2).join(" ")}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="How the challenge works">
        <ul className="grid gap-2 sm:grid-cols-2">
          {[
            {
              Icon: CalendarCheck,
              text: "Everyone gets the same five questions on the same day; the set changes at midnight.",
            },
            {
              Icon: Target,
              text: "Questions are mixed across topics and question styles, so it is retrieval practice, not a single-topic drill.",
            },
            {
              Icon: Flame,
              text: "Submitting on consecutive days builds the challenge streak. Retakes on the same day are fine; the best score counts.",
            },
            {
              Icon: Trophy,
              text: "Every answer is real evidence: misses land in your mistakes log and reviews, exactly like Quiz Me.",
            },
          ].map(({ Icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3 text-sm text-muted-foreground transition-colors hover:border-primary/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="leading-6">{text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
