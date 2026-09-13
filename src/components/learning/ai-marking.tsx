import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CircleAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { gradeWrittenAnswer, type GradeInput, type WrittenGrade } from "@/lib/grading.functions";

export interface MarkingState {
  busy: boolean;
  grade: WrittenGrade | null;
  error: string | null;
}

/** Sends a written answer to the AI marker and keeps the result for display. */
export function useAiMarking() {
  const grade = useServerFn(gradeWrittenAnswer);
  const [state, setState] = useState<MarkingState>({ busy: false, grade: null, error: null });

  const mark = useCallback(
    async (input: GradeInput): Promise<WrittenGrade | null> => {
      setState({ busy: true, grade: null, error: null });
      try {
        const reply = await grade({ data: input });
        if (!reply.ok) {
          setState({ busy: false, grade: null, error: reply.error });
          return null;
        }
        setState({ busy: false, grade: reply.grade, error: null });
        return reply.grade;
      } catch {
        setState({ busy: false, grade: null, error: "The marker could not be reached." });
        return null;
      }
    },
    [grade],
  );

  const reset = useCallback(() => setState({ busy: false, grade: null, error: null }), []);

  return { ...state, mark, reset };
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
        <Sparkles aria-hidden className="size-4 animate-pulse text-primary" />
        Marking your answer…
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

  return (
    <div role="status" className="mt-4 space-y-5 rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {grade.correct ? (
            <CheckCircle2 aria-hidden className="size-4 text-primary" />
          ) : (
            <CircleAlert aria-hidden className="size-4 text-destructive" />
          )}
          <Badge variant={grade.correct ? "default" : "destructive"}>
            {grade.correct ? "Correct" : "Not yet"}
          </Badge>
          <Badge variant="outline">Marked by AI</Badge>
        </div>
        {showScore ? <span className="text-sm tabular-nums">{grade.score}/100</span> : null}
      </div>

      {showScore ? <Progress value={grade.score} /> : null}

      {grade.verdict ? <p className="text-sm text-muted-foreground">{grade.verdict}</p> : null}

      <Section title="What you got right" items={grade.strengths} />
      <Section title="What you missed" items={grade.missed} />

      {grade.correctedAnswer ? (
        <div>
          <p className="text-sm font-medium text-foreground">A full answer</p>
          <p className="mt-2 whitespace-pre-wrap rounded-md border border-border p-3 text-sm text-muted-foreground">
            {grade.correctedAnswer}
          </p>
        </div>
      ) : null}

      {grade.followUp ? (
        <div>
          <p className="text-sm font-medium text-foreground">Check yourself</p>
          <p className="mt-1 text-sm text-muted-foreground">{grade.followUp}</p>
        </div>
      ) : null}
    </div>
  );
}
