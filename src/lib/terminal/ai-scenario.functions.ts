import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MachineSpec, ShellKind } from "./machine";
import type { TerminalScenario } from "./scenarios";
import { runAi } from "@/lib/ai/run.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlan } from "@/lib/entitlement.server";

const shellKinds = ["cmd", "powershell", "bash", "android", "ios"] as const;

const inputSchema = z.object({
  shell: z.enum(shellKinds),
  topicId: z.string().min(1).max(200),
  topicTitle: z.string().min(1).max(300).default("IT support"),
  weakAreas: z.array(z.string().max(200)).max(10).default([]),
  difficulty: z.enum(["gentle", "standard", "challenging"]).default("standard"),
});

/** Faults the simulator can really create and the learner can really repair. */
const faultKinds = ["service_stopped", "runaway_process", "stale_dns", "missing_folder"] as const;
type FaultKind = (typeof faultKinds)[number];

const serviceChoices: Record<ShellKind, string[]> = {
  cmd: ["Spooler", "Dhcp", "LanmanWorkstation", "wuauserv"],
  powershell: ["Spooler", "Dhcp", "LanmanWorkstation", "wuauserv"],
  bash: ["ssh", "nginx", "cron", "ufw"],
  android: ["wifi", "data", "bluetooth", "nfc", "location", "sync"],
  ios: ["wifi", "cellular", "icloud", "mail", "mdm", "findmy"],
};

const processChoices: Record<ShellKind, string[]> = {
  cmd: ["backup-agent.exe", "indexer.exe", "sync-agent.exe"],
  powershell: ["backup-agent.exe", "indexer.exe", "sync-agent.exe"],
  bash: ["report-worker", "log-shipper", "media-encoder"],
  android: ["com.android.chrome", "com.corp.mail"],
  ios: ["Maps", "Safari", "Mail"],
};

function faultsFor(shell: ShellKind): FaultKind[] {
  if (shell === "ios") return ["service_stopped", "runaway_process", "stale_dns"];
  if (shell === "android") return ["service_stopped", "runaway_process", "missing_folder"];
  return [...faultKinds];
}

const replyShape = z.object({
  title: z.string().min(4).max(120),
  brief: z.string().min(20).max(900),
  environment: z.string().min(5).max(300),
  fault: z.enum(faultKinds),
  target: z.string().max(120).default(""),
  hints: z.array(z.string().max(220)).default([]),
  explanation: z.string().max(900).default(""),
  keywords: z.array(z.string().max(40)).default([]),
  estimatedMinutes: z.number().default(10),
});

export type AiScenarioReply = { ok: true; scenario: TerminalScenario } | { ok: false; error: string };

function pick(list: string[], preferred: string): string {
  const match = list.find((item) => item.toLowerCase() === preferred.trim().toLowerCase());
  return match ?? (list[0] as string);
}

function homeFolder(shell: ShellKind): string {
  if (shell === "bash") return "/home/student/evidence";
  if (shell === "android") return "/sdcard/evidence";
  return "C:\\Users\\student\\evidence";
}

