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

import { GaylNote } from "@/components/gayl/gayl-note";
import { quizResultInsight } from "@/lib/gayl/insights";
import { Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { questions as allQuestions, topics } from "@/data/static-content";
import type { AnswerConfidence, Question, QuestionType, Quiz, QuizAttempt } from "@/lib/app-data/types";
import { recommendReview } from "@/lib/mistake-engine";
import { buildQuizDiagnostic } from "@/lib/quiz-diagnostic";
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
  nextQuestions,
  historyPool,
  startLabel = "Start quiz",
  passScore,
}: {
  quiz: Quiz;
  questions?: Question[];
  /** Called when an attempt starts, so each attempt can use a new set of questions. */
  nextQuestions?: () => Question[];
  /** Every question this quiz can ever ask, so older attempts still render. */
  historyPool?: Question[];
  startLabel?: string;
  passScore?: number;
}) {
  const { user, actions } = useAppState();
  const [attemptId, setAttemptId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [freshSet, setFreshSet] = useState<Question[] | null>(null);
  const base = useMemo(() => questions ?? quizQuestions(quiz), [questions, quiz]);
  const pool = freshSet ?? base;
  // Everything we can still render, so earlier attempts keep working.
  const known = useMemo(() => {
    const seen = new Set<string>();
    return [...pool, ...base, ...(historyPool ?? [])].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [base, pool, historyPool]);

  const attempts = useMemo(
    () =>
      user.quizAttempts.filter(
        (attempt) =>
          attempt.quizId === quiz.id &&
          // Older attempts can point at questions the current set no longer uses.
          // Those are skipped so the page offers a fresh start instead of a dead end.
          attempt.questionOrder.every((id) => known.some((question) => question.id === id)),
      ),
    [known, quiz.id, user.quizAttempts],
  );
  const activeAttempt = attempts.find((attempt) => attempt.status === "in_progress");
  const latestAttempt = attempts[0];
  const attempt = attempts.find((item) => item.id === attemptId) ?? activeAttempt ?? latestAttempt;


  useEffect(() => {
    setAttemptId("");
    setQuestionIndex(0);
    setReviewing(false);
    setFreshSet(null);
  }, [quiz.id]);

  function start(previousAttemptId?: string) {
    const set = nextQuestions ? nextQuestions() : base;
    const usable = set.length > 0 ? set : base;
    setFreshSet(usable);
    const next = createQuizAttempt(quiz.id, usable, previousAttemptId);
    actions.addQuizAttempt(next);
    setAttemptId(next.id);
    setQuestionIndex(0);
    setReviewing(false);
    toast.success(previousAttemptId ? "Retake started. These are new questions." : "Started.");
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
        pool={known}
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
      pool={known}
      quiz={quiz}
      {...(passScore !== undefined ? { passScore } : {})}
      questionIndex={questionIndex}
      setQuestionIndex={setQuestionIndex}
      onReview={() => setReviewing(true)}
    />
  );
}

function QuizWorkspace({
  attempt,
  pool,
  quiz,
  passScore,
  questionIndex,
  setQuestionIndex,
  onReview,
}: {
  attempt: QuizAttempt;
  pool: Question[];
  quiz: Quiz;
  passScore?: number;
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

  function updateConfidence(value: AnswerConfidence) {
    actions.updateQuizAttempt({
      ...attempt,
      confidence: { ...(attempt.confidence ?? {}), [currentQuestionId]: value },
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
    // Keep what the learner said about each answer alongside the mark, so the
    // engine reads confidence from them rather than guessing it from speed.
    const stated = attempt.confidence ?? {};
    result.results = result.results.map((item) =>
      stated[item.questionId] ? { ...item, confidence: stated[item.questionId]! } : item,
    );
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
    // A pass is remembered for good, whatever happens on later runs.
    if (passScore !== undefined && submittedAttempt.score >= passScore) {
      actions.recordQuizPass({
        quizId: quiz.id,
        ...(quiz.topicIds[0] ? { topicId: quiz.topicIds[0] } : {}),
        score: submittedAttempt.score,
      });
    }
    // Every missed question becomes evidence: skill, type, answers, difficulty and likely cause.
    const diagnostic = buildQuizDiagnostic(user, orderedQuestions, result.results);
    diagnostic.missed.forEach((item) => {
      actions.recordMistake({
        topicId: item.topicId,
        activity: "quiz",
        category: item.cause,
        severity: item.difficulty === "challenging" ? "high" : item.difficulty === "gentle" ? "low" : "medium",
        ...(item.skillId ? { skillId: item.skillId } : {}),
        questionId: item.questionId,
        quizAttemptId: attempt.id,
        attemptId: attempt.id,
        createdAt: now,
      });
    });
    // Review the root cause first: a weak prerequisite outranks the advanced topic that exposed it.
    const reviewTopicIds = new Set<string>(diagnostic.recommendation?.topicIds ?? []);
    result.weakTopicIds.forEach((topicId) => {
      const recommendation = recommendReview(user, { topicId });
      (recommendation.topicIds.length > 0 ? recommendation.topicIds : [topicId]).forEach((id) =>
        reviewTopicIds.add(id),
      );
    });
    reviewTopicIds.forEach((topicId) => actions.ensureReview({ topicId }));
    // Topics that came through clean settle their due review straight away, so
    // the queue reflects the work that was just done.
    const weakSet = new Set(result.weakTopicIds);
    const cleanTopicIds = new Set(
      orderedQuestions.map((item) => item.topicId).filter((id) => !weakSet.has(id) && !reviewTopicIds.has(id)),
    );
    cleanTopicIds.forEach((topicId) => actions.settleTopicReview(topicId, "pass"));
    onReview();
    toast.success("Nice, that is in. Let us see how it landed.");
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
        <ConfidencePicker
          value={attempt.confidence?.[question.id]}
          onChange={updateConfidence}
        />
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

const CONFIDENCE_OPTIONS: { value: AnswerConfidence; label: string }[] = [
  { value: "guess", label: "Guessing" },
  { value: "unsure", label: "Not sure" },
  { value: "sure", label: "Sure" },
];

/**
 * Asking beats guessing. A stated answer is a far better signal than how fast
 * someone clicked, and it is optional, so skipping it costs nothing.
 */
function ConfidencePicker({
  value,
  onChange,
}: {
  value: AnswerConfidence | undefined;
  onChange: (value: AnswerConfidence) => void;
}) {
  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">How sure are you? Optional.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONFIDENCE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? "default" : "outline"}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
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
  const { user } = useAppState();
  // Walkthrough mode: one question at a time, instead of the full list.
  const [walkIndex, setWalkIndex] = useState<number | null>(null);
  const topicName = (id: string) => topics.find((topic) => topic.id === id)?.title ?? id;
  const diagnostic = useMemo(
    () => buildQuizDiagnostic(user, pool, attempt.results),
    [attempt.results, pool, user],
  );

  function renderQuestionCard(questionId: string, index: number) {
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
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Score" value={`${attempt.score}%`} />
        <StatCard label="Correct" value={attempt.correct} />
        <StatCard label="To revisit" value={attempt.incorrect} />
        <StatCard
          label={passScore ? `Pass mark ${passScore}%` : "Questions"}
          value={passScore ? (attempt.score >= passScore ? "Passed" : "Not there yet") : attempt.total}
        />
      </div>
      {attempt.score > 80 ? null : diagnostic.items.length > 0 ? (
        <GaylNote
          message={[
            diagnostic.explanation,
            diagnostic.calibration.note,
            "Rather than pick over each missed question, go back over the section and run the whole quiz again. A second full run tells us far more than one answer does.",
          ]
            .filter(Boolean)
            .join(" ")}
          why={[
            `${attempt.correct} of ${attempt.total} answers landed in this attempt.`,
            ...(diagnostic.calibration.rated > 0
              ? [
                  `You rated ${diagnostic.calibration.rated} answer(s): sure on ${diagnostic.calibration.sureTotal} (${diagnostic.calibration.sureWrong} missed), unsure on ${diagnostic.calibration.unsureTotal}, guessing on ${diagnostic.calibration.guessTotal}.`,
                ]
              : []),
            ...diagnostic.weakest
              .slice(0, 2)
              .map(
                (skill) =>
                  `${skill.title}: ${skill.correct} of ${skill.total}${
                    skill.appliedTotal > 0 ? `, applied ${skill.appliedCorrect} of ${skill.appliedTotal}` : ""
                  }.`,
              ),
            ...diagnostic.topCauses.slice(0, 2).map((entry) => `${entry.label} came up ${entry.count} time(s).`),
            "I use this as evidence about the work, never as a label for you.",
          ]}
        />
      ) : (
        <GaylNote
          {...quizResultInsight({
            score: attempt.score,
            correct: attempt.correct,
            total: attempt.total,
            weakTopicTitles: attempt.recommendedTopicIds.map((id) => topicName(id)),
          })}
        />
      )}
      {diagnostic.items.length > 0 ? (
        <Panel
          title="What I looked at"
          description="Every answer in this attempt: the skill behind the question, how it was asked, and where it held or slipped."
        >
          {diagnostic.strongest.length > 0 || diagnostic.weakest.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Holding up</p>
                {diagnostic.strongest.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {diagnostic.strongest.slice(0, 3).map((skill) => (
                      <li key={skill.title}>
                        {skill.title}: {skill.correct} of {skill.total}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Nothing clearly proven yet in this attempt.</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Asking for attention</p>
                {diagnostic.weakest.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {diagnostic.weakest.slice(0, 3).map((skill) => (
                      <li key={skill.title}>
                        {skill.title}: {skill.correct} of {skill.total}
                        {skill.appliedTotal > 0
                          ? `, applied ${skill.appliedCorrect} of ${skill.appliedTotal}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Nothing stood out as weak here.</p>
                )}
              </div>
            </div>
          ) : null}

          {diagnostic.topCauses.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-medium">Likely reasons for the misses</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {diagnostic.topCauses.map((entry) => (
                  <Badge key={entry.cause} variant="secondary">
                    {entry.label} ({entry.count})
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {diagnostic.recommendation && diagnostic.recommendedTitles.length > 0 ? (
            <div className="mt-4 rounded-md border border-border p-4">
              <p className="text-sm font-medium">Where I'd start</p>
              <p className="mt-1 text-sm text-muted-foreground">{diagnostic.recommendation.explanation}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {diagnostic.recommendedTitles.map((title) => (
                  <Badge key={title} variant="outline">
                    {title}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {diagnostic.missed.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-medium">Missed question detail</p>
              <div className="mt-2 space-y-2">
                {diagnostic.missed.map((item) => (
                  <div key={item.questionId} className="rounded-md border border-border p-3 text-sm">
                    <p className="font-medium">
                      {item.skillTitle}, {questionTypeLabels[item.type]}, {item.difficulty} level
                    </p>
                    <p className="mt-1 break-words text-muted-foreground">
                      You chose: {item.selectedAnswer.join(", ") || "No answer"}
                    </p>
                    <p className="break-words text-muted-foreground">
                      Correct: {item.correctAnswer.join(", ")}
                    </p>
                    <p className="text-muted-foreground">Likely reason: {item.causeLabel}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}
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
      <Panel
        title="Question review"
        description="Your saved answers, correct answers, and explanations."
      >
        {attempt.questionOrder.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This summary was preserved from an earlier data version. Per-question answers were not recorded by that
            version.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {walkIndex === null
                  ? `${attempt.questionOrder.length} questions`
                  : `Question ${walkIndex + 1} of ${attempt.questionOrder.length}`}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWalkIndex(walkIndex === null ? 0 : null)}
              >
                {walkIndex === null ? "Walk through one at a time" : "Show all"}
              </Button>
            </div>
            {(walkIndex === null
              ? attempt.questionOrder.map((questionId, index) => ({ questionId, index }))
              : attempt.questionOrder[walkIndex]
                ? [{ questionId: attempt.questionOrder[walkIndex]!, index: walkIndex }]
                : []
            ).map(({ questionId, index }) => renderQuestionCard(questionId, index))}
            {walkIndex !== null ? (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setWalkIndex(Math.max(0, walkIndex - 1))}
                  disabled={walkIndex === 0}
                >
                  <ArrowLeft /> Previous
                </Button>
                <Button
                  onClick={() => setWalkIndex(Math.min(attempt.questionOrder.length - 1, walkIndex + 1))}
                  disabled={walkIndex === attempt.questionOrder.length - 1}
                >
                  Next <ArrowRight />
                </Button>
              </div>
            ) : null}
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
