import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { questions } from "@/data/static-content";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/quiz-me")({
  head: () => ({
    meta: [
      { title: "Quiz Me — IT PATH" },
      { name: "description", content: "Test your knowledge and track every quiz attempt." },
      { property: "og:title", content: "Quiz Me — IT PATH" },
      { property: "og:description", content: "Question practice with an honest attempt history." },
    ],
  }),
  component: QuizMe,
});

function QuizMe() {
  const { user } = useAppState();
  const attempts = user.quizAttempts;
  const best = attempts.reduce((m, a) => Math.max(m, a.total ? a.score / a.total : 0), 0);

  return (
    <>
      <PageHeader
        title="Quiz Me"
        description="Recall practice drawn from the topics you have studied."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Question bank" value={questions.length} />
        <StatCard label="Attempts" value={attempts.length} />
        <StatCard label="Best score" value={attempts.length ? `${Math.round(best * 100)}%` : "—"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {questions.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title="Question bank is empty"
            body="Questions are added with each topic. Nothing can be scored until then, so your attempt history stays at zero."
          />
        ) : (
          <Panel title="Ready to practise" description={`${questions.length} questions available.`} />
        )}
        <Panel title="Attempt history">
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz attempts recorded.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {attempts.slice(0, 10).map((a) => (
                <li key={a.id} className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                  <span className="tabular-nums">
                    {a.score}/{a.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