/** Real, shell-correct commands revealed under each hint for AI-generated scenarios. */
function aiHintSteps(shell: ShellKind, fault: FaultKind, target: string): string[][] {
  if (fault === "service_stopped") {
    if (shell === "cmd") return [[`sc query ${target}`], ["net start"], [`sc start ${target}`, `sc query ${target}`]];
    if (shell === "powershell") return [[`Get-Service -Name ${target}`], ["Start-Process powershell -Verb RunAs"], [`Start-Service -Name ${target}`, `Get-Service -Name ${target}`]];
    if (shell === "bash") return [[`systemctl status ${target}`], ["ping 10.0.0.1"], [`sudo systemctl start ${target}`, `systemctl status ${target}`]];
    if (shell === "android") return [[`dumpsys ${target}`], ["settings list"], [`svc ${target} enable`, `dumpsys ${target}`]];
    return [["sync status"], ["device info"], [`sync on ${target}`, "sync status"]];
  }
  if (fault === "runaway_process") {
    if (shell === "cmd") return [["tasklist"], ["tasklist"], [`taskkill /im ${target}`, "tasklist"]];
    if (shell === "powershell") return [["Get-Process"], ["Get-Process"], [`Stop-Process -Name ${target.replace(/\.exe$/i, "")}`, "Get-Process"]];
    if (shell === "bash") return [["ps aux", "free -m"], ["top"], [`pkill ${target}`, "free -m"]];
    if (shell === "android") return [["dumpsys battery"], ["ps"], [`am force-stop ${target}`, "dumpsys battery"]];
    return [["apps list"], ["device info"], [`app quit ${target}`, "apps list"]];
  }
  if (fault === "stale_dns") {
    if (shell === "cmd") return [["ping 10.0.0.1"], ["nslookup intranet.corp.local"], ["ipconfig /flushdns", "nslookup intranet.corp.local"]];
    if (shell === "powershell") return [["Test-Connection 10.0.0.1"], ["Resolve-DnsName intranet.corp.local"], ["Clear-DnsClientCache", "Resolve-DnsName intranet.corp.local"]];
    if (shell === "bash") return [["ping 10.0.0.1"], ["dig intranet.corp.local"], ["resolvectl flush-caches", "dig intranet.corp.local"]];
    return [["network status"], ["logs"], ["network reset", "network status"]];
  }
  const folder = homeFolder(shell);
  if (shell === "cmd") return [["cd"], ["dir"], [`mkdir ${folder}`, "dir"]];
  if (shell === "powershell") return [["Get-Location"], ["ls"], [`New-Item -ItemType Directory -Path ${folder}`, "ls"]];
  if (shell === "android") return [["pwd"], ["ls /sdcard"], [`mkdir ${folder}`, "ls /sdcard"]];
  return [["pwd"], ["ls"], [`mkdir ${folder}`, "ls"]];
}

function buildScenario(
  shell: ShellKind,
  topicId: string,
  difficulty: "gentle" | "standard" | "challenging",
  reply: z.infer<typeof replyShape>,
): TerminalScenario {
  const allowed = faultsFor(shell);
  const fault: FaultKind = allowed.includes(reply.fault) ? reply.fault : (allowed[0] as FaultKind);
  const id = `terminal-ai-${shell}-${crypto.randomUUID()}`;
  const base = {
    id,
    topicId,
    shell,
    title: reply.title.trim(),
    brief: reply.brief.trim(),
    environment: reply.environment.trim(),
    difficulty,
    estimatedMinutes: Math.max(5, Math.min(30, Math.round(reply.estimatedMinutes))),
    efficientCommandCount: 4,
    hints: reply.hints.map((hint) => hint.trim()).filter(Boolean).slice(0, 3),
    explanation: reply.explanation.trim(),
    reasoningKeywords: reply.keywords.map((word) => word.trim().toLowerCase()).filter(Boolean).slice(0, 6),
    misconceptionRules: [
      { pattern: "format|factory|wipe|rm -rf /", label: "Reached for a destructive action before isolating the cause" },
    ],
    source: "ai" as const,
  };

  if (fault === "service_stopped") {
    const target = pick(serviceChoices[shell], reply.target);
    const spec: MachineSpec = { shell };
    return {
      ...base,
      goals: [{ id: "service", description: `Return ${target} to running`, kind: "service_running", target }],
      diagnosticGroups: [["status", "query", "list"], ["start", "enable", "on"]],
      hintSteps: aiHintSteps(shell, fault, target),
      machineSpec: { ...spec, services: stoppedServices(shell, target) },
    };
  }

  if (fault === "runaway_process") {
    const target = pick(processChoices[shell], reply.target);
    return {
      ...base,
      goals: [{ id: "process", description: `Stop ${target}`, kind: "process_absent", target }],
      diagnosticGroups: [["tasklist", "ps", "top", "get-process", "dumpsys", "apps"], ["kill", "stop", "force-stop", "taskkill", "quit"]],
      hintSteps: aiHintSteps(shell, fault, target),
      machineSpec: { shell, memoryUsedMb: 7600, processes: runawayProcesses(shell, target) },
    };
  }

  if (fault === "stale_dns") {
    return {
      ...base,
      goals: [{ id: "dns", description: "Clear the stale cached lookup", kind: "dns_cache_empty" }],
      diagnosticGroups: [["ipconfig", "ip addr", "network status", "nslookup", "dig"], ["flush", "reset", "clear"]],
      hintSteps: aiHintSteps(shell, fault, ""),
      machineSpec: { shell, dnsCache: { "intranet.corp.local": "10.0.0.99" } },
    };
  }

  const folder = homeFolder(shell);
  return {
    ...base,
    goals: [{ id: "folder", description: `Create ${folder}`, kind: "path_exists", target: folder }],
    diagnosticGroups: [["pwd", "cd", "dir", "ls"], ["mkdir", "md", "new-item"]],
    hintSteps: aiHintSteps(shell, "missing_folder", ""),
    machineSpec: { shell },
  };
}

