import { describe, expect, it } from "vitest";
import { createMachine, injectTrainingFault, setServiceStatus } from "@/lib/terminal/machine";
import { createVirtualEnvironment, syncVirtualEnvironment } from "@/lib/training/environment";
import { applicationCheck, applicationForProcess, applicationInstalled, launchTrainingApplication, reconcilePrintQueue, stopTrainingApplication, submitPrintJob, trainingApplications } from "@/lib/training/applications";

function lab() {
  const environment = createVirtualEnvironment();
  const machines = syncVirtualEnvironment({
    windows: createMachine({ shell: "cmd" }),
    linux: createMachine({ shell: "bash" }),
    mac: createMachine({ shell: "mac" }),
  }, environment);
  return { environment, machines };
}

describe("training application runtime", () => {
  it("launches a healthy application as a real user process", () => {
    const { environment, machines } = lab();
    const result = launchTrainingApplication("browser", machines.windows, machines, environment);
    expect(result.health).toBe("ready");
    expect(machines.windows.processes.some((process) => process.name === "itpath-browser")).toBe(true);
  });

  it("blocks Team Files when the workstation service is stopped", () => {
    const { environment, machines } = lab();
    expect(setServiceStatus(machines.windows, "LanmanWorkstation", "stopped").error).toBeUndefined();
    const app = trainingApplications.find((item) => item.id === "team-files")!;
    const result = applicationCheck(app, machines.windows, machines, environment);
    expect(result.health).toBe("blocked");
    expect(result.causes.join(" ")).toContain("LanmanWorkstation");
  });

  it("maps an ended process back to the application it owns", () => {
    expect(applicationForProcess("itpath-browser")?.id).toBe("browser");
    expect(applicationForProcess("itpath-browser.exe")?.id).toBe("browser");
    expect(applicationForProcess("spoolsv")).toBeUndefined();
  });

  it("removes a closed application from the process list and returns its memory", () => {
    const { environment, machines } = lab();
    const browser = trainingApplications.find((item) => item.id === "browser")!;
    const before = machines.windows.memoryUsedMb;
    expect(launchTrainingApplication(browser.id, machines.windows, machines, environment).health).toBe("ready");
    expect(machines.windows.processes.some((process) => process.name === browser.processName)).toBe(true);
    expect(stopTrainingApplication(browser.id, machines.windows)).toBe(true);
    expect(machines.windows.processes.some((process) => process.name === browser.processName)).toBe(false);
    expect(machines.windows.memoryUsedMb).toBeLessThanOrEqual(before);
  });

  it("keeps Windows-only applications off the other virtual desktops", () => {
    expect(applicationInstalled("team-files", "windows")).toBe(true);
    expect(applicationInstalled("team-files", "linux")).toBe(false);
    expect(applicationInstalled("updates", "mac")).toBe(false);
    expect(applicationInstalled("browser", "mac")).toBe(true);
  });

  it("targets the exact service behind an application incident", () => {
    const { environment, machines } = lab();
    const fault = injectTrainingFault(machines.mac, "service", "cupsd");
    const synced = syncVirtualEnvironment(machines, environment);
    expect(fault.target).toBe("cupsd");
    expect(synced.mac.services.find((service) => service.name === "cupsd")?.status).toBe("stopped");
    expect(synced.mac.processes.some((process) => process.name === "cupsd")).toBe(false);
    const app = trainingApplications.find((item) => item.id === "print-center")!;
    expect(applicationCheck(app, synced.windows, synced, environment).health).toBe("blocked");
  });

  it("keeps failed print work visible and recovers it when the print host returns", () => {
    const { environment, machines } = lab();
    setServiceStatus(machines.mac, "cupsd", "stopped");
    let synced = syncVirtualEnvironment(machines, environment);
    expect(submitPrintJob(synced.windows, synced, environment, "Quarterly Report").health).toBe("blocked");
    expect(synced.windows.printJobs?.[0]?.status).toBe("error");
    setServiceStatus(synced.mac, "cupsd", "running");
    synced = syncVirtualEnvironment(synced, environment);
    reconcilePrintQueue(synced.windows, synced, environment);
    expect(synced.windows.printJobs?.[0]?.status).toBe("printing");
  });

  it("blocks the intranet browser when nginx is stopped on another machine", () => {
    const { environment, machines } = lab();
    expect(setServiceStatus(machines.linux, "nginx", "stopped").error).toBeUndefined();
    const app = trainingApplications.find((item) => item.id === "browser")!;
    const result = applicationCheck(app, machines.windows, machines, environment);
    expect(result.health).toBe("blocked");
    expect(result.causes.join(" ")).toContain("network resource");
  });

  it("distinguishes DNS failure from a dead network link", () => {
    const { environment, machines } = lab();
    machines.windows.dnsServers = ["203.0.113.53"];
    const app = trainingApplications.find((item) => item.id === "browser")!;
    const result = applicationCheck(app, machines.windows, machines, environment);
    expect(result.causes).toContain("Name resolution is unavailable because DNS is not usable.");
    expect(result.causes).not.toContain("The workstation has no usable network link.");
  });

  it("blocks a local application when its required file is unreadable", () => {
    const { environment, machines } = lab();
    const node = machines.windows.root.children?.Users?.children?.student?.children?.Documents?.children?.["readme.txt"];
    expect(node).toBeTruthy();
    if (node) { node.owner = "Administrator"; node.group = "Administrators"; node.mode = "600"; }
    machines.windows.elevated = false;
    const app = trainingApplications.find((item) => item.id === "notes")!;
    const result = applicationCheck(app, machines.windows, machines, environment);
    expect(result.health).toBe("blocked");
    expect(result.causes.join(" ")).toContain("Access is denied");
  });

  it("blocks update work when free space is below the application's requirement", () => {
    const { environment, machines } = lab();
    machines.windows.diskUsedPercent = 99;
    expect(setServiceStatus(machines.windows, "wuauserv", "running").error).toBeUndefined();
    const app = trainingApplications.find((item) => item.id === "updates")!;
    const result = applicationCheck(app, machines.windows, machines, environment);
    expect(result.health).toBe("blocked");
    expect(result.causes.join(" ")).toContain("free disk space");
  });
});
