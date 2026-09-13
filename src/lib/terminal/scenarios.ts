import type { Difficulty } from "@/lib/app-data/types";
import {
  createMachine,
  findService,
  getNode,
  resolvePath,
  type MachineState,
  type ShellKind,
} from "./machine";

export type TerminalGoal =
  | { id: string; description: string; kind: "dns_cache_empty" }
  | { id: string; description: string; kind: "service_running"; target: string }
  | { id: string; description: string; kind: "process_absent"; target: string }
  | { id: string; description: string; kind: "user_unlocked"; target: string }
  | { id: string; description: string; kind: "file_mode"; target: string; expected: string }
  | { id: string; description: string; kind: "path_exists"; target: string };

export interface TerminalScenario {
  id: string;
  topicId: string;
  shell: ShellKind;
  title: string;
  brief: string;
  environment: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  goals: TerminalGoal[];
  diagnosticGroups: string[][];
  efficientCommandCount: number;
  hints: string[];
  explanation: string;
  reasoningKeywords: string[];
  misconceptionRules: Array<{ pattern: string; label: string }>;
}

export const terminalScenarios: TerminalScenario[] = [
  {
    id: "terminal-cmd-stale-dns",
    topicId: "topic-dns-fundamentals",
    shell: "cmd",
    title: "The intranet resolves to an old address",
    brief: "A Windows user can reach the gateway, but intranet.corp.local is resolving to the retired server at 10.0.0.99. Diagnose the layer at fault and restore name resolution.",
    environment: "Windows 11 workstation on the corporate LAN. Use the simulated CMD prompt only.",
    difficulty: "gentle",
    estimatedMinutes: 10,
    goals: [{ id: "flush", description: "Remove the stale DNS resolver entry", kind: "dns_cache_empty" }],
    diagnosticGroups: [["ipconfig", "ping 10.0.0.1"], ["nslookup intranet.corp.local", "ping intranet.corp.local"]],
    efficientCommandCount: 4,
    hints: ["Test the local network separately from name resolution.", "Compare a direct IP test with a hostname lookup.", "CMD can clear cached resolver answers with ipconfig /flushdns."],
    explanation: "The network path was healthy. A stale local resolver cache sent the hostname to 10.0.0.99, so flushing that cache allowed the current DNS record to be used.",
    reasoningKeywords: ["dns", "cache", "hostname", "ip", "flush"],
    misconceptionRules: [{ pattern: "route delete|format|del .*hosts", label: "Used a destructive fix before isolating DNS" }],
  },
  {
    id: "terminal-cmd-print-service",
    topicId: "topic-command-line-fundamentals",
    shell: "cmd",
    title: "Print jobs remain queued",
    brief: "Users cannot print from an administrator CMD session. Inspect the Print Spooler, restore it, and verify its final state.",
    environment: "Windows 11 support workstation with an elevated CMD prompt.",
    difficulty: "standard",
    estimatedMinutes: 12,
    goals: [{ id: "spooler", description: "Return the Print Spooler service to running", kind: "service_running", target: "Spooler" }],
    diagnosticGroups: [["sc query spooler", "net start"], ["sc start spooler", "net start spooler"]],
    efficientCommandCount: 3,
    hints: ["Printing depends on a Windows service.", "Use sc query to inspect a named service.", "Start Spooler, then query it again to verify."],
    explanation: "The Spooler service was stopped. Querying it established the cause; starting it and checking again restored the print dependency.",
    reasoningKeywords: ["spooler", "service", "stopped", "start", "verify"],
    misconceptionRules: [{ pattern: "del |rd |format", label: "Deleted data for a service-state problem" }],
  },
  {
    id: "terminal-powershell-locked-user",
    topicId: "topic-command-line-fundamentals",
    shell: "powershell",
    title: "A local support account is disabled",
    brief: "The local account helpdesk2 cannot sign in. Confirm its state, elevate safely, enable it, and verify the change.",
    environment: "Windows 11 PowerShell opened as a standard user.",
    difficulty: "standard",
    estimatedMinutes: 14,
    goals: [{ id: "unlock", description: "Enable the helpdesk2 local account", kind: "user_unlocked", target: "helpdesk2" }],
    diagnosticGroups: [["get-localuser", "get-localuser -name helpdesk2"], ["start-process powershell -verb runas"], ["enable-localuser -name helpdesk2"]],
    efficientCommandCount: 4,
    hints: ["Inspect the account before changing it.", "This change requires an elevated shell.", "Use Start-Process powershell -Verb RunAs, then Enable-LocalUser."],
    explanation: "The account existed but was disabled. The correct path was to confirm that state, elevate, enable only that account, and verify Enabled became True.",
    reasoningKeywords: ["disabled", "account", "elevated", "enable", "verify"],
    misconceptionRules: [{ pattern: "remove-item|disable-localuser", label: "Tried to remove or further disable the affected account" }],
  },
  {
    id: "terminal-powershell-memory-process",
    topicId: "topic-command-line-fundamentals",
    shell: "powershell",
    title: "A workstation is low on memory",
    brief: "The workstation has become unresponsive. Identify the abnormal process, stop only that process, and confirm memory use returns to a safe level.",
    environment: "Windows 11 PowerShell. The affected process belongs to the signed-in user.",
    difficulty: "challenging",
    estimatedMinutes: 15,
    goals: [{ id: "process", description: "Stop the runaway backup-agent process", kind: "process_absent", target: "backup-agent.exe" }],
    diagnosticGroups: [["get-process"], ["stop-process -name backup-agent", "stop-process -id 4450"], ["get-computerinfo", "get-process"]],
    efficientCommandCount: 4,
    hints: ["List processes and compare memory use.", "Stop-Process accepts either -Name or -Id.", "After stopping it, inspect processes or free memory again."],
    explanation: "backup-agent.exe was consuming most available memory. Stopping that single user process was proportionate; terminating system services or rebooting would hide the cause.",
    reasoningKeywords: ["backup-agent", "memory", "process", "stop", "verify"],
    misconceptionRules: [{ pattern: "stop-process -name system|stop-process -id 4", label: "Tried to terminate a protected system process" }],
  },
  {
    id: "terminal-linux-web-service",
    topicId: "topic-command-line-fundamentals",
    shell: "bash",
    title: "The internal web service is down",
    brief: "The Linux server responds to network tests, but its web page is unavailable. Diagnose nginx, restore it, and prove the service is running.",
    environment: "Ubuntu server as a sudo-capable standard user.",
    difficulty: "standard",
    estimatedMinutes: 14,
    goals: [{ id: "nginx", description: "Return nginx to running", kind: "service_running", target: "nginx" }],
    diagnosticGroups: [["ping intranet.corp.local", "curl intranet.corp.local"], ["systemctl status nginx"], ["sudo systemctl start nginx", "sudo systemctl restart nginx"]],
    efficientCommandCount: 5,
    hints: ["First separate reachability from the application service.", "systemctl status shows a service's state.", "Use sudo systemctl start nginx, then check its status."],
    explanation: "The host and route were available, but nginx was stopped. Checking service state before restarting it isolated the fault without changing unrelated network settings.",
    reasoningKeywords: ["nginx", "service", "network", "stopped", "verify"],
    misconceptionRules: [{ pattern: "chmod 777|rm -rf", label: "Used broad permissions or destructive deletion for a stopped service" }],
  },
  {
    id: "terminal-linux-permissions",
    topicId: "topic-command-line-fundamentals",
    shell: "bash",
    title: "A deployment script cannot run",
    brief: "The release script /opt/deploy/release.sh exists but cannot be executed by its owner. Inspect it and apply the least-permissive repair.",
    environment: "Ubuntu deployment host. The script belongs to student and should not be writable by other users.",
    difficulty: "challenging",
    estimatedMinutes: 16,
    goals: [{ id: "mode", description: "Set release.sh to owner rwx, group rx, others rx (755)", kind: "file_mode", target: "/opt/deploy/release.sh", expected: "755" }],
    diagnosticGroups: [["ls -l /opt/deploy/release.sh"], ["chmod 755 /opt/deploy/release.sh"]],
    efficientCommandCount: 3,
    hints: ["Inspect the current permission bits with ls -l.", "The owner needs read, write and execute; everyone else needs read and execute.", "That permission set is represented by 755."],
    explanation: "The script lacked execute permission. Mode 755 adds execution while keeping write access limited to the owner; 777 would expose an unnecessary integrity risk.",
    reasoningKeywords: ["execute", "permission", "owner", "755", "least privilege"],
    misconceptionRules: [{ pattern: "chmod 777", label: "Granted write access to everyone instead of applying least privilege" }],
  },
];