function stoppedServices(shell: ShellKind, target: string) {
  const catalogue: Record<string, { display: string }> = {
    Spooler: { display: "Print Spooler" },
    Dhcp: { display: "DHCP Client" },
    LanmanWorkstation: { display: "Workstation" },
    wuauserv: { display: "Windows Update" },
    ssh: { display: "OpenBSD Secure Shell server" },
    nginx: { display: "A high performance web server" },
    cron: { display: "Regular background program processing" },
    ufw: { display: "Uncomplicated firewall" },
    wifi: { display: "Wi-Fi" },
    data: { display: "Mobile data" },
    cellular: { display: "Cellular data" },
    bluetooth: { display: "Bluetooth" },
    nfc: { display: "NFC controller" },
    location: { display: "Location services" },
    sync: { display: "Account sync" },
    icloud: { display: "iCloud sync" },
    mail: { display: "Mail account" },
    mdm: { display: "Mobile device management" },
    findmy: { display: "Find My" },
  };
  return serviceChoices[shell].map((name) => ({
    name,
    display: catalogue[name]?.display ?? name,
    status: (name === target ? "stopped" : "running") as "stopped" | "running",
    startType: "auto" as const,
  }));
}

function runawayProcesses(shell: ShellKind, target: string) {
  const owner = shell === "bash" ? "student" : shell === "ios" || shell === "android" ? "student" : "student";
  const root = shell === "cmd" || shell === "powershell" ? "SYSTEM" : "root";
  const core = shell === "cmd" || shell === "powershell" ? "System" : shell === "bash" ? "systemd" : "init";
  return [
    { pid: 1, name: core, user: root, cpu: 0.2, memoryMb: 18 },
    { pid: 4120, name: target, user: owner, cpu: 92, memoryMb: 4400 },
  ];
}

/**
 * Deterministic self-check: the fault the scenario describes must be one the
 * simulator really creates and the learner can really repair.
 */
function isSolvable(scenario: TerminalScenario, shell: ShellKind): boolean {
  const goal = scenario.goals[0];
  if (!goal) return false;
  if (!scenario.title.trim() || !scenario.brief.trim()) return false;
  if (scenario.machineSpec?.shell !== shell) return false;

  if (goal.kind === "service_running") {
    if (!goal.target || !serviceChoices[shell].includes(goal.target)) return false;
    const services = scenario.machineSpec?.services ?? [];
    return services.some((service) => service.name === goal.target && service.status === "stopped");
  }
  if (goal.kind === "process_absent") {
    if (!goal.target || !processChoices[shell].includes(goal.target)) return false;
    return (scenario.machineSpec?.processes ?? []).some((process) => process.name === goal.target);
  }
  if (goal.kind === "dns_cache_empty") {
    return Object.keys(scenario.machineSpec?.dnsCache ?? {}).length > 0;
  }
  if (goal.kind === "path_exists") return Boolean(goal.target);
  return true;
}

