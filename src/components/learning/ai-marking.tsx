import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { GaylMark } from "@/components/gayl/gayl-note";
import { Progress } from "@/components/ui/progress";
import { gradeWrittenAnswer, type GradeInput, type WrittenGrade } from "@/lib/grading.functions";
import { knowledgeDigest } from "@/lib/knowledge-context";
import { useKnowledge } from "@/hooks/use-knowledge";
import { useSubscription } from "@/hooks/use-subscription";
import { useAppState } from "@/state/app-state";

export interface MarkingState {
  busy: boolean;
  grade: WrittenGrade | null;
  error: string | null;
}

/**
 * Sends a written answer to the AI marker and keeps the result for display.
 * AI marking is a Pro feature: on the free tier `mark` returns null so
 * callers fall back to the built-in meaning-based grading.
 */
export function useAiMarking() {
  const grade = useServerFn(gradeWrittenAnswer);
  const { items: knowledgeItems } = useKnowledge();
  const { isPro } = useSubscription();
  const { actions } = useAppState();
  const [state, setState] = useState<MarkingState>({ busy: false, grade: null, error: null });

  const mark = useCallback(
    async (input: GradeInput, topicId?: string): Promise<WrittenGrade | null> => {
      if (!isPro) {
        setState({
          busy: false,
          grade: null,
          error: "I can only read written answers on Pro. Your answer is saved, so I can come back to it once you upgrade.",
        });
        return null;
      }
      setState({ busy: true, grade: null, error: null });
      try {
        const digest = knowledgeDigest(knowledgeItems, topicId, 4);
        const reply = await grade({
          data: { ...input, ...(digest ? { knowledge: digest } : {}) },
        });
        if (!reply.ok) {
          setState({ busy: false, grade: null, error: reply.error });
          return null;
        }
        setState({ busy: false, grade: reply.grade, error: null });
        if (topicId) {
          // Marked answers are real evidence, so the learner model sees them too.
          actions.addLearnerSignal({
            topicId,
            kind: "ai_grading",
            correct: reply.grade.correct,
            score: reply.grade.score / 100,
          });
        }
        return reply.grade;
      } catch {
        setState({ busy: false, grade: null, error: "I could not read your answer just then. Your writing is saved, so try again in a moment." });
        return null;
      }
    },
    [grade, isPro, actions, knowledgeItems],
  );

  const reset = useCallback(() => setState({ busy: false, grade: null, error: null }), []);

  return useMemo(() => ({ ...state, mark, reset }), [state, mark, reset]);
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-muted-foreground">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shows the marker's score, what was missed, a model answer and a follow-up question. */
export function AiFeedback({
  state,
  showScore = true,
}: {
  state: MarkingState;
  showScore?: boolean;
}) {
  if (state.busy)
    return (
      <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="animate-pulse">
          <GaylMark />
        </span>
        GAYL is reading your answer…
      </p>
    );

  if (state.error)
    return (
      <p role="status" className="mt-3 flex items-start gap-2 text-sm text-destructive">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {state.error}
      </p>
    );

  const grade = state.grade;
  if (!grade) return null;

  const almost = grade.status === "almost";

  return (
    <div role="status" className="mt-4 space-y-5 rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {grade.correct ? (
            <CheckCircle2 aria-hidden className="size-4 text-primary" />
          ) : (
            <CircleAlert aria-hidden className={almost ? "size-4 text-amber-400" : "size-4 text-destructive"} />
          )}
          <Badge variant={grade.correct ? "default" : almost ? "secondary" : "destructive"}>
            {grade.correct ? "Correct" : almost ? "Nearly there" : "Not yet"}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <GaylMark />
            Read by GAYL
          </Badge>
        </div>
        {showScore ? <span className="text-sm tabular-nums">{grade.score}/100</span> : null}
      </div>

      {showScore ? <Progress value={grade.score} /> : null}

      {grade.verdict ? <p className="text-sm text-muted-foreground">{grade.verdict}</p> : null}

      {grade.hints.length ? (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
          <p className="text-sm font-medium text-foreground">
            {almost ? "Your thinking works, add these and it is there" : "Where I would start"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {grade.hints.map((hint) => (
              <li key={hint} className="flex gap-2 text-sm text-muted-foreground">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Section title="What you got right" items={grade.strengths} />
      <Section title="What I could not see in your answer" items={grade.missed} />



      {grade.correctedAnswer ? (
        <div>
          <p className="text-sm font-medium text-foreground">How I would answer it</p>
          <p className="mt-2 whitespace-pre-wrap rounded-md border border-border p-3 text-sm text-muted-foreground">
            {grade.correctedAnswer}
          </p>
        </div>
      ) : null}

      {grade.followUp ? (
        <div>
          <p className="text-sm font-medium text-foreground">One thing to check yourself on</p>
          <p className="mt-1 text-sm text-muted-foreground">{grade.followUp}</p>
        </div>
      ) : null}
    </div>
  );
}