export function buildScenarioMachine(scenario: TerminalScenario): MachineState {
  if (scenario.id === "terminal-cmd-stale-dns") {
    return createMachine({ shell: "cmd", dnsCache: { "intranet.corp.local": "10.0.0.99" } });
  }
  if (scenario.id === "terminal-cmd-print-service") {
    const machine = createMachine({ shell: "cmd", elevated: true });
    const service = findService(machine, "Spooler");
    if (service) service.status = "stopped";
    return machine;
  }
  if (scenario.id === "terminal-powershell-locked-user") {
    const machine = createMachine({ shell: "powershell" });
    machine.users.push({ name: "helpdesk2", fullName: "Help Desk Backup", groups: ["Users"], admin: false, locked: true, passwordExpired: false });
    return machine;
  }
  if (scenario.id === "terminal-powershell-memory-process") {
    const machine = createMachine({ shell: "powershell", memoryUsedMb: 7720 });
    machine.processes.push({ pid: 4450, name: "backup-agent.exe", user: "student", cpu: 78.4, memoryMb: 4520, note: "runaway process" });
    return machine;
  }
  if (scenario.id === "terminal-linux-web-service") {
    const machine = createMachine({ shell: "bash" });
    const service = findService(machine, "nginx");
    if (service) service.status = "stopped";
    return machine;
  }
  return createMachine({
    shell: "bash",
    dirs: ["/opt/deploy"],
    files: { "/opt/deploy/release.sh": "#!/bin/bash\necho Deploying IT PATH\n" },
    perms: { "/opt/deploy/release.sh": "student:student:644" },
  });
}

export function goalMet(state: MachineState, goal: TerminalGoal): boolean {
  if (goal.kind === "dns_cache_empty") return Object.keys(state.dnsCache).length === 0;
  if (goal.kind === "service_running") return findService(state, goal.target)?.status === "running";
  if (goal.kind === "process_absent") {
    return !state.processes.some((process) => process.name.toLowerCase() === goal.target.toLowerCase());
  }
  if (goal.kind === "user_unlocked") {
    return state.users.some((user) => user.name.toLowerCase() === goal.target.toLowerCase() && !user.locked);
  }
  const node = getNode(state, resolvePath(state, goal.target));
  if (goal.kind === "path_exists") return Boolean(node);
  return node?.mode === goal.expected;
}

export function scenariosForShell(shell: ShellKind): TerminalScenario[] {
  return terminalScenarios.filter((scenario) => scenario.shell === shell);
}