import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { questionTypeLabels } from "@/components/quiz/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getTopic } from "@/lib/app-data/selectors";
import {
  gradeMissedQuestion,
  missedQuestionExplanation,
  missedQuestionPrompt,
  missedQuestionAnchor,
  missedQuestionKey,
  missedQuestions,
  type MissedQuestion,
} from "@/lib/missed-questions";
import { useAppState } from "@/state/app-state";

export function MissedQuestionsPanel() {
  const { user } = useAppState();
  const [showCleared, setShowCleared] = useState(false);
  const items = useMemo(() => missedQuestions(user, showCleared), [user, showCleared]);
  const openCount = useMemo(() => missedQuestions(user).length, [user]);

  return (
    <Panel
      title="Missed questions"
      description="Every question you got wrong, linked back to its topic. Answer one correctly and you can clear it."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={openCount > 0 ? "destructive" : "outline"}>{openCount} still open</Badge>
        <Button size="sm" variant="ghost" onClick={() => setShowCleared((value) => !value)}>
          {showCleared ? "Hide cleared" : "Show cleared"}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {showCleared
            ? "No missed questions recorded yet."
            : "Nothing outstanding. Missed questions appear here after a quiz or recall check."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <MissedQuestionRow key={missedQuestionKey(item)} item={item} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function MissedQuestionRow({ item }: { item: MissedQuestion }) {
  const { user, actions } = useAppState();
  const [response, setResponse] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const topic = getTopic(item.mistake.topicId);
  const questionId = missedQuestionKey(item);
  const anchor = missedQuestionAnchor(item);
  const cleared = item.mistake.resolved;
  const ref = useRef<HTMLLIElement>(null);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.slice(1) !== anchor) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(true);
    const timer = window.setTimeout(() => setHighlight(false), 2500);
    return () => window.clearTimeout(timer);
  }, [anchor]);

  function check() {
    const correct = gradeMissedQuestion(item, response);
    setChecked(correct);
    if (!correct) toast.error("Not correct yet. Review the topic and try again.");
  }

  function clear() {
    user.mistakes
      .filter((mistake) => mistake.questionId === questionId && !mistake.resolved)
      .forEach((mistake) => actions.setMistakeResolved(mistake.id, true));
    toast.success("Cleared from your missed questions.");
  }

  return (
    <li
      id={anchor}
      ref={ref}
      className={`scroll-mt-24 rounded-lg border p-3 text-sm ${
        highlight ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {topic ? (
          <Link
            to="/topics/$topicId"
            params={{ topicId: topic.id }}
            className="font-medium underline underline-offset-4"
          >
            {topic.title}
          </Link>
        ) : (
          <span className="font-medium">{item.mistake.topicId}</span>
        )}
        <Badge variant="outline">
          {item.kind === "quiz"
            ? questionTypeLabels[item.question.type]
            : item.kind === "practice"
              ? "Practice"
              : "Recall"}
        </Badge>
        {cleared ? <Badge variant="secondary">cleared</Badge> : null}
        <span className="text-xs text-muted-foreground">
          missed {new Date(item.mistake.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p className="mt-2">{missedQuestionPrompt(item)}</p>

      {cleared ? (
        <p className="mt-2 text-xs text-muted-foreground">{missedQuestionExplanation(item)}</p>
      ) : item.kind === "practice" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to="/practice" search={{ assignment: item.assignment.id }}>
              Open this practice task
            </Link>
          </Button>
          {topic ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/topics/$topicId" params={{ topicId: topic.id }}>
                Review the topic
              </Link>
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Clears automatically when you score 70 or higher on a retake.
          </span>
        </div>
      ) : (
        <>
          <div className="mt-3">
            {item.kind === "quiz" && item.question.type === "multiple_choice" ? (
              <RadioGroup
                value={response[0] ?? ""}
                onValueChange={(value) => {
                  setResponse([value]);
                  setChecked(null);
                }}
                className="space-y-2"
              >
                {item.question.choices.map((choice) => (
                  <div key={choice} className="flex items-start gap-2">
                    <RadioGroupItem value={choice} id={`${questionId}-${choice}`} />
                    <Label htmlFor={`${questionId}-${choice}`} className="font-normal">
                      {choice}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : item.kind === "quiz" && item.question.type === "multiple_response" ? (
              <div className="space-y-2">
                {item.question.choices.map((choice) => (
                  <div key={choice} className="flex items-start gap-2">
                    <Checkbox
                      id={`${questionId}-${choice}`}
                      checked={response.includes(choice)}
                      onCheckedChange={(value) => {
                        setChecked(null);
                        setResponse((current) =>
                          value ? [...current, choice] : current.filter((entry) => entry !== choice),
                        );
                      }}
                    />
                    <Label htmlFor={`${questionId}-${choice}`} className="font-normal">
                      {choice}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <Textarea
                value={response[0] ?? ""}
                onChange={(event) => {
                  setResponse([event.target.value]);
                  setChecked(null);
                }}
                placeholder="Answer in your own words."
                rows={3}
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={check}>
              Check answer
            </Button>
            {checked ? (
              <Button size="sm" variant="secondary" onClick={clear}>
                Clear this question
              </Button>
            ) : null}
            {topic ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/topics/$topicId" params={{ topicId: topic.id }}>
                  Open topic
                </Link>
              </Button>
            ) : null}
          </div>

          {checked === null ? null : checked ? (
            <p className="mt-2 text-sm text-primary">
              Correct. {missedQuestionExplanation(item)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-destructive">
              Not correct yet — the answer stays hidden so the retry still counts.
            </p>
          )}
        </>
      )}
    </li>
  );
}