export const generateTerminalScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<AiScenarioReply> => {
    const denied = await requirePlan(context.supabase, context.userId, context.claims, "plus", "AI practice scenarios");
    if (denied) return denied;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI practice is not configured." };

    const allowed = faultsFor(data.shell);
    const system = [
      "You write short, realistic IT support scenarios for a command-line practice simulator.",
      "The simulator is limited. Only these faults exist, and you must pick exactly one:",
      allowed.join(", "),
      `Allowed service names: ${serviceChoices[data.shell].join(", ")}.`,
      `Allowed process or app names: ${processChoices[data.shell].join(", ")}.`,
      "Never invent commands, files or tools outside a normal support workflow.",
      "Write plain text only, no markdown symbols.",
      "Reply with one JSON object and nothing else:",
      '{"title":"short title","brief":"2-4 sentences describing the complaint and what to achieve","environment":"one sentence about the device","fault":"one of the allowed faults","target":"the service or app name if relevant, else empty","hints":["three hints, increasingly direct"],"explanation":"2-3 sentences on what was wrong and why the fix worked","keywords":["4-6 words a good written explanation would include"],"estimatedMinutes":10}',
    ].join("\n");

    const environmentLabel =
      data.shell === "android"
        ? "Android phone over an adb shell"
        : data.shell === "ios"
          ? "iPhone handled through a support console, with no shell access"
          : data.shell === "bash"
            ? "Linux or Mac terminal"
            : `Windows ${data.shell === "cmd" ? "CMD" : "PowerShell"} prompt`;

    const prompt = [
      `Environment: ${environmentLabel}`,
      `Topic focus: ${data.topicTitle}`,
      data.weakAreas.length ? `The learner is weak on: ${data.weakAreas.join(", ")}` : "",
      `Difficulty: ${data.difficulty}`,
      "Return the JSON object now.",
    ]
      .filter(Boolean)
      .join("\n");

    // One retry: a generated scenario the simulator cannot actually complete is
    // regenerated once before the learner ever sees it.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        // Low risk and easy to verify, so this stays on the cheap model. Each
        // attempt is deliberately uncached: a fresh scenario every time.
        const result = await runAi({
          feature: "scenario",
          userId: context.userId,
          system,
          prompt: `${prompt}\nAttempt: ${attempt + 1}`,
          risk: "low",
          priority: "interactive",
          json: true,
          // A regeneration is the same piece of work, so it is not charged twice.
          skipBudget: attempt > 0,
        });
        if (!result.ok) {
          if (attempt === 0 && result.outcome === "error") continue;
          return { ok: false, error: result.error };
        }
        const raw = result.text;
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start === -1 || end === -1) {
          if (attempt === 0) continue;
          return { ok: false, error: "The scenario writer returned an unreadable reply." };
        }

        const parsed = replyShape.safeParse(JSON.parse(raw.slice(start, end + 1)));
        if (!parsed.success) {
          if (attempt === 0) continue;
          return { ok: false, error: "The scenario writer returned an unexpected format." };
        }

        const scenario = buildScenario(data.shell, data.topicId, data.difficulty, parsed.data);
        if (scenario.hints.length === 0) {
          scenario.hints = ["Gather evidence before changing anything.", "Check the state of the component named in the complaint.", "Fix only that component, then verify it."];
        }
        if (!isSolvable(scenario, data.shell)) {
          if (attempt === 0) continue;
          return { ok: false, error: "Could not create a scenario you can finish here, try again." };
        }
        return { ok: true, scenario };
      } catch {
        return { ok: false, error: "Could not reach the scenario writer." };
      }
    }

    return { ok: false, error: "Could not create a scenario, try again." };
  });
