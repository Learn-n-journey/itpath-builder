/** PathOS is a behavioral OS: real causal state without CPU instruction emulation. */
export const PATHOS_SPEC = {
  name: "PathOS",
  kernel: "PathKernel",
  abiVersion: 1,
  snapshotVersion: 1,
  principles: [
    "One canonical serializable machine state",
    "Every visible control changes meaningful state",
    "Kernel consequences propagate across every client",
    "Applications use OS contracts instead of mutating state directly",
    "Scenarios are deterministic, inspectable, resettable and safe",
  ],
} as const;

export type PathOsCapability =
  | "filesystem" | "processes" | "memory" | "services" | "identity"
  | "devices" | "network" | "events" | "power" | "applications";
