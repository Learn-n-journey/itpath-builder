import type { MachineState, NetInterface } from "@/lib/terminal/machine";

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
