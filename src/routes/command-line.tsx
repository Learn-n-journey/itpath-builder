import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  Play,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TerminalAttempt, TerminalMode } from "@/lib/app-data/types";
import { prompt } from "@/lib/terminal/machine";
import { generateTerminalScenario } from "@/lib/terminal/ai-scenario.functions";
import {
  hintStepsFor,
  randomTerminalScenario,
  scenariosForShell,
  terminalScenarios,
  type TerminalScenario,
} from "@/lib/terminal/scenarios";
import {
  createTerminalAttempt,
  evaluateTerminalAttempt,
  recommendedTerminalScenario,
  runTerminalCommand,
} from "@/lib/terminal/session";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/command-line")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Command-Line Simulator | IT PATH" },
      {
        name: "description",
        content: "Practice Mac/Linux Bash, Windows CMD and PowerShell troubleshooting in safe persistent virtual computers.",
      },
      { property: "og:title", content: "Command-Line Simulator | IT PATH" },
      {
        property: "og:description",
        content: "Realistic guided and challenge-mode command-line troubleshooting practice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommandLineRoute,
});

function CommandLineRoute() {
  return (
    <ProGate feature="The command-line simulator">
      <CommandLinePage />
    </ProGate>
  );
}

const shellLabels = {
  cmd: "Windows CMD",
  powershell: "Windows PowerShell",
  bash: "Mac/Linux",
  android: "Android",
  ios: "iPhone / iPad",
} as const;
type TerminalEnvironment = "unix" | "windows" | "android" | "ios";

