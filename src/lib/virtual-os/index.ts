export { PATHOS_SPEC, type PathOsCapability } from "./spec";
export { createVirtualKernel, kernelHardware, type VirtualKernel } from "./kernel/runtime";
export { createSyscalls, type PathSyscalls } from "./kernel/syscalls";
export { emitKernelEvent, type KernelEventInput } from "./kernel/events";
export { spawnProcess, terminateProcess, type ProcessState, type SpawnProcessRequest } from "./kernel/processes";
export { memoryStatus, canAllocateMemory, type MemoryStatus } from "./kernel/memory";
export { enumerateDevices } from "./kernel/devices";
export { readNode, listPath, writePath, createDirectory, deletePath } from "./kernel/filesystem";
export type { KernelDevice, KernelHardware, KernelPowerState, KernelSnapshot, VirtualMachineState } from "./kernel/types";
