import { emitKernelEvent } from "./events";
import type { VirtualMachineState } from "./types";

export function setNetworkDriverHealth(state:VirtualMachineState,healthy:boolean){
  state.networkDriverHealthy=healthy;
  emitKernelEvent(state,{level:healthy?"information":"error",source:"PathDriver",eventId:4001,channel:"system",message:`Network driver ${healthy?"started successfully":"entered an error state"}.`});
}
export function setNetworkDeviceEnabled(state:VirtualMachineState,name:string,enabled:boolean){
  const nic=state.interfaces.find(item=>item.name===name);
  if(!nic)return false;
  nic.up=enabled;
  emitKernelEvent(state,{level:"information",source:"PathDriver",eventId:4002,channel:"system",message:`Network device ${name} ${enabled?"enabled":"disabled"}.`});
  return true;
}