function CommandLinePage() {
  const { user, actions } = useAppState();
  const weakTopicIds = useMemo(
    () => [...new Set(user.mistakes.filter((mistake) => !mistake.resolved).map((mistake) => mistake.topicId))],
    [user.mistakes],
  );
  const recommended = useMemo(
    () => recommendedTerminalScenario(terminalScenarios, user.terminalAttempts, weakTopicIds),
    [user.terminalAttempts, weakTopicIds],
  );
  const recommendedShell = useMemo(() => {
    const submitted = user.terminalAttempts.filter((item) => item.status === "submitted");
    const counts = new Map<TerminalAttempt["shell"], number>();
    for (const attempt of submitted) {
      counts.set(attempt.shell, (counts.get(attempt.shell) ?? 0) + 1);
    }
    const shells: TerminalAttempt["shell"][] = ["cmd", "powershell", "bash", "android", "ios"];
    return shells.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0] ?? recommended.shell;
  }, [user.terminalAttempts, recommended.shell]);
  const [shell, setShell] = useState<TerminalAttempt["shell"]>(recommendedShell);
  const [windowsShell, setWindowsShell] = useState<Extract<TerminalAttempt["shell"], "cmd" | "powershell">>(
    recommendedShell === "powershell" ? "powershell" : "cmd",
  );
  const environment: TerminalEnvironment =
    shell === "bash" ? "unix" : shell === "android" ? "android" : shell === "ios" ? "ios" : "windows";
  const shellScenarios = useMemo(() => scenariosForShell(shell), [shell]);
  const [scenarioId, setScenarioId] = useState(recommended.id);
  const [mode, setMode] = useState<TerminalMode>("guided");
  const [attemptId, setAttemptId] = useState("");
  const [command, setCommand] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [reasoning, setReasoning] = useState("");
  const terminalEnd = useRef<HTMLDivElement>(null);
  const terminalPanel = useRef<HTMLElement>(null);
  const [scrollToTerminal, setScrollToTerminal] = useState(false);
  const [generated, setGenerated] = useState<TerminalScenario | null>(null);
  const [creating, setCreating] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState<number[]>([]);

  const openedAttempt = user.terminalAttempts.find((item) => item.id === attemptId);
  const scenario =
    openedAttempt?.scenarioSnapshot ??
    (generated && generated.id === scenarioId ? generated : undefined) ??
    terminalScenarios.find((item) => item.id === scenarioId) ??
    shellScenarios[0] ??
    recommended;
  const latestAttempt = useMemo(
    () => user.terminalAttempts.find((item) => item.scenarioId === scenario.id && item.status === "in_progress"),
    [scenario.id, user.terminalAttempts],
  );
  const attempt = openedAttempt ?? latestAttempt;
  const evaluation = attempt?.status === "submitted" ? evaluateTerminalAttempt(scenario, attempt) : null;

  useEffect(() => {
    terminalEnd.current?.scrollIntoView({ block: "nearest" });
  }, [attempt?.transcript.length]);

  useEffect(() => {
    setRevealedSteps([]);
  }, [attempt?.id]);

  // Starting a scenario swaps the brief for the terminal further down the page,
  // which looks like nothing happened on small screens, so bring it into view.
  useEffect(() => {
    if (!scrollToTerminal || !terminalPanel.current) return;
    terminalPanel.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollToTerminal(false);
  }, [scrollToTerminal, attempt?.id]);

  function changeShell(value: TerminalAttempt["shell"]) {
    const next = scenariosForShell(value);
    setShell(value);
    setGenerated(null);
    setScenarioId(next[0]?.id ?? recommended.id);
    setAttemptId("");
    setReasoning("");
  }

  function changeEnvironment(value: TerminalEnvironment) {
    if (value === "unix") return changeShell("bash");
    if (value === "android") return changeShell("android");
    if (value === "ios") return changeShell("ios");
    return changeShell(windowsShell);
  }

  function changeWindowsShell(value: "cmd" | "powershell") {
    setWindowsShell(value);
    changeShell(value);
  }

  function changeScenario(id: string) {
    setGenerated(null);
    setScenarioId(id);
    setAttemptId("");
    const saved = user.terminalAttempts.find((item) => item.scenarioId === id && item.status === "in_progress");
    setReasoning(saved?.reasoning ?? "");
  }

  function rollRandomScenario() {
    const next = randomTerminalScenario(
      shell,
      user.terminalAttempts.map((item) => ({ scenarioId: item.scenarioId, topicId: item.topicId })),
      weakTopicIds,
      scenario.id,
    );
    setGenerated(next);
    setScenarioId(next.id);
    setAttemptId("");
    setReasoning("");
    setCommand("");
    toast.success("New random scenario ready");
  }

  async function createAiScenario() {
    if (creating) return;
    setCreating(true);
    try {
      const reply = await generateTerminalScenario({
        data: {
          shell,
          topicId: scenario.topicId,
          topicTitle: scenario.title,
          weakAreas: weakTopicIds.slice(0, 5).map((id) => id.replace("topic-", "").replace(/-/g, " ")),
          difficulty: "standard",
        },
      });
      if (!reply.ok) {
        toast.error(reply.error);
        return;
      }
      setGenerated(reply.scenario);
      setScenarioId(reply.scenario.id);
      setAttemptId("");
      setReasoning("");
      setCommand("");
      toast.success("AI scenario ready");
    } catch {
      toast.error("Could not create a scenario right now.");
    } finally {
      setCreating(false);
    }
  }

  function start(reset = false) {
    if (reset && attempt && attempt.status === "in_progress") actions.removeTerminalAttempt(attempt.id);
    const next = createTerminalAttempt(scenario, mode);
    actions.addTerminalAttempt(next);
    setAttemptId(next.id);
    setReasoning("");
    setCommand("");
    setScrollToTerminal(true);
    toast.success(reset ? "Virtual computer reset" : "Practice started");
  }

  function run() {
    if (!attempt || !command.trim() || attempt.status === "submitted") return;
    const next = runTerminalCommand(attempt, command);
    actions.updateTerminalAttempt(next);
    setCommand("");
    setHistoryIndex(-1);
  }

  function useHint() {
    if (!attempt || attempt.mode === "challenge" || attempt.status === "submitted") return;
    actions.updateTerminalAttempt({
      ...attempt,
      hintsUsed: Math.min(scenario.hints.length, attempt.hintsUsed + 1),
      updatedAt: new Date().toISOString(),
    });
  }

  function saveReasoning() {
    if (!attempt || attempt.status === "submitted") return;
    actions.updateTerminalAttempt({ ...attempt, reasoning, updatedAt: new Date().toISOString() });
    toast.success("Progress saved");
  }

  function submit() {
    if (!attempt || attempt.status === "submitted") return;
    if (attempt.transcript.length === 0) {
      toast.error("Run at least one command before checking your work.");
      return;
    }
    const draft = { ...attempt, reasoning, updatedAt: new Date().toISOString() };
    const result = evaluateTerminalAttempt(scenario, draft);
    const finished: TerminalAttempt = {
      ...draft,
      status: "submitted",
      score: result.score,
      objectiveScore: result.objectiveScore,
      processScore: result.processScore,
      efficiencyScore: result.efficiencyScore,
      misconceptions: result.misconceptions,
      submittedAt: new Date().toISOString(),
    };
    actions.updateTerminalAttempt(finished);
    actions.addLearnerSignal({
      topicId: scenario.topicId,
      kind: "terminal",
      correct: result.score >= 70,
      score: result.score / 100,
      elapsedMs: new Date(finished.updatedAt).getTime() - new Date(finished.createdAt).getTime(),
      ...(result.misconceptions[0] ? { errorTag: result.misconceptions[0] } : {}),
    });
    if (result.score < 70) {
      actions.recordMistake({
        topicId: scenario.topicId,
        activity: "terminal",
        category: result.misconceptions.length > 0 ? "command_knowledge_gap" : "scenario_recognition_failure",
        severity: result.score < 40 ? "high" : "medium",
        attemptId: finished.id,
      });
      actions.ensureReview({ topicId: scenario.topicId });
    }
    toast.success(`Scenario checked, ${result.score}%`);
  }

  const commands = attempt?.machine.history ?? [];
  const completedCount = user.terminalAttempts.filter((item) => item.status === "submitted").length;
  const bestScore = Math.max(0, ...user.terminalAttempts.map((item) => item.score ?? 0));

  return (
    <>
      <PageHeader
        title="Command-line simulator"
        description="Switch between safe virtual Mac/Linux, Windows, Android and iPhone devices. Your commands never affect your real device."
        actions={<Badge variant="outline"><ShieldCheck className="mr-1 size-3" aria-hidden /> Isolated</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Completed" value={completedCount} hint="Submitted scenarios" />
        <StatCard label="Best score" value={`${bestScore}%`} hint="From real attempts" />
        <StatCard label="Recommended" value={shellLabels[recommendedShell]} hint="Practice here to keep your skills balanced across devices" />
      </div>

      <Panel className="mt-5">
        <div className={`grid min-w-0 gap-4 sm:grid-cols-2 ${environment === "windows" ? "xl:grid-cols-[220px_180px_minmax(0,1fr)_180px]" : "xl:grid-cols-[220px_minmax(0,1fr)_180px]"}`}>
          <div className="min-w-0 space-y-2">
            <Label>Environment</Label>
            <div className="grid min-w-0 grid-cols-2 gap-0.5 overflow-hidden rounded-md border border-input p-0.5" role="group" aria-label="Environment">
              <Button type="button" size="sm" variant={environment === "unix" ? "secondary" : "ghost"} onClick={() => changeEnvironment("unix")} className="min-w-0 w-full px-1 text-xs">Mac/Linux</Button>
              <Button type="button" size="sm" variant={environment === "windows" ? "secondary" : "ghost"} onClick={() => changeEnvironment("windows")} className="min-w-0 w-full px-1 text-xs">Windows</Button>
              <Button type="button" size="sm" variant={environment === "android" ? "secondary" : "ghost"} onClick={() => changeEnvironment("android")} className="min-w-0 w-full px-1 text-xs">Android</Button>
              <Button type="button" size="sm" variant={environment === "ios" ? "secondary" : "ghost"} onClick={() => changeEnvironment("ios")} className="min-w-0 w-full px-1 text-xs">iPhone</Button>
            </div>
          </div>
          {environment === "windows" ? (
            <div className="min-w-0 space-y-2">
              <Label>Windows shell</Label>
              <Select value={shell} onValueChange={(value) => changeWindowsShell(value as "cmd" | "powershell")}>
                <SelectTrigger aria-label="Windows shell"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmd">CMD</SelectItem>
                  <SelectItem value="powershell">PowerShell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="min-w-0 space-y-2">
            <Label>Scenario</Label>
            <div className="flex min-w-0 gap-2">
              <Select value={scenario.id} onValueChange={changeScenario}>
                <SelectTrigger aria-label="Scenario" className="min-w-0 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {scenario.source && scenario.source !== "curated"
                    ? <SelectItem value={scenario.id}>{scenario.title}</SelectItem>
                    : null}
                  {shellScenarios.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={rollRandomScenario} title="Random scenario">
                <Shuffle aria-hidden /> <span className="hidden sm:inline">Random</span>
              </Button>
              <Button type="button" variant="outline" onClick={createAiScenario} disabled={creating} title="Create a new scenario with AI">
                <Sparkles aria-hidden /> <span className="hidden sm:inline">{creating ? "Creating…" : "AI"}</span>
              </Button>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <Label>Mode</Label>
            <div className="grid grid-cols-2 rounded-md border border-input p-0.5">
              {(["guided", "challenge"] as const).map((item) => (
                <Button key={item} type="button" size="sm" variant={mode === item ? "secondary" : "ghost"} onClick={() => setMode(item)} className="px-2 capitalize">{item}</Button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {!attempt ? (
        <Panel className="mt-5" title={scenario.title} description={`${shellLabels[scenario.shell]} · about ${scenario.estimatedMinutes} minutes`}>
          <p className="text-sm leading-relaxed text-muted-foreground">{scenario.brief}</p>
          <p className="mt-3 text-sm"><span className="font-medium">Environment: </span><span className="text-muted-foreground">{scenario.environment}</span></p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => start()}><Play aria-hidden /> Start scenario</Button>
            {scenario.id === recommended.id ? <Badge variant="secondary">Recommended from your learning record</Badge> : null}
          </div>
        </Panel>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <Panel title={scenario.title} description={`${shellLabels[scenario.shell]} · ${attempt.mode === "challenge" ? "No-hint challenge" : "Guided practice"}`}>
              <p className="text-sm leading-relaxed text-muted-foreground">{scenario.brief}</p>
            </Panel>

            <section ref={terminalPanel} aria-label="Virtual terminal" className="scroll-mt-20 overflow-hidden rounded-md border border-border bg-[color:var(--terminal-background,#07100d)] shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
                <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><SquareTerminal className="size-4" aria-hidden />{shellLabels[attempt.shell]} · {attempt.machine.hostname}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => start(true)} disabled={attempt.status === "submitted"} title="Reset virtual computer"><RefreshCw aria-hidden /> Reset</Button>
              </div>
              <div className="h-[430px] overflow-y-auto p-4 font-mono text-sm leading-6 text-[color:var(--terminal-foreground,#d7f7e5)]" role="log" aria-live="polite">
                <p className="mb-4 text-muted-foreground">IT PATH virtual machine. Type help for supported commands.</p>
                {attempt.transcript.map((entry) => (
                  <div key={entry.id} className="mb-3">
                    <div><span className="text-primary">{entry.prompt}</span> {entry.command}</div>
                    {entry.output ? <pre className={entry.error ? "whitespace-pre-wrap text-destructive" : "whitespace-pre-wrap"}>{entry.output}</pre> : null}
                  </div>
                ))}
                <div ref={terminalEnd} />
              </div>
              <form className="flex border-t border-border bg-card p-2" onSubmit={(event) => { event.preventDefault(); run(); }}>
                <span className="hidden shrink-0 px-2 py-2 font-mono text-sm text-primary sm:block">{prompt(attempt.machine)}</span>
                <Input
                  aria-label="Terminal command"
                  autoCapitalize="off"
                  autoComplete="off"
                  spellCheck={false}
                  value={command}
                  disabled={attempt.status === "submitted"}
                  onChange={(event) => setCommand(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                    event.preventDefault();
                    if (commands.length === 0) return;
                    const next = event.key === "ArrowUp"
                      ? Math.min(commands.length - 1, historyIndex + 1)
                      : Math.max(-1, historyIndex - 1);
                    setHistoryIndex(next);
                    setCommand(next < 0 ? "" : commands[commands.length - 1 - next] ?? "");
                  }}
                  className="border-0 font-mono shadow-none focus-visible:ring-0"
                  placeholder="Enter a command"
                />
                <Button type="submit" size="icon" disabled={!command.trim() || attempt.status === "submitted"} title="Run command"><ArrowDown aria-hidden /></Button>
              </form>
            </section>

            <Panel title="Your diagnosis" description="Explain the cause, the evidence you found, the repair, and how you verified it.">
              <Textarea value={reasoning} onChange={(event) => setReasoning(event.target.value)} disabled={attempt.status === "submitted"} rows={5} placeholder="The evidence showed… I fixed it by… I verified…" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={saveReasoning} disabled={attempt.status === "submitted"}>Save progress</Button>
                <Button onClick={submit} disabled={attempt.status === "submitted"}><CheckCircle2 aria-hidden /> Check my work</Button>
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel title="Objectives">
              <ul className="space-y-3 text-sm">
                {scenario.goals.map((goal) => (
                  <li key={goal.id} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><span>{goal.description}</span></li>
                ))}
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><span>Gather evidence before changing the system</span></li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><span>Verify the final state</span></li>
              </ul>
            </Panel>

            {attempt.mode === "guided" && attempt.status !== "submitted" ? (
              <Panel title="Hints" description="Hints are staged so you can stop when you have enough.">
                {scenario.hints.slice(0, attempt.hintsUsed).map((hint, index) => {
                  const steps = hintStepsFor(scenario, index);
                  const stepsShown = revealedSteps.includes(index);
                  return (
                    <div key={hint} className="mb-3 text-sm">
                      <p><span className="font-medium">Hint {index + 1}: </span><span className="text-muted-foreground">{hint}</span></p>
                      {steps.length > 0 ? (
                        stepsShown ? (
                          <div className="mt-2 rounded-md border bg-muted/40 p-2.5">
                            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Exact steps</p>
                            <ul className="space-y-1">
                              {steps.map((step) => <li key={step} className="font-mono text-xs break-all">{step}</li>)}
                            </ul>
                            <button type="button" onClick={() => setRevealedSteps((current) => current.filter((item) => item !== index))} className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline">Hide steps</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setRevealedSteps((current) => [...current, index])} className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline">Show exact steps</button>
                        )
                      ) : null}
                    </div>
                  );
                })}
                <Button variant="outline" onClick={useHint} disabled={attempt.hintsUsed >= scenario.hints.length}><Lightbulb aria-hidden /> {attempt.hintsUsed === 0 ? "Get a hint" : "Next hint"}</Button>
              </Panel>
            ) : null}

            {evaluation ? (
              <Panel title="Attempt report">
                <p className="font-display text-4xl font-semibold tabular-nums">{evaluation.score}%</p>
                <div className="mt-4 space-y-2 text-sm">
                  <ScoreLine label="System restored" value={evaluation.objectiveScore} />
                  <ScoreLine label="Diagnostic process" value={evaluation.processScore} />
                  <ScoreLine label="Efficiency" value={evaluation.efficiencyScore} />
                </div>
                {evaluation.missingGoals.length > 0 || evaluation.missingDiagnostics > 0 ? (
                  <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium"><CircleAlert className="size-4" aria-hidden />Still needs work</p>
                    {evaluation.missingGoals.map((goal) => <p key={goal} className="mt-2 text-muted-foreground">{goal}</p>)}
                    {evaluation.missingDiagnostics > 0 ? <p className="mt-2 text-muted-foreground">You skipped {evaluation.missingDiagnostics} important diagnostic stage{evaluation.missingDiagnostics === 1 ? "" : "s"}.</p> : null}
                  </div>
                ) : null}
                {evaluation.misconceptions.map((item) => <p key={item} className="mt-3 text-sm text-destructive">{item}</p>)}
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{scenario.explanation}</p>
                <Button className="mt-4" variant="outline" onClick={() => start()}><RefreshCw aria-hidden /> Try again</Button>
              </Panel>
            ) : null}

            <Panel title="Saved attempts">
              <div className="space-y-2">
                {user.terminalAttempts.filter((item) => item.scenarioId === scenario.id).slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0">
                    <button type="button" className="min-w-0 text-left text-sm" onClick={() => { setAttemptId(item.id); setReasoning(item.reasoning); }}>
                      <span className="block font-medium">{item.status === "submitted" ? `${item.score ?? 0}%` : "In progress"}</span>
                      <span className="block truncate text-xs text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</span>
                    </button>
                    <Button size="icon" variant="ghost" title="Delete attempt" onClick={() => { actions.removeTerminalAttempt(item.id); if (attemptId === item.id) setAttemptId(""); }}><Trash2 aria-hidden /></Button>
                  </div>
                ))}
                {!user.terminalAttempts.some((item) => item.scenarioId === scenario.id) ? <p className="text-sm text-muted-foreground">No attempts yet.</p> : null}
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums">{value}%</span></div>;
}