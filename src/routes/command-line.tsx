import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  ArrowDown,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  Minus,
  Play,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Square,
  SquareTerminal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
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
  component: () => <Navigate to="/virtual-mobile" replace />,
});

function CommandLineRoute() {
  return (
    <ProGate feature="Virtual computer and mobile practice">
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
type TerminalEnvironment = "android" | "ios";

const FREE_PREFIX = "terminal-free-";

/** A plain machine with no task attached, for using the command line on its own. */
function freePlayScenario(shell: TerminalAttempt["shell"]): TerminalScenario {
  return {
    id: `${FREE_PREFIX}${shell}`,
    topicId: "topic-command-line-fundamentals",
    shell,
    title: "Free terminal",
    brief:
      "A clean virtual machine with nothing to solve. Explore the file system, try commands and see what they return. Type help at any time for the commands this machine supports.",
    environment: `${shellLabels[shell]} virtual machine, isolated from your real device.`,
    difficulty: "gentle",
    estimatedMinutes: 10,
    goals: [],
    diagnosticGroups: [],
    efficientCommandCount: 0,
    hints: [],
    explanation: "",
    reasoningKeywords: [],
    misconceptionRules: [],
    source: "random",
  };
}

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
    const shells: TerminalAttempt["shell"][] = ["android", "ios"];
    return shells.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0] ?? recommended.shell;
  }, [user.terminalAttempts, recommended.shell]);
  const [shell, setShell] = useState<TerminalAttempt["shell"]>(recommendedShell);
  const environment: TerminalEnvironment = shell === "ios" ? "ios" : "android";
  const shellScenarios = useMemo(() => scenariosForShell(shell), [shell]);
  const [scenarioId, setScenarioId] = useState(recommended.id);
  const [mode, setMode] = useState<TerminalMode>("guided");
  const [workspaceView, setWorkspaceView] = useState<"free" | "scenario">("free");
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

  const openedDefaultTerminal = useRef(false);
  useEffect(() => {
    if (openedDefaultTerminal.current) return;
    openedDefaultTerminal.current = true;
    const free = freePlayScenario(recommendedShell);
    setGenerated(free);
    setScenarioId(free.id);
    const existing = user.terminalAttempts.find(
      (item) => item.scenarioId === free.id && item.status === "in_progress",
    );
    if (existing) {
      setAttemptId(existing.id);
      return;
    }
    const next = createTerminalAttempt(free, "guided");
    actions.addTerminalAttempt(next);
    setAttemptId(next.id);
  }, [actions, recommendedShell, user.terminalAttempts]);

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
    setReasoning("");
    setCommand("");

    if (workspaceView === "free") {
      const free = freePlayScenario(value);
      setGenerated(free);
      setScenarioId(free.id);
      setAttemptId("");
      start(false, free);
      return;
    }

    setGenerated(null);
    setScenarioId(next[0]?.id ?? recommended.id);
    setAttemptId("");
  }

  function changeEnvironment(value: TerminalEnvironment) {
    return changeShell(value === "ios" ? "ios" : "android");
  }

  function changeScenario(id: string) {
    setWorkspaceView("scenario");
    setGenerated(null);
    setScenarioId(id);
    setAttemptId("");
    const saved = user.terminalAttempts.find((item) => item.scenarioId === id && item.status === "in_progress");
    setReasoning(saved?.reasoning ?? "");
  }

  function rollRandomScenario() {
    setWorkspaceView("scenario");
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
    setWorkspaceView("scenario");
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

  function openFreeTerminal() {
    setWorkspaceView("free");
    const free = freePlayScenario(shell);
    setGenerated(free);
    setScenarioId(free.id);
    setAttemptId("");
    setReasoning("");
    setCommand("");
    start(false, free);
  }

  function start(reset = false, useScenario?: TerminalScenario) {
    const target = useScenario ?? scenario;
    if (reset && attempt && attempt.status === "in_progress") actions.removeTerminalAttempt(attempt.id);
    const next = createTerminalAttempt(target, mode);
    actions.addTerminalAttempt(next);
    setAttemptId(next.id);
    setReasoning("");
    setCommand("");
    setScrollToTerminal(true);
    toast.success(reset ? "Virtual computer reset" : useScenario ? "Terminal ready" : "Practice started");
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

  const isFree = scenario.id.startsWith(FREE_PREFIX);
  const commands = attempt?.machine.history ?? [];
  const completedCount = user.terminalAttempts.filter((item) => item.status === "submitted").length;
  const bestScore = Math.max(0, ...user.terminalAttempts.map((item) => item.score ?? 0));

  return (
    <>
      <PageHeader
        title="Command-line simulator"
        description="Mobile command-line practice remains here while desktop terminal training now lives inside Virtual Desktop."
        actions={<Badge variant="outline"><ShieldCheck className="mr-1 size-3" aria-hidden /> Isolated</Badge>}
      />

      <div className="mt-1 flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid w-full grid-cols-2 overflow-hidden rounded-full border border-border bg-card/70 xl:max-w-md">
          <Button
            type="button"
            variant="ghost"
            onClick={openFreeTerminal}
            className={`rounded-none border-r border-border px-4 py-5 ${workspaceView === "free" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
          >
            <SquareTerminal aria-hidden /> Free terminal
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setWorkspaceView("scenario");
              const nextId = shellScenarios[0]?.id ?? recommended.id;
              changeScenario(nextId);
            }}
            className={`rounded-none px-4 py-5 ${workspaceView === "scenario" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
          >
            <Play aria-hidden /> Guided / Challenge
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
          <div className="min-w-0 space-y-1.5">
            <Label>Environment</Label>
            <Select value={environment} onValueChange={(value) => changeEnvironment(value as TerminalEnvironment)}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Environment"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="ios">iPhone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="outline" onClick={() => start(true)} disabled={!attempt || attempt.status === "submitted"}>
            <RefreshCw aria-hidden /> Reset
          </Button>
        </div>
      </div>

      {workspaceView === "scenario" ? (
        <section className="mt-4 rounded-xl border border-border bg-card/40 p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <Label>Scenario</Label>
              <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                <Select value={scenario.id} onValueChange={changeScenario}>
                  <SelectTrigger aria-label="Scenario" className="min-w-0 flex-1 sm:min-w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {scenario.source && scenario.source !== "curated" ? <SelectItem value={scenario.id}>{scenario.title}</SelectItem> : null}
                    {shellScenarios.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={rollRandomScenario}><Shuffle aria-hidden /> Random</Button>
                <Button type="button" variant="outline" onClick={createAiScenario} disabled={creating}><Sparkles aria-hidden /> {creating ? "Creating…" : "AI"}</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 overflow-hidden rounded-full border border-border bg-background/60">
              {(["guided", "challenge"] as const).map((item, index) => (
                <Button
                  key={item}
                  type="button"
                  variant="ghost"
                  onClick={() => setMode(item)}
                  className={`rounded-none px-5 capitalize ${index === 0 ? "border-r border-border" : ""} ${mode === item ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!attempt ? (
        <Panel className="mt-5" title={scenario.title} description={shellLabels[scenario.shell]}>
          <p className="text-sm leading-relaxed text-muted-foreground">{scenario.brief}</p>
          <p className="mt-3 text-sm"><span className="font-medium">Environment: </span><span className="text-muted-foreground">{scenario.environment}</span></p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => start()}><Play aria-hidden /> Start scenario</Button>
            <Button variant="outline" onClick={openFreeTerminal}><SquareTerminal aria-hidden /> Open the terminal on its own</Button>
            {scenario.id === recommended.id ? <Badge variant="secondary">Recommended from your learning record</Badge> : null}
          </div>
        </Panel>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <section className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold">{scenario.title}</h2>
                <Badge variant="outline">{shellLabels[scenario.shell]}</Badge>
                <Badge variant="secondary">{attempt.mode === "challenge" ? "Challenge" : "Guided"}</Badge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{scenario.brief}</p>
            </section>

            <section ref={terminalPanel} aria-label="Virtual terminal" data-shell={attempt.shell} className="terminal-window scroll-mt-20">
              {(() => {
                const windowsShell = attempt.shell === "cmd" || attempt.shell === "powershell";
                return (
              <div className="terminal-titlebar">
                {windowsShell ? null : (
                  <span className="flex gap-1.5" aria-hidden>
                    <span className="terminal-dot terminal-dot-close" />
                    <span className="terminal-dot terminal-dot-min" />
                    <span className="terminal-dot terminal-dot-max" />
                  </span>
                )}
                <span className="flex min-w-0 items-center gap-2 font-mono text-xs term-muted"><SquareTerminal className="size-4 shrink-0" aria-hidden /><span className="truncate">{shellLabels[attempt.shell]} · {attempt.machine.hostname}</span></span>
                <Button type="button" size="sm" variant="ghost" onClick={() => start(true)} disabled={attempt.status === "submitted"} title="Reset virtual computer" className="ml-auto"><RefreshCw aria-hidden /> Reset</Button>
                {windowsShell ? (
                  <span className="flex items-center gap-1" aria-hidden>
                    <span className="terminal-winctrl"><Minus className="size-3" /></span>
                    <span className="terminal-winctrl"><Square className="size-2.5" /></span>
                    <span className="terminal-winctrl terminal-winctrl-close"><X className="size-3" /></span>
                  </span>
                ) : null}
              </div>
                );
              })()}
              <div className="terminal-screen" role="log" aria-live="polite">
                <p className="mb-4 term-muted">IT PATH virtual machine. Type help for supported commands.</p>
                {attempt.transcript.map((entry) => (
                  <div key={entry.id} className="mb-3">
                    <div><span className="term-prompt">{entry.prompt}</span> {entry.command}</div>
                    {entry.output ? <pre className={entry.error ? "whitespace-pre-wrap term-error" : "whitespace-pre-wrap"}>{entry.output}</pre> : null}
                  </div>
                ))}
                {attempt.status !== "submitted" ? (
                  <div aria-hidden><span className="term-prompt">{prompt(attempt.machine)}</span> <span className="terminal-cursor" /></div>
                ) : null}
                <div ref={terminalEnd} />
              </div>
              <form className="terminal-inputbar" onSubmit={(event) => { event.preventDefault(); run(); }}>
                <span className="term-prompt hidden shrink-0 px-2 py-2 font-mono text-sm sm:block">{prompt(attempt.machine)}</span>
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
                  className="border-0 bg-transparent font-mono shadow-none focus-visible:ring-0 dark:bg-transparent"
                  placeholder="Enter a command"
                />
                <Button type="submit" size="icon" disabled={!command.trim() || attempt.status === "submitted"} title="Run command"><ArrowDown aria-hidden /></Button>
              </form>
            </section>

            {isFree ? null : (
            <Panel title="Your diagnosis" description="Explain the cause, the evidence you found, the repair, and how you verified it." descriptionVisibility="visible">
              <Textarea value={reasoning} onChange={(event) => setReasoning(event.target.value)} disabled={attempt.status === "submitted"} rows={5} placeholder="The evidence showed… I fixed it by… I verified…" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={saveReasoning} disabled={attempt.status === "submitted"}>Save progress</Button>
                <Button onClick={submit} disabled={attempt.status === "submitted"}><CheckCircle2 aria-hidden /> Check my work</Button>
              </div>
            </Panel>
            )}
          </div>

          <aside className="space-y-4 xl:border-l xl:border-border xl:pl-5">
            {isFree ? (
              <Panel title="Quick help" description="Type help to see what this machine supports.">
                <div className="flex flex-wrap gap-2">
                  {["help", "dir", "cd ..", "cd \\", "type filename"].map((item) => (
                    <Badge key={item} variant="outline" className="font-mono">{item}</Badge>
                  ))}
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-medium">Need a scenario?</p>
                  <p className="mt-1 text-xs text-muted-foreground">Switch to guided practice or a no-hint challenge.</p>
                  <Button className="mt-3 w-full" variant="outline" onClick={() => {
                    setWorkspaceView("scenario");
                    changeScenario(shellScenarios[0]?.id ?? recommended.id);
                  }}>
                    <Play aria-hidden /> Guided / Challenge
                  </Button>
                  <Button className="mt-2 w-full" variant="ghost" onClick={rollRandomScenario}><Shuffle aria-hidden /> Surprise me</Button>
                </div>
              </Panel>
            ) : (
            <Panel title="Objectives">
              <ul className="space-y-3 text-sm">
                {scenario.goals.map((goal) => (
                  <li key={goal.id} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><span>{goal.description}</span></li>
                ))}
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><span>Gather evidence before changing the system</span></li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><span>Verify the final state</span></li>
              </ul>
            </Panel>
            )}

            {!isFree && attempt.mode === "guided" && attempt.status !== "submitted" ? (
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