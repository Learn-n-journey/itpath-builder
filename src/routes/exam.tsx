import { createFileRoute } from "@tanstack/react-router";
import { AlarmClock, ClipboardCheck, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { domain } from "@/domain/active";
import { certifications } from "@/data/static-content";
import { selectedCertification } from "@/lib/adaptive-path";
import {
  certificationQuestionPool,
  courseQuestionPool,
  generateExam,
  generateFinalExam,
} from "@/lib/cert-path";
import { useShuffleSeed } from "@/lib/shuffle";
import { useAppState } from "@/state/app-state";

const PASS_SCORE = 75;
/** Questions in the course-wide final exam. */
const FINAL_EXAM_SIZE = 80;
/** Seconds allowed per question in the simulator. */
const SECONDS_PER_QUESTION = 72;

export const Route = createFileRoute("/exam")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Exam Simulator | IT PATH" },
      {
        name: "description",
        content: "Sit a full timed mock certification exam with a pass or fail report and a review of every question you missed.",
      },
      { property: "og:title", content: "Exam Simulator | IT PATH" },
      {
        property: "og:description",
        content: "Randomised timed mock exams drawn from the full question bank for your certification.",
      },
    ],
  }),
  component: ExamPageGated,
});

function ExamPageGated() {
  return (
    <ProGate feature="The exam simulator">
      <ExamPage />
    </ProGate>
  );
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}

function ExamTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, onExpire]);

  const low = remaining <= 300;
  return (
    <div className="flex items-center gap-2">
      <AlarmClock className={low ? "size-4 text-destructive" : "size-4 text-muted-foreground"} aria-hidden />
      <span className={low ? "font-display text-lg font-semibold tabular-nums text-destructive" : "font-display text-lg font-semibold tabular-nums"}>
        {formatClock(remaining)}
      </span>
    </div>
  );
}

function ExamPage() {
  const { user } = useAppState();
  const [seed, reshuffle] = useShuffleSeed();
  const [mode, setMode] = useState<"mock" | "final">("mock");
  const [certId, setCertId] = useState(() => selectedCertification(user.settings).id);
  const [count, setCount] = useState(50);
  const [started, setStarted] = useState(false);
  const [expired, setExpired] = useState(false);

  const certification = certifications.find((item) => item.id === certId) ?? certifications[0];
  const finalPoolSize = useMemo(() => courseQuestionPool().length, []);
  const poolSize = mode === "final" ? finalPoolSize : certification ? certificationQuestionPool(certification.id).length : 0;
  const exam = useMemo(
    () => {
      if (!started) return null;
      if (mode === "final") return generateFinalExam(domain.appName, seed, FINAL_EXAM_SIZE);
      return certification ? generateExam(certification, seed, count) : null;
    },
    [mode, certification, seed, count, started],
  );

  if (mode === "mock" && !certification) return null;

  const questionCount = exam
    ? exam.questions.length
    : mode === "final"
      ? Math.min(FINAL_EXAM_SIZE, finalPoolSize)
      : Math.min(count, poolSize);
  const totalSeconds = questionCount * SECONDS_PER_QUESTION;

  function start() {
    reshuffle();
    setExpired(false);
    setStarted(true);
  }

  return (
    <>
      <PageHeader
        title="Exam Simulator"
        description="A timed mock exam for one certification, or the 80-question final exam covering the whole course. Score 75% or higher to pass, then review every question you missed."
        actions={
          started ? (
            <Button variant="outline" onClick={start}>
              <RefreshCw /> New exam
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Question bank" value={poolSize} hint={mode === "final" ? "Whole course" : certification?.title} />
        <StatCard label="This exam" value={questionCount} />
        <StatCard label="Time allowed" value={`${Math.round(totalSeconds / 60)} min`} />
        <StatCard label="Pass mark" value={`${PASS_SCORE}%`} />
      </div>

      {!started ? (
        <Panel
          className="mt-6"
          title="Set up your mock exam"
          description="Question order, choice order and the selection itself change every time."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="exam-cert">Certification</Label>
              <Select value={certId} onValueChange={setCertId}>
                <SelectTrigger id="exam-cert" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {certifications.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exam-count">Length</Label>
              <Select value={`${count}`} onValueChange={(value) => setCount(Number(value))}>
                <SelectTrigger id="exam-count" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 questions, short</SelectItem>
                  <SelectItem value="50">50 questions, standard</SelectItem>
                  <SelectItem value="75">75 questions, full length</SelectItem>
                  <SelectItem value="90">90 questions, maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {poolSize === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              There are no questions for this certification yet. Pick another one.
            </p>
          ) : (
            <Button className="mt-5" onClick={start}>
              <ClipboardCheck /> Start timed exam
            </Button>
          )}
        </Panel>
      ) : exam ? (
        <div className="mt-6 space-y-4">
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{certification.title} mock exam</p>
              <p className="text-xs text-muted-foreground">
                {expired
                  ? "Time is up. Submit now, anything unanswered is marked wrong, exactly like the real exam."
                  : `${questionCount} questions · ${PASS_SCORE}% to pass`}
              </p>
            </div>
            <ExamTimer seconds={totalSeconds} onExpire={() => setExpired(true)} />
          </div>
          <QuizRunner
            quiz={exam.quiz}
            questions={exam.questions}
            startLabel="Begin exam"
            passScore={PASS_SCORE}
          />
        </div>
      ) : null}
    </>
  );
}
