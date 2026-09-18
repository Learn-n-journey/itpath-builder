import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lock, PartyPopper, Share2 } from "lucide-react";
import { toast } from "sonner";

import { QuizRunner } from "@/components/quiz/quiz-runner";
import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { STAGE_EXAM_SIZE, STAGE_PASS_SCORE, getStageExam, getStageExamQuestions, stageExams } from "@/data/stage-exams";
import type { Quiz } from "@/lib/app-data/types";
import { journeyOrderedTopics, isMastered } from "@/lib/journey-order";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/stage-exam/$stageId")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const exam = getStageExam(params.stageId);
    const title = exam ? `${exam.title} | IT PATH` : "Stage exam | IT PATH";
    const description = exam?.description ?? "A twenty question stage exam on IT PATH.";
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
    if (!getStageExam(params.stageId)) throw notFound();
    return null;
  },
  component: StageExamPage,
});

function StageExamPage() {
  const { stageId } = Route.useParams();
  const exam = getStageExam(stageId);
  const { user } = useAppState();
  const [shared, setShared] = useState(false);
  const [paper] = useState(() => Math.random());

  const stageTopics = useMemo(
    () =>
      exam
        ? journeyOrderedTopics.filter((topic) => topic.month >= exam.from && topic.month <= exam.to)
        : [],
    [exam],
  );

  if (!exam) return null;

  const remaining = stageTopics.filter((topic) => !isMastered(user, topic.id));
  const attempts = user.quizAttempts.filter(
    (attempt) => attempt.quizId === exam.id && attempt.status === "submitted",
  );
  const best = attempts.reduce((top, attempt) => Math.max(top, attempt.score ?? 0), 0);
  const passed = best >= STAGE_PASS_SCORE;

  // A fresh paper every time the exam is opened, drawn from the exam domains.
  const examQuestions = useMemo(() => getStageExamQuestions(exam.id, paper), [exam.id, paper]);

  const quiz: Quiz = {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    topicIds: stageTopics.map((topic) => topic.id),
    questionIds: examQuestions.map((question) => question.id),
    kind: "assessment",
  };

  async function share() {
    const text = `I passed the ${exam!.stage} exam on IT PATH with ${best}%. ${exam!.title.replace(/^Stage \d+ exam: /, "")}. https://www.it-path.net`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "IT PATH stage exam passed", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied. Paste it wherever you like.");
      }
      setShared(true);
    } catch {
      // A cancelled share is not an error worth reporting.
    }
  }

  if (remaining.length > 0 && !passed) {
    return (
      <>
        <PageHeader title={exam.title} description={exam.description} />
        <EmptyState
          icon={Lock}
          title="Finish the stage first"
          body={`${remaining.length} topic${remaining.length === 1 ? "" : "s"} in this stage ${remaining.length === 1 ? "is" : "are"} still unproven. The exam opens once they are mastered, starting with ${remaining[0]?.title}.`}
        >
          <Button asChild>
            <Link to="/topics/$topicId" params={{ topicId: remaining[0]!.id }}>
              Open {remaining[0]!.title}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/journey">See the journey</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title={exam.title} description={exam.description} />

      {passed ? (
        <Panel
          className="mb-5 border-primary/50"
          title={`${exam.stage} complete`}
          description={`Your best score on this exam is ${best}%. The pass mark is ${STAGE_PASS_SCORE}%.`}
        >
          <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <PartyPopper className="size-7" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">{exam.stage} passed</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Fifty questions, written answers included, and {best}% of them held up. That is the whole
                stage proven, not a single lesson. Well worth telling someone about.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => void share()}>
                <Share2 aria-hidden /> {shared ? "Share again" : "Share this"}
              </Button>
              <Button asChild variant="secondary">
                <Link to="/journey">Back to the journey</Link>
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <QuizRunner
        quiz={quiz}
        questions={examQuestions}
        startLabel={passed ? "Retake the exam" : "Start the stage exam"}
        passScore={STAGE_PASS_SCORE}
      />

      <Panel className="mt-5" title="Other stage exams" description="Each one closes a stage of the journey.">
        <ul className="space-y-2">
          {stageExams.map((other) => (
            <li key={other.id}>
              <Link
                to="/stage-exam/$stageId"
                params={{ stageId: other.id }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3 text-sm transition-colors hover:border-primary/60"
              >
                <span className="min-w-0 truncate">{other.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{STAGE_EXAM_SIZE} questions</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
