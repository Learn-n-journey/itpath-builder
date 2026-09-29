import { currentGroups, type MachineState } from "@/lib/terminal/machine";

export type VirtualOsKey = "windows" | "linux" | "mac";

export interface SharedResource {
  id: string;
  name: string;
  host: VirtualOsKey;
  kind: "share" | "web" | "printer";
  hostname: string;
  port: number;
  available: boolean;
  /** Training-facing access model. Connected systems stay simulated; the learner works primarily on one machine. */
  access?: { readGroups: string[]; writeGroups: string[]; files?: { name: string; content: string; readGroups?: string[]; writeGroups?: string[] }[] };
}

export interface VirtualEnvironmentState {
  name: string;
  subnet: string;
  gateway: string;
  dnsServers: string[];
  dnsRecords: Record<string, string>;
  resources: SharedResource[];
}

export function createVirtualEnvironment(): VirtualEnvironmentState {
  return {
    name: "IT PATH Training LAN",
    subnet: "10.0.0.0/24",
    gateway: "10.0.0.1",
    dnsServers: ["10.0.0.10"],
    dnsRecords: {
      "files.itpath.local": "10.0.0.21",
      "intranet.itpath.local": "10.0.0.22",
      "print.itpath.local": "10.0.0.23",
    },
    resources: [
      { id: "shared-files", name: "Team Files", host: "windows", kind: "share", hostname: "files.itpath.local", port: 445, available: true, access: { readGroups: ["Users","Accounting","staff"], writeGroups: ["Accounting"], files: [{ name:"Monthly Report.txt", content:"Accounting monthly report training file.", readGroups:["Accounting"], writeGroups:["Accounting"] }, { name:"Company Readme.txt", content:"Welcome to the IT PATH Training LAN.", readGroups:["Users","Accounting","staff"], writeGroups:["Accounting"] }] } },
      { id: "intranet", name: "IT PATH Intranet", host: "linux", kind: "web", hostname: "intranet.itpath.local", port: 80, available: true },
      { id: "office-printer", name: "Office Printer", host: "mac", kind: "printer", hostname: "print.itpath.local", port: 631, available: true },
    ],
  };
}

function serviceRunning(machine: MachineState, names: string[]): boolean {
  return names.some((name) => machine.services.some((svc) => svc.name.toLowerCase() === name.toLowerCase() && svc.status === "running"));
}

export function resourceAvailable(resource: SharedResource, machines: Record<VirtualOsKey, MachineState>): boolean {
  const host = machines[resource.host];
  const iface = host.interfaces.find((item) => item.name !== "lo" && item.name !== "lo0") ?? host.interfaces[0];
  if (!iface?.up) return false;
  if (resource.kind === "web") return serviceRunning(host, ["nginx", "apache2", "httpd"]);
  if (resource.kind === "printer") return serviceRunning(host, ["cupsd", "cups"]);
  if (resource.kind === "share") return serviceRunning(host, ["LanmanServer", "Server", "smbd"]) || host.platform === "windows";
  return resource.available;
}

export function connectMachineToEnvironment(machine: MachineState, env: VirtualEnvironmentState): MachineState {
  const next = JSON.parse(JSON.stringify(machine)) as MachineState;
  next.dnsRecords = { ...next.dnsRecords, ...env.dnsRecords };
  if (!next.dnsServers.length) next.dnsServers = [...env.dnsServers];
  for (const resource of env.resources) {
    const ip = env.dnsRecords[resource.hostname];
    const existing = next.targets.find((target) => target.host === resource.hostname);
    if (existing) {
      existing.ip = ip;
      // Host reachability and application availability are separate facts.
      // A stopped SMB/web/print service must not make the server itself disappear.
      existing.reachable = true;
      const ports = new Set(existing.openPorts ?? []);
      if (resource.available) ports.add(resource.port);
      else ports.delete(resource.port);
      existing.openPorts = Array.from(ports);
    } else {
      next.targets.push({ host: resource.hostname, ip, reachable: true, latencyMs: 2, openPorts: resource.available ? [resource.port] : [] });
    }
  }
  return next;
}

export function syncVirtualEnvironment(
  machines: Record<VirtualOsKey, MachineState>,
  env: VirtualEnvironmentState,
): Record<VirtualOsKey, MachineState> {
  const liveEnv: VirtualEnvironmentState = {
    ...env,
    resources: env.resources.map((resource) => ({ ...resource, available: resourceAvailable(resource, machines) })),
  };
  return {
    windows: connectMachineToEnvironment(machines.windows, liveEnv),
    linux: connectMachineToEnvironment(machines.linux, liveEnv),
    mac: connectMachineToEnvironment(machines.mac, liveEnv),
  };
}

/** Resolve a shared resource against live host state. Used by ticket verification as well as LAN sync. */
export function sharedResourceAvailable(resourceId: string, machines: Record<VirtualOsKey, MachineState>, env: VirtualEnvironmentState): boolean {
  const resource = env.resources.find((item) => item.id === resourceId);
  return Boolean(resource && resourceAvailable(resource, machines));
}

export type ResourceAccess = "unreachable" | "denied" | "read" | "write";

/** Evaluate access from one workstation without requiring a second interactive PC. */
export function resourceAccessForMachine(resourceId: string, machine: MachineState, machines: Record<VirtualOsKey, MachineState>, env: VirtualEnvironmentState): ResourceAccess {
  const resource = env.resources.find((item) => item.id === resourceId);
  if (!resource || !resourceAvailable(resource, machines)) return "unreachable";
  if (!resource.access) return "read";
  const groups = currentGroups(machine);
  if (resource.access.writeGroups.some((group) => groups.has(group))) return "write";
  if (resource.access.readGroups.some((group) => groups.has(group))) return "read";
  return "denied";
}
