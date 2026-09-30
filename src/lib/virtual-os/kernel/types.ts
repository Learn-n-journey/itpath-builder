import type { MachineState, PlatformKind, SystemEvent } from "@/lib/terminal/machine";

export type VirtualMachineState = MachineState;
export type KernelPowerState = "off" | "booting" | "running" | "restarting" | "shutting-down";
export type DeviceState = "online" | "offline" | "disabled" | "error";

export interface KernelDevice {
  id: string;
  kind: "cpu" | "memory" | "storage" | "network" | "display" | "battery" | "usb" | "bluetooth";
  name: string;
  driver: string;
  state: DeviceState;
}

export interface KernelHardware {
  cpu: { logicalProcessors: number; utilizationPercent: number };
  memory: { totalMb: number; usedMb: number; availableMb: number };
  storage: { capacityBytes: number; usedBytes: number; freeBytes: number };
  devices: KernelDevice[];
}

export interface KernelSnapshot {
  version: 1;
  platform: PlatformKind;
  capturedAt: string;
  machine: VirtualMachineState;
}

export interface KernelEvent extends SystemEvent { sequence: number }
