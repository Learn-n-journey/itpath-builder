import type { TerminalAttempt } from "@/lib/app-data/types";
import { execute } from "./shells";
import { buildScenarioMachine, goalMet, type TerminalScenario } from "./scenarios";

function id(prefix: string): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function createTerminalAttempt(
  scenario: TerminalScenario,
  mode: TerminalAttempt["mode"],
): TerminalAttempt {
  const now = new Date().toISOString();
  return {
    id: id("terminal-attempt"),
    scenarioId: scenario.id,
    topicId: scenario.topicId,
    shell: scenario.shell,
    mode,
    status: "in_progress",
    machine: buildScenarioMachine(scenario),
    transcript: [],
    hintsUsed: 0,
    reasoning: "",
    createdAt: now,
    updatedAt: now,
    // Generated variations are not in the static library, so the attempt keeps
    // its own copy and stays playable after a refresh.
    ...(scenario.source && scenario.source !== "curated" ? { scenarioSnapshot: scenario } : {}),
  };
}

export function runTerminalCommand(attempt: TerminalAttempt, raw: string): TerminalAttempt {
  const command = raw.trim();
  if (!command || attempt.status === "submitted") return attempt;
  const prompt = attempt.machine.shell === "cmd"
    ? `${attempt.machine.drive}\\${attempt.machine.cwd.join("\\")}>`
    : attempt.machine.shell === "powershell"
      ? `PS ${attempt.machine.drive}\\${attempt.machine.cwd.join("\\")}>`
      : `${attempt.machine.currentUser}@${attempt.machine.hostname}:${attempt.machine.cwd.length ? `/${attempt.machine.cwd.join("/")}` : "/"}$`;
  const result = execute(attempt.machine, command);
  return {
    ...attempt,
    machine: result.state,
    transcript: result.cleared
      ? []
      : [...attempt.transcript, { id: id("line"), command, prompt, output: result.output, error: result.error, createdAt: new Date().toISOString() }].slice(-150),
    updatedAt: new Date().toISOString(),
  };
}

function commandMatches(command: string, pattern: string): boolean {
  return new RegExp(pattern, "i").test(command.trim());
}

export interface TerminalEvaluation {
  score: number;
  objectiveScore: number;
  processScore: number;
  efficiencyScore: number;
  goalsMet: string[];
  missingGoals: string[];
  missingDiagnostics: number;
  misconceptions: string[];
}

export function evaluateTerminalAttempt(
  scenario: TerminalScenario,
  attempt: TerminalAttempt,
): TerminalEvaluation {
  const commands = attempt.transcript.map((entry) => entry.command);
  const met = scenario.goals.filter((goal) => goalMet(attempt.machine, goal));
  const diagnosticHits = scenario.diagnosticGroups.filter((group) =>
    group.some((pattern) => commands.some((command) => commandMatches(command, pattern))),
  ).length;
  const objectiveScore = Math.round((met.length / scenario.goals.length) * 100);
  const processScore = Math.round((diagnosticHits / scenario.diagnosticGroups.length) * 100);
  const efficiencyScore = Math.max(0, Math.round(100 - Math.max(0, commands.length - scenario.efficientCommandCount) * 10));
  const misconceptions = scenario.misconceptionRules
    .filter((rule) => commands.some((command) => commandMatches(command, rule.pattern)))
    .map((rule) => rule.label);
  const penalty = misconceptions.length * 10;
  const score = Math.max(0, Math.round(objectiveScore * 0.6 + processScore * 0.3 + efficiencyScore * 0.1 - penalty));
  return {
    score,
    objectiveScore,
    processScore,
    efficiencyScore,
    goalsMet: met.map((goal) => goal.description),
    missingGoals: scenario.goals.filter((goal) => !met.includes(goal)).map((goal) => goal.description),
    missingDiagnostics: scenario.diagnosticGroups.length - diagnosticHits,
    misconceptions,
  };
}

export function recommendedTerminalScenario(
  scenarios: TerminalScenario[],
  attempts: TerminalAttempt[],
  weakTopicIds: string[],
): TerminalScenario {
  return [...scenarios].sort((a, b) => {
    const aWeak = weakTopicIds.includes(a.topicId) ? 1 : 0;
    const bWeak = weakTopicIds.includes(b.topicId) ? 1 : 0;
    const aBest = Math.max(0, ...attempts.filter((item) => item.scenarioId === a.id).map((item) => item.score ?? 0));
    const bBest = Math.max(0, ...attempts.filter((item) => item.scenarioId === b.id).map((item) => item.score ?? 0));
    return bWeak - aWeak || aBest - bBest;
  })[0] as TerminalScenario;
}