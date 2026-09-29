import { navigateTrainingBrowser, observeTrainingNetwork } from "@/lib/training/network-capabilities";
import { describe, expect, it } from "vitest";
import { createMachine, injectTrainingFault, setServiceStatus } from "@/lib/terminal/machine";
import { createVirtualEnvironment, resourceAccessForMachine, syncVirtualEnvironment } from "@/lib/training/environment";
import { advancePrintQueue, advanceWindowsUpdate, applicationCheck, applicationForProcess, applicationInstalled, completeWindowsUpdateRestart, launchTrainingApplication, reconcilePrintQueue, retryPrintJob, stopTrainingApplication, submitPrintJob, trainingApplications } from "@/lib/training/applications";

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

  it("distinguishes browser DNS, reachability, service, and offline failures", () => {
    const { machines } = lab();
    expect(navigateTrainingBrowser(machines.windows, "http://intranet.itpath.local").status).toBe("ok");
    const dns = structuredClone(machines.windows);
    dns.dnsServers = ["203.0.113.53"];
    expect(navigateTrainingBrowser(dns, "http://intranet.itpath.local").status).toBe("dns");
    const offline = structuredClone(machines.windows);
    offline.interfaces.find((item) => item.up)!.up = false;
    expect(navigateTrainingBrowser(offline, "http://intranet.itpath.local").status).toBe("offline");
    const unreachable = structuredClone(machines.windows);
    const intranet = unreachable.targets.find((item) => item.host === "intranet.itpath.local");
    if (intranet) intranet.reachable = false;
    expect(navigateTrainingBrowser(unreachable, "http://intranet.itpath.local").status).toBe("unreachable");
    const refused = structuredClone(machines.windows);
    const web = refused.targets.find((item) => item.host === "intranet.itpath.local");
    if (web) web.openPorts = (web.openPorts ?? []).filter((port) => port !== 80);
    expect(navigateTrainingBrowser(refused, "http://intranet.itpath.local").status).toBe("refused");
  });

  it("uses adapter health as the same network truth shown by the tray and apps", () => {
    const { environment, machines } = lab();
    machines.windows.networkDriverHealthy = false;
    expect(observeTrainingNetwork(machines.windows).state).toBe("offline");
    const browser = trainingApplications.find((item) => item.id === "browser")!;
    expect(applicationCheck(browser, machines.windows, machines, environment).health).toBe("blocked");
    machines.windows.networkDriverHealthy = true;
    expect(observeTrainingNetwork(machines.windows).state).toBe("online");
  });

  it("cascades network loss and recovery across network applications", () => {
    const { environment, machines } = lab();
    const browser = trainingApplications.find((item) => item.id === "browser")!;
    const files = trainingApplications.find((item) => item.id === "team-files")!;
    const print = trainingApplications.find((item) => item.id === "print-center")!;
    const updates = trainingApplications.find((item) => item.id === "updates")!;
    const iface = machines.windows.interfaces.find((item) => item.up)!;
    iface.up = false;
    expect(applicationCheck(browser, machines.windows, machines, environment).health).toBe("blocked");
    expect(applicationCheck(files, machines.windows, machines, environment).health).toBe("blocked");
    expect(applicationCheck(print, machines.windows, machines, environment).health).toBe("blocked");
    expect(applicationCheck(updates, machines.windows, machines, environment).health).toBe("blocked");
    iface.up = true;
    expect(applicationCheck(browser, machines.windows, machines, environment).health).toBe("ready");
    expect(applicationCheck(files, machines.windows, machines, environment).health).not.toBe("blocked");
    expect(applicationCheck(print, machines.windows, machines, environment).health).toBe("ready");
    expect(applicationCheck(updates, machines.windows, machines, environment).health).toBe("ready");
  });

  it("keeps local resources available when only the default route is missing", () => {
    const { environment, machines } = lab();
    const files = trainingApplications.find((item) => item.id === "team-files")!;
    const updates = trainingApplications.find((item) => item.id === "updates")!;
    const iface = machines.windows.interfaces.find((item) => item.up)!;
    iface.gateway = "";
    expect(applicationCheck(files, machines.windows, machines, environment).health).not.toBe("blocked");
    expect(applicationCheck(updates, machines.windows, machines, environment).health).toBe("blocked");
  });

  it("uses one identity model for local and shared-resource permissions", () => {
    const { environment, machines } = lab();
    const machine = machines.windows;
    const readme = getNode(machine, ["Users","student","Documents","readme.txt"])!;
    expect(accessDecision(machine, readme, "read").allowed).toBe(true);
    expect(resourceAccessForMachine("shared-files", machine, machines, environment)).toBe("read");
    expect(addAccountToGroup(machine, "student", "Accounting")).toBeNull();
    expect(resourceAccessForMachine("shared-files", machine, machines, environment)).toBe("write");
    expect(setNodePermissions(machine, ["Users","student","Documents","readme.txt"], "400")).toBeNull();
    expect(accessDecision(machine, readme, "write").allowed).toBe(false);
  });

  it("requires administrative authority to change account privileges", () => {
    const { machines } = lab();
    const machine = machines.windows;
    machine.users.push({ name:"operator", fullName:"Operator", groups:["Users"], admin:false, locked:false, passwordExpired:false });
    machine.currentUser = "operator";
    machine.elevated = false;
    expect(canManageAccounts(machine)).toBe(false);
    expect(setAccountAdmin(machine, "student", true)).toBe("denied");
    machine.elevated = true;
    expect(setAccountAdmin(machine, "student", true)).toBeNull();
  });

  it("runs Windows Update through download install and restart completion", () => {
    const { environment, machines } = lab();
    const machine = machines.windows;
    advanceWindowsUpdate(machine, machines, environment);
    expect(machine.updateState?.phase).toBe("checking");
    advanceWindowsUpdate(machine, machines, environment);
    expect(machine.updateState?.phase).toBe("downloading");
    expect(machine.services.find(item => item.name === "wuauserv")?.status).toBe("running");
    advanceWindowsUpdate(machine, machines, environment);
    expect(machine.updateState?.phase).toBe("installing");
    advanceWindowsUpdate(machine, machines, environment);
    expect(machine.updateState?.phase).toBe("restart-required");
    expect(machine.restartRequired).toBe(true);
    completeWindowsUpdateRestart(machine);
    expect(machine.updateState?.phase).toBe("completed");
    expect(machine.restartRequired).toBe(false);
    expect(machine.pendingUpdates).toHaveLength(0);
  });

  it("blocks Windows Update without enough free storage", () => {
    const { environment, machines } = lab();
    machines.windows.diskUsedPercent = 99;
    advanceWindowsUpdate(machines.windows, machines, environment);
    expect(machines.windows.updateState?.phase).toBe("error");
    expect(machines.windows.updateState?.message).toContain("free disk space");
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

  it("models local spooler failure separately and completes recovered print work", () => {
    const { environment, machines } = lab();
    setServiceStatus(machines.windows, "Spooler", "stopped");
    submitPrintJob(machines.windows, machines, environment, "Service Ticket");
    expect(machines.windows.printJobs?.[0]?.status).toBe("error");
    expect(machines.windows.printJobs?.[0]?.errorReason).toContain("Spooler");
    setServiceStatus(machines.windows, "Spooler", "running");
    retryPrintJob(machines.windows, machines, environment, machines.windows.printJobs![0].id);
    expect(machines.windows.printJobs?.[0]?.status).toBe("printing");
    advancePrintQueue(machines.windows, machines, environment);
    expect(machines.windows.printJobs?.[0]?.status).toBe("completed");
    expect(machines.windows.printJobs?.[0]?.completedAt).toBeTruthy();
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
