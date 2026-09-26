import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { a1DiagnosticSimulationFor } from "@/data/auto/a1-diagnostic-simulations";

export function A1DiagnosticTestPanel({ topicId }: { topicId: string }) {
  const simulation = a1DiagnosticSimulationFor(topicId);
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!simulation) return null;
  const current = simulation.tests[step];
  if (!current) return null;
  const complete = step === simulation.tests.length - 1 && revealed;

  const reset = () => {
    setStep(0);
    setRevealed(false);
  };

  return (
    <Panel className="border-primary/35">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Interactive diagnostic test</p>
      <h3 className="mt-2 font-display text-lg font-semibold">{simulation.complaint}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Work one test at a time. Predict what the result could prove before revealing it. This exercise is practice only and does not change mastery.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test {step + 1} of {simulation.tests.length}</p>
        <p className="mt-2 text-sm font-medium">{current.label}</p>

        {!revealed ? (
          <Button className="mt-4" onClick={() => setRevealed(true)}>Run test and reveal result</Button>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Result</p>
              <p className="mt-1 text-sm">{current.result}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What it means</p>
              <p className="mt-1 text-sm">{current.interpretation}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What it rules out</p>
              <p className="mt-1 text-sm text-muted-foreground">{current.rulesOut}</p>
            </div>

            {complete ? (
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4" aria-hidden />Evidence gathered</p>
                <p className="mt-1 text-sm text-muted-foreground">{simulation.conclusion}</p>
              </div>
            ) : (
              <Button onClick={() => { setStep((value) => value + 1); setRevealed(false); }}>Choose the next test</Button>
            )}
          </div>
        )}
      </div>

      <Button variant="ghost" size="sm" className="mt-3" onClick={reset}><RotateCcw className="size-4" />Restart simulation</Button>
    </Panel>
  );
}
