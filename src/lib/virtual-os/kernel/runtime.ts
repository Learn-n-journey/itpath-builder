import { bootServices, clone, reconcileServiceProcesses, storageFreeBytes, storageUsedBytes } from "@/lib/terminal/machine";
import { enumerateDevices } from "./devices";
import { emitKernelEvent } from "./events";
import type { KernelHardware, KernelPowerState, KernelSnapshot, VirtualMachineState } from "./types";

const DEFAULT_CAPACITY=512*1024*1024;

export interface VirtualKernel {
  readonly state: VirtualMachineState;
  readonly powerState: KernelPowerState;
  hardware(): KernelHardware;
  transact(mutator:(next:VirtualMachineState)=>void): VirtualMachineState;
  boot(): VirtualMachineState;
  restart(): VirtualMachineState;
  snapshot(): KernelSnapshot;
  restore(snapshot:KernelSnapshot): VirtualMachineState;
}

function reconcile(state:VirtualMachineState){
  reconcileServiceProcesses(state);
  const processMemory=state.processes.reduce((sum,p)=>sum+Math.max(0,p.memoryMb),0);
  state.memoryUsedMb=Math.min(state.memoryTotalMb,Math.max(0,processMemory));
}

export function kernelHardware(state:VirtualMachineState):KernelHardware{
  const capacityBytes=state.diskCapacityBytes??DEFAULT_CAPACITY;
  const usedBytes=Math.min(capacityBytes,storageUsedBytes(state));
  const usedMemory=Math.min(state.memoryTotalMb,Math.max(0,state.memoryUsedMb));
  const cpu=Math.min(100,Math.max(0,state.processes.reduce((sum,p)=>sum+Math.max(0,p.cpu),0)));
  return {
    cpu:{logicalProcessors:4,utilizationPercent:Math.round(cpu*10)/10},
    memory:{totalMb:state.memoryTotalMb,usedMb:usedMemory,availableMb:Math.max(0,state.memoryTotalMb-usedMemory)},
    storage:{capacityBytes,usedBytes,freeBytes:storageFreeBytes(state)},
    devices:enumerateDevices(state),
  };
}

export function createVirtualKernel(initial:VirtualMachineState):VirtualKernel{
  let state=clone(initial); let powerState:KernelPowerState="running"; reconcile(state);
  const commit=(next:VirtualMachineState)=>{reconcile(next);state=next;return clone(state)};
  return {
    get state(){return clone(state)}, get powerState(){return powerState}, hardware:()=>kernelHardware(state),
    transact(mutator){const next=clone(state);mutator(next);return commit(next)},
    boot(){powerState="booting";const next=clone(state);bootServices(next);next.bootCount=(next.bootCount??0)+1;next.lastBootAt=new Date().toISOString();emitKernelEvent(next,{level:"information",source:"PathKernel",eventId:1,channel:"system",message:"PathOS boot completed."});powerState="running";return commit(next)},
    restart(){powerState="restarting";const next=clone(state);bootServices(next);next.bootCount=(next.bootCount??0)+1;next.lastBootAt=new Date().toISOString();next.restartRequired=false;emitKernelEvent(next,{level:"information",source:"PathKernel",eventId:2,channel:"system",message:"PathOS restarted."});powerState="running";return commit(next)},
    snapshot(){return {version:1,platform:state.platform,capturedAt:new Date().toISOString(),machine:clone(state)}},
    restore(snapshot){if(snapshot.version!==1)throw new Error("Unsupported PathOS snapshot version.");powerState="booting";const next=clone(snapshot.machine);emitKernelEvent(next,{level:"information",source:"PathKernel",eventId:3,channel:"system",message:"PathOS snapshot restored."});powerState="running";return commit(next)},
  };
}
