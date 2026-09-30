import type { ProcessInfo } from "@/lib/terminal/machine";
import type { VirtualMachineState } from "./types";

export interface ScheduledProcess extends ProcessInfo {
  runState: "ready" | "running" | "waiting";
  priority: number;
}

export function schedule(state: VirtualMachineState): ScheduledProcess[] {
  return [...state.processes]
    .sort((a,b)=>(b.cpu-a.cpu)||(a.pid-b.pid))
    .map((process,index)=>({...process,runState:index===0?"running":"ready",priority:Math.max(1,Math.min(10,Math.round(5+process.cpu/10)))}));
}
