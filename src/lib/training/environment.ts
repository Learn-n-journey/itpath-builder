import type { MachineState } from "@/lib/terminal/machine";

export type VirtualOsKey = "windows" | "linux" | "mac";

export interface SharedResource {
  id: string;
  name: string;
  host: VirtualOsKey;
  kind: "share" | "web" | "printer";
  hostname: string;
  port: number;
  available: boolean;
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
      { id: "shared-files", name: "Team Files", host: "windows", kind: "share", hostname: "files.itpath.local", port: 445, available: true },
      { id: "intranet", name: "IT PATH Intranet", host: "linux", kind: "web", hostname: "intranet.itpath.local", port: 80, available: true },
      { id: "office-printer", name: "Office Printer", host: "mac", kind: "printer", hostname: "print.itpath.local", port: 631, available: true },
    ],
  };
}

function serviceRunning(machine: MachineState, names: string[]): boolean {
  return names.some((name) => machine.services.some((svc) => svc.name.toLowerCase() === name.toLowerCase() && svc.status === "running"));
}

function resourceAvailable(resource: SharedResource, machines: Record<VirtualOsKey, MachineState>): boolean {
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
      existing.reachable = resource.available;
      existing.openPorts = resource.available ? Array.from(new Set([...(existing.openPorts ?? []), resource.port])) : [];
    } else {
      next.targets.push({ host: resource.hostname, ip, reachable: resource.available, latencyMs: 2, openPorts: resource.available ? [resource.port] : [] });
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
