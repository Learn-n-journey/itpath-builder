import type { VirtualMachineState } from "./types";

export interface MemoryStatus {
  totalMb: number;
  usedMb: number;
  availableMb: number;
  utilizationPercent: number;
}

export function memoryStatus(state: VirtualMachineState): MemoryStatus {
  const usedMb = Math.min(state.memoryTotalMb, Math.max(0, state.memoryUsedMb));
  return {
    totalMb: state.memoryTotalMb,
    usedMb,
    availableMb: Math.max(0, state.memoryTotalMb - usedMb),
    utilizationPercent: state.memoryTotalMb ? Math.round((usedMb / state.memoryTotalMb) * 1000) / 10 : 0,
  };
}

export function canAllocateMemory(state: VirtualMachineState, mb: number): boolean {
  return mb >= 0 && memoryStatus(state).availableMb >= mb;
}
