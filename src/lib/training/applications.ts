import {
  canRead,
  currentGroups,
  getNode,
  resolvePath,
  storageFreePercent,
  type MachineState,
} from "@/lib/terminal/machine";
import {
  resourceAccessForMachine,
  sharedResourceAvailable,
  type VirtualEnvironmentState,
  type VirtualOsKey,
} from "@/lib/training/environment";
import { observeTrainingNetwork } from "@/lib/training/network-capabilities";

export type TrainingApplicationId = "browser" | "team-files" | "print-center" | "updates" | "notes";
export type ApplicationHealth = "ready" | "degraded" | "blocked";

export interface TrainingApplication {
  id: TrainingApplicationId;
  name: string;
  os: VirtualOsKey | "any";
  processName: string;
  memoryMb: number;
  requiresServices?: string[];
  requiresNetwork?: boolean;
  requiresDns?: boolean;
  resourceId?: string;
  minimumFreePercent?: number;
  readablePath?: string;
  requiredEnv?: string[];
}

export interface ApplicationCheck {
  health: ApplicationHealth;
  summary: string;
  causes: string[];
}

export const trainingApplications: TrainingApplication[] = [
  {
    id: "browser",
    name: "IT PATH Browser",
    os: "any",
    processName: "itpath-browser",
    memoryMb: 220,
    requiresNetwork: true,
    requiresDns: true,
    resourceId: "intranet",
    minimumFreePercent: 2,
  },
  {
    id: "team-files",
    name: "Team Files",
    os: "windows",
    processName: "team-files",
    memoryMb: 74,
    requiresServices: ["LanmanWorkstation"],
    requiresNetwork: true,
    requiresDns: true,
    resourceId: "shared-files",
    minimumFreePercent: 1,
  },
  {
    id: "print-center",
    name: "Office Print Center",
    os: "any",
    processName: "print-center",
    memoryMb: 82,
    requiresServices: ["Spooler"],
    requiresNetwork: true,
    requiresDns: true,
    resourceId: "office-printer",
    minimumFreePercent: 1,
  },
  {
    id: "updates",
    name: "System Update",
    os: "windows",
    processName: "system-update-ui",
    memoryMb: 96,
    requiresNetwork: true,
    minimumFreePercent: 8,
  },
  {
    id: "notes",
    name: "Support Notes",
    os: "any",
    processName: "support-notes",
    memoryMb: 48,
    minimumFreePercent: 1,
  },
];

function serviceIsRunning(machine: MachineState, name: string): boolean {
  return machine.services.some(
    (service) => service.name.toLowerCase() === name.toLowerCase() && service.status === "running",
  );
}

function dnsUsable(machine: MachineState): boolean {
  return machine.dnsServers.length > 0 && !machine.dnsServers.every((server) => server.startsWith("203.0.113."));
}

function defaultNotesPath(machine: MachineState): string {
  if (machine.platform === "windows") return `C:\\Users\\${machine.currentUser}\\Documents\\readme.txt`;
  if (machine.platform === "macos") return `/Users/${machine.currentUser}/Documents/IT PATH Lab Notes.txt`;
  return `/home/${machine.currentUser}/notes.txt`;
}

export function applicationCheck(
  application: TrainingApplication,
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
): ApplicationCheck {
  const causes: string[] = [];

  if (application.os !== "any") {
    const currentOs: VirtualOsKey = machine.platform === "windows" ? "windows" : machine.platform === "macos" ? "mac" : "linux";
    if (application.os !== currentOs) causes.push(`${application.name} is not installed for this operating system.`);
  }

  for (const service of application.requiresServices ?? []) {
    if (service === "Spooler" && machine.platform !== "windows") continue;
    if (!serviceIsRunning(machine, service)) causes.push(`Required service ${service} is stopped.`);
  }

  const network = observeTrainingNetwork(machine);
  if (application.requiresNetwork && !network.localReady) causes.push(network.summary);
  if (application.requiresDns && network.localReady && !dnsUsable(machine)) causes.push("Name resolution is unavailable because DNS is not usable.");
  if (application.id === "updates" && network.localReady && !network.hasGateway) causes.push("System Update cannot reach remote update servers because no default route is available.");

  if (application.resourceId) {
    if (!sharedResourceAvailable(application.resourceId, machines, environment)) {
      causes.push("The required network resource or its host service is unavailable.");
    } else if (application.resourceId === "shared-files") {
      const access = resourceAccessForMachine(application.resourceId, machine, machines, environment);
      if (access === "denied") causes.push("The signed-in account does not have permission to the required share.");
      if (access === "unreachable") causes.push("The required share cannot be reached.");
    }
  }

  const minimumFree = application.minimumFreePercent ?? 0;
  if (storageFreePercent(machine) < minimumFree) {
    causes.push(`The application needs at least ${minimumFree}% free disk space.`);
  }

  const path = application.readablePath ?? (application.id === "notes" ? defaultNotesPath(machine) : undefined);
  if (path) {
    const node = getNode(machine, resolvePath(machine, path));
    if (!node) causes.push(`Required file is missing: ${path}`);
    else if (!canRead(machine, node)) causes.push(`Access is denied to required file: ${path}`);
  }

  for (const key of application.requiredEnv ?? []) {
    if (!machine.env[key]) causes.push(`Required configuration ${key} is missing.`);
  }

  if (causes.length) return { health: "blocked", summary: `${application.name} cannot complete its task.`, causes };
  if (application.resourceId === "shared-files") {
    const access = resourceAccessForMachine(application.resourceId, machine, machines, environment);
    if (access === "read") return { health: "degraded", summary: `${application.name} is available read-only.`, causes: ["The signed-in account has read-only access to this share."] };
  }
  return { health: "ready", summary: `${application.name} is ready.`, causes: [] };
}

