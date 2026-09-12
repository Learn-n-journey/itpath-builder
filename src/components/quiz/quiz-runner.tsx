import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { questions as allQuestions, topics } from "@/data/static-content";
import type { Question, QuestionType, Quiz, QuizAttempt } from "@/lib/app-data/types";
import { causeFromQuestionCategory, recommendReview } from "@/lib/mistake-engine";
import { createQuizAttempt, scoreQuiz } from "@/lib/quiz-engine";
import { useAppState } from "@/state/app-state";

export const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  multiple_response: "Multiple Response",
  scenario: "Scenario",
  troubleshooting: "Troubleshooting",
  short_answer: "Short Answer",
  command: "Command Question",
};

const categoryLabels = {
  concept: "Concept",
  terminology: "Terminology",
  diagnosis: "Diagnosis",
  procedure: "Procedure",
  command_syntax: "Command Syntax",
  professional_judgment: "Professional Judgment",
} as const;

export function quizQuestions(quiz: Quiz, extra: Question[] = []): Question[] {
  return quiz.questionIds
    .map(
      (id) =>
        extra.find((question) => question.id === id) ??
        allQuestions.find((question) => question.id === id),
    )
    .filter((question): question is Question => Boolean(question));
}

/**
 * One reusable quiz experience. Static quizzes and generated practice exams
 * both render this; generated exams pass their own question list.
 */
