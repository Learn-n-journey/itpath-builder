import type { KernelDevice, VirtualMachineState } from "./types";

export function enumerateDevices(state: VirtualMachineState): KernelDevice[] {
  const devices: KernelDevice[] = [
    { id:"cpu0", kind:"cpu", name:"Path Virtual Processor", driver:"pathcpu", state:"online" },
    { id:"mem0", kind:"memory", name:`${state.memoryTotalMb} MB System Memory`, driver:"pathmem", state:"online" },
    { id:"disk0", kind:"storage", name:"Path Virtual Disk", driver:"pathdisk", state:"online" },
    { id:"display0", kind:"display", name:"Path Display Adapter", driver:"pathdisplay", state:"online" },
  ];
  for (const nic of state.interfaces) devices.push({
    id:`net:${nic.name}`, kind:"network", name:nic.name, driver:"pathnet",
    state: state.networkDriverHealthy === false ? "error" : nic.up ? "online" : "offline",
  });
  return devices;
}
