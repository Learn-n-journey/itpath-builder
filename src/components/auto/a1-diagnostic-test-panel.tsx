import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { a1DiagnosticSimulationFor } from "@/data/auto/a1-diagnostic-simulations";
import { a1BranchingScenarioFor, type A1EvidenceState } from "@/data/auto/a1-branching-diagnosis";

const evidenceLabel: Record<A1EvidenceState, string> = {
  plausible: "Plausible",
  "less-likely": "Less likely",
  "ruled-out": "Ruled out",
  supported: "Supported",
};

function A1BranchingDiagnosticPanel({ topicId }: { topicId: string }) {
  const scenario = a1BranchingScenarioFor(topicId);
  const [testedIds, setTestedIds] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<Record<string, A1EvidenceState>>({});
  const [diagnosisId, setDiagnosisId] = useState("");
  const [diagnosisFeedback, setDiagnosisFeedback] = useState("");
  const [repairId, setRepairId] = useState("");
  const [repairCommitted, setRepairCommitted] = useState(false);
  const [verificationIds, setVerificationIds] = useState<string[]>([]);
  const [verificationFeedback, setVerificationFeedback] = useState("");
  const [postRepairEvidence, setPostRepairEvidence] = useState("");
  const [closed, setClosed] = useState(false);

  if (!scenario) return null;
  const lastTest = scenario.tests.find((test) => test.id === testedIds[testedIds.length - 1]);
  const lastOutcome = lastTest?.outcomes[scenario.hiddenCauseId];
  const supportedSignals = testedIds.filter((testId) => scenario.tests.find((test) => test.id === testId)?.outcomes[scenario.hiddenCauseId]?.evidence[scenario.hiddenCauseId] === "supported").length;
  const enoughEvidence = supportedSignals >= scenario.diagnosisThreshold;
  const diagnosed = diagnosisId === scenario.hiddenCauseId && enoughEvidence && diagnosisFeedback.startsWith("Diagnosis supported");
  const selectedRepair = scenario.repairChoices.find((choice) => choice.id === repairId);
  const requiredVerificationIds = scenario.verificationChoices.filter((choice) => choice.correct).map((choice) => choice.id);
  const verificationReady = requiredVerificationIds.every((id) => verificationIds.includes(id));

  const runTest = (testId: string) => {
    if (testedIds.includes(testId) || repairCommitted || closed) return;
    const test = scenario.tests.find((item) => item.id === testId);
    const result = test?.outcomes[scenario.hiddenCauseId];
    if (!result) return;
    setTestedIds((ids) => [...ids, testId]);
    setEvidence((current) => ({ ...current, ...result.evidence }));
    setDiagnosisFeedback("");
    setPostRepairEvidence("");
  };

  const submitDiagnosis = () => {
    if (!diagnosisId) return;
    if (!enoughEvidence) {
      setDiagnosisFeedback("Not enough independent evidence yet. Run another targeted test before committing to a diagnosis.");
      return;
    }
    setDiagnosisFeedback(diagnosisId === scenario.hiddenCauseId
      ? "Diagnosis supported. The accumulated evidence justifies moving to the repair decision."
      : "That diagnosis does not fit all of the evidence. Recheck the cause board and test results before committing to a repair.");
  };

  const commitRepair = () => {
    if (!selectedRepair) return;
    setRepairCommitted(true);
    setVerificationIds([]);
    setVerificationFeedback("");
  };

  const chooseVerification = (id: string) => {
    const choice = scenario.verificationChoices.find((item) => item.id === id);
    if (!choice || verificationIds.includes(id)) return;
    if (!choice.correct) {
      setVerificationFeedback(choice.feedback + " Choose a verification step that directly proves the repair and original complaint.");
      return;
    }
    setVerificationIds((ids) => [...ids, id]);
    setVerificationFeedback(choice.feedback);
  };

  const performVerification = () => {
    if (!selectedRepair || !verificationReady) return;
    if (selectedRepair.correct) {
      setClosed(true);
      setVerificationFeedback("Verification passed. The repair corrected the measured fault and the original complaint. The repair order can be closed.");
      return;
    }

    const newEvidence = selectedRepair.verificationFailureEvidence ?? "The original complaint remains after repair.";
    setPostRepairEvidence(newEvidence);
    setVerificationFeedback("Verification failed. The original complaint remains. Use the post-repair evidence and return to diagnosis.");
    setRepairCommitted(false);
    setRepairId("");
    setVerificationIds([]);
    setDiagnosisId("");
    setDiagnosisFeedback("");
    setEvidence((current) => ({
      ...current,
      [scenario.hiddenCauseId]: "supported",
    }));
  };

  const reset = () => {
    setTestedIds([]);
    setEvidence({});
    setDiagnosisId("");
    setDiagnosisFeedback("");
    setRepairId("");
    setRepairCommitted(false);
    setVerificationIds([]);
    setVerificationFeedback("");
    setPostRepairEvidence("");
    setClosed(false);
  };

  return (
    <Panel className="border-primary/35">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Branching diagnostic case · Fix → Verify</p>
      <h3 className="mt-2 font-display text-lg font-semibold">{scenario.complaint}</h3>
      <p className="mt-2 text-sm text-muted-foreground">Diagnose from evidence, choose the repair, then prove the repair. A failed verification does not end the case—it gives you new evidence and sends you back into diagnosis. Practice only; mastery is unchanged.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {scenario.causes.map((cause) => {
          const state = evidence[cause.id] ?? "plausible";
          return <div key={cause.id} className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-sm font-medium">{cause.label}</p><p className="mt-1 text-xs text-muted-foreground">{evidenceLabel[state]}</p></div>;
        })}
      </div>

      {postRepairEvidence ? <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs font-bold uppercase tracking-wide">Post-repair evidence</p><p className="mt-1 text-sm">{postRepairEvidence}</p><p className="mt-2 text-sm text-muted-foreground">Verification failed. Re-enter the diagnostic process using this new evidence instead of starting the case over.</p></div> : null}

      {!repairCommitted && !closed ? <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a diagnostic test</p>
        {scenario.tests.map((test) => <button key={test.id} type="button" disabled={testedIds.includes(test.id) || diagnosed} onClick={() => runTest(test.id)} className="w-full rounded-lg border border-border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-default disabled:opacity-60">{testedIds.includes(test.id) ? "Completed: " : ""}{test.label}</button>)}
      </div> : null}

      {lastOutcome && !repairCommitted && !closed ? <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs font-bold uppercase tracking-wide">Latest result</p><p className="mt-1 text-sm">{lastOutcome.result}</p><p className="mt-2 text-sm text-muted-foreground">{lastOutcome.interpretation}</p></div> : null}

      {!repairCommitted && !closed ? <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Make the diagnosis</p>
        {scenario.causes.map((cause) => <button key={cause.id} type="button" disabled={diagnosed} onClick={() => setDiagnosisId(cause.id)} className={diagnosisId === cause.id ? "w-full rounded-lg border border-primary bg-primary/5 p-3 text-left text-sm" : "w-full rounded-lg border border-border bg-background p-3 text-left text-sm"}>{cause.label}</button>)}
        <Button onClick={submitDiagnosis} disabled={!diagnosisId || diagnosed}>Commit diagnosis</Button>
        {diagnosisFeedback ? <p className="text-sm text-muted-foreground">{diagnosisFeedback}</p> : null}
      </div> : null}

      {diagnosed && !repairCommitted && !closed ? <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="text-xs font-bold uppercase tracking-wide">Choose the repair</p>
        <p className="mt-1 text-sm text-muted-foreground">Diagnosis is the midpoint. Select the corrective action that best matches the evidence.</p>
        <div className="mt-3 space-y-2">
          {scenario.repairChoices.map((choice) => <button key={choice.id} type="button" onClick={() => setRepairId(choice.id)} className={repairId === choice.id ? "w-full rounded-lg border border-primary bg-background p-3 text-left text-sm" : "w-full rounded-lg border border-border bg-background p-3 text-left text-sm"}>{choice.label}</button>)}
        </div>
        {selectedRepair ? <p className="mt-3 text-sm text-muted-foreground">{selectedRepair.feedback}</p> : null}
        <Button className="mt-3" onClick={commitRepair} disabled={!selectedRepair}>Perform selected repair</Button>
      </div> : null}

      {repairCommitted && !closed ? <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="text-xs font-bold uppercase tracking-wide">Verify the repair</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose the checks needed to prove both the repair and the original complaint are resolved.</p>
        <div className="mt-3 space-y-2">
          {scenario.verificationChoices.map((choice) => <button key={choice.id} type="button" disabled={verificationIds.includes(choice.id)} onClick={() => chooseVerification(choice.id)} className={verificationIds.includes(choice.id) ? "w-full rounded-lg border border-success/30 bg-success/5 p-3 text-left text-sm" : "w-full rounded-lg border border-border bg-background p-3 text-left text-sm"}>{verificationIds.includes(choice.id) ? "Selected: " : ""}{choice.label}</button>)}
        </div>
        {verificationFeedback ? <p className="mt-3 text-sm text-muted-foreground">{verificationFeedback}</p> : null}
        <Button className="mt-3" onClick={performVerification} disabled={!verificationReady}>Run verification sequence</Button>
      </div> : null}

      {closed ? <div className="mt-5 rounded-lg border border-success/30 bg-success/5 p-3"><p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4" aria-hidden />Repair verified · repair order closed</p><p className="mt-2 text-sm text-muted-foreground">The post-repair checks passed and the original complaint was reproduced without the fault returning.</p></div> : null}

      <Button variant="ghost" size="sm" className="mt-3" onClick={reset}><RotateCcw className="size-4" />Restart case</Button>
    </Panel>
  );
}

export function A1DiagnosticTestPanel({ topicId }: { topicId: string }) {
  const branching = a1BranchingScenarioFor(topicId);
  const simulation = a1DiagnosticSimulationFor(topicId);
  const [step, setStep] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [mistakes, setMistakes] = useState(0);

  if (branching) return <A1BranchingDiagnosticPanel topicId={topicId} />;
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
