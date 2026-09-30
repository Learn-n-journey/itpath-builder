import { createFileRoute } from "@tanstack/react-router";
import { AlarmClock, CheckCircle2, ClipboardCheck, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-kit";
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
      { title: `Exam Simulator | ${domain.appName}` },
      {
        name: "description",
        content: "Sit a timed mock exam for any certification, or the 80-question final exam covering the whole course, with a pass or fail report and a review of every question you missed.",
      },
      { property: "og:title", content: `Exam Simulator | ${domain.appName}` },
      {
        property: "og:description",
        content: "Randomised timed mock exams and an 80-question course-wide final exam, drawn from the full question bank.",
      },
    ],
  }),
  component: ExamPageGated,
});

function ExamPageGated() {
  return (
    <ProGate feature={"The exam simulator"}>
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

function ExamStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="font-display text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
      <p className="mt-1 truncate text-[0.625rem] text-muted-foreground sm:text-xs">{label}</p>
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
        title={"Exam Simulator"}
        description={"A timed mock exam for one certification, or the 80-question final exam covering the whole course. Score 75% or higher to pass, then review every question you missed."}
        actions={
          started ? (
            <Button variant="outline" onClick={start}>
              <RefreshCw /> New exam
            </Button>
          ) : null
        }
      />

      <section className="grid grid-cols-4 divide-x divide-border border-y border-border py-3" aria-label="Exam summary">
        <ExamStat value={poolSize} label="Bank" />
        <ExamStat value={questionCount} label="Questions" />
        <ExamStat value={`${Math.round(totalSeconds / 60)}m`} label="Time" />
        <ExamStat value={`${PASS_SCORE}%`} label="Pass" />
      </section>

      {!started ? (
        <section className="relative mt-5 overflow-hidden rounded-xl border border-border/70 bg-card/80 p-5">
              <div className="relative">
            <p className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="size-4" aria-hidden />Build your exam
            </p>
            <h2 className="mt-3 font-display text-xl font-semibold sm:text-2xl">Choose your challenge</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pick the coverage and length. Every run reshuffles the questions and answer choices.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="exam-mode">Exam type</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as "mock" | "final")}>
                <SelectTrigger id="exam-mode" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock exam — one certification</SelectItem>
                  <SelectItem value="final">Final exam — whole course, 80 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "mock" ? (
              <>
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
              </>
            ) : null}
          </div>
            {poolSize === 0 ? (
              <p className="mt-4 text-sm text-destructive">
                There are no questions available for this selection yet.
              </p>
            ) : (
              <Button className="mt-5 w-full sm:w-auto" onClick={start}>
                <ClipboardCheck /> {mode === "final" ? "Start final exam" : "Start timed exam"}
              </Button>
            )}
            <div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
              <span>{questionCount} questions · {Math.round(totalSeconds / 60)} minutes · {PASS_SCORE}% to pass</span>
            </div>
          </div>
        </section>
      ) : exam ? (
        <div className="mt-6 space-y-4">
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">
                {mode === "final" ? `${domain.appName} final exam` : `${certification?.title} mock exam`}
              </p>
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
