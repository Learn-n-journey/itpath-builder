import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { a1DiagnosticSimulationFor } from "@/data/auto/a1-diagnostic-simulations";

export function A1DiagnosticTestPanel({ topicId }: { topicId: string }) {
  const simulation = a1DiagnosticSimulationFor(topicId);
  const [step, setStep] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [mistakes, setMistakes] = useState(0);

  if (!simulation) return null;
  const current = simulation.tests[step];
  if (!current) return null;
  const selected = current.choices.find((choice) => choice.id === selectedChoiceId);
  const bestSelected = selected?.value === "best";
  const complete = step === simulation.tests.length - 1 && bestSelected;

  const reset = () => {
    setStep(0);
    setSelectedChoiceId("");
    setMistakes(0);
  };

  return (
    <Panel className="border-primary/35">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Interactive diagnostic test</p>
      <h3 className="mt-2 font-display text-lg font-semibold">{simulation.complaint}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Work one decision at a time. Choose the test that best follows the evidence, then interpret the result before continuing. This exercise is practice only and does not change mastery.
      </p>

      <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test {step + 1} of {simulation.tests.length}</p>
        <p className="mt-2 text-sm font-medium">Use the evidence gathered so far. Which test should you perform next?</p>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose the best next test</p>
          {current.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={bestSelected}
              onClick={() => {
                setSelectedChoiceId(choice.id);
                if (choice.value !== "best") setMistakes((value) => value + 1);
              }}
              className="w-full rounded-lg border border-border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-default"
            >
              {choice.label}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="mt-4 space-y-3">
            <div className={selected.value === "best" ? "rounded-lg border border-success/30 bg-success/5 p-3" : "rounded-lg border border-border bg-muted/30 p-3"}>
              <p className="text-xs font-bold uppercase tracking-wide">{selected.value === "best" ? "Diagnostic result" : "Efficiency feedback"}</p>
              <p className="mt-1 text-sm">{selected.result}</p>
              <p className="mt-2 text-sm text-muted-foreground">{selected.feedback}</p>
            </div>

            {bestSelected ? (
              <>
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
                    <p className="mt-2 text-xs text-muted-foreground">Diagnostic efficiency: {mistakes === 0 ? "clean sequence" : `${mistakes} lower-value choice${mistakes === 1 ? "" : "s"} before the evidence-supported path`}.</p>
                  </div>
                ) : (
                  <Button onClick={() => { setStep((value) => value + 1); setSelectedChoiceId(""); }}>Continue with the evidence</Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Choose again. The simulator will not advance until the next test is supported by the evidence.</p>
            )}
          </div>
        ) : null}
      </div>

      <Button variant="ghost" size="sm" className="mt-3" onClick={reset}><RotateCcw className="size-4" />Restart simulation</Button>
    </Panel>
  );
}
