import { createDirectory, deletePath, listPath, readNode, writePath } from "./filesystem";
import { memoryStatus } from "./memory";
import { spawnProcess, terminateProcess, type SpawnProcessRequest } from "./processes";
import type { VirtualMachineState } from "./types";

export function createSyscalls(state: VirtualMachineState) {
  return {
    fs: {
      read: (path:string) => readNode(state,path),
      list: (path:string) => listPath(state,path),
      write: (path:string,content:string,append=false) => writePath(state,path,content,append),
      mkdir: (path:string) => createDirectory(state,path),
      remove: (path:string,recursive=false) => deletePath(state,path,recursive),
    },
    process: {
      list: () => state.processes.map(process=>({...process})),
      spawn: (request:SpawnProcessRequest) => spawnProcess(state,request).pid,
      kill: (pid:number) => terminateProcess(state,pid),
    },
    memory: { status: () => memoryStatus(state) },
  };
}
export type PathSyscalls = ReturnType<typeof createSyscalls>;
