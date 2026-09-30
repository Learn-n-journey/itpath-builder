import { emitKernelEvent } from "./events";
import { spawnProcess, terminateProcess } from "./processes";
import type { VirtualMachineState } from "./types";

export interface ApplicationManifest {
  id:string; name:string; executable:string; memoryMb:number; singleton?:boolean;
}
export interface RunningApplication { appId:string; pid:number }

export function launchApplication(state:VirtualMachineState, app:ApplicationManifest):RunningApplication{
  if(app.singleton){
    const existing=state.processes.find(p=>p.name.toLowerCase()===app.executable.toLowerCase());
    if(existing) return {appId:app.id,pid:existing.pid};
  }
  const process=spawnProcess(state,{name:app.executable,memoryMb:app.memoryMb,user:state.currentUser});
  emitKernelEvent(state,{level:"information",source:"PathApp",eventId:3001,channel:"application",message:`${app.name} launched.`});
  return {appId:app.id,pid:process.pid};
}
export function closeApplication(state:VirtualMachineState,app:ApplicationManifest):boolean{
  const process=state.processes.find(p=>p.name.toLowerCase()===app.executable.toLowerCase());
  if(!process)return false;
  const closed=terminateProcess(state,process.pid);
  if(closed)emitKernelEvent(state,{level:"information",source:"PathApp",eventId:3002,channel:"application",message:`${app.name} closed.`});
  return closed;
}