export function QuizRunner({
  quiz,
  questions,
  startLabel = "Start quiz",
  passScore,
}: {
  quiz: Quiz;
  questions?: Question[];
  startLabel?: string;
  passScore?: number;
}) {
  const { user, actions } = useAppState();
  const [attemptId, setAttemptId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const pool = useMemo(() => questions ?? quizQuestions(quiz), [questions, quiz]);

  const attempts = useMemo(
    () => user.quizAttempts.filter((attempt) => attempt.quizId === quiz.id),
    [quiz.id, user.quizAttempts],
  );
  const activeAttempt = attempts.find((attempt) => attempt.status === "in_progress");
  const latestAttempt = attempts[0];
  const attempt = attempts.find((item) => item.id === attemptId) ?? activeAttempt ?? latestAttempt;

  useEffect(() => {
    setAttemptId("");
    setQuestionIndex(0);
    setReviewing(false);
  }, [quiz.id]);

  function start(previousAttemptId?: string) {
    const next = createQuizAttempt(quiz.id, pool, previousAttemptId);
    actions.addQuizAttempt(next);
    setAttemptId(next.id);
    setQuestionIndex(0);
    setReviewing(false);
    toast.success(previousAttemptId ? "Retake started." : "Started.");
  }

  if (!attempt) {
    return (
      <Panel title={quiz.title} description={quiz.description}>
        <div className="flex flex-wrap gap-2">
          {[...new Set(pool.map((question) => question.type))].map((type) => (
            <Badge key={type} variant="outline">
              {questionTypeLabels[type]}
            </Badge>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {pool.length} questions. Question order and eligible choice order change with every attempt, and answers
          are saved as you work.
          {passScore ? ` A score of ${passScore}% or higher is a pass.` : ""}
        </p>
        <Button className="mt-5" onClick={() => start()}>
          <ClipboardCheck /> {startLabel}
        </Button>
      </Panel>
    );
  }

  if (reviewing || attempt.status === "submitted") {
    return (
      <QuizReview
        attempt={attempt}
        attempts={attempts}
        pool={pool}
        {...(passScore !== undefined ? { passScore } : {})}
        onRetake={() => start(attempt.id)}
        onSelectAttempt={(id) => {
          setAttemptId(id);
          setReviewing(true);
        }}
      />
    );
  }

  return (
    <QuizWorkspace
      attempt={attempt}
      pool={pool}
      questionIndex={questionIndex}
      setQuestionIndex={setQuestionIndex}
      onReview={() => setReviewing(true)}
    />
  );
}

function QuizWorkspace({
  attempt,
  pool,
  questionIndex,
  setQuestionIndex,
  onReview,
}: {
  attempt: QuizAttempt;
  pool: Question[];
  questionIndex: number;
  setQuestionIndex: (index: number) => void;
  onReview: () => void;
}) {
  const { user, actions } = useAppState();
  const questionId = attempt.questionOrder[questionIndex];
  const question = pool.find((item) => item.id === questionId);
  const answered = attempt.questionOrder.filter((id) => (attempt.responses[id]?.length ?? 0) > 0).length;

  if (!question) {
    return (
      <Panel
        title="Question unavailable"
        description="This attempt references a question that is no longer in the current bank."
      />
    );
  }
  const currentQuestionId = question.id;

  function updateResponse(response: string[]) {
    actions.updateQuizAttempt({
      ...attempt,
      responses: { ...attempt.responses, [currentQuestionId]: response },
      updatedAt: new Date().toISOString(),
    });
  }

  function submit() {
    if (answered !== attempt.total) {
      toast.error(`Answer all questions before submitting. ${attempt.total - answered} remaining.`);
      return;
    }
    const orderedQuestions = attempt.questionOrder
      .map((id) => pool.find((item) => item.id === id))
      .filter((item): item is Question => Boolean(item));
    const result = scoreQuiz(orderedQuestions, attempt.responses);
    const now = new Date().toISOString();
    const submittedAttempt: QuizAttempt = {
      ...attempt,
      ...result,
      status: "submitted",
      score: Math.round((result.correct / attempt.total) * 100),
      recommendedTopicIds: result.weakTopicIds,
      updatedAt: now,
      submittedAt: now,
    };
    actions.updateQuizAttempt(submittedAttempt);
    result.results
      .filter((item) => !item.correct)
      .forEach((item) => {
        const missed = orderedQuestions.find((entry) => entry.id === item.questionId);
        actions.recordMistake({
          topicId: item.topicId,
          activity: "quiz",
          category: missed
            ? causeFromQuestionCategory(missed.mistakeCategory, missed.requiresReasoning)
            : "misunderstood_concept",
          severity: missed?.difficulty === "challenging" ? "high" : "medium",
          questionId: item.questionId,
          quizAttemptId: attempt.id,
          attemptId: attempt.id,
          createdAt: now,
        });
      });
    // Review the root cause first: a weak prerequisite outranks the advanced topic that exposed it.
    const reviewTopicIds = new Set<string>();
    result.weakTopicIds.forEach((topicId) => {
      const recommendation = recommendReview(user, { topicId });
      (recommendation.topicIds.length > 0 ? recommendation.topicIds : [topicId]).forEach((id) =>
        reviewTopicIds.add(id),
      );
    });
    reviewTopicIds.forEach((topicId) => actions.ensureReview({ topicId }));
    onReview();
    toast.success("Submitted and scored.");
  }

  const response = attempt.responses[question.id] ?? [];
  const choices = attempt.choiceOrder[question.id] ?? question.choices;
  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="font-medium">
            Question {questionIndex + 1} of {attempt.total}
          </span>
          <span className="text-muted-foreground">{answered} answered</span>
        </div>
        <Progress className="mt-3" value={(answered / attempt.total) * 100} />
      </Panel>
      <Panel>
        <div className="flex flex-wrap gap-2">
          <Badge>{questionTypeLabels[question.type]}</Badge>
          <Badge variant="outline">{topics.find((topic) => topic.id === question.topicId)?.title}</Badge>
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold">{question.prompt}</h2>
        <div className="mt-6">
          <QuestionInput question={question} choices={choices} response={response} onChange={updateResponse} />
        </div>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setQuestionIndex(questionIndex - 1)} disabled={questionIndex === 0}>
          <ArrowLeft /> Previous
        </Button>
        {questionIndex < attempt.total - 1 ? (
          <Button onClick={() => setQuestionIndex(questionIndex + 1)}>
            Next <ArrowRight />
          </Button>
        ) : (
          <Button onClick={submit}>
            <Send /> Submit
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  choices,
  response,
  onChange,
}: {
  question: Question;
  choices: string[];
  response: string[];
  onChange: (value: string[]) => void;
}) {
  if (question.type === "multiple_response") {
    return (
      <div className="space-y-3">
        {choices.map((choice) => (
          <Label key={choice} className="flex items-start gap-3 rounded-md border border-border p-4">
            <Checkbox
              checked={response.includes(choice)}
              onCheckedChange={(checked) =>
                onChange(checked === true ? [...response, choice] : response.filter((item) => item !== choice))
              }
            />
            <span className="font-normal">{choice}</span>
          </Label>
        ))}
      </div>
    );
  }
  if (choices.length > 0) {
    return (
      <RadioGroup value={response[0] ?? ""} onValueChange={(value) => onChange([value])}>
        {choices.map((choice) => (
          <Label key={choice} className="flex items-start gap-3 rounded-md border border-border p-4">
            <RadioGroupItem value={choice} />
            <span className="font-normal">{choice}</span>
          </Label>
        ))}
      </RadioGroup>
    );
  }
  return (
    <Textarea
      aria-label="Your answer"
      rows={5}
      value={response[0] ?? ""}
      onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
      placeholder={
        question.type === "command" ? "Enter the command exactly as you would run it." : "Type your answer."
      }
    />
  );
}

function QuizReview({
  attempt,
  attempts,
  pool,
  passScore,
  onRetake,
  onSelectAttempt,
}: {
  attempt: QuizAttempt;
  attempts: QuizAttempt[];
  pool: Question[];
  passScore?: number;
  onRetake: () => void;
  onSelectAttempt: (id: string) => void;
}) {
  const topicName = (id: string) => topics.find((topic) => topic.id === id)?.title ?? id;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Score" value={`${attempt.score}%`} />
        <StatCard label="Correct" value={attempt.correct} />
        <StatCard label="Incorrect" value={attempt.incorrect} />
        <StatCard
          label={passScore ? `Pass mark ${passScore}%` : "Questions"}
          value={passScore ? (attempt.score >= passScore ? "Passed" : "Not passed") : attempt.total}
        />
      </div>
      <Panel
        title="Recommended review"
        description="Recommendations come directly from incorrect answers in this attempt."
      >
        {attempt.recommendedTopicIds.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {attempt.recommendedTopicIds.map((id) => (
                <Badge key={id} variant="outline">
                  {topicName(id)}
                </Badge>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium">Mistake categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {attempt.mistakeCategories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {categoryLabels[category]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" /> No weak topics identified in this attempt.
          </p>
        )}
      </Panel>
      <Panel title="Question review" description="Your saved answers, correct answers, and explanations.">
        {attempt.questionOrder.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This summary was preserved from an earlier data version. Per-question answers were not recorded by that
            version.
          </p>
        ) : (
          <div className="space-y-4">
            {attempt.questionOrder.map((questionId, index) => {
              const question = pool.find((item) => item.id === questionId);
              const result = attempt.results.find((item) => item.questionId === questionId);
              if (!question || !result) return null;
              return (
                <article key={questionId} className="rounded-md border border-border p-4">
                  <div className="flex items-start gap-3">
                    {result.correct ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">
                        {index + 1}. {question.prompt}
                      </p>
                      <p className="mt-2 break-words text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Your answer:</span>{" "}
                        {result.response.join(", ") || "No answer"}
                      </p>
                      {!result.correct ? (
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Correct answer:</span>{" "}
                          {question.correctAnswer.join(", ")}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
      <Button onClick={onRetake}>
        <RotateCcw /> Retake
      </Button>
      <Panel title={`Attempt history (${attempts.length})`}>
        <div className="space-y-2">
          {attempts.map((item, index) => (
            <Button
              key={item.id}
              variant={item.id === attempt.id ? "secondary" : "outline"}
              className="h-auto w-full justify-between py-3"
              onClick={() => onSelectAttempt(item.id)}
            >
              <span>Attempt {attempts.length - index}</span>
              <span>{item.status === "submitted" ? `${item.score}%` : "In progress"}</span>
            </Button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
