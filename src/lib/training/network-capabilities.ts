import { findTarget, resolveHost, type MachineState, type NetInterface } from "@/lib/terminal/machine";

export type TrainingNetworkObservation = {
  interfaceName: string;
  linkUp: boolean;
  address: string;
  mask: string;
  gateway: string;
  dhcp: boolean;
  dnsServers: string[];
  hasAddress: boolean;
  hasGateway: boolean;
  hasDns: boolean;
  localReady: boolean;
  internetReady: boolean;
  state: "offline" | "limited" | "local" | "online";
  summary: string;
};

export type TrainingNetworkAction =
  | { type: "set-interface"; name: string; up?: boolean; dhcp?: boolean; ip?: string; mask?: string; gateway?: string }
  | { type: "set-dns"; servers: string[] }
  | { type: "flush-dns" };

function activeInterface(machine: MachineState): NetInterface {
  return machine.interfaces.find(item => item.up) ?? machine.interfaces[0] ?? {
    name: "network0", mac: "", ip: "", mask: "", gateway: "", dhcp: true, up: false,
  };
}

/** One deterministic network model shared by GUI training, terminals, labs and tickets. */
export function observeTrainingNetwork(machine: MachineState): TrainingNetworkObservation {
  const iface = activeInterface(machine);
  const hasAddress = Boolean(iface.ip && iface.ip !== "0.0.0.0" && !iface.ip.startsWith("169.254."));
  const hasGateway = Boolean(iface.gateway);
  const hasDns = machine.dnsServers.some(Boolean);
  const localReady = iface.up && hasAddress;
  const internetReady = localReady && hasGateway && hasDns;
  const state: TrainingNetworkObservation["state"] = !iface.up || !hasAddress ? (!iface.up ? "offline" : "limited") : !hasGateway || !hasDns ? "local" : "online";
  const summary = !iface.up ? "Network disconnected" : !hasAddress ? "Limited connectivity · no usable address" : !hasGateway ? "Local network only · no default route" : !hasDns ? "Connected · name resolution unavailable" : "Connected";
  return {
    interfaceName: iface.name,
    linkUp: iface.up,
    address: iface.ip,
    mask: iface.mask,
    gateway: iface.gateway,
    dhcp: iface.dhcp,
    dnsServers: [...machine.dnsServers],
    hasAddress,
    hasGateway,
    hasDns,
    localReady,
    internetReady,
    state,
    summary,
  };
}

export function applyTrainingNetworkAction(machine: MachineState, action: TrainingNetworkAction): MachineState {
  const next = structuredClone(machine);
  if (action.type === "set-dns") {
    next.dnsServers = action.servers.filter(Boolean);
    return next;
  }
  if (action.type === "flush-dns") {
    next.dnsCache = {};
    return next;
  }
  next.interfaces = next.interfaces.map(iface => iface.name !== action.name ? iface : {
    ...iface,
    ...(action.up === undefined ? {} : { up: action.up }),
    ...(action.dhcp === undefined ? {} : { dhcp: action.dhcp }),
    ...(action.ip === undefined ? {} : { ip: action.ip }),
    ...(action.mask === undefined ? {} : { mask: action.mask }),
    ...(action.gateway === undefined ? {} : { gateway: action.gateway }),
  });
  return next;
}

export function trainingNetworkChecks(machine: MachineState) {
  const net = observeTrainingNetwork(machine);
  return [
    { id: "link", label: "Network interface has link", passed: net.linkUp },
    { id: "address", label: "Device has a usable IP address", passed: net.hasAddress },
    { id: "gateway", label: "A default gateway is configured", passed: net.hasGateway },
    { id: "dns", label: "At least one DNS server is configured", passed: net.hasDns },
    { id: "internet", label: "Core network configuration is complete", passed: net.internetReady },
  ];
}


export type TrainingNetworkProbe =
  | { kind: "link"; ok: boolean; detail: string }
  | { kind: "gateway"; ok: boolean; detail: string }
  | { kind: "dns"; ok: boolean; detail: string; address?: string }
  | { kind: "reachability"; ok: boolean; detail: string; address?: string };