export function launchTrainingApplication(
  applicationId: TrainingApplicationId,
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
): ApplicationCheck {
  const application = trainingApplications.find((item) => item.id === applicationId);
  if (!application) return { health: "blocked", summary: "Application is not installed.", causes: ["Unknown application."] };

  const check = applicationCheck(application, machine, machines, environment);
  if (check.health === "blocked") {
    machine.eventLog.unshift(`${new Date().toISOString()} ${application.name}: launch/task failed - ${check.causes.join(" ")}`);
    return check;
  }

  const existing = machine.processes.find((process) => process.name === application.processName && process.user === machine.currentUser);
  if (!existing) {
    machine.processes.push({
      pid: machine.nextPid++,
      name: application.processName,
      user: machine.currentUser,
      cpu: 0.4,
      memoryMb: application.memoryMb,
    });
    machine.memoryUsedMb = Math.min(machine.memoryTotalMb, machine.memoryUsedMb + application.memoryMb);
  }
  machine.eventLog.unshift(`${new Date().toISOString()} ${application.name}: launched successfully`);
  return check;
}

export function stopTrainingApplication(applicationId: TrainingApplicationId, machine: MachineState): boolean {
  const application = trainingApplications.find((item) => item.id === applicationId);
  if (!application) return false;
  const before = machine.processes.length;
  const removed = machine.processes.filter(
    (process) => process.name === application.processName && process.user === machine.currentUser,
  );
  machine.processes = machine.processes.filter(
    (process) => !(process.name === application.processName && process.user === machine.currentUser),
  );
  if (removed.length) {
    machine.memoryUsedMb = Math.max(600, machine.memoryUsedMb - removed.reduce((sum, process) => sum + process.memoryMb, 0));
  }
  return machine.processes.length !== before;
}

export function applicationPermissionSummary(machine: MachineState): string {
  const groups = Array.from(currentGroups(machine));
  return groups.length ? groups.join(", ") : "No effective groups";
}


export function printFailureReason(
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
): string | undefined {
  if (machine.platform === "windows" && !serviceIsRunning(machine, "Spooler")) return "Local Print Spooler service is stopped.";
  const network = observeTrainingNetwork(machine);
  if (!network.localReady) return network.summary;
  if (!dnsUsable(machine)) return "Printer name cannot be resolved because DNS is unavailable.";
  if (!sharedResourceAvailable("office-printer", machines, environment)) return "Office Printer host or remote print service is unavailable.";
  return undefined;
}

export function submitPrintJob(
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
  document = "Test Page",
): ApplicationCheck {
  const application = trainingApplications.find((item) => item.id === "print-center")!;
  const check = applicationCheck(application, machine, machines, environment);
  machine.printJobs ??= [];
  machine.nextPrintJobId ??= 1;
  const reason = printFailureReason(machine, machines, environment);
  const job = {
    id: machine.nextPrintJobId++,
    document,
    printer: "Office Printer",
    status: (reason ? "error" : "queued") as "queued" | "error",
    submittedAt: new Date().toISOString(),
    ...(reason ? { errorReason: reason } : {}),
  };
  machine.printJobs.unshift(job);
  machine.eventLog.unshift(`${new Date().toISOString()} Print: ${document} — ${job.status}${reason ? ` — ${reason}` : ""}`);
  return check;
}

export function reconcilePrintQueue(
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
): void {
  if (!machine.printJobs?.length) return;
  const reason = printFailureReason(machine, machines, environment);
  let activeAssigned = false;
  machine.printJobs = machine.printJobs.map((job) => {
    if (job.status === "completed" || job.status === "cancelled") return job;
    if (reason) return { ...job, status: "error" as const, errorReason: reason };
    if (!activeAssigned) {
      activeAssigned = true;
      return { ...job, status: "printing" as const, errorReason: undefined };
    }
    return { ...job, status: "queued" as const, errorReason: undefined };
  });
}

