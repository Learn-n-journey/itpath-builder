import { describe, expect, it } from "vitest";
import { createMachine, getNode, resolvePath } from "@/lib/terminal/machine";
import { createVirtualKernel, createSyscalls, enumerateDevices } from "./index";

describe("PathOS kernel foundation", () => {
  it("keeps filesystem operations in canonical machine state", () => {
    const kernel=createVirtualKernel(createMachine({shell:"cmd"}));
    const next=kernel.transact(state=>{
      const sys=createSyscalls(state);
      expect(sys.fs.write("C:\\Users\\student\\Documents\\kernel.txt","PathOS")).toBeNull();
    });
    expect(getNode(next,resolvePath(next,"C:\\Users\\student\\Documents\\kernel.txt"))?.content).toBe("PathOS");
    expect(next.systemEvents?.some(event=>event.source==="PathFS")).toBe(true);
  });

  it("couples process lifecycle to memory", () => {
    const kernel=createVirtualKernel(createMachine({shell:"cmd"}));
    let pid=0;
    const started=kernel.transact(state=>{pid=createSyscalls(state).process.spawn({name:"path-app.exe",memoryMb:96});});
    expect(started.processes.some(process=>process.pid===pid)).toBe(true);
    const afterStart=started.memoryUsedMb;
    const stopped=createVirtualKernel(started).transact(state=>{expect(createSyscalls(state).process.kill(pid)).toBe(true);});
    expect(stopped.processes.some(process=>process.pid===pid)).toBe(false);
    expect(stopped.memoryUsedMb).toBeLessThan(afterStart);
  });

  it("derives device state from the same network interface state", () => {
    const machine=createMachine({shell:"cmd"});
    const nic=machine.interfaces[0];
    expect(nic).toBeDefined();
    if(!nic) return;
    nic.up=false;
    expect(enumerateDevices(machine).find(device=>device.id===`net:${nic.name}`)?.state).toBe("offline");
  });

  it("restores a deterministic snapshot", () => {
    const kernel=createVirtualKernel(createMachine({shell:"cmd"}));
    const snapshot=kernel.snapshot();
    kernel.transact(state=>{state.hostname="changed-host";});
    const restored=kernel.restore(snapshot);
    expect(restored.hostname).toBe(snapshot.machine.hostname);
  });
});
