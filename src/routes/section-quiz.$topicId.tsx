import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useMemo, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/static-content";
import {
  SECTION_PASS_SCORE,
  SECTION_QUIZ_SIZE,
  getSectionQuizQuestions,
  getTopicQuestionPool,
} from "@/data/topic-quizzes";
import type { Quiz } from "@/lib/app-data/types";
import { nextJourneyTopic, sectionQuizBest, sectionQuizPassedAt } from "@/lib/journey-order";
import { useAppState } from "@/state/app-state";

const findTopic = (topicId: string) => topics.find((topic) => topic.id === topicId);

export const Route = createFileRoute("/section-quiz/$topicId")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const topic = findTopic(params.topicId);
    const title = topic ? `${topic.title} section quiz | IT PATH` : "Section quiz | IT PATH";
    const description = topic
      ? `A ${SECTION_QUIZ_SIZE} question quiz on ${topic.title}, all multiple choice.`
      : "A section quiz on IT PATH.";
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
  component: SectionQuizPage,
});

function SectionQuizPage() {
  const { topicId } = Route.useParams();
  const topic = findTopic(topicId);
  const { user } = useAppState();
  const quizId = `section-quiz-${topicId}`;
  const takenBefore = user.quizAttempts.filter((attempt) => attempt.quizId === quizId).length;
  // Each attempt moves through the section's material, so a retake is a new set.
  const round = useRef(takenBefore);
  const questions = useMemo(() => getSectionQuizQuestions(topicId, round.current), [topicId]);
  // Every question this section can ask, so earlier attempts still show their review.
  const fullPool = useMemo(() => getTopicQuestionPool(topicId), [topicId]);
  const nextQuestions = useCallback(() => {
    round.current += 1;
    return getSectionQuizQuestions(topicId, round.current);
  }, [topicId]);
  if (!topic) return null;

  const best = sectionQuizBest(user, topicId);
  const passedAt = sectionQuizPassedAt(user, topicId);
  const passed = Boolean(passedAt) || best >= SECTION_PASS_SCORE;
  const passedOn = passedAt
    ? new Date(passedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : undefined;
  const next = passed ? nextJourneyTopic(topicId) : undefined;

  const quiz: Quiz = {
    id: quizId,
    title: `${topic.title} section quiz`,
    description: `${SECTION_QUIZ_SIZE} questions on this section, all multiple choice, with new questions each time you take it. ${SECTION_PASS_SCORE}% to pass.`,
    topicIds: [topicId],
    questionIds: questions.map((question) => question.id),
    kind: "assessment",
  };

  return (
    <>
      <PageHeader
        title={`${topic.title}: section quiz`}
        description={`${SECTION_QUIZ_SIZE} questions drawn from this section only. Every question is multiple choice, and ${SECTION_PASS_SCORE}% is a pass. Pass it and the next section opens.`}
      />

      {passed ? (
        <Panel className="mb-5 border-primary/50" title="Section passed">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            {passedOn ? `You passed this on ${passedOn}. ` : ""}Your best score here is {best}%. That pass stays
            recorded, so taking it again can only help.
          </p>
          {next ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                That opened the next section: {next.title}.
              </p>
              <Button asChild size="sm">
                <Link to="/topics/$topicId" params={{ topicId: next.id }}>
                  Start {next.title}
                </Link>
              </Button>
            </div>
          ) : null}
        </Panel>
      ) : null}

      <QuizRunner
        quiz={quiz}
        questions={questions}
        nextQuestions={nextQuestions}
        historyPool={fullPool}
        startLabel={passed ? "Take it again" : "Start the section quiz"}
        passScore={SECTION_PASS_SCORE}
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link to="/topics/$topicId" params={{ topicId }}>
            Back to the lesson
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/journey">Journey map</Link>
        </Button>
      </div>
    </>
  );
}
