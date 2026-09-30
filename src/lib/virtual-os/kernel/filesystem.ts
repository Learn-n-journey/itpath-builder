import {
  getNode, listDir, makeDir, removePath, resolvePath, writeFile,
  type VfsNode,
} from "@/lib/terminal/machine";
import { emitKernelEvent } from "./events";
import type { VirtualMachineState } from "./types";

export function readNode(state: VirtualMachineState, path: string): VfsNode | null {
  return getNode(state, resolvePath(state, path));
}
export function listPath(state: VirtualMachineState, path: string) { return listDir(state, path); }
export function writePath(state: VirtualMachineState, path: string, content: string, append=false) {
  const error=writeFile(state,path,content,append);
  if(!error) emitKernelEvent(state,{level:"audit",source:"PathFS",eventId:2001,channel:"system",message:`Wrote ${path}.`});
  return error;
}
export function createDirectory(state: VirtualMachineState,path:string){
  const error=makeDir(state,path);
  if(!error) emitKernelEvent(state,{level:"audit",source:"PathFS",eventId:2002,channel:"system",message:`Created directory ${path}.`});
  return error;
}
export function deletePath(state:VirtualMachineState,path:string,recursive=false){
  const error=removePath(state,path,recursive);
  if(!error) emitKernelEvent(state,{level:"audit",source:"PathFS",eventId:2003,channel:"system",message:`Deleted ${path}.`});
  return error;
}
