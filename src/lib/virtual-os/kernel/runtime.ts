import { clone, reconcileServiceProcesses, storageFreeBytes, storageUsedBytes } from "@/lib/terminal/machine";
import { enumerateDevices } from "./devices";
import { emitKernelEvent } from "./events";
import { bootSequence, shutdown } from "./power";
import type { KernelHardware, KernelPowerState, KernelSnapshot, VirtualMachineState } from "./types";
const DEFAULT_CAPACITY=512*1024*1024;
export interface VirtualKernel {
 readonly state:VirtualMachineState; readonly powerState:KernelPowerState; hardware():KernelHardware;
 transact(mutator:(next:VirtualMachineState)=>void):VirtualMachineState; boot():VirtualMachineState;
 restart():VirtualMachineState; shutdown():VirtualMachineState; snapshot():KernelSnapshot; restore(snapshot:KernelSnapshot):VirtualMachineState;
}
function reconcile(state:VirtualMachineState){reconcileServiceProcesses(state);const processMemory=state.processes.reduce((s,p)=>s+Math.max(0,p.memoryMb),0);state.memoryUsedMb=Math.min(state.memoryTotalMb,Math.max(0,processMemory));}
export function kernelHardware(state:VirtualMachineState):KernelHardware{
 const capacityBytes=state.diskCapacityBytes??DEFAULT_CAPACITY,usedBytes=Math.min(capacityBytes,storageUsedBytes(state));
 const usedMemory=Math.min(state.memoryTotalMb,Math.max(0,state.memoryUsedMb)),cpu=Math.min(100,Math.max(0,state.processes.reduce((s,p)=>s+Math.max(0,p.cpu),0)));
 return {cpu:{logicalProcessors:4,utilizationPercent:Math.round(cpu*10)/10},memory:{totalMb:state.memoryTotalMb,usedMb:usedMemory,availableMb:Math.max(0,state.memoryTotalMb-usedMemory)},storage:{capacityBytes,usedBytes,freeBytes:storageFreeBytes(state)},devices:enumerateDevices(state)};
}
export function createVirtualKernel(initial:VirtualMachineState):VirtualKernel{
 let state=clone(initial);let powerState:KernelPowerState="running";reconcile(state);
 const commit=(next:VirtualMachineState)=>{reconcile(next);state=next;return clone(state)};
 return {get state(){return clone(state)},get powerState(){return powerState},hardware:()=>kernelHardware(state),
 transact(mutator){const next=clone(state);mutator(next);return commit(next)},
 boot(){powerState="booting";const next=clone(state);bootSequence(next);powerState="running";return commit(next)},
 restart(){powerState="restarting";const next=clone(state);shutdown(next);bootSequence(next);next.restartRequired=false;emitKernelEvent(next,{level:"information",source:"PathKernel",eventId:12,channel:"system",message:"Restart completed."});powerState="running";return commit(next)},
 shutdown(){powerState="shutting-down";const next=clone(state);shutdown(next);powerState="off";return commit(next)},
 snapshot(){return {version:1,platform:state.platform,capturedAt:new Date().toISOString(),machine:clone(state)}},
 restore(snapshot){if(snapshot.version!==1)throw new Error("Unsupported PathOS snapshot version.");powerState="booting";const next=clone(snapshot.machine);emitKernelEvent(next,{level:"information",source:"PathKernel",eventId:3,channel:"system",message:"PathOS snapshot restored."});powerState="running";return commit(next)}};}