/** Active diagnostic probes. These model what a learner can prove, not merely what is configured. */
export function probeTrainingNetwork(machine: MachineState, host?: string): TrainingNetworkProbe[] {
  const net = observeTrainingNetwork(machine);
  const probes: TrainingNetworkProbe[] = [
    { kind: "link", ok: net.localReady, detail: !net.linkUp ? "Interface is down." : !net.hasAddress ? "Interface is up but has no usable IP address." : `Interface ${net.interfaceName} is up with ${net.address}.` },
    { kind: "gateway", ok: net.localReady && net.hasGateway, detail: !net.localReady ? "Cannot test the gateway until local addressing works." : net.hasGateway ? `Default gateway ${net.gateway} is configured.` : "No default gateway is configured." },
  ];
  if (!host) return probes;

  const numeric = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const resolved = resolveHost(machine, host);
  probes.push({
    kind: "dns",
    ok: numeric || Boolean(resolved),
    detail: numeric ? "Numeric address does not require DNS." : resolved ? `${host} resolved to ${resolved}.` : !net.hasDns ? "No DNS server is configured." : `${host} could not be resolved.`,
    ...(resolved ? { address: resolved } : {}),
  });

  const target = resolved ? findTarget(machine, resolved) ?? findTarget(machine, host) : undefined;
  const address = resolved ?? (numeric ? host : undefined);
  const localSubnet = Boolean(address && net.address && address.split(".").slice(0, 3).join(".") === net.address.split(".").slice(0, 3).join("."));
  const routeReady = net.localReady && (localSubnet || net.hasGateway);
  const reachable = routeReady && Boolean(target?.reachable);
  probes.push({
    kind: "reachability",
    ok: reachable,
    detail: !address ? "Destination cannot be tested until its address is known." : !net.localReady ? "Local network configuration is not usable." : !localSubnet && !net.hasGateway ? "Remote destination has no route because the default gateway is missing." : reachable ? `${host} is reachable at ${address}.` : `${host} did not respond.`,
    ...(address ? { address } : {}),
  });
  return probes;
}


export type TrainingServiceProbe = {
  host: string;
  address?: string;
  port: number;
  service: string;
  networkReachable: boolean;
  listening: boolean;
  blocked: boolean;
  ok: boolean;
  detail: string;
};

const WELL_KNOWN_TRAINING_SERVICES: Record<number, string> = {
  22: "SSH", 53: "DNS", 80: "HTTP", 443: "HTTPS", 445: "SMB", 3389: "RDP",
};

/** Prove that a specific application service is available after basic reachability succeeds. */
export function probeTrainingService(machine: MachineState, host: string, port: number): TrainingServiceProbe {
  const networkProbe = probeTrainingNetwork(machine, host).find(item => item.kind === "reachability");
  const address = resolveHost(machine, host) ?? (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : undefined);
  const target = address ? findTarget(machine, address) ?? findTarget(machine, host) : undefined;
  const networkReachable = Boolean(networkProbe?.ok);
  const listening = Boolean(target?.openPorts?.includes(port));
  const blocked = machine.firewallEnabled && machine.blockedPorts.includes(port);
  const service = WELL_KNOWN_TRAINING_SERVICES[port] ?? `TCP/${port}`;
  const ok = networkReachable && listening && !blocked;
  const detail = !networkReachable
    ? `${service} cannot be tested successfully because ${host} is not reachable.`
    : blocked
      ? `${service} on TCP ${port} is blocked by the simulated local firewall.`
      : !listening
        ? `${host} is reachable, but TCP ${port} is not accepting connections.`
        : `${service} is reachable on ${host} TCP ${port}.`;
  return { host, ...(address ? { address } : {}), port, service, networkReachable, listening, blocked, ok, detail };
}


export type BrowserNavigationResult = {
  host: string;
  address?: string;
  status: "ok" | "offline" | "dns" | "unreachable" | "refused";
  title: string;
  detail: string;
};

export function navigateTrainingBrowser(machine: MachineState, rawAddress: string): BrowserNavigationResult {
  const trimmed = rawAddress.trim() || "http://intranet.itpath.local";
  const withoutScheme = trimmed.replace(/^https?:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/)[0]?.split(":")[0] || "intranet.itpath.local";
  const net = observeTrainingNetwork(machine);
  if (!net.localReady) return { host, status:"offline", title:"You’re offline", detail:net.summary };
  const numeric = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const address = numeric ? host : resolveHost(machine, host) ?? undefined;
  if (!address) return { host, status:"dns", title:"This site can’t be reached", detail:`DNS could not find ${host}.` };
  const reachability = probeTrainingNetwork(machine, host).find(item => item.kind === "reachability");
  if (!reachability?.ok) return { host, address, status:"unreachable", title:"This site can’t be reached", detail:reachability?.detail ?? `${host} did not respond.` };
  const web = probeTrainingService(machine, host, 80);
  if (!web.ok) return { host, address, status:"refused", title:"This site refused to connect", detail:web.detail };
  return { host, address, status:"ok", title:host === "intranet.itpath.local" ? "Company Intranet" : host, detail:`Connected to ${host}${address ? ` at ${address}` : ""}.` };
}
