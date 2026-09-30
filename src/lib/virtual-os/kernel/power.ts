import { bootServices } from "@/lib/terminal/machine";
import { emitKernelEvent } from "./events";
import type { VirtualMachineState } from "./types";

export type BootStage="firmware"|"kernel"|"drivers"|"services"|"session"|"ready";
export function bootSequence(state:VirtualMachineState):BootStage[]{
  const stages:BootStage[]=["firmware","kernel","drivers","services","session","ready"];
  bootServices(state);
  state.bootCount=(state.bootCount??0)+1;
  state.lastBootAt=new Date().toISOString();
  emitKernelEvent(state,{level:"information",source:"PathKernel",eventId:10,channel:"system",message:"Boot sequence reached ready state."});
  return stages;
}
export function shutdown(state:VirtualMachineState){
  state.processes=state.processes.filter(p=>p.user==="SYSTEM"||p.user==="root");
  emitKernelEvent(state,{level:"information",source:"PathKernel",eventId:11,channel:"system",message:"Shutdown completed."});
}
