import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PageHeader, Panel } from "@/components/page-kit";
import { MasteryChecklist } from "@/components/learning/mastery-checklist";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/static-content";
import {
  SECTION_PASS_SCORE,
  SECTION_QUIZ_SIZE,
  buildSectionQuiz,
  getTopicQuestionPool,
  topicConceptLookup,
} from "@/data/topic-quizzes";
import { conceptStats } from "@/lib/concept-mastery";
import type { Quiz } from "@/lib/app-data/types";
import { sectionQuizBest, sectionQuizPassedAt } from "@/lib/journey-order";
import { learnerContinuity } from "@/lib/learner-continuity";
import { useAppState } from "@/state/app-state";
import { LearningBreadcrumbs } from "@/components/learning-breadcrumbs";
import { certifications } from "@/data/static-content";
import { domain } from "@/domain/active";

const findTopic = (topicId: string) => topics.find((topic) => topic.id === topicId);

export const Route = createFileRoute("/section-quiz/$topicId")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const topic = findTopic(params.topicId);
    const checkLabel = domain.id === "auto-repair" ? "shop knowledge check" : "section quiz";
    const title = topic ? `${topic.title} ${checkLabel} | ${domain.appName}` : `${checkLabel} | ${domain.appName}`;
    const description = topic
      ? `A ${SECTION_QUIZ_SIZE} question quiz on ${topic.title}, all multiple choice.`
      : `A ${checkLabel} on ${domain.appName}.`;
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
  // A fresh paper is drawn each time the page is opened, always from this section only.
  const [paper] = useState(() => Math.random());
  const round = useRef(0);
  // What this learner has already shown on each idea in the section, worked
  // out from their own recorded answers.
  const stats = useMemo(
    () => conceptStats(user.quizAttempts ?? [], topicConceptLookup(topicId)),
    [user.quizAttempts, topicId],
  );
  const questions = useMemo(
    () => buildSectionQuiz(topicId, paper, stats),
    [topicId, paper, stats],
  );
  // Every question this section can ask, so earlier attempts still show their review.
  const fullPool = useMemo(() => getTopicQuestionPool(topicId), [topicId]);
  const nextQuestions = useCallback(() => {
    round.current += 1;
    return buildSectionQuiz(topicId, paper + round.current, stats);
  }, [topicId, paper, stats]);
  if (!topic) return null;

  const best = sectionQuizBest(user, topicId);
  const passedAt = sectionQuizPassedAt(user, topicId);
  const passed = Boolean(passedAt) || best >= SECTION_PASS_SCORE;
  const passedOn = passedAt
    ? new Date(passedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : undefined;
  const continuity = useMemo(() => learnerContinuity(user), [user]);

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
      <LearningBreadcrumbs items={[{ label: domain.id === "auto-repair" ? "Training Plan" : "My Path", to: "/my-path" }, ...(certifications.find((item) => item.id === topic.certificationId) ? [{ label: certifications.find((item) => item.id === topic.certificationId)?.title ?? "Certification", to: "/certifications/$certId", params: { certId: topic.certificationId } }] : []), { label: topic.title, to: "/topics/$topicId", params: { topicId } }, { label: domain.id === "auto-repair" ? "Shop knowledge check" : "Section quiz" }]} />
      <PageHeader
        title={`${topic.title}: ${domain.id === "auto-repair" ? "shop knowledge check" : "section quiz"}`}
        description={`${SECTION_QUIZ_SIZE} questions drawn from this section only. Every question is multiple choice, and ${SECTION_PASS_SCORE}% is a pass. This is one part of what opens the next section, alongside recall, teach back and the hands on work.`}
      />

      {passed ? (
        <Panel className="mb-5 border-primary/50" title="Section passed">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            {passedOn ? `You passed this on ${passedOn}. ` : ""}Your best score here is {best}%. That pass stays
            recorded, so taking it again can only help.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              The knowledge check is complete. {continuity.reason}
            </p>
            {continuity.to !== `/section-quiz/${topicId}` ? (
              <Button asChild size="sm">
                <Link
                  to={continuity.to as never}
                  {...(continuity.params ? { params: continuity.params as never } : {})}
                  {...(continuity.search ? { search: continuity.search as never } : {})}
                >
                  {continuity.kind === "return" ? continuity.label : continuity.kind === "recommendation" ? "Continue to next step" : "Continue learning"}
                </Link>
              </Button>
            ) : null}
          </div>
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

      <div className="mt-5">
        <MasteryChecklist topicId={topicId} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link
            to={continuity.to as never}
            {...(continuity.params ? { params: continuity.params as never } : {})}
            {...(continuity.search ? { search: continuity.search as never } : {})}
          >
            {continuity.kind === "return" ? continuity.label : passed ? "Continue learning" : "Review and keep going"}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/topics/$topicId" params={{ topicId }}>Back to the lesson</Link>
        </Button>
      </div>
    </>
  );
}
