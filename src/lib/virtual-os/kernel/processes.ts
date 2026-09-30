import type { ProcessInfo } from "@/lib/terminal/machine";
import { emitKernelEvent } from "./events";
import { canAllocateMemory } from "./memory";
import type { VirtualMachineState } from "./types";

export type ProcessState = "ready" | "running" | "waiting" | "terminated";
export interface SpawnProcessRequest { name: string; user?: string; cpu?: number; memoryMb?: number }

export function spawnProcess(state: VirtualMachineState, request: SpawnProcessRequest): ProcessInfo {
  const memoryMb = Math.max(1, Math.round(request.memoryMb ?? 64));
  if (!canAllocateMemory(state, memoryMb)) throw new Error("ENOMEM");
  const process: ProcessInfo = {
    pid: state.nextPid++, name: request.name, user: request.user ?? state.currentUser,
    cpu: Math.max(0, request.cpu ?? 0.1), memoryMb,
  };
  state.processes.push(process);
  state.memoryUsedMb += memoryMb;
  emitKernelEvent(state, { level:"information", source:"PathKernel", eventId:1001, channel:"system",
    message:`Process ${process.name} started with PID ${process.pid}.` });
  return process;
}

export function terminateProcess(state: VirtualMachineState, pid: number): boolean {
  const index = state.processes.findIndex(process => process.pid === pid);
  if (index < 0) return false;
  const [process] = state.processes.splice(index, 1);
  if (!process) return false;
  state.memoryUsedMb = Math.max(0, state.memoryUsedMb - process.memoryMb);
  emitKernelEvent(state, { level:"information", source:"PathKernel", eventId:1002, channel:"system",
    message:`Process ${process.name} (PID ${process.pid}) terminated.` });
  return true;
}
