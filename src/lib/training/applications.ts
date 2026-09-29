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
  const job = {
    id: machine.nextPrintJobId++,
    document,
    printer: "Office Printer",
    status: (check.health === "ready" ? "printing" : "error") as "printing" | "error",
    submittedAt: new Date().toISOString(),
  };
  machine.printJobs.unshift(job);
  machine.eventLog.unshift(`${new Date().toISOString()} Print: ${document} — ${job.status}`);
  return check;
}

export function reconcilePrintQueue(
  machine: MachineState,
  machines: Record<VirtualOsKey, MachineState>,
  environment: VirtualEnvironmentState,
): void {
  if (!machine.printJobs?.length) return;
  const application = trainingApplications.find((item) => item.id === "print-center")!;
  const ready = applicationCheck(application, machine, machines, environment).health === "ready";
  machine.printJobs = machine.printJobs.map((job) => {
    if (ready && (job.status === "error" || job.status === "queued")) return { ...job, status: "printing" as const };
    if (!ready && job.status === "printing") return { ...job, status: "error" as const };
    return job;
  });
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