export function advancePrintQueue(
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
): void {
  reconcilePrintQueue(machine, machines, environment);
  const active = machine.printJobs?.find((job) => job.status === "printing");
  if (!active) return;
  active.status = "completed";
  active.completedAt = new Date().toISOString();
  machine.eventLog.unshift(`${active.completedAt} Print: ${active.document} — completed`);
  reconcilePrintQueue(machine, machines, environment);
}

export function retryPrintJob(
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
  jobId: number,
): void {
  const job = machine.printJobs?.find((item) => item.id === jobId);
  if (!job || job.status === "completed" || job.status === "cancelled") return;
  job.status = "queued";
  job.errorReason = undefined;
  machine.eventLog.unshift(`${new Date().toISOString()} Print: retry requested for ${job.document}`);
  reconcilePrintQueue(machine, machines, environment);
}

export function cancelPrintJob(machine: MachineState, jobId: number): void {
  const job = machine.printJobs?.find((item) => item.id === jobId);
  if (!job || job.status === "completed" || job.status === "cancelled") return;
  job.status = "cancelled";
  job.errorReason = undefined;
  machine.eventLog.unshift(`${new Date().toISOString()} Print: ${job.document} — cancelled`);
}


export function advanceWindowsUpdate(
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
): ApplicationCheck {
  const application = trainingApplications.find((item) => item.id === "updates")!;
  const check = applicationCheck(application, machine, machines, environment);
  machine.updateState ??= { phase: "idle", progress: 0 };
  const now = new Date().toISOString();
  if (check.health === "blocked") {
    machine.updateState = { ...machine.updateState, phase:"error", message:check.causes[0], lastCheckedAt:now };
    machine.eventLog.unshift(`${now} Windows Update: blocked — ${check.causes[0]}`);
    return check;
  }
  const service = machine.services.find(item => item.name.toLowerCase() === "wuauserv");
  if (service && service.status !== "running") {
    service.status = "running";
    if (!machine.processes.some(proc => proc.name === (service.processName ?? service.name))) {
      machine.processes.push({ pid:machine.nextPid++, name:service.processName ?? service.name, user:"SYSTEM", cpu:0.2, memoryMb:46 });
    }
  }
  const state = machine.updateState;
  if (state.phase === "idle" || state.phase === "completed" || state.phase === "error") {
    machine.updateState = { phase:"checking", progress:10, message:"Checking for updates…", lastCheckedAt:now };
  } else if (state.phase === "checking") {
    machine.pendingUpdates ??= [];
    if (!machine.pendingUpdates.length) machine.pendingUpdates.push({ title:"2026-09 Cumulative Update for IT PATH Windows", kind:"security", requiresRestart:true });
    machine.updateState = { phase:"downloading", progress:35, message:"Downloading updates…", lastCheckedAt:state.lastCheckedAt ?? now };
  } else if (state.phase === "downloading") {
    machine.updateState = { phase:"installing", progress:70, message:"Installing updates…", lastCheckedAt:state.lastCheckedAt };
  } else if (state.phase === "installing") {
    const requiresRestart = machine.pendingUpdates?.some(item => item.requiresRestart) ?? false;
    machine.restartRequired = requiresRestart;
    machine.updateState = requiresRestart
      ? { phase:"restart-required", progress:100, message:"Restart required to finish installing.", lastCheckedAt:state.lastCheckedAt }
      : { phase:"completed", progress:100, message:"You’re up to date.", lastCheckedAt:state.lastCheckedAt };
  }
  machine.eventLog.unshift(`${now} Windows Update: ${machine.updateState.phase} (${machine.updateState.progress}%)`);
  return check;
}

export function completeWindowsUpdateRestart(machine: MachineState): void {
  if (machine.updateState?.phase !== "restart-required" && !machine.restartRequired) return;
  machine.pendingUpdates = [];
  machine.restartRequired = false;
  machine.updateState = { phase:"completed", progress:100, message:"You’re up to date.", lastCheckedAt:machine.updateState?.lastCheckedAt };
  machine.eventLog.unshift(`${new Date().toISOString()} Windows Update: installation completed after restart`);
}


export function applicationInstalled(applicationId: TrainingApplicationId, os: VirtualOsKey): boolean {
  const application = trainingApplications.find((item) => item.id === applicationId);
  return Boolean(application && (application.os === "any" || application.os === os));
}


export function applicationForProcess(processName: string): TrainingApplication | undefined {
  const key = processName.toLowerCase().replace(/\.exe$/, "");
  return trainingApplications.find((application) =>
    application.processName.toLowerCase().replace(/\.exe$/, "") === key,
  );
}
