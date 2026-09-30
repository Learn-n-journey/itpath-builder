import type { SystemEvent } from "@/lib/terminal/machine";
import type { VirtualMachineState } from "./types";

export type KernelEventInput = Omit<SystemEvent, "at"> & { at?: string };

export function emitKernelEvent(state: VirtualMachineState, input: KernelEventInput): SystemEvent {
  const event: SystemEvent = { ...input, at: input.at ?? new Date().toISOString() };
  state.systemEvents ??= [];
  state.systemEvents.unshift(event);
  state.eventLog.unshift(`${event.at} ${event.source}: ${event.message}`);
  return event;
}
