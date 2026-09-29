import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Folder,
  FolderOpen,
  HardDrive,
  Menu,
  Monitor,
  Search,
  Settings,
  SquareTerminal,
  Wifi,
  Activity,
  Cpu,
  MemoryStick,
  Network,
  ServerCog,
  ScrollText,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { injectTrainingFault, prompt, reclaimTrainingDiskSpace, trainingFaultResolved, type TrainingFault } from "@/lib/terminal/machine";
import { requiredTicketEvidence, ticketDifficulty, ticketScope, trainingTickets, type TrainingTicket } from "@/lib/training/tickets";
import { createVirtualEnvironment, resourceAccessForMachine, sharedResourceAvailable, syncVirtualEnvironment } from "@/lib/training/environment";
import { execute } from "@/lib/terminal/shells";
import { buildScenarioMachine, terminalScenarios, type TerminalScenario } from "@/lib/terminal/scenarios";
import { createTerminalAttempt, evaluateTerminalAttempt, runTerminalCommand } from "@/lib/terminal/session";
import type { TerminalAttempt, TerminalMode } from "@/lib/app-data/types";
import { clone,
  bootServices, ensureWorkstationState, copyPath, canManageAccounts, createMachine, currentGroups, getNode, killProcess, makeDir, movePath, primaryInterface, removePath, setAccountAdmin, setAccountLocked, setServiceStatus, storageFreePercent, writeFile, type MachineState, type VfsNode } from "@/lib/terminal/machine";
import { useAppState } from "@/state/app-state";
import { hasSimulatorCredit, simulatorOutcomeSignal, simulatorScaffoldingProfile } from "@/lib/learner-signals";
import { applyTrainingNetworkAction, navigateTrainingBrowser, observeTrainingNetwork, probeTrainingNetwork, probeTrainingService } from "@/lib/training/network-capabilities";
import { advancePrintQueue, advanceWindowsUpdate, applicationCheck, applicationForProcess, applicationInstalled, cancelPrintJob, launchTrainingApplication, completeWindowsUpdateRestart, reconcilePrintQueue, retryPrintJob, stopTrainingApplication, submitPrintJob, trainingApplications, type TrainingApplicationId } from "@/lib/training/applications";

export const Route = createFileRoute("/virtual-pc")({
  validateSearch: (search: Record<string, unknown>): { activity?: "lab"|"ticket"; lab?: string; ticket?: string; topic?: string; tool?: string; os?: "windows"|"linux" } => ({
    ...(search.activity === "lab" || search.activity === "ticket" ? { activity:search.activity } : {}),
    ...(typeof search.ticket === "string" ? { ticket:search.ticket } : {}),
    ...(typeof search.lab === "string" ? { lab:search.lab } : {}),
    ...(typeof search.topic === "string" ? { topic:search.topic } : {}),
    ...(typeof search.tool === "string" ? { tool:search.tool } : {}),
    ...(search.os === "windows" || search.os === "linux" ? { os:search.os } : {}),
  }),
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Virtual PC | IT PATH" },
      { name: "description", content: "Practice working inside a safe, responsive virtual Windows-style computer." },
    ],
  }),
  component: VirtualPcPage,
});

type AppId = "files" | "settings" | "terminal" | "processes" | "network" | "services" | "hardware" | "logs" | "storage" | "accounts" | "control" | "systeminfo" | TrainingApplicationId;
type PcOs = "windows" | "linux" | "mac";
type VirtualFile = { name: string; kind: "folder" | "file"; detail: string };

const SHARED_WINDOWS_SCENARIO = "terminal-free-cmd";

function entries(node: VfsNode | null): VirtualFile[] {
  if (!node || node.type !== "dir") return [];
  return Object.values(node.children ?? {}).map((child) => ({
    name: child.name,
    kind: child.type === "dir" ? "folder" : "file",
    detail: child.type === "dir" ? `${Object.keys(child.children ?? {}).length} items` : `Text document · ${(child.content ?? "").length} bytes`,
  }));
}

function freshWindowsMachine(): MachineState {
  return createMachine({
    shell: "cmd",
    files: { "C:\\Users\\student\\Desktop\\IT PATH Lab Notes.txt": "Virtual PC training machine. Changes here are visible from CMD.\\r\\n" },
    dirs: ["C:\\Users\\student\\Downloads", "C:\\Users\\student\\Pictures"],
  });
}

// Tickets are authored incidents with a real reported symptom and hidden cause. Terminal scenarios are practice/lab work and must never be promoted into the support queue.
const helpDeskTickets: TrainingTicket[] = trainingTickets.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);

function VirtualPcPage() {
  const launchContext = Route.useSearch();
  const practiceMode = launchContext.activity === "lab" && Boolean(launchContext.lab);
  const [practiceActions,setPracticeActions]=useState(0);
  const { user, actions } = useAppState();
  const sharedAttempt = user.terminalAttempts.find((attempt) => attempt.scenarioId === SHARED_WINDOWS_SCENARIO && attempt.status === "in_progress");
  const [fallbackMachine] = useState<MachineState>(() => freshWindowsMachine());
  const [pcOs, setPcOs] = useState<PcOs>(()=>launchContext.os ?? "windows");
  const [virtualEnvironment, setVirtualEnvironment] = useState(() => createVirtualEnvironment());
  const [osMachines, setOsMachines] = useState<Record<PcOs, MachineState>>(() => syncVirtualEnvironment({ windows: sharedAttempt?.machine ?? freshWindowsMachine(), linux: createMachine({ shell: "bash", hostname: "itpath-linux" }), mac: createMachine({ shell: "mac", hostname: "itpath-mac" }) }, createVirtualEnvironment()));
  const machine = ensureWorkstationState(osMachines[pcOs] ?? (pcOs === "windows" ? sharedAttempt?.machine ?? fallbackMachine : fallbackMachine));
  const networkState = useMemo(() => observeTrainingNetwork(machine), [machine]);
  const diskFreePercent = storageFreePercent(machine);
  const [folder, setFolder] = useState<string[]>(["Users", "student"]);
  const [openApp, setOpenApp] = useState<AppId | null>(() => {
    if(!practiceMode) return "files";
    const tool=launchContext.tool;
    if(tool==="terminal"||tool==="files"||tool==="services"||tool==="processes"||tool==="accounts"||tool==="network"||tool==="storage") return tool;
    return "files";
  });
  const [startOpen, setStartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftName, setDraftName] = useState("");
  const [editing, setEditing] = useState<VirtualFile | null>(null);
  const [fileText, setFileText] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [desktopScenarioId, setDesktopScenarioId] = useState("");
  const [desktopScenarioMode, setDesktopScenarioMode] = useState<TerminalMode>("guided");
  const [desktopScenarioAttempt, setDesktopScenarioAttempt] = useState<TerminalAttempt | null>(null);
  const [desktopScenarioReasoning, setDesktopScenarioReasoning] = useState("");
  const [desktopScenarioResult, setDesktopScenarioResult] = useState<ReturnType<typeof evaluateTerminalAttempt> | null>(null);
  const [accountName, setAccountName] = useState("");
  const [windowsSettingsView, setWindowsSettingsView] = useState<"home" | "system" | "update" | "security" | "apps" | "personalization" | "time">("home");
  const [controlView, setControlView] = useState<"home" | "network" | "programs" | "system" | "users" | "tools">("home");
  const [eventChannel, setEventChannel] = useState<"all" | "system" | "application" | "security">("all");
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<"processes" | "performance" | "startup" | "users" | "details">("processes");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeFault, setActiveFault] = useState<TrainingFault | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketVerified, setTicketVerified] = useState(false);
  const [ticketEvidence, setTicketEvidence] = useState<string[]>([]);
  const [ticketTrace, setTicketTrace] = useState<Array<"observe"|"test"|"repair"|"verify">>([]);
  const [gaylHelpLevel, setGaylHelpLevel] = useState(0);
  const [gaylWalkthrough, setGaylWalkthrough] = useState(false);
  const [gaylStep, setGaylStep] = useState(0);
  const [gaylStepChecked, setGaylStepChecked] = useState(false);
  const [gaylIndependent, setGaylIndependent] = useState(false);
  const [gaylWhyOpen, setGaylWhyOpen] = useState(false);
  const [gaylIndependentChecks, setGaylIndependentChecks] = useState<string[]>([]);
  const [gaylFeedback, setGaylFeedback] = useState("Start with the symptom. Gather evidence before you change anything.");
  const [gaylHypothesis, setGaylHypothesis] = useState("");
  const [gaylActions, setGaylActions] = useState(0);
  const ticketBaseline = useRef<{ os: PcOs; machine: MachineState } | null>(null);
  const ticketEnvironmentBaseline = useRef<{ os: PcOs; machines: Record<PcOs, MachineState> } | null>(null);
  const [netIp, setNetIp] = useState("");
  const [netMask, setNetMask] = useState("");
  const [netGateway, setNetGateway] = useState("");
  const [netDns, setNetDns] = useState("");
  const [networkEditing, setNetworkEditing] = useState(false);
  const [networkProbeHost, setNetworkProbeHost] = useState("support.itpath.local");
  const [browserAddress, setBrowserAddress] = useState("http://intranet.itpath.local");
  const [browserHistory, setBrowserHistory] = useState(["http://intranet.itpath.local"]);
  const [browserHistoryIndex, setBrowserHistoryIndex] = useState(0);
  const [contextItem, setContextItem] = useState<VirtualFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [propertiesItem, setPropertiesItem] = useState<VirtualFile | null>(null);
  const [propertyOwner, setPropertyOwner] = useState("");
  const [propertyGroup, setPropertyGroup] = useState("");
  const [propertyMode, setPropertyMode] = useState("");
  const [clipboard, setClipboard] = useState<{ item: VirtualFile; from: string; cut: boolean } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFileName, setShareFileName] = useState<string | null>(null);
  const [shareFileText, setShareFileText] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [deviceNameDraft, setDeviceNameDraft] = useState("");
  const [firewallDraft, setFirewallDraft] = useState(true);
  const [windowsTheme, setWindowsTheme] = useState<"dark" | "light">("dark");
  const [pearWindowMaximized, setPearWindowMaximized] = useState(false);
  const [pearMenu, setPearMenu] = useState<"pathos" | "file" | "edit" | "view" | "go" | "window" | null>(null);
  const [pearNotice, setPearNotice] = useState("");
  const [pearView, setPearView] = useState<"icons" | "list">("icons");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNode = getNode(machine, folder);
  const visibleFiles = useMemo(
    () => entries(currentNode).filter((file) => file.name.toLowerCase().includes(query.toLowerCase())),
    [currentNode, query],
  );
  const teamFilesResource = virtualEnvironment.resources.find((resource) => resource.id === "shared-files");
  const teamFilesAccess = resourceAccessForMachine("shared-files", machine, osMachines, virtualEnvironment);
  const teamFilesService = probeTrainingService(machine, "files.itpath.local", 445);
  const activeTrainingApplication = trainingApplications.find((item) => item.id === openApp);
  const activeApplicationCheck = activeTrainingApplication ? applicationCheck(activeTrainingApplication, machine, osMachines, virtualEnvironment) : null;
  const networkInterface = primaryInterface(machine);
  const trayNetworkState = networkState.state;
  const trayPrintJobs = machine.printJobs ?? [];
  const trayPrintError = trayPrintJobs.some((job) => job.status === "error");
  const trayPrinting = trayPrintJobs.some((job) => job.status === "printing" || job.status === "queued");
  const trayUpdateAttention = machine.restartRequired || (machine.pendingUpdates?.length ?? 0) > 0;
  const browserResult = navigateTrainingBrowser(machine, browserAddress);
  const navigateBrowser = (address = browserAddress, addHistory = true) => {
    const normalized = address.trim() || "http://intranet.itpath.local";
    setBrowserAddress(normalized);
    if (addHistory) {
      const next = [...browserHistory.slice(0, browserHistoryIndex + 1), normalized].slice(-30);
      setBrowserHistory(next);
      setBrowserHistoryIndex(next.length - 1);
    }
    recordEvidence(`Browser: navigated to ${normalized}`);
  };
  const browserBack = () => {
    if (browserHistoryIndex <= 0) return;
    const index = browserHistoryIndex - 1;
    setBrowserHistoryIndex(index);
    setBrowserAddress(browserHistory[index] ?? "http://intranet.itpath.local");
  };
  const browserForward = () => {
    if (browserHistoryIndex >= browserHistory.length - 1) return;
    const index = browserHistoryIndex + 1;
    setBrowserHistoryIndex(index);
    setBrowserAddress(browserHistory[index] ?? browserAddress);
  };

  const pathFor = (name?: string) => {
    const parts = [...folder, ...(name ? [name] : [])];
    return pcOs === "windows" ? `C:\\${parts.join("\\")}` : `/${parts.join("/")}`;
  };
  const saveMachine = (next: MachineState) => {
    setOsMachines((current) => syncVirtualEnvironment({ ...current, [pcOs]: next }, virtualEnvironment));
    if (pcOs === "windows" && sharedAttempt) actions.updateTerminalAttempt({ ...sharedAttempt, machine: next, updatedAt: new Date().toISOString() });
  };
  const mutate = (fn: (next: MachineState) => void) => {
    const next = clone(machine);
    fn(next);
    saveMachine(next);
  };
  const openFile = (item: VirtualFile) => {
    if (item.kind === "folder") return setFolder((current) => [...current, item.name]);
    const node = getNode(machine, [...folder, item.name]);
    setEditing(item);
    setFileText(node?.type === "file" ? node.content ?? "" : "");
  };
  const createFolder = () => {
    const name = draftName.trim();
    if (!name) return;
    mutate((next) => { makeDir(next, pathFor(name)); });
    setDraftName("");
  };
  const createTextFile = () => {
    const raw = draftName.trim();
    if (!raw) return;
    const name = raw.toLowerCase().endsWith(".txt") ? raw : `${raw}.txt`;
    mutate((next) => { writeFile(next, pathFor(name), "", false); });
    setDraftName("");
  };
  const deleteItem = (item: VirtualFile) => { mutate((next) => { removePath(next, pathFor(item.name), true); }); setContextItem(null); };
  const showContext = (item: VirtualFile) => { setContextItem(item); setRenameValue(item.name); };
  const showProperties = (item: VirtualFile) => {
    const node = getNode(machine, [...folder, item.name]);
    if (!node) return;
    setPropertiesItem(item); setPropertyOwner(node.owner); setPropertyGroup(node.group); setPropertyMode(node.mode); setContextItem(null);
  };
  const saveProperties = () => {
    if (!propertiesItem) return;
    mutate((next) => {
      const node = getNode(next, [...folder, propertiesItem.name]);
      if (!node) return;
      node.owner = propertyOwner.trim() || node.owner;
      node.group = propertyGroup.trim() || node.group;
      if (/^[0-7]{3}$/.test(propertyMode)) node.mode = propertyMode;
      addEvent(next, `Permissions updated for ${pathFor(propertiesItem.name)}.`);
    });
    setPropertiesItem(null);
  };
  const beginPress = (item: VirtualFile) => { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = setTimeout(() => showContext(item), 480); };
  const cancelPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = null; };
  const renameItem = () => {
    if (!contextItem || !renameValue.trim() || renameValue.trim() === contextItem.name) return setContextItem(null);
    mutate((next) => { movePath(next, pathFor(contextItem.name), pathFor(renameValue.trim())); });
    setContextItem(null);
  };
  const copyItem = (cut: boolean) => { if (contextItem) setClipboard({ item: contextItem, from: pathFor(contextItem.name), cut }); setContextItem(null); };
  const pasteItem = () => {
    if (!clipboard) return;
    mutate((next) => { const target = pathFor(clipboard.item.name); clipboard.cut ? movePath(next, clipboard.from, target) : copyPath(next, clipboard.from, target); });
    if (clipboard.cut) setClipboard(null);
  };
  const saveText = () => {
    if (!editing) return;
    mutate((next) => { writeFile(next, pathFor(editing.name), fileText, false); });
    setEditing(null);
  };
  const signedInGroups = () => currentGroups(machine);
  const openTeamShare = () => {
    recordEvidence("GUI: opened Team Files network share");
    setShareNotice("");
    if (!teamFilesService.ok || teamFilesAccess === "unreachable") return setShareNotice(teamFilesService.detail);
    if (teamFilesAccess === "denied") return setShareNotice("Access denied. Your signed-in account does not have permission to open this network share.");
    setShareOpen(true);
  };
  const openShareFile = (name: string) => {
    const item = teamFilesResource?.access?.files?.find((file) => file.name === name);
    if (!item) return;
    const groups = signedInGroups();
    if (item.readGroups?.length && !item.readGroups.some((group) => groups.has(group))) {
      recordEvidence(`GUI: access denied opening shared file ${name}`);
      return setShareNotice(`You don't have permission to open ${name}. The share is reachable, but this file has more restrictive permissions.`);
    }
    recordEvidence(`GUI: opened shared file ${name}`);
    setShareFileName(name); setShareFileText(item.content); setShareNotice("");
  };
  const saveShareFile = () => {
    if (!shareFileName) return;
    const item = teamFilesResource?.access?.files?.find((file) => file.name === shareFileName);
    if (!item) return;
    const groups = signedInGroups();
    const allowed = teamFilesAccess === "write" && (!item.writeGroups?.length || item.writeGroups.some((group) => groups.has(group)));
    if (!allowed) {
      recordEvidence(`GUI: write denied for shared file ${shareFileName}`);
      return setShareNotice("You can read this file, but you do not have permission to save changes to it.");
    }
    item.content = shareFileText;
    setVirtualEnvironment(current => ({ ...current, resources: current.resources.map(resource => resource.id !== "shared-files" ? resource : { ...resource, access: resource.access ? { ...resource.access, files: resource.access.files?.map(file => file.name === shareFileName ? { ...file, content:shareFileText } : file) } : resource.access }) }));
    recordEvidence(`GUI: saved shared file ${shareFileName}`);
    mutate((next) => { addEvent(next, `Network file ${shareFileName} saved to \\\\files.itpath.local\\Team Files.`); });
    setShareNotice("Changes saved to Team Files."); setShareFileName(null);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("itpath-virtualpc-environment-v1");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.resources && saved?.dnsRecords) setVirtualEnvironment(saved);
    } catch { /* keep the clean training LAN */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("itpath-virtualpc-environment-v1", JSON.stringify(virtualEnvironment)); } catch { /* storage unavailable */ }
  }, [virtualEnvironment]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("itpath-virtualpc-machines-v1");
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Record<PcOs, MachineState>>;
      setOsMachines(current => syncVirtualEnvironment({ ...current, ...saved }, virtualEnvironment));
    } catch { /* keep fresh training machines if saved state is invalid */ }
  }, [virtualEnvironment]);

  useEffect(() => {
    localStorage.setItem("itpath-virtualpc-machines-v1", JSON.stringify(osMachines));
  }, [osMachines]);

  useEffect(() => {
    try {
      const sharedSaved = localStorage.getItem("itpath-virtualpc-ticket-shared");
      const saved = sharedSaved ?? localStorage.getItem(`itpath-virtualpc-ticket-${pcOs}`);
      if (!saved) { setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); return; }
      const parsed = JSON.parse(saved) as { ticketId: string; fault: TrainingFault; verified?: boolean };
      setActiveTicketId(parsed.ticketId); setActiveFault(parsed.fault); setTicketVerified(Boolean(parsed.verified)); setTicketEvidence((parsed as any).evidence ?? []); setGaylHelpLevel((parsed as any).helpLevel ?? 0);
    } catch { setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); }
  }, [pcOs]);

  useEffect(() => {
    if (!activeTicketId || !activeFault) return;
    const ticket = helpDeskTickets.find((item) => item.id === activeTicketId);
    const key = ticket?.scope === "cross-machine" ? "itpath-virtualpc-ticket-shared" : `itpath-virtualpc-ticket-${pcOs}`;
    localStorage.setItem(key, JSON.stringify({ ticketId: activeTicketId, fault: activeFault, verified: ticketVerified, evidence: ticketEvidence, helpLevel: gaylHelpLevel }));
  }, [activeTicketId, activeFault, ticketVerified, ticketEvidence, gaylHelpLevel, pcOs]);

  const resetVirtualLab = () => {
    const cleanEnvironment = createVirtualEnvironment();
    const cleanMachines = syncVirtualEnvironment({
      windows: freshWindowsMachine(),
      linux: createMachine({ shell:"bash", hostname:"itpath-linux" }),
      mac: createMachine({ shell:"mac", hostname:"itpath-mac" }),
    }, cleanEnvironment);
    try {
      localStorage.removeItem("itpath-virtualpc-machines-v1");
      localStorage.removeItem("itpath-virtualpc-environment-v1");
      localStorage.removeItem("itpath-virtualpc-ticket-shared");
      (["windows","linux","mac"] as PcOs[]).forEach(os => localStorage.removeItem(`itpath-virtualpc-ticket-${os}`));
    } catch { /* reset still applies in memory */ }
    setVirtualEnvironment(cleanEnvironment);
    setOsMachines(cleanMachines);
    setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); setTicketEvidence([]); setTicketTrace([]); setGaylHelpLevel(0);
    setOpenApp(null); setShareFileName(null); setShareNotice(""); setDesktopScenarioAttempt(null);
    setTicketOpen(false); setTerminalLines([]); setTerminalInput("");
  };

  const activeTicket = helpDeskTickets.find((ticket) => ticket.id === activeTicketId);
  const faultMachine = activeTicket?.faultHostOs ? osMachines[activeTicket.faultHostOs] : machine;
  const activeJobScenario = activeTicket?.terminalScenarioId ? terminalScenarios.find((scenario) => scenario.id === activeTicket.terminalScenarioId) : undefined;
  const activeJobResult = activeJobScenario && desktopScenarioAttempt ? evaluateTerminalAttempt(activeJobScenario, { ...desktopScenarioAttempt, machine }) : null;
  const repairReady = activeJobScenario ? Boolean(activeJobResult && activeJobResult.missingGoals.length === 0) : Boolean(activeFault && trainingFaultResolved(faultMachine, activeFault));
  const ticketResolved = repairReady && ticketVerified;
  const ticketOs = (ticket: TrainingTicket): PcOs | null => {
    if (ticket.reporterOs) return ticket.reporterOs;
    const hasWindows = ticket.shells.some((shell) => shell === "cmd" || shell === "powershell");
    const hasLinux = ticket.shells.includes("bash");
    const hasPear = ticket.shells.includes("mac");
    const count = Number(hasWindows) + Number(hasLinux) + Number(hasPear);
    if (count !== 1) return null;
    return hasWindows ? "windows" : hasLinux ? "linux" : "mac";
  };
  const startTicket = (ticketId: string) => {
    const ticket = helpDeskTickets.find((item) => item.id === ticketId);
    if (!ticket || activeTicketId) return;
    const requestedOs = ticketOs(ticket);
    const launchOs: PcOs = requestedOs ?? pcOs;
    const targetOs: PcOs = ticket.faultHostOs ?? launchOs;
    ticketEnvironmentBaseline.current = { os: pcOs, machines: { windows: clone(osMachines.windows), linux: clone(osMachines.linux), mac: clone(osMachines.mac) } };
    const sourceMachine = osMachines[targetOs];
    ticketBaseline.current = { os: targetOs, machine: clone(sourceMachine) };
    let next = clone(sourceMachine);
    let fault: TrainingFault | null = null;
    if (ticket.terminalScenarioId) {
      const scenario = terminalScenarios.find((item) => item.id === ticket.terminalScenarioId);
      if (!scenario) return;
      next = buildScenarioMachine(scenario);
      const attempt = createTerminalAttempt(scenario, "challenge");
      const linkedAttempt = { ...attempt, machine: next };
      actions.addTerminalAttempt(linkedAttempt);
      setDesktopScenarioId(scenario.id);
      setDesktopScenarioMode("challenge");
      setDesktopScenarioAttempt(linkedAttempt);
      setDesktopScenarioReasoning("");
      setDesktopScenarioResult(null);
    } else if (ticket.fault) {
      fault = injectTrainingFault(next, ticket.fault, ticket.faultTarget);
      setDesktopScenarioAttempt(null);
      setDesktopScenarioResult(null);
      setDesktopScenarioId("");
    }
    setOsMachines((current) => syncVirtualEnvironment({ ...current, [targetOs]: next }, virtualEnvironment));
    setPcOs(launchOs);
    setFolder(homeFolder(launchOs));
    setOpenApp((ticket.symptomApp ?? null) as AppId | null);
    setDesktopScenarioAttempt(null); setDesktopScenarioResult(null); setDesktopScenarioId("");
    setActiveTicketId(ticket.id); setActiveFault(fault); setTicketTrace([]); setTicketVerified(false); setTicketEvidence([ticket.scope === "cross-machine" ? "Cross-machine incident opened from reporting workstation" : "Ticket opened"]); setGaylHelpLevel(0); setGaylWalkthrough(false); setGaylStep(0); setGaylStepChecked(false); setGaylIndependent(false); setTicketOpen(true); setTerminalLines([]);
  };
  useEffect(()=>{
    if(launchContext.activity!=="ticket" || !launchContext.ticket || activeTicketId) return;
    if(helpDeskTickets.some(item=>item.id===launchContext.ticket)) startTicket(launchContext.ticket);
  },[launchContext.activity,launchContext.ticket]);
  const verifyTicket = () => {
    if(activeTicketId)setTicketTrace(trace=>trace.includes("verify")?trace:[...trace,"verify"]);
    if (activeJobScenario) {
      const passed = Boolean(activeJobResult && activeJobResult.missingGoals.length === 0);
      setTicketVerified(passed);
      setTicketEvidence((items) => [...items, passed ? "Job verified successfully" : "Verification attempted; objectives remain"].slice(-40));
      return;
    }
    if (!activeFault) return;
    const host = activeTicket?.faultHostOs ? osMachines[activeTicket.faultHostOs] : machine;
    const faultFixed = trainingFaultResolved(host, activeFault);
    const resourceFixed = activeTicket?.verifyResourceId ? sharedResourceAvailable(activeTicket.verifyResourceId, osMachines, virtualEnvironment) : true;
    const reporterHealthy = activeTicket?.reporterOs ? Boolean(primaryInterface(osMachines[activeTicket.reporterOs])?.up) : true;
    const passed = faultFixed && resourceFixed && reporterHealthy;
    if(passed) setTicketTrace(trace=>trace.includes("verify")?trace:[...trace,"verify"]);
    setTicketVerified(passed); setTicketEvidence((items) => [...items, passed ? "Fix verified successfully" : "Verification attempted; issue remains"].slice(-40));
    if (passed) mutate((next) => { addEvent(next, `Help desk ticket ${activeTicketId?.replace("ticket-","") ?? ""} verified resolved.`); });
  };
  const closeTicket = () => {
    if (!ticketResolved) return;
    const required=activeTicket?requiredTicketEvidence(activeTicket):[];
    const processComplete=required.every(step=>ticketTrace.includes(step) || step==="verify" && ticketVerified);
    if(activeTicket && !hasSimulatorCredit(user,"troubleshoot",activeTicket.id)) actions.addLearnerSignal(simulatorOutcomeSignal(activeTicket.topicId,"troubleshoot",activeTicket.id,processComplete?1:0.75,gaylHelpLevel));
    const required=activeTicket?requiredTicketEvidence(activeTicket):["observe","repair","verify"];
    const demonstrated=required.every(stage=>ticketTrace.includes(stage));
    if(!demonstrated){ setNotice(`The fix works, but demonstrate the troubleshooting process first: ${required.filter(stage=>!ticketTrace.includes(stage)).join(", ")}.`); return; }
    if(activeTicket && !hasSimulatorCredit(user,"troubleshoot",activeTicket.id)) actions.addLearnerSignal(simulatorOutcomeSignal(activeTicket.topicId,"troubleshoot",activeTicket.id,1,gaylHelpLevel));
    localStorage.removeItem(`itpath-virtualpc-ticket-${pcOs}`);
    localStorage.removeItem("itpath-virtualpc-ticket-shared");
    setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); setTicketEvidence([]); setGaylHelpLevel(0); setGaylFeedback("Start with the symptom. Gather evidence before you change anything."); setGaylHypothesis(""); setGaylActions(0); setGaylWalkthrough(false); setGaylStep(0); setGaylStepChecked(false); setGaylIndependent(false); ticketBaseline.current=null; ticketEnvironmentBaseline.current=null; setTicketOpen(false);
  };
  const cancelTicket = () => {
    if (!activeTicketId) return;
    const baseline = ticketEnvironmentBaseline.current;
    localStorage.removeItem("itpath-virtualpc-ticket-shared");
    (["windows","linux","mac"] as const).forEach((os) => localStorage.removeItem(`itpath-virtualpc-ticket-${os}`));
    if (baseline) {
      setOsMachines(syncVirtualEnvironment({ windows: clone(baseline.machines.windows), linux: clone(baseline.machines.linux), mac: clone(baseline.machines.mac) }, virtualEnvironment));
      setPcOs(baseline.os);
      setFolder(homeFolder(baseline.os));
    }
    setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); setTicketEvidence([]);
    setGaylHelpLevel(0); setGaylFeedback("Start with the symptom. Gather evidence before you change anything."); setGaylHypothesis(""); setGaylActions(0); setGaylWalkthrough(false); setGaylStep(0); setGaylStepChecked(false); setGaylIndependent(false);
    setDesktopScenarioAttempt(null); setDesktopScenarioResult(null); setDesktopScenarioId(""); setTerminalLines([]); setTerminalInput("");
    ticketBaseline.current = null; ticketEnvironmentBaseline.current = null; setOpenApp(null); setTicketOpen(false);
  };

  const cleanupStorage = () => {
    recordEvidence("GUI: storage cleanup performed");
    mutate((next) => { reclaimTrainingDiskSpace(next, 12); });
  };

  const recordEvidence = (message: string) => {
    const lowerMessage=message.toLowerCase();
    const stage: "observe"|"test"|"repair"|null =
      ["saved","started","enabled","cleanup","unlocked","roll back","restored","changed","disabled"].some(word=>lowerMessage.includes(word)) ? "repair" :
      ["ping","nslookup","probe","test","browser","terminal:"].some(word=>lowerMessage.includes(word)) ? "test" :
      ["opened","inspect","status","network","service","storage","account","device"].some(word=>lowerMessage.includes(word)) ? "observe" : null;
    if(stage) setTicketTrace(trace=>trace.includes(stage)?trace:[...trace,stage]);
    if (practiceMode) setPracticeActions(count=>count+1);
    if (!activeTicketId) return;
    setTicketEvidence((items) => [...items, message].slice(-40));
    setGaylActions((count) => count + 1);
    if (!activeFault) return;
    const lower = message.toLowerCase();
    const relevant: Record<string,string[]> = { dns:["network","dns","ipconfig","resolv","nslookup","name"], adapter:["network","interface","adapter","ipconfig","ip link"], gateway:["network","gateway","route","ipconfig"], service:["service","systemctl","sc ","get-service"], disk:["storage","disk","df ","cleanup"], account:["account","user","users"], driver:["driver","device","adapter","hardware"] };
    const repairWords = ["saved","started","enabled","cleanup","unlocked","roll back","restored"];
    if (repairWords.some(word=>lower.includes(word))) setGaylFeedback("You changed system state. Now verify the symptom is actually gone. A change is not proof of a fix.");
    else if ((relevant[activeFault.kind] ?? []).some(word=>lower.includes(word))) setGaylFeedback("That evidence is relevant. Ask what it rules in or rules out before making the next change.");
    else if (lower.startsWith("terminal:")) setGaylFeedback("That command may still be useful, but connect its output to the reported symptom. Avoid collecting evidence without a reason.");
  };
  const completePracticeLab = () => {
    if(!practiceMode || !launchContext.lab || !launchContext.topic || practiceActions<2) return;
    if(!hasSimulatorCredit(user,"lab",launchContext.lab)) actions.addLearnerSignal(simulatorOutcomeSignal(launchContext.topic,"lab",launchContext.lab,1,gaylHelpLevel));
    setNotice("Practice verified. This demonstrated work has been recorded as practical evidence.");
  };
  const scaffoldingProfile = launchContext.lab ? simulatorScaffoldingProfile(user,launchContext.lab) : null;
  const adaptiveOpeningHint = scaffoldingProfile?.openingHintStyle==="socratic"
    ? "You have solved work like this before. What observation would most efficiently test your first hypothesis?"
    : scaffoldingProfile?.openingHintStyle==="guided"
      ? "Start with the symptom, name the subsystem it depends on, then inspect that subsystem before changing state."
      : "Start with the symptom. Identify what should be working, inspect its current state, and make the smallest evidence-based change.";
  const gaylHelp = () => { if (!activeFault && !activeJobScenario) return; setGaylHelpLevel((level) => Math.min(3, level + 1)); recordEvidence(`GAYL assistance requested (level ${Math.min(3, gaylHelpLevel + 1)})`); };
  const gaylMessage = activeJobScenario ? (gaylHelpLevel === 0 ? "I’ll stay out of the way unless you need me." : activeJobScenario.hints[Math.min(activeJobScenario.hints.length - 1, Math.max(0, gaylHelpLevel - 1))] ?? "Inspect the symptom first, then make the smallest appropriate change and verify the result.") : !activeFault ? "" : gaylHelpLevel === 0 ? "I’ll stay out of the way unless you need me." : gaylHelpLevel === 1 ? (practiceMode ? adaptiveOpeningHint : "Start with evidence. Inspect the part of the system connected to the symptom before changing anything.") : gaylHelpLevel === 2 ? ({dns:"Compare the DNS configuration with the network path, then test name resolution.",adapter:"Check whether the primary network interface is enabled and has a usable configuration.",gateway:"Inspect the default route or gateway before changing addressing.",service:"Identify the service tied to the failed feature and inspect its current state.",disk:"Check disk usage and identify safe temporary or cached data before deleting anything.",account:"Inspect the affected user's account state before enabling or resetting it.",driver:"Open Device Manager and inspect the network adapter's device status before changing it."} as Record<string,string>)[activeFault.kind] : ({dns:"Repair the invalid DNS server, then test hostname resolution again.",adapter:"Re-enable the affected network interface, then verify connectivity.",gateway:"Restore a valid default gateway and verify off-subnet connectivity.",service:"Start the stopped required service and confirm it remains running.",disk:"Reclaim enough safe storage to bring usage below the warning threshold.",account:"Use an administrative account-management tool to enable the affected user, then verify the account state.",driver:"The adapter reports a driver start failure. Restore the previous working driver, then verify the adapter and connectivity."} as Record<string,string>)[activeFault.kind];

  const gaylGuide: [string,string,AppId][] = activeJobScenario ? activeJobScenario.hints.map((hint, index) => [index === 0 ? "Investigate" : index === activeJobScenario.hints.length - 1 ? "Repair and verify" : "Narrow the cause", hint, "terminal" as AppId]) : activeFault ? ({
    dns: [
      ["Confirm the symptom","Open Network settings. First confirm the adapter is connected and has an IP address. Do not change anything yet.","network"],
      ["Inspect DNS","Look at the configured DNS servers. A bad DNS setting can break names while the network itself still works.","network"],
      ["Repair the cause","Open Edit IP assignment. Restore a valid DNS server, or use DHCP if that is appropriate for this workstation.","network"],
      ["Verify it","Test the fix, then use Verify fix. The goal is to prove name resolution works, not just change a setting.","terminal"]
    ],
    adapter: [["Confirm the symptom","Open Network settings and confirm the primary adapter is disabled or disconnected.","network"],["Inspect the adapter","Check the adapter state before changing IP or DNS settings.","network"],["Restore the link","Enable the affected network interface.","network"],["Verify it","Confirm the interface is up and then verify the ticket.","terminal"]],
    gateway: [["Confirm the scope","Inspect the current IP configuration. Local access with remote failure points toward routing.","network"],["Inspect the route","Find the default gateway and confirm whether it is missing.","network"],["Repair the route","Edit the IP configuration and restore the correct default gateway, or use DHCP.","network"],["Verify it","Confirm the gateway is present and test connectivity before verifying.","terminal"]],
    service: [["Confirm the symptom","Open Services and identify the service related to the failed feature.","services"],["Inspect before changing","Check whether the required service is stopped and note its current startup state.","services"],["Restore the service","Start the stopped service. Watch its status to make sure it remains running.","services"],["Verify it","Return to the reported feature and verify the ticket after the service is running.","services"]],
    disk: [["Confirm the symptom","Open Disk Management and inspect disk usage before deleting anything.","storage"],["Find the pressure","Confirm the system volume is critically low on free space.","storage"],["Reclaim safe space","Use the training cleanup action to remove temporary data without touching user files.","storage"],["Verify it","Confirm usage is below the warning threshold, then verify the ticket.","storage"]],
    account: [["Confirm the user","Open Local Users and Groups and find the account named in the incident.","accounts"],["Inspect account state","Check whether that account is locked or disabled. Avoid changing unrelated accounts.","accounts"],["Restore access","Unlock or enable the affected account.","accounts"],["Verify it","Confirm the account now shows Enabled, then verify the ticket.","accounts"]],
    driver: [["Confirm the symptom","Open Device Manager and inspect Network adapters.","hardware"],["Read the device status","Select the affected adapter and confirm the driver/device error before changing it.","hardware"],["Restore the driver","Use Roll Back Driver to return to the known-working simulated driver.","hardware"],["Verify it","Confirm the adapter is healthy and network connectivity returns, then verify the ticket.","network"]]
  } as Record<string,[string,string,AppId][]>) [activeFault.kind] : [];
  const beginGaylWalkthrough = () => { if(!activeFault && !activeJobScenario) return; setGaylWalkthrough(true); setGaylStep(0); setGaylStepChecked(false); setGaylIndependent(false); setGaylWhyOpen(false); setGaylIndependentChecks([]); setGaylHypothesis(""); setGaylFeedback("I’ll guide one decision at a time. Do the step, inspect the result, then check it with me."); setGaylHelpLevel(3); recordEvidence("GAYL guided walkthrough started"); };
  const gaylOpenStep = () => { const step=gaylGuide[gaylStep]; if(step?.[2]) launch(step[2]); recordEvidence(`GAYL guided learner to ${step?.[2] ?? "diagnostic surface"}`); };
  const gaylStepSatisfied = () => { if(activeJobScenario) { if(gaylStep < gaylGuide.length-1) return Boolean(desktopScenarioAttempt && desktopScenarioAttempt.transcript.length >= gaylStep + 1); return repairReady; } if(!activeFault) return false; const iface=primaryInterface(machine); if(gaylStep===0) return ticketEvidence.length>1 || openApp===gaylGuide[gaylStep]?.[2]; if(gaylStep===1) return openApp===gaylGuide[gaylStep]?.[2] || ticketEvidence.some(e=>e.includes("inspected")); if(gaylStep===2) return trainingFaultResolved(faultMachine,activeFault); return trainingFaultResolved(faultMachine,activeFault); };
  const checkGaylStep = () => { const ok=gaylStepSatisfied(); setGaylStepChecked(true); recordEvidence(`GAYL checked guided step ${gaylStep+1}: ${ok?"complete":"not complete"}`); };
  const advanceGaylStep = () => { if(gaylStep < gaylGuide.length-1) { setGaylStep(s=>s+1); setGaylStepChecked(false); setGaylWhyOpen(false); } };
  const restartAfterGayl = () => {
    if(!activeTicket || !ticketBaseline.current) return;
    const targetOs=ticketBaseline.current.os;
    if (activeJobScenario) {
      const cleanJob = buildScenarioMachine(activeJobScenario);
      const nextAttempt = createTerminalAttempt(activeJobScenario, "challenge");
      const linked = { ...nextAttempt, machine: cleanJob };
      setOsMachines(current=>syncVirtualEnvironment({...current,[targetOs]:cleanJob},virtualEnvironment));
      setDesktopScenarioAttempt(linked);
      actions.addTerminalAttempt(linked);
      setDesktopScenarioResult(null);
      setDesktopScenarioReasoning("");
      setTicketVerified(false);
      setTicketEvidence(["Guided practice completed","Problem restarted for independent attempt"]);
      setGaylWalkthrough(false);
      setGaylStep(0);
      setGaylStepChecked(false);
      setGaylIndependent(true);
      setGaylHelpLevel(0);
      setPcOs(activeTicket.reporterOs ?? targetOs);
      setOpenApp("terminal");
      return;
    }
    if (!activeTicket.fault) return;
    const clean=clone(ticketBaseline.current.machine);
    const fault=injectTrainingFault(clean,activeTicket.fault);
    setOsMachines(current=>syncVirtualEnvironment({...current,[targetOs]:clean},virtualEnvironment));
    setActiveFault(fault); setTicketVerified(false); setTicketEvidence(["Guided practice completed","Problem restarted for independent attempt"]); setGaylWalkthrough(false); setGaylStep(0); setGaylStepChecked(false); setGaylWhyOpen(false); setGaylIndependentChecks([]); setGaylHypothesis(""); setGaylFeedback("Your turn. I’ll watch the evidence trail and only intervene if you ask."); setGaylIndependent(true); setGaylHelpLevel(0); setPcOs(activeTicket.reporterOs ?? targetOs); setOpenApp(null); setTerminalLines([]);
  };

  const gaylWhy = activeJobScenario ? activeJobScenario.explanation : activeFault ? ({dns:"DNS translates names into addresses. Checking the adapter first separates a name-resolution problem from a broader connectivity failure.",adapter:"An interface that is down cannot carry traffic. Confirming link state before changing addressing prevents unnecessary configuration changes.",gateway:"The default gateway is the path to destinations outside the local subnet. A workstation can look locally healthy while off-subnet traffic fails when that route is missing.",service:"A reachable computer can still fail to provide an application when the required service is stopped. Separating host reachability from service availability narrows the fault.",disk:"Critically low free space can disrupt updates, logs, temporary files, and applications. Confirm usage before deleting data so the repair is targeted and safe.",account:"Authentication failures can be isolated to one account. Confirming the affected identity and its state avoids changing the whole machine for a user-specific problem.",driver:"The operating system depends on a working driver to communicate with the network device. Device status helps distinguish driver failure from IP configuration problems."} as Record<string,string>)[activeFault.kind] : "";
  const independentMilestones = activeFault ? ({dns:["Inspect network configuration","Check DNS or name resolution","Correct DNS","Verify hostname resolution"],adapter:["Inspect adapter state","Enable the adapter","Test connectivity"],gateway:["Inspect IP configuration","Check the default route","Restore the gateway","Test off-subnet connectivity"],service:["Identify the affected service","Inspect service status","Start the service","Verify the feature"],disk:["Inspect disk usage","Identify storage pressure","Reclaim safe space","Confirm healthy free space"],account:["Identify the affected account","Inspect account state","Restore the account","Verify access"],driver:["Inspect Device Manager","Read device status","Restore the working driver","Verify network connectivity"]} as Record<string,string[]>)[activeFault.kind] ?? [] : [];
  const markIndependentCheck = (item:string) => setGaylIndependentChecks(current=>current.includes(item)?current:[...current,item]);

  const hypothesisOptions: {value:string;label:string}[] = [{value:"dns",label:"DNS / name resolution"},{value:"adapter",label:"Network adapter / link"},{value:"gateway",label:"Default gateway / routing"},{value:"service",label:"Required service"},{value:"disk",label:"Storage capacity"},{value:"account",label:"User account state"},{value:"driver",label:"Device driver"}];
  const checkHypothesis = (value:string) => { setGaylHypothesis(value); if(!activeFault) return; if(value===activeFault.kind) setGaylFeedback("That hypothesis fits the fault. Now prove it with evidence before repairing it."); else setGaylFeedback("Possible, but the evidence does not support that as the root cause yet. Re-check the symptom and the most relevant system state."); recordEvidence("Learner hypothesis: "+value); };
  const gaylProgress = gaylWalkthrough ? Math.round(((gaylStep + (gaylStepSatisfied()?1:0))/Math.max(1,gaylGuide.length))*100) : gaylIndependent ? Math.round((gaylIndependentChecks.length/Math.max(1,independentMilestones.length))*100) : 0;
  const gaylStatus = ticketResolved ? "Verified" : repairReady ? "Repair detected — verify it" : gaylWalkthrough ? "Guided practice" : gaylIndependent ? "Independent attempt" : "Available when you need help";

  const desktopScenarios: TerminalScenario[] = [];
  const selectedDesktopScenario = terminalScenarios.find((scenario) => scenario.id === desktopScenarioId);

  const startDesktopScenario = (scenario: TerminalScenario, mode: TerminalMode = desktopScenarioMode) => {
    const attempt = createTerminalAttempt(scenario, mode);
    actions.addTerminalAttempt(attempt);
    setDesktopScenarioId(scenario.id); setDesktopScenarioMode(mode); setDesktopScenarioAttempt(attempt);
    setDesktopScenarioReasoning(""); setDesktopScenarioResult(null); setTerminalLines([]);
    setOsMachines(current => syncVirtualEnvironment({ ...current, [pcOs]: attempt.machine }, virtualEnvironment));
    setOpenApp("terminal"); recordEvidence(`Terminal scenario started: ${scenario.title}`);
  };
  const runDesktopScenarioCommand = () => {
    if (!desktopScenarioAttempt || !terminalInput.trim() || desktopScenarioAttempt.status === "submitted") return;
    const next = runTerminalCommand({ ...desktopScenarioAttempt, machine }, terminalInput);
    setDesktopScenarioAttempt(next); actions.updateTerminalAttempt(next); saveMachine(next.machine);
    recordEvidence(`Terminal: ${terminalInput.trim()}`); setTerminalInput("");
  };
  const submitDesktopScenario = () => {
    if (!desktopScenarioAttempt || !selectedDesktopScenario || desktopScenarioAttempt.transcript.length === 0) return;
    const draft = { ...desktopScenarioAttempt, machine, reasoning: desktopScenarioReasoning, updatedAt: new Date().toISOString() };
    const result = evaluateTerminalAttempt(selectedDesktopScenario, draft);
    const finished: TerminalAttempt = { ...draft, status:"submitted", score:result.score, objectiveScore:result.objectiveScore, processScore:result.processScore, efficiencyScore:result.efficiencyScore, misconceptions:result.misconceptions, submittedAt:new Date().toISOString() };
    setDesktopScenarioAttempt(finished); setDesktopScenarioResult(result); actions.updateTerminalAttempt(finished);
    actions.addLearnerSignal({ topicId:selectedDesktopScenario.topicId, kind:"terminal", correct:result.score>=70, score:result.score/100 });
    if(result.score<70) actions.ensureReview({topicId:selectedDesktopScenario.topicId});
    recordEvidence(`Terminal scenario checked: ${result.score}%`);
  };
  const exitDesktopScenario = () => { setDesktopScenarioAttempt(null); setDesktopScenarioResult(null); setDesktopScenarioReasoning(""); setTerminalLines([]); };

  const runEmbeddedTerminal = () => {
    if (desktopScenarioAttempt) return runDesktopScenarioCommand();
    const command = terminalInput.trim();
    if (!command) return;
    const before = prompt(machine);
    const result = execute(machine, command);
    saveMachine(result.state);
    setTerminalLines((lines) => [...lines, `${before}${command}`, result.output].filter(Boolean).slice(-120));
    recordEvidence(`Terminal: ${command}`);
    setTerminalInput("");
  };

  const pearNavigate = (target: "home" | "desktop" | "documents" | "downloads" | "root") => {
    const map = {
      home: ["Users", machine.currentUser],
      desktop: ["Users", machine.currentUser, "Desktop"],
      documents: ["Users", machine.currentUser, "Documents"],
      downloads: ["Users", machine.currentUser, "Downloads"],
      root: [],
    } as const;
    setFolder([...map[target]]);
    setOpenApp("files");
    setStartOpen(false);
    setPearMenu(null);
  };
  const pearMenuAction = (action: string) => {
    if (action === "new-folder") { setOpenApp("files"); setDraftName("New Folder"); setPearNotice("Name the folder, then choose New Folder."); }
    else if (action === "new-file") { setOpenApp("files"); setDraftName("Untitled"); setPearNotice("Name the document, then choose New File."); }
    else if (action === "copy" && contextItem) copyItem(false);
    else if (action === "paste") pasteItem();
    else if (action === "icons") { setPearView("icons"); setPearNotice("Grove switched to icon view."); }
    else if (action === "list") { setPearView("list"); setPearNotice("Grove switched to list view."); }
    else if (action === "settings") launch("settings");
    else if (action === "terminal") launch("terminal");
    else if (action === "maximize") setPearWindowMaximized(true);
    else if (action === "restore") setPearWindowMaximized(false);
    else if (action === "close") appBack();
    setPearMenu(null);
  };

  const switchOs = (next: PcOs) => {
    setPcOs(next);
    setWindowsSettingsView("home");
    setFolder(next === "windows" ? ["Users", "student"] : next === "mac" ? ["Users", "student"] : ["home", "student"]);
    setTerminalLines([]);
    setDesktopScenarioAttempt(null);
    setDesktopScenarioResult(null);
    setDesktopScenarioId("");
    setOpenApp(null);
    setStartOpen(false);
  };

  const addEvent = (next: MachineState, message: string) => { next.eventLog = [...(next.eventLog ?? []), message].slice(-250); };
  const endProcess = (pid: number) => {
    const process = machine.processes.find((item) => item.pid === pid);
    if (!process) return;
    const application = applicationForProcess(process.name);
    const service = machine.services.find((item) => (item.processName ?? item.name).toLowerCase().replace(/\.exe$/, "") === process.name.toLowerCase().replace(/\.exe$/, ""));
    recordEvidence(`GUI: ended process ${process.name} PID ${pid}`);
    const next = clone(machine);
    const result = killProcess(next, String(pid));
    if (result) {
      addEvent(next, `Process PID ${pid} could not be ended: ${result}.`);
      saveMachine(next);
      return;
    }
    if (application) {
      addEvent(next, `${application.name} was terminated from the process manager (PID ${pid}).`);
      next.systemEvents ??= [];
      next.systemEvents.unshift({ at:new Date().toISOString(), level:"warning", source:pcOs==="windows"?"Application Error":pcOs==="linux"?"systemd-coredump":"ReportCrash", eventId:1000, channel:"application", message:`${application.name} was terminated by ${next.currentUser}.` });
      if (openApp === application.id) setOpenApp(null);
    } else if (service) {
      addEvent(next, `Service process ${process.name} ended; ${service.name} is now stopped.`);
    } else {
      addEvent(next, `Process ${process.name} PID ${pid} ended by ${next.currentUser}.`);
    }
    reconcilePrintQueue(next, { ...osMachines, [pcOs]: next }, virtualEnvironment);
    saveMachine(next);
  };
  const toggleService = (name: string, running: boolean) => { mutate((next) => { const result=setServiceStatus(next,name,running?"stopped":"running"); if(result.error){ addEvent(next,`Service ${name} action failed: ${result.reason??result.error}.`); recordEvidence(`GUI: service ${name} action failed (${result.error})`); return; } addEvent(next,`Service ${name} ${running?"stopped":"started"} by ${next.currentUser}.`); recordEvidence(`GUI: ${running?"stopped":"started"} service ${name}`); }); };
  const toggleNetwork = () => { const iface = primaryInterface(machine); if (!iface) return; recordEvidence(`GUI: ${iface.up ? "disabled" : "enabled"} network interface ${iface.name}`); mutate((next) => { const before = observeTrainingNetwork(next); const updated = applyTrainingNetworkAction(next, { type: "set-interface", name: iface.name, up: !iface.up }); Object.assign(next, updated); const after = observeTrainingNetwork(next); addEvent(next, `Network interface ${iface.name} changed to ${!iface.up ? "up" : "down"}. ${after.summary}.`); if (before.state !== after.state) { next.systemEvents ??= []; next.systemEvents.unshift({ at:new Date().toISOString(), level:after.state==="online"?"information":"warning", source:pcOs==="windows"?"NetworkProfile":pcOs==="linux"?"NetworkManager":"configd", eventId:after.state==="online"?10000:10001, channel:"system", message:`Network state changed: ${before.summary} → ${after.summary}.` }); } reconcilePrintQueue(next, { ...osMachines, [pcOs]: next }, virtualEnvironment); }); };
  const beginNetworkEdit = () => { const net = observeTrainingNetwork(machine); recordEvidence("GUI: inspected network configuration"); setNetIp(net.address); setNetMask(net.mask); setNetGateway(net.gateway); setNetDns(net.dnsServers.join(", ")); setNetworkEditing(true); };
  const saveNetwork = (dhcp: boolean) => { recordEvidence(`GUI: saved network configuration (${dhcp ? "DHCP" : "manual"})`); mutate((next) => { const iface = primaryInterface(next); if (!iface) return; let updated = applyTrainingNetworkAction(next, dhcp ? { type: "set-interface", name: iface.name, dhcp: true, ip: "10.0.0.54", mask: "255.255.255.0", gateway: "10.0.0.1" } : { type: "set-interface", name: iface.name, dhcp: false, ip: netIp.trim() || iface.ip, mask: netMask.trim() || iface.mask, gateway: netGateway.trim() }); updated = applyTrainingNetworkAction(updated, { type: "set-dns", servers: dhcp ? ["10.0.0.10"] : netDns.split(",").map(v => v.trim()).filter(Boolean) }); Object.assign(next, updated); reconcilePrintQueue(next, { ...osMachines, [pcOs]: next }, virtualEnvironment); const after = observeTrainingNetwork(next); addEvent(next, `${pcOs === "windows" ? "TCP/IP" : pcOs === "linux" ? "Network interface" : "Network service"} configuration updated (${dhcp ? "DHCP" : "manual"}): ${after.summary}.`); }); };

  const addAccount = () => {
    if (!canManageAccounts(machine)) { recordEvidence("GUI: account creation denied — administrator access required"); return; }
    const name = accountName.trim().replace(/\s+/g, "").toLowerCase();
    if (!name || machine.users.some((u) => u.name.toLowerCase() === name)) return;
    mutate((next) => {
      next.users.push({ name, fullName: accountName.trim(), groups: pcOs === "windows" ? ["Users"] : ["users"], admin: false, locked: false, passwordExpired: false });
      makeDir(next, pcOs === "windows" ? `C:\\Users\\${name}` : pcOs === "mac" ? `/Users/${name}` : `/home/${name}`);
      addEvent(next, `User account ${name} created.`);
    });
    setAccountName("");
  };
  const toggleAdmin = (name: string) => {
    const current = machine.users.find((u) => u.name === name);
    if (!current) return;
    if (!canManageAccounts(machine)) { recordEvidence(`GUI: administrator change denied for ${name}`); return; }
    recordEvidence(`GUI: changed administrator access for ${name}`);
    mutate((next) => {
      const error = setAccountAdmin(next, name, !current.admin);
      if (!error) addEvent(next, `Account ${name} administrator access ${current.admin ? "removed" : "enabled"}.`);
    });
  };
  const toggleLock = (name: string) => {
    const current = machine.users.find((u) => u.name === name);
    if (!current) return;
    if (!canManageAccounts(machine)) { recordEvidence(`GUI: account lock change denied for ${name}`); return; }
    recordEvidence(`GUI: ${current.locked ? "unlocked" : "locked"} account ${name}`);
    mutate((next) => {
      const error = setAccountLocked(next, name, !current.locked);
      if (!error) addEvent(next, `Account ${name} ${current.locked ? "unlocked" : "locked"}.`);
    });
  };

  const repairNetworkDriver = () => {
    recordEvidence("GUI: rolled back network adapter driver");
    mutate((next) => { next.networkDriverHealthy = true; const iface = primaryInterface(next); if (iface) iface.up = true; addEvent(next, `Network adapter driver rolled back successfully; ${iface?.name ?? "adapter"} started.`); });
  };

  const hardwareGroups = useMemo(() => {
    const iface = primaryInterface(machine);
    if (pcOs === "windows") return [
      { group: "Processors", items: [{ name: "IT PATH Virtual CPU", detail: "4 cores · 8 logical processors", status: "Working properly" }] },
      { group: "Disk drives", items: [{ name: "Virtual NVMe SSD", detail: `${machine.diskUsedPercent}% used`, status: "Working properly" }] },
      { group: "Network adapters", items: [{ name: iface?.name ?? "Ethernet Adapter", detail: machine.networkDriverHealthy===false ? "Driver version 3.2.1 · This device cannot start. (Code 10)" : iface?.up ? iface.ip : "Disabled", status: machine.networkDriverHealthy===false ? "⚠ Driver error" : iface?.up ? "Working properly" : "Device disabled" }] },
      { group: "Memory", items: [{ name: "System memory", detail: `${machine.memoryTotalMb} MB installed`, status: "Working properly" }] },
    ];
    if (pcOs === "linux") return [
      { group: "CPU", items: [{ name: "Virtual x86_64 Processor", detail: "4 cores · 8 threads", status: "online" }] },
      { group: "Block Devices", items: [{ name: "/dev/nvme0n1", detail: `${machine.diskUsedPercent}% filesystem used`, status: "mounted" }] },
      { group: "Network", items: [{ name: iface?.name ?? "ens33", detail: iface?.up ? iface.ip : "link down", status: iface?.up ? "UP" : "DOWN" }] },
      { group: "Memory", items: [{ name: "RAM", detail: `${machine.memoryUsedMb} / ${machine.memoryTotalMb} MB used`, status: "available" }] },
    ];
    return [
      { group: "Hardware Overview", items: [{ name: "Processor", detail: "PathSilicon virtual training CPU", status: "Normal" }, { name: "Memory", detail: `${machine.memoryTotalMb} MB`, status: "Normal" }] },
      { group: "Storage", items: [{ name: "Virtual SSD", detail: `${machine.diskUsedPercent}% used`, status: "S.M.A.R.T. status: Verified" }] },
      { group: "Network", items: [{ name: iface?.name ?? "en0", detail: iface?.up ? iface.ip : "Inactive", status: iface?.up ? "Active" : "Inactive" }] },
    ];
  }, [machine, pcOs]);

  const networkEditorPanel = (accent: "linux" | "mac") => networkEditing ? <div className={cn("mt-4 rounded-xl border bg-white p-4",accent==="mac"?"border-black/10":"border-black/10 shadow-sm")}><div className="mb-3 flex items-center justify-between"><div><b className="text-sm">{accent==="mac"?"TCP/IP & DNS":"IPv4 Settings"}</b><p className="text-[10px] text-slate-500">Changes apply to the simulated interface and terminal immediately.</p></div><button onClick={()=>setNetworkEditing(false)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Cancel</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-500">IP address<input value={netIp} onChange={e=>setNetIp(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 font-mono text-xs"/></label><label className="text-xs text-slate-500">Subnet mask<input value={netMask} onChange={e=>setNetMask(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 font-mono text-xs"/></label><label className="text-xs text-slate-500">{accent==="mac"?"Router":"Gateway"}<input value={netGateway} onChange={e=>setNetGateway(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 font-mono text-xs"/></label><label className="text-xs text-slate-500">DNS servers<input value={netDns} onChange={e=>setNetDns(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 font-mono text-xs"/></label></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>{saveNetwork(false);setNetworkEditing(false)}} className={cn("rounded-lg px-3 py-2 text-xs font-semibold text-white",accent==="linux"?"bg-[#e95420]":"bg-blue-500")}>Apply</button><button onClick={()=>{saveNetwork(true);setNetworkEditing(false)}} className="rounded-lg border px-3 py-2 text-xs">Use DHCP</button></div></div> : null;

  const restartWorkstation = () => {
    const next = clone(machine);
    ensureWorkstationState(next);
    if (pcOs === "windows") {
      const startupProcesses = [
        { app: "OneDrive", name: "OneDrive.exe", memoryMb: 118, cpu: 0.4 },
        { app: "Teams", name: "ms-teams.exe", memoryMb: 286, cpu: 1.1 },
        { app: "Windows Security notification icon", name: "SecurityHealthSystray.exe", memoryMb: 32, cpu: 0.1 },
      ];
      const startupNames = new Set(startupProcesses.map((item) => item.name));
      next.processes = next.processes.filter((proc) => proc.user !== next.currentUser || !startupNames.has(proc.name));
      for (const item of startupProcesses) {
        const enabled = next.startupApps?.find((app) => app.name === item.app)?.enabled;
        if (!enabled) continue;
        next.processes.push({ pid: next.nextPid++, name: item.name, user: next.currentUser, cpu: item.cpu, memoryMb: item.memoryMb });
      }
      next.memoryUsedMb = Math.min(next.memoryTotalMb, Math.max(512, next.processes.reduce((sum, proc) => sum + proc.memoryMb, 0)));
      completeWindowsUpdateRestart(next);
    }
    bootServices(next);
    next.bootCount = (next.bootCount ?? 1) + 1;
    next.lastBootAt = new Date().toISOString();
    addEvent(next, `Workstation restarted. Boot #${next.bootCount}.`);
    saveMachine(next);
    recordEvidence(`GUI: ${pcOs} workstation restarted`);
    setOpenApp(null);
    setStartOpen(false);
    setTerminalLines([]);
    setFolder(homeFolder(pcOs));
  };

  const shutDownWorkstation = () => {
    const next = clone(machine);
    addEvent(next, "Workstation shut down from the operating system menu.");
    saveMachine(next);
    recordEvidence(`GUI: ${pcOs} workstation shut down`);
    setOpenApp(null);
    setStartOpen(false);
    setTerminalLines([]);
  };


  const launch = (app: AppId) => {
    if (trainingApplications.some((item) => item.id === app)) {
      if (!applicationInstalled(app as TrainingApplicationId, pcOs)) return;
      const next = clone(machine);
      const nextMachines = { ...osMachines, [pcOs]: next };
      const result = launchTrainingApplication(app as TrainingApplicationId, next, nextMachines, virtualEnvironment);
      saveMachine(next);
      recordEvidence(`GUI: opened ${trainingApplications.find((item) => item.id === app)?.name ?? app} — ${result.health}`);
    }
    setOpenApp(app);
    setStartOpen(false);
    if (app === "settings" && pcOs === "windows") {
      setDeviceNameDraft(machine.hostname);
      setFirewallDraft(machine.firewallEnabled);
    }
  };
  const renameWorkstation = () => {
    const name = deviceNameDraft.trim().replace(/[^a-zA-Z0-9-]/g, "").slice(0, 15);
    if (!name || name === machine.hostname) return;
    mutate((next) => {
      const previous = next.hostname;
      next.hostname = name;
      next.restartRequired = true;
      addEvent(next, `Computer rename requested: ${previous} → ${name}. Restart required.`);
    });
    setDeviceNameDraft(name);
    recordEvidence("GUI: renamed Windows workstation; restart required");
  };
  const applyFirewall = () => {
    mutate((next) => {
      next.firewallEnabled = firewallDraft;
      addEvent(next, `Windows Defender Firewall turned ${firewallDraft ? "on" : "off"}.`);
    });
    recordEvidence(`GUI: Windows firewall turned ${firewallDraft ? "on" : "off"}`);
  };
  const homeFolder = (os: PcOs = pcOs) => os === "windows" ? ["Users","student"] : os === "mac" ? ["Users","student"] : ["home","student"];
  const navigateFiles = (place: string) => {
    const home = homeFolder();
    if (place === "Home") setFolder(home);
    else if (place === "This PC") setFolder([]);
    else if (place === "Recent" || place === "Starred" || place === "AirDrop" || place === "Applications" || place === "Trash") setFolder(home);
    else setFolder([...home, place]);
  };
  const appBack = () => {
    if (openApp === "files" && folder.length > 0) return setFolder(x=>x.slice(0,-1));
    if (openApp === "settings" && pcOs === "windows" && windowsSettingsView !== "home") return setWindowsSettingsView("home");
    if (openApp === "control" && controlView !== "home") return setControlView("home");
    if (openApp && trainingApplications.some((item) => item.id === openApp)) {
      const next = clone(machine);
      stopTrainingApplication(openApp as TrainingApplicationId, next);
      saveMachine(next);
      recordEvidence(`GUI: closed ${trainingApplications.find((item) => item.id === openApp)?.name ?? openApp}`);
    }
    setOpenApp(null);
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[#071426] text-white select-none [-webkit-touch-callout:none] overscroll-none">
      <div className={cn("absolute inset-0", pcOs === "windows" && (windowsTheme==="dark" ? "bg-[radial-gradient(circle_at_72%_18%,rgba(38,140,255,.34),transparent_32%),linear-gradient(145deg,#061426_0%,#0b2140_50%,#174c82_100%)]" : "bg-[radial-gradient(circle_at_72%_18%,rgba(56,189,248,.30),transparent_32%),linear-gradient(145deg,#dbeafe_0%,#e0f2fe_50%,#f8fafc_100%)]"), pcOs === "linux" && "bg-[radial-gradient(circle_at_24%_20%,rgba(233,84,32,.34),transparent_30%),radial-gradient(circle_at_78%_72%,rgba(119,33,111,.42),transparent_36%),linear-gradient(145deg,#2c0e37,#4b164f_48%,#1d1028)]", pcOs === "mac" && "bg-[radial-gradient(ellipse_at_68%_22%,rgba(170,255,120,.30),transparent_25%),radial-gradient(circle_at_24%_76%,rgba(80,190,255,.30),transparent_34%),radial-gradient(circle_at_78%_78%,rgba(255,214,102,.18),transparent_28%),linear-gradient(145deg,#102c3f,#24526b_46%,#315f4d)]")} />
      
      {practiceMode?<div className="absolute bottom-20 left-3 z-40 rounded-xl border border-emerald-300/30 bg-[#0d1b2e]/95 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-xl backdrop-blur-xl sm:left-4">Practice lab</div>:null}\n      <button onClick={()=>setTicketOpen(v=>!v)} className="absolute bottom-20 right-3 z-40 rounded-xl border border-cyan-300/30 bg-[#0d1b2e]/95 px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur-xl sm:right-4">Tickets{activeTicket ? ` · ${activeTicket.id.replace("ticket-","")}` : ""}</button>
      {ticketOpen ? <div className="absolute bottom-32 right-3 z-50 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#0d1b2e]/95 shadow-2xl backdrop-blur-2xl sm:right-4"><div className="flex items-center justify-between border-b border-white/10 p-4"><div><b>Help Desk Queue</b><p className="text-xs text-slate-400">Diagnose from symptoms. The cause is hidden.</p></div><div className="flex items-center gap-2"><button onClick={resetVirtualLab} className="rounded border border-red-300/25 px-2 py-1 text-[10px] text-red-200">Reset lab</button><button onClick={()=>setTicketOpen(false)}><X className="size-4"/></button></div></div>{activeTicket ? <div className="p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-cyan-300">#{activeTicket.id.replace("ticket-","")}</span><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold",ticketResolved?"bg-emerald-500/20 text-emerald-300":"bg-amber-500/20 text-amber-200")}>{ticketResolved?"Resolved":"Open"}</span></div><h3 className="font-semibold">{activeTicket.title}</h3><p className="mt-1 text-xs text-slate-400">{activeTicket.requester} · {activeTicket.environment}</p><p className="mt-3 text-sm leading-6 text-slate-200">{activeTicket.brief}</p><div className="mt-4 rounded-xl bg-white/5 p-3"><b className="text-xs">Verification</b>{activeTicket.verification.map(item=><p key={item} className="mt-1 text-xs text-slate-300">• {item}</p>)}</div><div className="mt-3 overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-500/15 to-violet-500/5 shadow-lg"><div className="border-b border-violet-300/10 p-3"><div className="flex items-center justify-between gap-3"><div><b className="text-sm text-violet-100">GAYL Coach</b><p className="mt-0.5 text-[10px] text-violet-200/70">{gaylStatus}</p></div><span className="rounded-full bg-violet-300/10 px-2 py-1 text-[9px] text-violet-200">{gaylWalkthrough?"Teaching":gaylIndependent?"Standing by":"Optional help"}</span></div>{(gaylWalkthrough||gaylIndependent)?<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-violet-400 transition-all duration-300" style={{width: gaylProgress+"%"}}/></div>:null}</div><div className="p-3">{gaylIndependent?<div className="mb-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2"><b className="text-[10px] text-emerald-300">YOUR TURN</b><p className="mt-1 text-xs text-slate-200">Same problem, fresh start. Solve it without the walkthrough. GAYL will stay quiet unless you ask for a hint.</p><p className="mt-2 text-[10px] text-emerald-200/80">No checklist this time. Diagnose it in the order that makes sense to you.</p></div>:null}<div className="flex items-center justify-between gap-2"><b className="text-xs text-violet-200">GAYL</b>{!gaylWalkthrough?<div className="flex gap-1"><button onClick={gaylHelp} className="rounded-lg border border-violet-300/30 px-2 py-1 text-[10px] text-violet-100">Give me a hint</button><button onClick={beginGaylWalkthrough} className="rounded-lg bg-violet-400 px-2 py-1 text-[10px] font-semibold text-slate-950">Walk me through it</button></div>:<span className="text-[10px] text-violet-200">Guided practice · {gaylStep+1}/{gaylGuide.length}</span>}</div>{gaylWalkthrough?<div className="mt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">{gaylGuide[gaylStep]?.[0]}</p><p className="mt-1 text-xs leading-5 text-slate-100">{gaylGuide[gaylStep]?.[1]}</p><button onClick={()=>setGaylWhyOpen(v=>!v)} className="mt-2 text-[10px] font-semibold text-violet-200">{gaylWhyOpen?"Hide why":"Why am I doing this?"}</button>{gaylWhyOpen?<p className="mt-2 rounded-lg bg-black/20 p-2 text-[10px] leading-4 text-slate-300">{gaylWhy}</p>:null}<div className="mt-3 flex flex-wrap gap-2"><button onClick={gaylOpenStep} className="rounded-lg border border-violet-300/30 px-2 py-1.5 text-[10px] text-violet-100">Take me there</button><button onClick={checkGaylStep} className="rounded-lg border border-violet-300/30 px-2 py-1.5 text-[10px] text-violet-100">Check my step</button>{gaylStepChecked&&!gaylStepSatisfied()?<span className="w-full text-[10px] text-amber-200">Not quite yet. Stay on this step and check the evidence before moving on.</span>:null}{gaylStep<gaylGuide.length-1?<button onClick={advanceGaylStep} disabled={!gaylStepSatisfied()} className="rounded-lg bg-violet-400 px-2 py-1.5 text-[10px] font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Next step</button>:repairReady?<button onClick={restartAfterGayl} className="rounded-lg bg-emerald-400 px-2 py-1.5 text-[10px] font-semibold text-slate-950">Restart it — I’ll do it myself</button>:<button onClick={gaylOpenStep} className="rounded-lg bg-violet-400 px-2 py-1.5 text-[10px] font-semibold text-slate-950">Finish the repair first</button>}</div></div>:<><p className="mt-2 text-xs leading-5 text-slate-200">{gaylMessage}</p><p className="mt-2 text-[10px] text-slate-400">Hints are recorded. Guided mode teaches the repair, then restarts the problem for an independent attempt.</p></>}</div></div><details className="mt-3 rounded-xl bg-white/5 p-3"><summary className="cursor-pointer text-xs font-semibold">Troubleshooting evidence · {ticketEvidence.length}</summary><div className="mt-2 max-h-28 overflow-y-auto">{ticketEvidence.map((item,index)=><p key={index} className="mt-1 text-[10px] text-slate-400">{index+1}. {item}</p>)}</div></details><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={cancelTicket} className="rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">Cancel ticket</button>{ticketResolved?<button onClick={closeTicket} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950">Close resolved ticket</button>:<button onClick={verifyTicket} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">Verify fix</button>}</div></div> : <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">{helpDeskTickets.filter(ticket=>ticket.surfaces.includes("virtual-pc")||ticket.shells.some(shell=>["cmd","powershell","bash","mac"].includes(shell))).map(ticket=>{const os=ticketOs(ticket);return <button key={ticket.id} onClick={()=>startTicket(ticket.id)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-cyan-400/50"><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-cyan-300">#{ticket.id.replace("ticket-","")} · {ticket.requester}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-300">{os==="windows"?"IT PATH Desktop":os==="linux"?"IT PATH Server":os==="mac"?"PathOS Pear":"Any desktop"} · {ticketDifficulty(ticket)}{ticketScope(ticket)==="cross-machine"?" · network":""}</span></div><p className="mt-1 text-sm font-semibold">{ticket.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-400">{ticket.brief}</p></button>})}</div>}</div> : null}
      {pcOs === "mac" ? <header className="absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-between border-b border-white/10 bg-black/25 px-3 text-xs backdrop-blur-xl"><div className="flex items-center gap-1"><button onClick={()=>setPearMenu(pearMenu==="pathos"?null:"pathos")} className="flex items-center gap-1.5 rounded px-2 py-1 font-semibold text-lime-100 hover:bg-white/10"><span className="grid size-4 place-items-center rounded-[45%_55%_50%_50%] bg-lime-300/90 text-[9px] font-black text-emerald-950">P</span>PathOS Pear</button><button onClick={()=>launch("files")} className="rounded px-2 py-1 font-semibold hover:bg-white/10">Grove</button>{(["File","Edit","View","Go","Window"] as const).map(label=><button key={label} onClick={()=>setPearMenu(pearMenu===label.toLowerCase()?null:label.toLowerCase() as typeof pearMenu)} className="hidden rounded px-2 py-1 hover:bg-white/10 sm:block">{label}</button>)}</div><div className="flex items-center gap-3"><Wifi className={cn("size-3.5",trayNetworkState==="online"?"text-lime-200":trayNetworkState==="offline"?"text-red-300":"text-amber-300")}/><span>{machine.hostname}</span><select value={pcOs} onChange={(e)=>switchOs(e.target.value as PcOs)} className="rounded bg-white/10 px-1 py-0.5 text-[10px]"><option value="windows" className="text-black">IT PATH Desktop</option><option value="linux" className="text-black">IT PATH Server</option><option value="mac" className="text-black">PathOS Pear</option></select></div>{pearMenu?<div className="absolute left-3 top-8 z-50 min-w-48 overflow-hidden rounded-xl border border-white/20 bg-[#173242]/95 p-1.5 text-white shadow-2xl backdrop-blur-2xl">{pearMenu==="pathos"?<><button onClick={()=>pearMenuAction("settings")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">System Settings</button><button onClick={restartWorkstation} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Restart PathOS Pear</button><Link to="/dashboard" className="block rounded-lg px-3 py-2 hover:bg-white/10">Exit Virtual Desktop</Link></>:pearMenu==="file"?<><button onClick={()=>pearMenuAction("new-folder")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">New Folder</button><button onClick={()=>pearMenuAction("new-file")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">New Text File</button><button onClick={()=>pearMenuAction("close")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Close Window</button></>:pearMenu==="edit"?<><button onClick={()=>pearMenuAction("paste")} disabled={!clipboard} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10 disabled:opacity-35">Paste</button><p className="px-3 py-1 text-[10px] text-white/45">Copy and rename are available from an item's context menu.</p></>:pearMenu==="view"?<><button onClick={()=>pearMenuAction("icons")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Icon View {pearView==="icons"?"✓":""}</button><button onClick={()=>pearMenuAction("list")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">List View {pearView==="list"?"✓":""}</button></>:pearMenu==="go"?<><button onClick={()=>pearNavigate("home")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Home</button><button onClick={()=>pearNavigate("desktop")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Desktop</button><button onClick={()=>pearNavigate("documents")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Documents</button><button onClick={()=>pearNavigate("downloads")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Downloads</button><button onClick={()=>pearNavigate("root")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Pear Drive</button></>:<><button onClick={()=>pearMenuAction(pearWindowMaximized?"restore":"maximize")} disabled={!openApp} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10 disabled:opacity-35">{pearWindowMaximized?"Restore Window":"Maximize Window"}</button><button onClick={()=>pearMenuAction("close")} disabled={!openApp} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10 disabled:opacity-35">Close Window</button><button onClick={()=>pearMenuAction("terminal")} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Open Terminal</button></>}</div>:null}</header> : pcOs === "linux" ? <header className="absolute inset-x-0 top-0 z-30 flex h-9 items-center justify-between bg-[#1f1724]/95 px-3 text-xs shadow-sm backdrop-blur-xl"><button onClick={()=>setStartOpen(v=>!v)} className="rounded-md px-3 py-1 font-semibold hover:bg-white/10">Activities</button><div className="absolute left-1/2 -translate-x-1/2 font-medium">IT PATH Server · {openApp?"Workspace":"Desktop"}</div><div className="flex items-center gap-3"><Wifi className={cn("size-3.5",trayNetworkState==="online"?"text-white":trayNetworkState==="offline"?"text-red-300":"text-amber-300")}/><span className="hidden sm:inline">{machine.hostname}</span><select value={pcOs} onChange={(e)=>switchOs(e.target.value as PcOs)} className="rounded bg-white/10 px-1 py-0.5"><option value="windows" className="text-black">IT PATH Desktop</option><option value="linux" className="text-black">IT PATH Server</option><option value="mac" className="text-black">PathOS Pear</option></select></div></header> : <header className="absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 bg-[#071426]/80 px-3 backdrop-blur-xl"><div className="flex min-w-0 items-center gap-2 text-sm font-semibold"><button onClick={appBack} className="mr-1 grid size-7 shrink-0 place-items-center rounded hover:bg-slate-200" aria-label="Back"><ChevronLeft className="size-4"/></button><Monitor className="size-4 text-cyan-300"/>IT PATH Desktop</div><div className="flex items-center gap-2"><select value={pcOs} onChange={(e)=>switchOs(e.target.value as PcOs)} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs"><option value="windows" className="text-black">IT PATH Desktop</option><option value="linux" className="text-black">IT PATH Server</option><option value="mac" className="text-black">PathOS Pear</option></select><Wifi className={cn("size-4",trayNetworkState==="online"?"text-cyan-300":trayNetworkState==="offline"?"text-red-300":"text-amber-300")}/></div></header>}

      <main className={cn("absolute inset-x-0 p-3 sm:p-6",pcOs==="mac"?"bottom-20 top-8":pcOs==="linux"?"bottom-16 top-9":"bottom-14 top-12")}>
        <div className="h-full w-full overflow-x-auto overflow-y-hidden rounded-2xl border border-white/10 bg-black/10 p-2 shadow-inner backdrop-blur-[2px] sm:w-fit sm:max-w-[32rem] sm:p-3"><div className="grid h-full auto-cols-[5.5rem] grid-flow-col grid-rows-[repeat(auto-fit,minmax(4.75rem,1fr))] gap-x-2 gap-y-1 text-center text-xs sm:auto-cols-[6rem] sm:gap-x-3">
          <button onClick={() => launch("browser")} className="rounded-xl p-2 hover:bg-white/10"><Network className="mx-auto mb-1 size-8 text-cyan-300" />Browser</button>
          {applicationInstalled("team-files",pcOs)?<button onClick={() => launch("team-files")} className="rounded-xl p-2 hover:bg-white/10"><FolderOpen className="mx-auto mb-1 size-8 text-blue-300" />Team Files</button>:null}
          <button onClick={() => launch("print-center")} className="rounded-xl p-2 hover:bg-white/10"><ServerCog className="mx-auto mb-1 size-8 text-emerald-300" />Print</button>
          <button onClick={() => launch("files")} className="rounded-xl p-2 hover:bg-white/10"><FolderOpen className="mx-auto mb-1 size-8 text-amber-300" /> {pcOs === "windows" ? "File Explorer" : pcOs === "linux" ? "Files" : "Grove"}</button>
          <button onClick={() => launch("settings")} className="rounded-xl p-2 hover:bg-white/10"><Settings className="mx-auto mb-1 size-8 text-slate-200" /> {pcOs === "linux" ? "System" : "Settings"}</button>
          <button onClick={() => launch("terminal")} className="rounded-xl p-2 hover:bg-white/10"><SquareTerminal className="mx-auto mb-1 size-8 text-cyan-300" />Terminal</button>
          <button onClick={() => launch("processes")} className="rounded-xl p-2 hover:bg-white/10"><Activity className="mx-auto mb-1 size-8 text-emerald-300" />{pcOs === "windows" ? "Task Manager" : "Activity"}</button>
          <button onClick={() => launch("hardware")} className="rounded-xl p-2 hover:bg-white/10"><Cpu className="mx-auto mb-1 size-8 text-violet-300" />{pcOs === "windows" ? "Device Manager" : pcOs === "linux" ? "Hardware" : "System Info"}</button>
          <button onClick={() => launch("logs")} className="rounded-xl p-2 hover:bg-white/10"><ScrollText className="mx-auto mb-1 size-8 text-amber-300" />{pcOs === "windows" ? "Event Viewer" : pcOs === "linux" ? "Logs" : "Console"}</button>
          <button onClick={() => launch("storage")} className="rounded-xl p-2 hover:bg-white/10"><HardDrive className="mx-auto mb-1 size-8 text-cyan-300" />{pcOs === "windows" ? "Disk Management" : pcOs === "linux" ? "Disks" : "Storage Utility"}</button>
          <button onClick={() => launch("accounts")} className="rounded-xl p-2 hover:bg-white/10"><UsersRound className="mx-auto mb-1 size-8 text-sky-300" />{pcOs === "windows" ? "Users" : pcOs === "linux" ? "Users & Groups" : "Users & Groups"}</button>
        </div></div>

        {openApp ? (
          <section className={cn("absolute inset-2 top-2 overflow-hidden border bg-[#f7f9fc] text-slate-900 shadow-2xl sm:inset-x-[8%] sm:inset-y-[5%] lg:inset-x-[16%]",pcOs==="windows"?"rounded-lg border-slate-400/40":pcOs==="linux"?"rounded-xl border-black/20":cn("rounded-2xl border-white/15 transition-all duration-300",pearWindowMaximized&&"!inset-1 !top-1 !bottom-1 sm:!inset-1 lg:!inset-1"))}>
            <div className={cn("relative flex h-11 items-center justify-between border-b px-3",pcOs==="windows"?"border-slate-300 bg-[#f3f6fb]":pcOs==="linux"?"border-black/10 bg-[#f7f6f5]":"border-slate-200/80 bg-white/90 backdrop-blur-xl")}>
              {pcOs==="mac"?<div className="mr-3 flex shrink-0 items-center gap-2" aria-label="PathOS Pear window controls"><button onClick={appBack} className="size-3.5 rounded-full bg-[#ff6258] shadow-inner ring-1 ring-black/10 hover:brightness-95" aria-label="Close window"/><button onClick={()=>setPearNotice("Window minimized. Use the dock to return.")} className="size-3.5 rounded-full bg-[#ffbd2e] shadow-inner ring-1 ring-black/10 hover:brightness-95" aria-label="Minimize window"/><button onClick={()=>setPearWindowMaximized(v=>!v)} className="size-3.5 rounded-full bg-[#28c840] shadow-inner ring-1 ring-black/10 hover:brightness-95" aria-label={pearWindowMaximized?"Restore window":"Maximize window"}/></div>:null}
              <div className={cn("flex items-center gap-2 text-sm font-semibold",pcOs==="mac"&&"min-w-0 flex-1 justify-center pr-16")}>
                {openApp === "browser" ? <Network className="size-4 text-blue-600" /> : openApp === "team-files" ? <FolderOpen className="size-4 text-blue-600" /> : openApp === "print-center" ? <ServerCog className="size-4 text-emerald-600" /> : openApp === "updates" ? <ShieldCheck className="size-4 text-cyan-600" /> : openApp === "files" ? <FolderOpen className="size-4 text-blue-600" /> : openApp === "terminal" ? <SquareTerminal className="size-4 text-slate-700" /> : openApp === "processes" ? <Activity className="size-4 text-emerald-600" /> : openApp === "network" ? <Network className="size-4 text-blue-600" /> : openApp === "services" ? <ServerCog className="size-4 text-violet-600" /> : openApp === "hardware" ? <Cpu className="size-4 text-violet-600" /> : openApp === "logs" ? <ScrollText className="size-4 text-amber-600" /> : openApp === "storage" ? <HardDrive className="size-4 text-cyan-600" /> : openApp === "accounts" ? <UsersRound className="size-4 text-sky-600" /> : openApp === "control" ? <Settings className="size-4 text-blue-700" /> : openApp === "systeminfo" ? <Monitor className="size-4 text-cyan-700" /> : <Settings className="size-4 text-blue-600" />}
                {openApp === "browser" ? "IT PATH Browser" : openApp === "team-files" ? "Team Files" : openApp === "print-center" ? "Office Print Center" : openApp === "updates" ? "System Update" : openApp === "files" ? (pcOs === "mac" ? "Grove" : pcOs === "linux" ? "Files" : "File Explorer") : openApp === "terminal" ? "Terminal" : openApp === "processes" ? (pcOs === "windows" ? "Task Manager" : pcOs === "linux" ? "System Monitor" : "Activity Monitor") : openApp === "network" ? "Network" : openApp === "services" ? "Services" : openApp === "hardware" ? (pcOs === "windows" ? "Device Manager" : pcOs === "linux" ? "Hardware Information" : "System Information") : openApp === "logs" ? (pcOs === "windows" ? "Event Viewer" : pcOs === "linux" ? "System Logs" : "Console") : openApp === "storage" ? (pcOs === "windows" ? "Disk Management" : pcOs === "linux" ? "Disks & Filesystems" : "Storage Utility") : openApp === "accounts" ? (pcOs === "windows" ? "Local Users & Groups" : "Users & Groups") : openApp === "control" ? "Control Panel" : openApp === "systeminfo" ? "System Information" : "Settings"}
              </div>
              {pcOs!=="mac"?<button onClick={appBack} className={cn("grid size-8 place-items-center hover:bg-slate-100",pcOs==="windows"?"rounded-sm hover:bg-red-500 hover:text-white":"rounded-full bg-slate-200/70")} aria-label="Close"><X className="size-4" /></button>:null}
            </div>

            {openApp === "files" ? (
              pcOs === "windows" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-white"><aside className="hidden w-48 shrink-0 border-r bg-slate-50 p-3 sm:block"><p className="mb-2 text-xs font-semibold text-slate-500">File Explorer</p>{["Home","Desktop","Documents","Downloads","Pictures","This PC"].map(item=><button key={item} onClick={()=>navigateFiles(item)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-blue-100"><Folder className="size-4 text-amber-500"/>{item}</button>)}</aside><div className="min-w-0 flex-1 p-3"><div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold text-blue-900">Team Files</p><p className="text-[11px] text-blue-700">\\\\files.itpath.local\\Team Files · simulated network share</p></div><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold",teamFilesAccess==="unreachable"?"bg-slate-200 text-slate-600":teamFilesAccess==="denied"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700")}>{teamFilesAccess==="unreachable"?(networkState.localReady?"SHARE OFFLINE":"NETWORK OFFLINE"):teamFilesAccess==="denied"?"ACCESS DENIED":teamFilesAccess==="write"?"READ / WRITE":"READ ONLY"}</span></div><div className="mt-2 flex flex-wrap items-center gap-2"><button onClick={openTeamShare} className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white">{teamFilesAccess==="unreachable"?"Diagnose connection":teamFilesAccess==="denied"?"Try to open":"Open Team Files"}</button><span className="text-[10px] text-blue-700">{machine.currentUser} · {teamFilesAccess==="write"?"can modify shared files":teamFilesAccess==="read"?"read access only":teamFilesAccess==="unreachable"&&networkState.localReady?"network connected · share service unavailable":teamFilesAccess==="unreachable"?"network connection unavailable":"access must be restored"}</span></div>{shareNotice?<p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">{shareNotice}</p>:null}{shareOpen&&teamFilesAccess!=="unreachable"&&teamFilesAccess!=="denied"&&teamFilesResource?.access?.files?<div className="mt-2 overflow-hidden rounded-md border bg-white"><div className="flex items-center justify-between border-b bg-slate-50 px-2 py-1.5"><b className="text-[11px]">Team Files</b><button onClick={()=>{setShareOpen(false);setShareFileName(null)}} className="text-[10px] text-slate-500">Disconnect view</button></div>{teamFilesResource.access.files.map(file=><button key={file.name} onClick={()=>openShareFile(file.name)} className="flex w-full items-center gap-2 border-b px-2 py-2 text-left text-xs last:border-0 hover:bg-blue-50"><HardDrive className="size-3.5 text-blue-600"/><span className="flex-1">{file.name}</span><span className="text-[10px] text-slate-400">{file.readGroups?.join(", ")||"Shared"}</span></button>)}</div>:null}</div><div className="mb-2 flex gap-2"><button disabled={folder.length===0} onClick={() => setFolder(x=>x.slice(0,-1))} className="rounded-md border px-3">←</button><div className="min-w-0 flex-1 rounded-md border bg-slate-50 px-3 py-2 font-mono text-xs">C:\\{folder.join("\\")}</div></div><div className="mb-3 flex flex-wrap gap-2"><input value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="New item" className="select-text min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"/><button onClick={createFolder} className="rounded-md border px-3 text-xs">New folder</button><button onClick={createTextFile} className="rounded-md border px-3 text-xs">New text file</button>{clipboard?<button onClick={pasteItem} className="rounded-md bg-blue-50 px-3 text-xs text-blue-700">Paste</button>:null}</div><div className="divide-y rounded-md border">{visibleFiles.map(file=><button key={file.name} onClick={()=>openFile(file)} onContextMenu={(e)=>{e.preventDefault();showContext(file)}} onPointerDown={()=>beginPress(file)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress} className="flex w-full touch-manipulation items-center gap-3 p-2 text-left hover:bg-blue-50">{file.kind==="folder"?<Folder className="size-5 text-amber-500"/>:<HardDrive className="size-5 text-blue-600"/>}<span className="flex-1 truncate text-sm">{file.name}</span><span className="hidden text-xs text-slate-400 sm:block">{file.detail}</span></button>)}</div></div></div>
              ) : pcOs === "linux" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f6f5f4]"><aside className="hidden w-44 border-r bg-[#eceae8] p-3 sm:block"><p className="mb-3 text-xs font-semibold">Places</p>{["Recent","Starred","Home","Desktop","Documents","Downloads","Trash"].map(item=><button key={item} onClick={()=>navigateFiles(item)} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-orange-100">{item}</button>)}</aside><div className="min-w-0 flex-1 p-4"><div className="mb-4 flex items-center gap-2"><button disabled={folder.length===0} onClick={()=>setFolder(x=>x.slice(0,-1))} className="rounded-full bg-white px-3 py-2 shadow-sm">←</button><div className="font-semibold">{folder.at(-1) ?? "Home"}</div><span className="ml-auto text-[10px] text-slate-400">Local files</span></div><div className="mb-3 flex gap-2"><input value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="Name" className="select-text min-w-0 flex-1 rounded-lg border px-3 py-2"/><button onClick={createFolder} className="rounded-lg bg-orange-600 px-3 text-xs text-white">Folder</button><button onClick={createTextFile} className="rounded-lg border bg-white px-3 text-xs">File</button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visibleFiles.map(file=><button key={file.name} onClick={()=>openFile(file)} onContextMenu={(e)=>{e.preventDefault();showContext(file)}} onPointerDown={()=>beginPress(file)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress} className="touch-manipulation rounded-xl bg-white p-4 text-center shadow-sm">{file.kind==="folder"?<Folder className="mx-auto mb-2 size-10 text-orange-500"/>:<HardDrive className="mx-auto mb-2 size-10 text-slate-500"/>}<span className="block truncate text-xs">{file.name}</span></button>)}</div></div></div>
              ) : (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f5f5f7]"><aside className="hidden w-48 border-r border-black/10 bg-white/65 p-3 sm:block"><p className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Favorites</p>{[["Home","home"],["Desktop","desktop"],["Documents","documents"],["Downloads","downloads"]].map(([item,target])=><button key={item} onClick={()=>pearNavigate(target as "home"|"desktop"|"documents"|"downloads")} className="block w-full rounded-md px-3 py-1.5 text-left text-xs hover:bg-blue-100">{item}</button>)}<p className="mb-2 mt-4 text-[10px] font-semibold uppercase text-slate-400">Locations</p><button onClick={()=>pearNavigate("root")} className="block w-full rounded-md px-3 py-1.5 text-left text-xs hover:bg-blue-100">Pear Drive</button></aside><div className="min-w-0 flex-1 p-4">{pearNotice?<div className="mb-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800"><span>{pearNotice}</span><button onClick={()=>setPearNotice("")} className="ml-3 font-semibold">Dismiss</button></div>:null}<div className="mb-4 flex items-center"><button disabled={folder.length===0} onClick={()=>setFolder(x=>x.slice(0,-1))} className="mr-2 rounded-md px-2 py-1 text-slate-500 disabled:opacity-30">‹</button><h2 className="font-semibold">{folder.at(-1) ?? "Pear Drive"}</h2><button onClick={()=>setPearView(v=>v==="icons"?"list":"icons")} className="ml-auto rounded-md px-2 py-1 text-[10px] text-slate-500 hover:bg-black/5">{pearView==="icons"?"Icon view":"List view"}</button></div><div className="mb-3 flex gap-2"><input value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="New item" className="select-text min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2"/><button onClick={createFolder} className="rounded-lg bg-white px-3 text-xs shadow-sm">New Folder</button><button onClick={createTextFile} className="rounded-lg bg-white px-3 text-xs shadow-sm">New File</button>{clipboard?<button onClick={pasteItem} className="rounded-lg bg-blue-500 px-3 text-xs text-white">Paste</button>:null}</div><div className={cn(pearView==="icons"?"grid grid-cols-2 gap-4 sm:grid-cols-4":"divide-y rounded-xl border border-black/10 bg-white")}>{visibleFiles.map(file=><button key={file.name} onClick={()=>openFile(file)} onContextMenu={(e)=>{e.preventDefault();showContext(file)}} onPointerDown={()=>beginPress(file)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress} className={cn("touch-manipulation hover:bg-black/5",pearView==="icons"?"rounded-xl p-3 text-center":"flex w-full items-center gap-3 p-3 text-left")}>{file.kind==="folder"?<Folder className={cn("text-blue-500",pearView==="icons"?"mx-auto mb-2 size-12":"size-6")}/>:<HardDrive className={cn("text-slate-500",pearView==="icons"?"mx-auto mb-2 size-12":"size-6")}/>}<span className="block min-w-0 flex-1 truncate text-xs">{file.name}</span>{pearView==="list"?<span className="text-[10px] text-slate-400">{file.detail}</span>:null}</button>)}</div>{visibleFiles.length===0?<p className="py-12 text-center text-xs text-slate-400">This folder is empty.</p>:null}</div></div>
              )
            ) : activeTrainingApplication && activeApplicationCheck ? (
              <div className="flex h-[calc(100%-2.75rem)] flex-col bg-slate-50">
                <div className="border-b bg-white px-4 py-3">
                  {openApp==="browser"?<form onSubmit={(e)=>{e.preventDefault();navigateBrowser()}} className="flex items-center gap-2"><button type="button" onClick={browserBack} disabled={browserHistoryIndex<=0} className="rounded px-2 py-1 text-slate-500 disabled:opacity-25">←</button><button type="button" onClick={browserForward} disabled={browserHistoryIndex>=browserHistory.length-1} className="rounded px-2 py-1 text-slate-500 disabled:opacity-25">→</button><button type="button" onClick={()=>navigateBrowser(browserAddress,false)} className="rounded px-2 py-1 text-slate-500">↻</button><div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-slate-50 px-3 py-2"><Network className="size-4 shrink-0 text-slate-400"/><input value={browserAddress} onChange={e=>setBrowserAddress(e.target.value)} className="min-w-0 flex-1 select-text bg-transparent font-mono text-xs outline-none" autoCapitalize="none" autoCorrect="off" spellCheck={false}/></div><button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Go</button></form>:<div className="flex items-center justify-between gap-3"><div><b className="text-sm">{activeTrainingApplication.name}</b><p className="text-[10px] text-slate-500">{machine.hostname} · {machine.currentUser}</p></div><button onClick={()=>launch(openApp as TrainingApplicationId)} className="rounded-lg border px-3 py-1.5 text-xs">Retry</button></div>}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  {activeApplicationCheck.health==="blocked" && openApp!=="print-center"?<div className="mx-auto mt-8 max-w-xl rounded-2xl border bg-white p-6 text-center shadow-sm"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100"><X className="size-7 text-slate-500"/></div><h2 className="text-xl font-semibold">{openApp==="browser"?"This site can’t be reached":openApp==="team-files"?"Team Files isn’t available":openApp==="print-center"?"Office Printer is unavailable":"Windows Update couldn’t continue"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{openApp==="browser"?"The intranet did not respond. Check the connection or try again later.":openApp==="team-files"?"The network path could not be opened. Your other applications may still work normally.":openApp==="print-center"?"The printer cannot accept jobs right now. The workstation is still connected to the network.":"The update task could not start. Retrying without diagnosing the workstation may not resolve it."}</p><div className="mt-5 flex justify-center gap-2"><button onClick={()=>launch(openApp as TrainingApplicationId)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>{activeTicket?<button onClick={()=>setTicketOpen(true)} className="rounded-lg border px-4 py-2 text-sm">View ticket</button>:null}</div><p className="mt-5 text-[10px] text-slate-400">The application reports the symptom. Use the workstation tools to determine the cause.</p></div>:
                  openApp==="browser"?<div className="mx-auto max-w-4xl">{browserResult.status!=="ok"?<div className="mt-8 rounded-2xl border bg-white p-7 shadow-sm"><div className="mb-4 grid size-12 place-items-center rounded-xl bg-slate-100"><Network className="size-6 text-slate-500"/></div><h2 className="text-2xl font-semibold">{browserResult.title}</h2><p className="mt-2 text-sm text-slate-500">{browserResult.detail}</p><p className="mt-4 font-mono text-xs text-slate-400">{browserResult.status==="dns"?"DNS_PROBE_FINISHED_NXDOMAIN":browserResult.status==="refused"?"ERR_CONNECTION_REFUSED":browserResult.status==="offline"?"ERR_INTERNET_DISCONNECTED":"ERR_ADDRESS_UNREACHABLE"}</p><button onClick={()=>navigateBrowser(browserAddress,false)} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Reload</button></div>:<><div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 p-7 text-white shadow-xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">IT PATH Training LAN</p><h1 className="mt-2 text-3xl font-bold">{browserResult.host==="intranet.itpath.local"?"Company Intranet":browserResult.host}</h1><p className="mt-2 max-w-xl text-sm text-slate-300">{browserResult.detail} {browserResult.host==="intranet.itpath.local"?"This page is being served by the Linux training host.":""}</p></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{["Service Desk","Knowledge Base","Systems Status"].map(item=><button key={item} onClick={()=>recordEvidence(`Browser: opened ${item}`)} className="rounded-xl border bg-white p-4 text-left hover:bg-blue-50"><b className="text-sm">{item}</b><p className="mt-1 text-xs text-slate-500">Training resource available</p></button>)}</div></>}</div>:
                  openApp==="team-files"?<div className="mx-auto max-w-3xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Team Files</h2><p className="text-xs text-slate-500">\\files.itpath.local\Team Files</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">{teamFilesAccess==="write"?"READ / WRITE":"READ ONLY"}</span></div><div className="overflow-hidden rounded-xl border bg-white">{teamFilesResource?.access?.files?.map(file=><button key={file.name} onClick={()=>{setOpenApp("files");setShareOpen(true);openShareFile(file.name)}} className="flex w-full items-center gap-3 border-b p-4 text-left last:border-0 hover:bg-blue-50"><FolderOpen className="size-5 text-blue-600"/><span className="flex-1 text-sm font-medium">{file.name}</span><span className="text-[10px] text-slate-400">Shared file</span></button>)}</div></div>:
                  openApp==="print-center"?<div className="mx-auto max-w-3xl"><div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><div className={cn("grid size-14 place-items-center rounded-xl",activeApplicationCheck.health==="blocked"?"bg-red-50":"bg-emerald-50")}><ServerCog className={cn("size-7",activeApplicationCheck.health==="blocked"?"text-red-600":"text-emerald-600")}/></div><div className="flex-1"><h2 className="font-semibold">Office Printer</h2><p className="text-xs text-slate-500">print.itpath.local · {activeApplicationCheck.health==="blocked"?"Needs attention":"Ready"}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-semibold",activeApplicationCheck.health==="blocked"?"bg-red-100 text-red-700":"bg-emerald-100 text-emerald-700")}>{activeApplicationCheck.health==="blocked"?"Offline":"Online"}</span></div>{activeApplicationCheck.health==="blocked"?<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{activeApplicationCheck.causes[0]}</div>:null}<div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs">Print queue</b><div className="flex gap-2"><button onClick={()=>{const next=clone(machine);advancePrintQueue(next,{...osMachines,[pcOs]:next},virtualEnvironment);saveMachine(next);}} className="rounded-lg border bg-white px-3 py-1.5 text-xs">Process queue</button><button onClick={()=>{const next=clone(machine);submitPrintJob(next,{...osMachines,[pcOs]:next},virtualEnvironment,"IT PATH Test Page");reconcilePrintQueue(next,{...osMachines,[pcOs]:next},virtualEnvironment);saveMachine(next);recordEvidence("GUI: submitted a test page to Office Printer");}} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Print test page</button></div></div>{trayPrintJobs.length?<div className="mt-3 divide-y rounded-lg border bg-white">{trayPrintJobs.map(job=><div key={job.id} className="p-3 text-xs"><div className="flex items-center gap-3"><span className={cn("size-2 rounded-full",job.status==="error"?"bg-red-500":job.status==="printing"?"bg-emerald-500":job.status==="completed"?"bg-blue-500":job.status==="cancelled"?"bg-slate-400":"bg-amber-500")}/><div className="min-w-0 flex-1"><b className="block truncate">{job.document}</b><span className="text-slate-400">{job.printer}</span></div><span className="font-semibold capitalize">{job.status}</span></div>{job.errorReason?<p className="ml-5 mt-1 text-[10px] text-red-600">{job.errorReason}</p>:null}{job.status==="error"?<div className="ml-5 mt-2 flex gap-2"><button onClick={()=>{const next=clone(machine);retryPrintJob(next,{...osMachines,[pcOs]:next},virtualEnvironment,job.id);saveMachine(next)}} className="rounded border px-2 py-1">Retry</button><button onClick={()=>{const next=clone(machine);cancelPrintJob(next,job.id);saveMachine(next)}} className="rounded border px-2 py-1 text-red-600">Cancel</button></div>:job.status==="queued"||job.status==="printing"?<button onClick={()=>{const next=clone(machine);cancelPrintJob(next,job.id);reconcilePrintQueue(next,{...osMachines,[pcOs]:next},virtualEnvironment);saveMachine(next)}} className="ml-5 mt-2 rounded border px-2 py-1 text-red-600">Cancel</button>:null}</div>)}</div>:<p className="mt-2 text-sm text-slate-500">No documents waiting. The printer is ready to accept jobs.</p>}</div></div></div>:
                  <div className="mx-auto max-w-3xl"><div className="rounded-2xl border bg-white p-6 shadow-sm"><ShieldCheck className={cn("mb-3 size-10",machine.updateState?.phase==="error"?"text-red-600":machine.updateState?.phase==="restart-required"?"text-amber-600":"text-emerald-600")}/><h2 className="text-xl font-semibold">{machine.updateState?.phase==="restart-required"?"Restart required":machine.updateState?.phase==="completed"?"You’re up to date":machine.updateState?.phase==="error"?"Update needs attention":machine.updateState?.message ?? "Ready to check for updates"}</h2><p className="mt-2 text-sm text-slate-500">{machine.updateState?.message ?? "Windows Update is ready to check this workstation."}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{width:`${machine.updateState?.progress ?? 0}%`}}/></div><div className="mt-5 flex flex-wrap gap-2">{machine.updateState?.phase==="restart-required"?<button onClick={restartWorkstation} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Restart now</button>:<button onClick={()=>{const next=clone(machine);advanceWindowsUpdate(next,{...osMachines,[pcOs]:next},virtualEnvironment);saveMachine(next);recordEvidence(`GUI: Windows Update advanced to ${next.updateState?.phase}`);}} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{machine.updateState?.phase==="checking"?"Continue check":machine.updateState?.phase==="downloading"?"Continue download":machine.updateState?.phase==="installing"?"Continue install":machine.updateState?.phase==="error"?"Try again":"Check for updates"}</button>}</div>{machine.pendingUpdates?.length?<div className="mt-5 divide-y rounded-xl border">{machine.pendingUpdates.map(update=><div key={update.title} className="p-3"><b className="text-xs">{update.title}</b><p className="mt-1 text-[10px] text-slate-500">{update.kind} update{update.requiresRestart?" · restart required after installation":""}</p></div>)}</div>:null}</div></div>}
                </div>
              </div>
            ) : openApp === "terminal" ? (
              <div className="flex h-[calc(100%-2.75rem)] min-h-0 bg-[#0b1020] text-slate-100"><div className="flex min-w-0 flex-1 flex-col"><div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/20 px-3 py-2"><select value={desktopScenarioAttempt ? "" : desktopScenarioId} onChange={e=>{setDesktopScenarioId(e.target.value);setDesktopScenarioAttempt(null);setDesktopScenarioResult(null)}} className="min-w-0 flex-1 rounded border border-white/15 bg-[#111c2b] px-2 py-1.5 text-xs text-white"><option value="">Free terminal</option>{desktopScenarios.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select>{desktopScenarioId&&!desktopScenarioAttempt?<><button onClick={()=>setDesktopScenarioMode("guided")} className={cn("rounded px-2 py-1 text-[10px]",desktopScenarioMode==="guided"?"bg-cyan-500 text-slate-950":"border border-white/15")}>Guided</button><button onClick={()=>setDesktopScenarioMode("challenge")} className={cn("rounded px-2 py-1 text-[10px]",desktopScenarioMode==="challenge"?"bg-cyan-500 text-slate-950":"border border-white/15")}>Challenge</button><button onClick={()=>selectedDesktopScenario&&startDesktopScenario(selectedDesktopScenario)} className="rounded bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950">Start</button></>:null}{desktopScenarioAttempt&&!activeTicket?<button onClick={exitDesktopScenario} className="rounded border border-white/15 px-2 py-1 text-[10px]">Free terminal</button>:null}</div>{desktopScenarioAttempt&&selectedDesktopScenario?<div className="border-b border-white/10 bg-cyan-500/5 px-3 py-2"><b className="block truncate text-xs text-cyan-200">{selectedDesktopScenario.title}</b><p className="truncate text-[10px] text-slate-400">{selectedDesktopScenario.brief}</p></div>:null}<div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm">{desktopScenarioAttempt?desktopScenarioAttempt.transcript.map(entry=><div key={entry.id} className="mb-3"><div><span className="text-cyan-300">{entry.prompt}</span>{entry.command}</div>{entry.output?<pre className={cn("whitespace-pre-wrap",entry.error&&"text-red-300")}>{entry.output}</pre>:null}</div>):terminalLines.length===0?<p className="text-slate-400">{pcOs === "windows" ? "IT PATH Desktop" : pcOs === "linux" ? "IT PATH Server" : "PathOS Pear"} training terminal. Type help to begin.</p>:terminalLines.map((line,i)=><pre key={i} className="whitespace-pre-wrap break-words">{line}</pre>)}</div><form onSubmit={(e)=>{e.preventDefault();runEmbeddedTerminal()}} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3"><span className="shrink-0 font-mono text-xs text-cyan-300">{prompt(machine)}</span><input autoCapitalize="none" autoCorrect="off" spellCheck={false} value={terminalInput} disabled={desktopScenarioAttempt?.status==="submitted"} onChange={(e)=>setTerminalInput(e.target.value)} className="min-w-0 flex-1 select-text bg-transparent font-mono text-sm text-white outline-none [-webkit-touch-callout:default]" placeholder="Enter command"/><button disabled={!terminalInput.trim()||desktopScenarioAttempt?.status==="submitted"} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-30">Run</button></form></div>{desktopScenarioAttempt&&selectedDesktopScenario?<aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-black/20 p-3 lg:block"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Objectives</p>{selectedDesktopScenario.goals.map(goal=><p key={goal.id} className="mt-2 text-xs text-slate-300">• {goal.description}</p>)}{desktopScenarioAttempt.mode==="guided"?<div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hints</p>{selectedDesktopScenario.hints.slice(0,desktopScenarioAttempt.hintsUsed).map((hint,i)=><p key={hint} className="mt-2 rounded bg-white/5 p-2 text-[10px] leading-4 text-slate-300">{i+1}. {hint}</p>)}{desktopScenarioAttempt.hintsUsed<selectedDesktopScenario.hints.length&&desktopScenarioAttempt.status!=="submitted"?<button onClick={()=>{const next={...desktopScenarioAttempt,hintsUsed:desktopScenarioAttempt.hintsUsed+1,updatedAt:new Date().toISOString()};setDesktopScenarioAttempt(next);actions.updateTerminalAttempt(next)}} className="mt-2 rounded border border-white/15 px-2 py-1 text-[10px]">Give me a hint</button>:null}</div>:null}<p className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Diagnosis</p><textarea value={desktopScenarioReasoning} onChange={e=>setDesktopScenarioReasoning(e.target.value)} disabled={desktopScenarioAttempt.status==="submitted"} rows={5} className="mt-2 w-full select-text rounded border border-white/15 bg-white/5 p-2 text-xs outline-none" placeholder="Cause, evidence, repair, verification…"/>{desktopScenarioAttempt.status!=="submitted"?<button onClick={submitDesktopScenario} disabled={desktopScenarioAttempt.transcript.length===0} className="mt-2 w-full rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-30">Check my work</button>:null}{desktopScenarioResult?<div className="mt-3 rounded-lg bg-white/5 p-3"><b className="text-lg text-emerald-300">{desktopScenarioResult.score}%</b><p className="mt-1 text-[10px] text-slate-400">Objective {desktopScenarioResult.objectiveScore}% · Process {desktopScenarioResult.processScore}% · Efficiency {desktopScenarioResult.efficiencyScore}%</p>{desktopScenarioResult.missingGoals.map(goal=><p key={goal} className="mt-1 text-[10px] text-amber-200">Still needed: {goal}</p>)}</div>:null}</aside>:null}</div>
            ) : openApp === "processes" ? (
              pcOs === "windows" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-white"><div className="sticky top-0 z-10 border-b bg-white/95 px-4 pt-3 backdrop-blur"><div className="flex gap-1 overflow-x-auto">{([["processes","Processes"],["performance","Performance"],["startup","Startup apps"],["users","Users"],["details","Details"]] as const).map(([id,label])=><button key={id} onClick={()=>setTaskView(id)} className={cn("whitespace-nowrap rounded-t-lg px-3 py-2 text-xs",taskView===id?"border-b-2 border-cyan-600 bg-cyan-50 font-semibold text-cyan-800":"text-slate-500 hover:bg-slate-50")}>{label}</button>)}</div></div><div className="p-4">{taskView==="performance"?<div><h2 className="font-semibold">Performance</h2><p className="mb-4 text-xs text-slate-500">Live simulated workstation resources</p><div className="grid gap-3 sm:grid-cols-3">{[["Memory",Math.round(machine.memoryUsedMb/machine.memoryTotalMb*100)+"%",machine.memoryUsedMb+" / "+machine.memoryTotalMb+" MB"],["Disk",machine.diskUsedPercent+"%","System volume"],["Processes",String(machine.processes.length),"Running"]].map(([name,value,detail])=><div key={name} className="rounded-xl border bg-slate-50 p-4"><span className="text-xs text-slate-500">{name}</span><p className="mt-1 text-2xl font-semibold">{value}</p><p className="text-[10px] text-slate-400">{detail}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-cyan-600" style={{width:name==="Memory"?value:name==="Disk"?value:Math.min(100,machine.processes.length*5)+"%"}}/></div></div>)}</div></div>:taskView==="startup"?<div><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-semibold">Startup apps</h2><p className="text-xs text-slate-500">Control applications that start when this training workstation signs in. Changes take effect after restart.</p></div><div className="text-right"><p className="text-[10px] text-slate-400">Boot #{machine.bootCount ?? 1}</p>{machine.restartRequired?<button onClick={restartWorkstation} className="mt-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-[10px] font-semibold text-white">Restart to apply</button>:null}</div></div><div className="overflow-hidden rounded-xl border">{(machine.startupApps??[]).map(app=><div key={app.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b p-3 text-xs last:border-0"><div><b>{app.name}</b><p className="text-slate-400">{app.enabled?"Enabled":"Disabled"} · applies next restart</p></div><span className="text-slate-500">{app.impact} impact</span><button onClick={()=>mutate(next=>{ensureWorkstationState(next);const found=next.startupApps?.find(x=>x.name===app.name);if(found){found.enabled=!found.enabled;next.restartRequired=true;addEvent(next,`${app.name} startup ${found.enabled?"enabled":"disabled"}. Change applies after restart.`);}})} className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">{app.enabled?"Disable":"Enable"}</button></div>)}</div></div>:taskView==="users"?<div><h2 className="font-semibold">Users</h2><p className="mb-3 text-xs text-slate-500">Local accounts with workstation access</p><div className="space-y-2">{machine.users.map(account=><div key={account.name} className="flex items-center rounded-xl border p-3"><div className="grid size-9 place-items-center rounded-full bg-cyan-50 font-semibold text-cyan-700">{account.name.slice(0,1).toUpperCase()}</div><div className="ml-3"><b className="text-sm">{account.name}</b><p className="text-xs text-slate-500">{account.admin?"Administrator":"Standard user"} · {account.locked?"Locked":"Active"}</p></div></div>)}</div></div>:<div><div className="mb-3 grid grid-cols-3 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2">Memory <b>{Math.round(machine.memoryUsedMb/machine.memoryTotalMb*100)}%</b></div><div className="rounded-lg bg-slate-50 p-2">Disk <b>{machine.diskUsedPercent}%</b></div><div className="rounded-lg bg-slate-50 p-2">Processes <b>{machine.processes.length}</b></div></div><div className="overflow-hidden rounded-xl border">{taskView==="details"?<div className="grid grid-cols-[1fr_70px_90px_70px] gap-2 border-b bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500"><span>Name</span><span>PID</span><span>User</span><span>CPU</span></div>:null}{machine.processes.map(proc=><div key={proc.pid} className={cn("items-center gap-3 border-b px-3 py-2 text-xs last:border-0",taskView==="details"?"grid grid-cols-[1fr_70px_90px_70px]":"grid grid-cols-[1fr_auto_auto]")}><div><b>{proc.name}</b>{taskView!=="details"?<p className="text-slate-400">PID {proc.pid} · {proc.user}</p>:null}</div>{taskView==="details"?<><span>{proc.pid}</span><span>{proc.user}</span><span>{proc.cpu.toFixed(1)}%</span></>:<><span>{proc.memoryMb} MB</span><button onClick={()=>endProcess(proc.pid)} className="rounded border px-2 py-1 hover:bg-slate-50">End task</button></>}</div>)}</div></div>}</div></div>
              ) : pcOs === "linux" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f7f6f5] p-4"><div className="mb-4 flex items-center justify-between border-b border-black/10 pb-3"><div><h2 className="font-semibold">System Monitor</h2><p className="text-xs text-slate-500">Processes · Resources · File Systems</p></div><span className="rounded-full bg-[#e95420]/10 px-3 py-1 text-xs text-[#a43b18]">IT PATH Server</span></div><div className="space-y-2">{machine.processes.map(proc=><div key={proc.pid} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm"><Activity className="size-5 text-orange-600"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{proc.name}</p><p className="text-xs text-slate-500">{proc.user} · PID {proc.pid} · {proc.cpu.toFixed(1)}% CPU · {proc.memoryMb} MB</p></div><button onClick={()=>endProcess(proc.pid)} className="rounded-lg border px-2 py-1 text-xs">End Process</button></div>)}</div></div>
              ) : (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f5f5f7] p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Activity Monitor</h2><p className="text-xs text-slate-500">CPU · Memory · Energy · Disk · Network</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">PathOS Pear</span></div><div className="overflow-hidden rounded-xl border border-black/10 bg-white">{machine.processes.map(proc=><div key={proc.pid} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-3 py-2 text-xs last:border-0"><div><b>{proc.name}</b><p className="text-slate-400">{proc.user} · PID {proc.pid}</p></div><span>{proc.cpu.toFixed(1)}% CPU</span><button onClick={()=>endProcess(proc.pid)} className="rounded-full border px-2 py-1">Stop</button></div>)}</div></div>
              )
            ) : openApp === "network" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto",pcOs==="windows"?"bg-[#f7f9fc]":pcOs==="linux"?"bg-[#f6f5f4]":"bg-[#f5f5f7]")}>{(() => { const iface=primaryInterface(machine); return pcOs==="windows" ? <div className="p-5"><h2 className="text-xl font-semibold">Network & internet</h2><p className="mb-4 text-sm text-slate-500">{networkState.internetReady?"Connected":networkState.localReady?"Local network only":"Disconnected"} · {iface?.name}</p><div className="mb-4 grid gap-2 sm:grid-cols-5">{[["Link",networkState.linkUp],["IP address",networkState.hasAddress],["Gateway",networkState.hasGateway],["DNS",networkState.hasDns],["Network ready",networkState.internetReady]].map(([label,passed])=><div key={String(label)} className={cn("rounded-lg border p-2 text-[11px] font-semibold",passed?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-amber-200 bg-amber-50 text-amber-700")}>{String(label)}<span className="float-right">{passed?"Ready":"Check"}</span></div>)}</div><div className="mb-4 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs text-slate-500">Test destination<input value={networkProbeHost} onChange={e=>setNetworkProbeHost(e.target.value)} className="mt-1 w-full select-text rounded border px-3 py-2 font-mono text-xs"/></label></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{probeTrainingNetwork(machine,networkProbeHost.trim()).map((probe,index)=><div key={`${probe.kind}-${index}`} className={cn("rounded-lg border p-3 text-xs",probe.ok?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50")}><div className="flex justify-between gap-2"><b className="capitalize">{probe.kind}</b><span className={probe.ok?"text-emerald-700":"text-amber-700"}>{probe.ok?"PASS":"CHECK"}</span></div><p className="mt-1 text-slate-600">{probe.detail}</p></div>)}</div></div><div className="rounded-xl border bg-white p-4"><div className="flex justify-between"><b>Ethernet</b><button onClick={toggleNetwork} className="rounded border px-3 py-1 text-xs">{iface?.up?"Disable":"Enable"}</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{[["IPv4 address",iface?.ip],["DNS servers",machine.dnsServers.join(", ")],["Default gateway",iface?.gateway],["Assignment",iface?.dhcp?"Automatic (DHCP)":"Manual"]].map(([k,v])=><div key={k} className="rounded-lg bg-slate-50 p-3 text-xs"><span className="text-slate-500">{k}</span><p className="mt-1 font-mono">{v||"—"}</p></div>)}</div><button onClick={beginNetworkEdit} className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Edit IP assignment</button></div>{networkEditing?<div className="mt-4 rounded-xl border bg-white p-4"><div className="mb-3 flex items-center justify-between"><b className="text-sm">Edit IP settings</b><button onClick={()=>setNetworkEditing(false)} className="text-xs text-slate-500">Cancel</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-500">IP address<input value={netIp} onChange={e=>setNetIp(e.target.value)} className="mt-1 w-full select-text rounded border px-3 py-2 font-mono text-xs"/></label><label className="text-xs text-slate-500">Subnet mask<input value={netMask} onChange={e=>setNetMask(e.target.value)} className="mt-1 w-full select-text rounded border px-3 py-2 font-mono text-xs"/></label><label className="text-xs text-slate-500">Gateway<input value={netGateway} onChange={e=>setNetGateway(e.target.value)} className="mt-1 w-full select-text rounded border px-3 py-2 font-mono text-xs"/></label><label className="text-xs text-slate-500">DNS servers<input value={netDns} onChange={e=>setNetDns(e.target.value)} className="mt-1 w-full select-text rounded border px-3 py-2 font-mono text-xs"/></label></div><div className="mt-4 flex gap-2"><button onClick={()=>{saveNetwork(false);setNetworkEditing(false)}} className="rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Save</button><button onClick={()=>{saveNetwork(true);setNetworkEditing(false)}} className="rounded border px-3 py-2 text-xs">Automatic (DHCP)</button></div></div>:null}</div> : pcOs==="linux" ? <div className="flex min-h-full"><aside className="hidden w-44 border-r bg-[#eceae8] p-3 sm:block"><b className="text-sm">Network</b><div className="mt-3 rounded-lg bg-orange-100 px-3 py-2 text-xs">Wired</div><div className="mt-2 px-3 py-2 text-xs text-slate-400">VPN · not configured</div></aside><div className="flex-1 p-5"><h2 className="text-xl font-semibold">Wired</h2><div className="mt-4 rounded-xl bg-white p-4 shadow-sm"><div className="flex justify-between"><div><b>{iface?.name}</b><p className="text-xs text-slate-500">{iface?.up?"Connected":"Disconnected"}</p></div><button onClick={toggleNetwork} className="rounded-full border px-3 text-xs">{iface?.up?"On":"Off"}</button></div><div className="mt-4 font-mono text-xs">IPv4 {iface?.ip||"—"}<br/>Gateway {iface?.gateway||"—"}<br/>DNS {machine.dnsServers.join(", ")||"—"}</div><button onClick={beginNetworkEdit} className="mt-4 rounded-lg border px-3 py-2 text-xs hover:bg-orange-50">IPv4 Settings</button>{networkEditorPanel("linux")}</div></div></div> : <div className="flex min-h-full"><aside className="hidden w-48 border-r border-black/10 bg-white/70 p-3 sm:block"><b className="text-sm">Network</b><div className="mt-3 rounded-lg bg-blue-500 px-3 py-2 text-xs text-white">Ethernet</div><div className="mt-2 px-3 py-2 text-xs text-slate-400">VPN · not configured</div></aside><div className="flex-1 p-5"><h2 className="text-xl font-semibold">Ethernet</h2><div className="mt-4 rounded-xl border border-black/10 bg-white p-4"><div className="flex justify-between"><div><b>{iface?.up?"Connected":"Not Connected"}</b><p className="text-xs text-slate-500">{iface?.name}</p></div><button onClick={()=>iface?.up?beginNetworkEdit():toggleNetwork()} className="rounded-full border px-3 py-1 text-xs hover:bg-blue-50">{iface?.up?"Details…":"Connect"}</button></div><div className="mt-4 grid gap-2 text-xs"><p>IP Address <span className="float-right font-mono">{iface?.ip||"—"}</span></p><p>Router <span className="float-right font-mono">{iface?.gateway||"—"}</span></p><p>DNS <span className="float-right font-mono">{machine.dnsServers.join(", ")||"—"}</span></p></div><div className="mt-4 flex gap-2"><button onClick={beginNetworkEdit} className="rounded-lg bg-blue-500 px-3 py-2 text-xs text-white">TCP/IP & DNS…</button>{iface?.up?<button onClick={toggleNetwork} className="rounded-lg border px-3 py-2 text-xs">Disconnect</button>:null}</div>{networkEditorPanel("mac")}</div></div></div>; })()}</div>
            ) : openApp === "accounts" ? (
              <div className={cn("flex h-[calc(100%-2.75rem)] overflow-hidden",pcOs==="windows"?"bg-white":pcOs==="linux"?"bg-[#f7f6f5]":"bg-[#f5f5f7]")}>{pcOs==="windows"?<aside className="hidden w-52 shrink-0 border-r bg-[#f4f6f8] p-3 sm:block"><b className="text-xs">Local Users and Groups</b><div className="mt-4 rounded bg-blue-100 px-2 py-1.5 text-xs text-blue-800">Users</div><p className="mt-2 px-2 text-[10px] text-slate-400">Group membership is shown on each account.</p></aside>:null}<div className="min-w-0 flex-1 overflow-y-auto p-4"><div className="mb-4"><h2 className="font-semibold">{pcOs==="windows"?"Users":pcOs==="linux"?"Users":"Users & Groups"}</h2><p className="text-xs text-slate-500">{pcOs==="windows"?"Local workstation accounts, status and group membership.":pcOs==="linux"?"Local users, account state and sudo access.":"Local accounts and administrator access."}</p></div><div className="mb-4 flex gap-2"><input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="New local user" className="min-w-0 flex-1 select-text rounded-lg border bg-white px-3 py-2 text-sm"/><button onClick={addAccount} className={cn("rounded-lg px-4 text-sm font-semibold text-white",pcOs==="linux"?"bg-[#e95420]":pcOs==="mac"?"bg-blue-500":"bg-blue-700")}>Create</button></div><div className={cn(pcOs==="windows"?"border bg-white":"space-y-2")}>{pcOs==="windows"?<div className="grid grid-cols-[1fr_100px_90px] gap-2 border-b bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500"><span>Name</span><span>Role</span><span>Status</span></div>:null}{machine.users.map(account=><div key={account.name} className={cn("items-center gap-3",pcOs==="windows"?"grid grid-cols-[1fr_100px_90px] border-b px-3 py-2 text-xs hover:bg-blue-50":"flex rounded-xl border bg-white p-3")}><div className="min-w-0"><b>{account.fullName||account.name}</b><p className="truncate text-xs text-slate-500">{account.name}</p></div><span>{account.admin?(pcOs==="linux"?"sudo":pcOs==="mac"?"admin":"Administrators"):"Users"}</span><span className={account.locked?"text-amber-700":"text-slate-500"}>{account.locked?"Locked":"Enabled"}</span><div className={cn("flex gap-2",pcOs==="windows"?"col-span-3":"ml-auto")}><button onClick={()=>toggleAdmin(account.name)} disabled={account.name===machine.currentUser||!canManageAccounts(machine)} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">{account.admin?"Standard":pcOs==="linux"?"sudo":"Admin"}</button><button onClick={()=>toggleLock(account.name)} disabled={account.name===machine.currentUser||!canManageAccounts(machine)} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">{account.locked?"Unlock":"Lock"}</button></div></div>)}</div></div></div>
            ) : openApp === "storage" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto",pcOs==="windows"?"bg-white":pcOs==="linux"?"bg-[#f7f6f5] p-4":"bg-[#f5f5f7] p-4")}>{pcOs==="windows"?<><div className="border-b bg-[#fafafa] px-3 py-2 text-[10px] text-slate-500">Storage overview · simulated local disk</div><div className="p-4"><h2 className="font-semibold">Disk Management</h2><p className="mb-4 text-xs text-slate-500">Disk 0 · Basic · Online</p><div className="overflow-hidden border"><div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 bg-slate-50 p-2 text-[10px] font-semibold text-slate-500"><span>Volume</span><span>Layout</span><span>File system</span><span>Status</span></div>{[["(C:)","Simple","NTFS","Healthy"],["Recovery","Simple","NTFS","Healthy"]].map(row=><div key={row[0]} className="grid grid-cols-[1fr_80px_80px_90px] gap-2 border-t p-2 text-xs">{row.map(x=><span key={x}>{x}</span>)}</div>)}</div><div className="mt-5 flex border bg-slate-50 p-3"><div className="w-28 shrink-0 border-r pr-3 text-xs"><b>Disk 0</b><p>Basic</p><p>Online</p></div><div className="ml-3 min-w-0 flex-1"><div className="border-t-4 border-blue-700 bg-white p-3"><b className="text-xs">(C:)</b><p className="text-[10px] text-slate-500">NTFS · Healthy (Boot, Primary Partition)</p><div className="mt-2 h-2 bg-slate-100"><div className="h-full bg-blue-600" style={{width:`${Math.max(4,machine.diskUsedPercent)}%`}}/></div><p className="mt-1 text-[10px] text-slate-500">{machine.diskUsedPercent}% used · {diskFreePercent}% free</p></div></div></div><div className={cn("mt-4 rounded-xl border p-3 text-xs",machine.diskUsedPercent>=90?"border-amber-200 bg-amber-50":"border-slate-200 bg-slate-50")}><b>{machine.diskUsedPercent>=90?"Low disk space":"Storage maintenance"}</b><p className={cn("mt-1",machine.diskUsedPercent>=90?"text-amber-800":"text-slate-500")}>{machine.diskUsedPercent>=90?"Temporary files can be removed to restore working space.":"Review temporary training data and reclaim space safely."}</p><button onClick={cleanupStorage} className="mt-2 rounded bg-blue-700 px-3 py-1.5 font-semibold text-white">Clean temporary files</button></div></div></>:<><div className="mb-4"><h2 className="font-semibold">{pcOs==="linux"?"Disks":"Storage Utility"}</h2><p className="text-xs text-slate-500">{pcOs==="linux"?"/dev/nvme0n1 · GUID Partition Table":"IT PATH SSD · GUID Partition Map"}</p></div><div className="rounded-xl border bg-white p-4"><div className="flex items-center gap-3"><HardDrive className={cn("size-9",pcOs==="linux"?"text-[#e95420]":"text-blue-500")}/><div><b>{pcOs==="linux"?"/dev/nvme0n1p2":"Pear Drive"}</b><p className="text-xs text-slate-500">{pcOs==="linux"?"ext4 · mounted at /":"PathFS · Mounted"}</p></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full",pcOs==="linux"?"bg-[#e95420]":"bg-blue-500")} style={{width:`${Math.max(4,machine.diskUsedPercent)}%`}}/></div><p className="mt-2 text-xs text-slate-500">{machine.diskUsedPercent}% used · {100-machine.diskUsedPercent}% available</p>{machine.diskUsedPercent>=90?<button onClick={cleanupStorage} className={cn("mt-4 rounded-lg px-3 py-2 text-xs font-semibold text-white",pcOs==="linux"?"bg-[#e95420]":"bg-blue-500")}>Review & clean storage</button>:null}</div></>}</div>
            ) : openApp === "logs" ? (
              <div className={cn("flex h-[calc(100%-2.75rem)] overflow-hidden",pcOs==="windows"?"bg-white":pcOs==="linux"?"bg-[#f7f6f5]":"bg-[#f5f5f7]")}>
                {pcOs==="windows"?<aside className="hidden w-48 shrink-0 border-r bg-[#f4f6f8] p-3 sm:block"><b className="text-xs">Event Viewer</b><p className="mt-3 text-[10px] font-semibold uppercase text-slate-400">Windows Logs</p>{["all","application","security","system"].map(ch=><button key={ch} onClick={()=>setEventChannel(ch as any)} className={cn("mt-1 block w-full rounded px-2 py-1.5 text-left text-xs capitalize",eventChannel===ch&&"bg-blue-100 text-blue-800")}>{ch==="all"?"Overview":ch}</button>)}</aside>:null}
                <div className="min-w-0 flex-1 overflow-y-auto p-4"><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="font-semibold">{pcOs==="windows"?"Event Viewer":pcOs==="linux"?"Logs":"Console"}</h2><p className="text-xs text-slate-500">{pcOs==="windows"?`Windows Logs · ${eventChannel}`:pcOs==="linux"?"systemd journal · current boot":"Unified Log · All Messages"} · {(machine.systemEvents?.length??0)+(machine.eventLog?.length??0)} events</p></div>{pcOs==="windows"?<button onClick={()=>recordEvidence(`GUI: reviewed ${eventChannel} event log`)} className="rounded border bg-white px-2 py-1 text-[10px]">Refresh / review</button>:null}</div>{(machine.systemEvents?.filter(e=>eventChannel==="all"||e.channel===eventChannel).length??0)>0?<div className={cn(pcOs==="windows"?"overflow-hidden border bg-white":"space-y-2")}>{machine.systemEvents!.filter(e=>eventChannel==="all"||e.channel===eventChannel).map((event,index)=><div key={`structured-${index}`} className={cn("text-xs",pcOs==="windows"?"grid grid-cols-[80px_110px_65px_1fr] gap-2 border-b p-2 hover:bg-blue-50":"rounded-xl border bg-white p-3")}><span className={event.level==="error"?"text-red-600":event.level==="warning"?"text-amber-600":"text-slate-500"}>{event.level==="error"?"Error":event.level==="warning"?"Warning":event.level==="audit"?"Audit":"Information"}</span><span className="font-medium">{event.source}</span><span className="text-slate-500">{pcOs==="windows"?event.eventId:event.channel}</span><span className="break-words">{event.message}<span className="mt-1 block text-[10px] text-slate-400">{new Date(event.at).toLocaleString()}</span></span></div>)}</div>:null}<div className={cn("mt-3",pcOs==="windows"?"border bg-white":"space-y-2")}>{[...(machine.eventLog??[])].reverse().map((event,index)=>{const warning=/fail|error|denied|down|stopped/i.test(event);return <div key={index} className={cn("text-xs",pcOs==="windows"?"grid grid-cols-[80px_1fr_100px] border-b p-2 hover:bg-blue-50":"rounded-xl border bg-white p-3")}><span className={warning?"text-amber-600":"text-slate-500"}>{warning?"Warning":"Information"}</span><span className="break-words">{event}</span><span className="text-slate-400">{pcOs==="windows"?"Legacy/System":pcOs==="linux"?"journal":"system.log"}</span></div>})}{!(machine.eventLog?.length)&&!(machine.systemEvents?.length)?<div className="p-8 text-center text-sm text-slate-500">No recorded system events.</div>:null}</div></div></div>
            ) : openApp === "hardware" ? (
              pcOs === "windows" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-white"><aside className="hidden w-52 border-r bg-slate-50 p-3 sm:block"><p className="mb-2 text-xs font-semibold text-slate-500">{machine.hostname}</p>{["Audio inputs and outputs","Disk drives","Display adapters","Network adapters","Processors","System devices"].map((x) => <div key={x} className="rounded px-2 py-1.5 text-xs text-slate-500">{x}</div>)}</aside><div className="min-w-0 flex-1 overflow-y-auto"><div className="flex items-center justify-between gap-3 border-b bg-[#fafafa] px-3 py-2 text-[10px] text-slate-500"><span>Devices by type</span><button onClick={()=>recordEvidence("GUI: scanned Device Manager for hardware changes")} className="rounded border bg-white px-2 py-1">Scan for hardware changes</button></div><div className="p-4"><div className="mb-3 text-xs text-slate-500">Device Manager · devices by type</div>{hardwareGroups.map(section=><div key={section.group} className="mb-2"><div className="mb-1 flex items-center gap-2 text-sm font-medium"><ChevronLeft className="size-3 -rotate-90"/>{section.group}</div>{section.items.map(item=><button key={item.name} onClick={()=>setSelectedDevice(item.name)} className={cn("ml-5 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded px-2 py-1.5 text-left text-sm",selectedDevice===item.name&&"bg-blue-100")}><Cpu className={cn("size-4",item.status!=="OK"?"text-amber-600":"text-slate-500")}/><span className="min-w-0 flex-1 truncate">{item.name}</span><span className={cn("text-xs",item.status!=="OK"?"font-semibold text-amber-700":"text-slate-400")}>{item.status}</span></button>)}</div>)}</div>{selectedDevice?<div className="border-t bg-slate-50 p-4"><b className="text-sm">{selectedDevice}</b><p className="mt-1 text-xs text-slate-500">{hardwareGroups.flatMap(g=>g.items).find(x=>x.name===selectedDevice)?.detail??"Device properties"} · {hardwareGroups.flatMap(g=>g.items).find(x=>x.name===selectedDevice)?.status??"OK"}</p><div className="mt-3 flex gap-2"><button onClick={()=>recordEvidence(`GUI: inspected device properties for ${selectedDevice}`)} className="rounded border bg-white px-3 py-1.5 text-xs">Properties</button>{hardwareGroups.some(g=>g.group==="Network adapters"&&g.items.some(i=>i.name===selectedDevice))&&machine.networkDriverHealthy===false?<button onClick={repairNetworkDriver} className="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white">Roll Back Driver</button>:null}</div></div>:null}</div></div>
              ) : pcOs === "linux" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f6f5f4] p-4"><div className="mx-auto max-w-3xl"><div className="mb-4 rounded-lg bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Hardware</p><h2 className="mt-1 text-xl font-semibold">{machine.hostname}</h2><p className="text-sm text-slate-500">IT PATH Server system overview</p></div><div className="grid gap-3 sm:grid-cols-2">{hardwareGroups.flatMap((section) => section.items.map((item) => <div key={section.group+item.name} className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs font-medium text-orange-700">{section.group}</p><p className="mt-1 font-medium">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.detail} · {item.status}</p></div>))}</div></div></div>
              ) : (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f5f5f7]"><aside className="hidden w-52 border-r border-black/10 bg-white/70 p-3 sm:block"><p className="mb-3 text-xs font-semibold text-slate-500">System Information</p><button onClick={()=>launch("hardware")} className="block w-full rounded-md bg-blue-500 px-2 py-1.5 text-left text-xs text-white">Hardware</button><button onClick={()=>launch("network")} className="mt-1 block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-blue-100">Network</button><button onClick={()=>launch("services")} className="mt-1 block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-blue-100">Software & Services</button></aside><div className="min-w-0 flex-1 overflow-y-auto p-5"><h2 className="mb-4 text-lg font-semibold">Hardware Overview</h2><div className="rounded-xl border border-black/10 bg-white p-4 text-sm">{[["Model Name","PathOS Pear Virtual Workstation"],["Computer Name",machine.hostname],["Processor","PathSilicon Virtual CPU"],["Memory",`${machine.memoryTotalMb} MB`],["Storage",`${100-machine.diskUsedPercent}% available`]].map(([k,v]) => <div key={k} className="grid grid-cols-2 border-b py-2 last:border-0"><span className="text-right text-slate-500">{k}:</span><span className="pl-4">{v}</span></div>)}</div><h3 className="mb-2 mt-5 text-sm font-semibold">Hardware Details</h3>{hardwareGroups.map((section) => <div key={section.group} className="mb-3 rounded-xl border border-black/10 bg-white p-3"><p className="mb-2 text-xs font-semibold text-slate-500">{section.group}</p>{section.items.map((item) => <div key={item.name} className="py-1 text-sm">{item.name}<span className="ml-2 text-xs text-slate-400">{item.detail}</span></div>)}</div>)}</div></div>
              )
            ) : openApp === "control" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-white p-5">{controlView!=="home"?<button onClick={()=>setControlView("home")} className="mb-4 rounded border px-3 py-1.5 text-xs">← Control Panel Home</button>:null}{controlView==="home"?<><div className="mb-5"><h2 className="text-xl font-semibold">Control Panel</h2><p className="text-xs text-slate-500">Adjust classic Windows settings and administrative tools.</p></div><div className="grid gap-3 sm:grid-cols-2">{[["System and Security","Security, system information and administrative tools","system"],["Network and Internet","Network status, adapters and connection settings","network"],["Programs","Installed programs and Windows features","programs"],["User Accounts","Local users, groups and account state","users"],["Administrative Tools","Services, Event Viewer and system utilities","tools"]].map(([a,b,v])=><button key={a} onClick={()=>setControlView(v as any)} className="rounded-xl border p-4 text-left hover:bg-blue-50"><b className="text-sm text-blue-800">{a}</b><p className="mt-1 text-xs text-slate-500">{b}</p></button>)}</div></>:controlView==="network"?<><h2 className="text-lg font-semibold">Network and Sharing Center</h2><div className="mt-4 rounded-xl border p-4"><p className="text-sm font-medium">Active network</p><p className="mt-1 text-xs text-slate-500">{primaryInterface(machine)?.up?"Connected":"Disconnected"} · {primaryInterface(machine)?.name} · {primaryInterface(machine)?.ip||"No address"}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>launch("network")} className="rounded border px-3 py-2 text-xs">Change adapter settings</button><button onClick={()=>launch("network")} className="rounded border px-3 py-2 text-xs">View connection details</button></div></div></>:controlView==="programs"?<><h2 className="text-lg font-semibold">Programs and Features</h2><div className="mt-4 divide-y rounded-xl border">{["IT PATH Training Tools","Microsoft Edge","Windows Terminal","Notepad"].map(x=><div key={x} className="flex items-center p-3 text-sm"><span className="flex-1">{x}</span><span className="text-xs text-slate-400">Installed</span></div>)}</div></>:controlView==="users"?<><h2 className="text-lg font-semibold">User Accounts</h2><p className="mt-1 text-xs text-slate-500">{machine.users.length} local accounts configured.</p><button onClick={()=>launch("accounts")} className="mt-4 rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Manage local users and groups</button></>:controlView==="tools"?<><h2 className="text-lg font-semibold">Windows Tools</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{[["Event Viewer","logs"],["Services","services"],["Computer Management · Users","accounts"],["Disk Management","storage"],["Device Manager","hardware"],["System Information","systeminfo"]].map(([a,v])=><button key={a} onClick={()=>launch(v as AppId)} className="rounded-xl border p-3 text-left text-sm hover:bg-blue-50">{a}</button>)}</div></>:<><h2 className="text-lg font-semibold">System and Security</h2><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={()=>launch("systeminfo")} className="rounded-xl border p-4 text-left"><b>System</b><p className="text-xs text-slate-500">Computer, OS and hardware information</p></button><button onClick={()=>launch("logs")} className="rounded-xl border p-4 text-left"><b>Event Viewer</b><p className="text-xs text-slate-500">Review system and application events</p></button><button onClick={()=>launch("services")} className="rounded-xl border p-4 text-left"><b>Services</b><p className="text-xs text-slate-500">Manage background services</p></button><button onClick={()=>launch("storage")} className="rounded-xl border p-4 text-left"><b>Storage</b><p className="text-xs text-slate-500">Review disks and free space</p></button></div></>}</div>
            ) : openApp === "systeminfo" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-white p-5"><h2 className="text-xl font-semibold">System Information</h2><p className="mb-4 text-xs text-slate-500">System Summary</p><div className="overflow-hidden rounded-xl border">{[["OS Name",machine.osName],["System Name",machine.hostname],["System Manufacturer","IT PATH Virtual Systems"],["System Model","Training Workstation"],["System Type","x64-based PC"],["Processor","Virtual x64 Processor"],["Installed Physical Memory",`${Math.round(machine.memoryTotalMb/1024)} GB`],["Available Physical Memory",`${Math.max(0,Math.round((machine.memoryTotalMb-machine.memoryUsedMb)/1024*10)/10)} GB`],["Boot Device","\\Device\\HarddiskVolume1"],["Windows Directory","C:\\Windows"],["System Directory","C:\\Windows\\System32"],["Network Adapter",primaryInterface(machine)?.name??"—"],["IPv4 Address",primaryInterface(machine)?.ip??"—"],["Default Gateway",primaryInterface(machine)?.gateway??"—"],["DNS Servers",machine.dnsServers.join(", ")||"—"]].map(([a,b])=><div key={a} className="grid grid-cols-[minmax(120px,35%)_1fr] border-b text-xs last:border-b-0"><span className="bg-slate-50 p-2 font-medium text-slate-600">{a}</span><span className="break-words p-2">{b}</span></div>)}</div></div>
            ) : openApp === "services" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto p-4",pcOs==="windows"?"bg-white":pcOs==="linux"?"bg-[#f7f6f5]":"bg-[#f5f5f7]")}><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-semibold">{pcOs==="windows"?"Services":pcOs==="linux"?"Services":"Background Services"}</h2><p className="text-xs text-slate-500">{pcOs==="windows"?"Local services · status and startup":pcOs==="linux"?"systemd units · terminal and GUI share state":"PathOS background services · terminal and GUI share state"}</p></div><input value={serviceQuery} onChange={e=>setServiceQuery(e.target.value)} placeholder="Filter services" className="select-text rounded border bg-white px-3 py-2 text-xs"/></div>{pcOs==="windows"?<div className="mb-1 hidden grid-cols-[1.5fr_1fr_90px_90px_70px] gap-2 border-b bg-slate-50 px-2 py-2 text-[10px] font-semibold text-slate-500 sm:grid"><span>Name</span><span>Description</span><span>Status</span><span>Startup</span><span>Action</span></div>:null}<div className={cn(pcOs==="windows"?"border":"space-y-2")}>{machine.services.filter(s=>!serviceQuery||s.display.toLowerCase().includes(serviceQuery.toLowerCase())||s.name.toLowerCase().includes(serviceQuery.toLowerCase())).map(svc=>pcOs==="windows"?<div key={svc.name} className="grid grid-cols-[1fr_auto] gap-2 border-b p-2 text-xs sm:grid-cols-[1.5fr_1fr_90px_90px_70px]"><div><b>{svc.display}</b><p className="text-[10px] text-slate-400">{svc.name}</p></div><span className="hidden text-slate-500 sm:block">Background system service</span><span>{svc.status}</span><span className="hidden sm:block">{svc.startType}</span><button onClick={()=>toggleService(svc.name,svc.status==="running")} className="rounded border px-2 py-1">{svc.status==="running"?"Stop":"Start"}</button></div>:<div key={svc.name} className="flex items-center gap-3 rounded-xl border bg-white p-3"><ServerCog className={cn("size-5",pcOs==="linux"?"text-[#e95420]":"text-blue-600")}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{svc.display}</p><p className="text-xs text-slate-500">{pcOs==="linux"?`${svc.name}.service`:`com.itpath.${svc.name}`} · {svc.startType} · {svc.status}</p></div><button onClick={()=>toggleService(svc.name,svc.status==="running")} className="rounded-lg border px-2 py-1 text-xs">{svc.status==="running"?"Stop":"Start"}</button></div>)}</div></div>
            ) : (
              pcOs === "windows" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f7f9fc] p-5">{windowsSettingsView!=="home"?<button onClick={()=>setWindowsSettingsView("home")} className="mb-3 rounded-lg border bg-white px-3 py-1.5 text-xs">← Settings</button>:null}{windowsSettingsView==="home"?<><div className="mb-5"><h2 className="text-xl font-semibold">Settings</h2><p className="text-sm text-slate-500">{machine.hostname} · {machine.osName}</p></div><div className="grid gap-3 sm:grid-cols-2">{[["System","Display, sound, storage and device information","system"],["Bluetooth & devices","Hardware and connected devices","hardware"],["Network & internet","Ethernet, IP and DNS","network"],["Personalization","Theme and desktop appearance","personalization"],["Accounts","Local users and administrator access","accounts"],["Apps","Installed applications and startup behavior","apps"],["Time & language","Clock, region and language","time"],["Windows Update","Update status and servicing","update"],["Privacy & security","Security status and protection","security"],["Storage","Volumes and disk usage","storage"],["Services","Background services and startup","services"],["Control Panel","Classic Windows configuration and administration","control"]].map(([name,desc,target])=><button key={name} onClick={()=>target==="system"||target==="apps"||target==="update"||target==="security"||target==="personalization"||target==="time"?setWindowsSettingsView(target as "system"|"apps"|"update"|"security"|"personalization"|"time"):launch(target as AppId)} className="rounded-xl border bg-white p-4 text-left hover:border-cyan-400"><b>{name}</b><p className="mt-1 text-xs text-slate-500">{desc}</p></button>)}</div></>:windowsSettingsView==="system"?<><h2 className="text-xl font-semibold">System · About</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Device name",machine.hostname],["Operating system",machine.osName],["Installed RAM",`${Math.round(machine.memoryTotalMb/1024)} GB`],["System type","64-bit operating system, x64-based processor"],["Workgroup","WORKGROUP"],["Device role","IT PATH training workstation"]].map(([k,v])=><div key={k} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 text-sm font-medium">{v}</p></div>)}</div><div className="mt-4 rounded-xl border bg-white p-4"><b className="text-sm">Rename this PC</b><p className="mt-1 text-xs text-slate-500">Computer-name changes require a restart before dependent services should be considered fully refreshed.</p><div className="mt-3 flex gap-2"><input value={deviceNameDraft} onChange={e=>setDeviceNameDraft(e.target.value)} className="min-w-0 flex-1 select-text rounded-lg border px-3 py-2 text-sm" maxLength={15}/><button onClick={renameWorkstation} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Rename</button></div>{machine.restartRequired?<div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><span>Restart required to finish pending system changes.</span><button onClick={restartWorkstation} className="rounded bg-amber-600 px-3 py-1.5 font-semibold text-white">Restart now</button></div>:null}</div><div className="mt-4 grid gap-2 sm:grid-cols-3"><button onClick={()=>launch("processes")} className="rounded-lg border bg-white p-3 text-sm">Task Manager</button><button onClick={()=>launch("hardware")} className="rounded-lg border bg-white p-3 text-sm">Device Manager</button><button onClick={()=>launch("storage")} className="rounded-lg border bg-white p-3 text-sm">Disk Management</button></div></>:windowsSettingsView==="apps"?<><h2 className="text-xl font-semibold">Apps</h2><p className="mb-4 text-sm text-slate-500">Installed apps and startup-related processes.</p><div className="space-y-2">{["IT PATH Training Tools","Microsoft Edge","Windows Terminal","Notepad","Calculator"].map((app,i)=><div key={app} className="flex items-center rounded-xl border bg-white p-3"><div className="flex-1"><b className="text-sm">{app}</b><p className="text-xs text-slate-500">{i===0?"Training environment component":"Installed application"}</p></div><span className="text-xs text-slate-400">Installed</span></div>)}</div><button onClick={()=>launch("processes")} className="mt-4 rounded-lg border bg-white px-3 py-2 text-xs">Open Task Manager for running/startup processes</button></>:windowsSettingsView==="personalization"?<><h2 className="text-xl font-semibold">Personalization</h2><p className="mb-4 text-sm text-slate-500">Choose the appearance of the Windows training desktop.</p><div className="grid gap-3 sm:grid-cols-2">{(["dark","light"] as const).map(theme=><button key={theme} onClick={()=>setWindowsTheme(theme)} className={cn("rounded-xl border bg-white p-4 text-left",windowsTheme===theme&&"border-cyan-500 ring-2 ring-cyan-100")}><div className={cn("mb-3 h-20 rounded-lg",theme==="dark"?"bg-gradient-to-br from-[#071426] to-[#174c82]":"bg-gradient-to-br from-sky-100 to-slate-50")}/><b className="capitalize">{theme} desktop</b><p className="text-xs text-slate-500">{theme==="dark"?"Deep blue IT PATH workspace":"Bright Windows-style workspace"}</p></button>)}</div></>:windowsSettingsView==="time"?<><h2 className="text-xl font-semibold">Time & language</h2><div className="mt-4 rounded-xl border bg-white p-5"><p className="text-xs text-slate-500">Current training workstation time</p><p className="mt-1 text-xl font-semibold">{new Date().toLocaleString()}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3 text-xs"><span className="text-slate-500">Time synchronization</span><p className="mt-1 font-medium">Training host synchronized</p></div><div className="rounded-lg bg-slate-50 p-3 text-xs"><span className="text-slate-500">Region format</span><p className="mt-1 font-medium">System default</p></div></div><p className="mt-4 text-xs text-slate-500">Clock and region faults can be added to future troubleshooting tickets without turning this page into a decorative control panel.</p></div></>:windowsSettingsView==="update"?<><h2 className="text-xl font-semibold">Windows Update</h2><div className="mt-4 rounded-xl border bg-white p-5"><ShieldCheck className="mb-3 size-8 text-cyan-600"/><b>{machine.restartRequired?"Restart required":(machine.pendingUpdates?.length??0)>0?`${machine.pendingUpdates!.length} update(s) available`:"You're up to date"}</b><p className="mt-1 text-xs text-slate-500">{machine.restartRequired?"An installed update is waiting for a simulated restart.":(machine.pendingUpdates?.length??0)>0?"Review the available quality, security, or driver updates before installing.":"No pending training updates. Driver faults can still be diagnosed and rolled back through Device Manager."}</p>{(machine.pendingUpdates??[]).map(u=><div key={u.title} className="mt-2 rounded border bg-slate-50 p-2 text-xs"><b>{u.title}</b><span className="ml-2 text-slate-400">{u.kind}</span></div>)}<button onClick={()=>{recordEvidence("GUI: checked Windows Update status");mutate(next=>{ensureWorkstationState(next);if(next.pendingUpdates?.length){next.pendingUpdates=[];next.restartRequired=true;}})}} className="mt-4 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white">{(machine.pendingUpdates?.length??0)>0?"Install updates":"Check for updates"}</button></div></>:<><h2 className="text-xl font-semibold">Privacy & security</h2><div className="mt-4 rounded-xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><div><b className="text-sm">Microsoft Defender Firewall</b><p className="text-xs text-slate-500">Control the simulated Windows firewall state used by networking and troubleshooting.</p></div><button onClick={()=>setFirewallDraft(v=>!v)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold",firewallDraft?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700")}>{firewallDraft?"On":"Off"}</button></div>{firewallDraft!==machine.firewallEnabled?<button onClick={applyFirewall} className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Apply firewall change</button>:null}</div><div className="mt-4 grid gap-3">{[["Windows Security",machine.security?.antivirusEnabled&&machine.security?.realtimeProtection?"No simulated protection alerts":"Protection requires attention",machine.security?.antivirusEnabled?"Protected":"Off"],["Firewall & network protection",`${machine.security?.firewallProfile??"Private"} profile · ${machine.firewallEnabled?"firewall on":"firewall off"}`,machine.firewallEnabled?"On":"Off"],["Device security","Standard workstation security baseline","Ready"],["Account protection",machine.users.some(u=>u.locked)?"A local account requires attention":"No account alerts",machine.users.some(u=>u.locked)?"Review":"OK"]].map(([a,b,s])=><div key={a} className="flex items-center rounded-xl border bg-white p-4"><ShieldCheck className="mr-3 size-5 text-cyan-600"/><div className="flex-1"><b className="text-sm">{a}</b><p className="text-xs text-slate-500">{b}</p></div><span className="text-xs font-semibold text-slate-500">{s}</span></div>)}</div></>}</div>
              ) : pcOs === "linux" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f7f6f5]"><aside className="hidden w-48 border-r border-black/10 bg-[#eeeae7] p-3 sm:block"><b className="text-sm">Settings</b>{[["Network","network"],["Users","accounts"],["System","hardware"],["Storage","storage"],["Hardware","hardware"]].map(([x,target])=><button key={x} onClick={()=>launch(target as AppId)} className="mt-2 block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-orange-100">{x}</button>)}</aside><div className="min-w-0 flex-1 overflow-y-auto p-5"><h2 className="text-xl font-semibold">System Settings</h2><p className="mb-5 text-sm text-slate-500">{machine.hostname} · IT PATH Server workstation</p><div className="grid gap-3 sm:grid-cols-2">{[["Network","Connections, IPv4 and DNS","network"],["Users","Accounts and sudo access","accounts"],["System Monitor","Processes and resources","processes"],["Disks","Storage and filesystems","storage"],["Hardware","Devices and system information","hardware"],["Services","systemd units","services"]].map(([name,desc,target])=><button key={name} onClick={()=>launch(target as AppId)} className="rounded-xl bg-white p-4 text-left shadow-sm hover:ring-1 hover:ring-[#e95420]"><b>{name}</b><p className="mt-1 text-xs text-slate-500">{desc}</p></button>)}</div></div></div>
              ) : (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f5f5f7]"><aside className="hidden w-52 border-r border-black/10 bg-white/70 p-3 sm:block"><b className="text-sm">System Settings</b>{[["Network","network"],["Users & Groups","accounts"],["General","hardware"],["Storage","storage"]].map(([x,target],i)=><button key={x} onClick={()=>launch(target as AppId)} className={cn("mt-2 block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-100",i===0&&"bg-blue-500 text-white")}>{x}</button>)}</aside><div className="min-w-0 flex-1 overflow-y-auto p-5"><h2 className="text-xl font-semibold">System Settings</h2><p className="mb-5 text-sm text-slate-500">{machine.hostname} · PathOS Pear</p><div className="space-y-3">{[["Network","Network services, TCP/IP and DNS","network"],["Users & Groups","Local users and administrator access","accounts"],["General / Storage","PathFS volumes and disk usage","storage"],["System Information","Hardware and software details","hardware"],["Activity Monitor","Processes and resource use","processes"],["Background Agents & Services","Background services and startup agents","services"]].map(([name,desc,target])=><button key={name} onClick={()=>launch(target as AppId)} className="flex w-full items-center rounded-xl border border-black/10 bg-white p-4 text-left hover:bg-blue-50"><div><b>{name}</b><p className="text-xs text-slate-500">{desc}</p></div><ChevronLeft className="ml-auto size-4 rotate-180 text-slate-400"/></button>)}</div></div></div>
              )
            )}
            {propertiesItem ? <div className="absolute inset-0 z-40 flex items-end bg-black/25 sm:items-center sm:justify-center" onClick={() => setPropertiesItem(null)}><div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:w-[28rem] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}><h3 className="font-semibold">{pcOs === "windows" ? "Properties · Security" : pcOs === "linux" ? "Properties · Permissions" : "Details · Sharing & Permissions"}</h3><p className="mb-4 truncate text-xs text-slate-500">{propertiesItem.name}</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-600">Owner<input value={propertyOwner} onChange={(e) => setPropertyOwner(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs text-slate-600">Group<input value={propertyGroup} onChange={(e) => setPropertyGroup(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 text-sm" /></label></div><div className="mt-3"><p className="mb-2 text-xs font-medium text-slate-600">{pcOs === "windows" ? "Permission level (training representation)" : "Unix mode"}</p><div className="flex flex-wrap gap-2">{["644","600","755","700"].map((mode) => <button key={mode} onClick={() => setPropertyMode(mode)} className={cn("rounded-lg border px-3 py-2 text-xs", propertyMode === mode && "border-blue-500 bg-blue-50 text-blue-700")}>{mode} · {mode === "644" ? "owner write / others read" : mode === "600" ? "owner only" : mode === "755" ? "owner write / all execute" : "owner only execute"}</button>)}</div><input value={propertyMode} onChange={(e) => setPropertyMode(e.target.value.replace(/[^0-7]/g, "").slice(0,3))} inputMode="numeric" className="mt-2 w-24 select-text rounded-lg border px-3 py-2 font-mono text-sm" /></div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><p>{pcOs === "windows" ? "Security principal" : "Owner"}: {propertyOwner || "—"}</p><p>Group: {propertyGroup || "—"}</p><p>Path: {pathFor(propertiesItem.name)}</p></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setPropertiesItem(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={saveProperties} disabled={!/^[0-7]{3}$/.test(propertyMode)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Apply</button></div></div></div> : null}
            {contextItem ? <div className="absolute inset-0 z-30 flex items-end bg-black/20 sm:items-center sm:justify-center" onClick={() => setContextItem(null)}><div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:w-80 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-3"><p className="truncate text-sm font-semibold">{contextItem.name}</p><p className="text-xs text-slate-500">{contextItem.kind === "folder" ? "Folder" : contextItem.detail}</p></div><div className="mb-3 flex gap-2"><input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="min-w-0 flex-1 select-text rounded-lg border px-3 py-2 text-sm" /><button onClick={renameItem} className="rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white">Rename</button></div><div className="grid grid-cols-2 gap-2 text-sm"><button onClick={() => { openFile(contextItem); setContextItem(null); }} className="rounded-lg bg-slate-100 p-3">Open</button><button onClick={() => copyItem(false)} className="rounded-lg bg-slate-100 p-3">Copy</button><button onClick={() => copyItem(true)} className="rounded-lg bg-slate-100 p-3">Cut</button><button onClick={() => deleteItem(contextItem)} className="rounded-lg bg-red-50 p-3 text-red-600">Delete</button><button onClick={() => showProperties(contextItem)} className="col-span-2 rounded-lg bg-slate-100 p-3">Properties / Permissions</button></div><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><p>Location: {pathFor(contextItem.name)}</p></div></div></div> : null}
            {shareFileName ? <div className="absolute inset-0 z-20 flex flex-col bg-white"><div className="flex h-11 items-center justify-between border-b px-3"><div><strong className="truncate text-sm">{shareFileName}</strong><p className="text-[10px] text-slate-400">\\\\files.itpath.local\\Team Files · {teamFilesAccess==="write"?"Read / write":"Read only"}</p></div><button onClick={()=>setShareFileName(null)}><X className="size-4"/></button></div><textarea value={shareFileText} onChange={(e)=>setShareFileText(e.target.value)} readOnly={teamFilesAccess!=="write"} className="min-h-0 flex-1 select-text resize-none p-4 font-mono text-sm outline-none read-only:bg-slate-50 read-only:text-slate-600"/><div className="flex items-center justify-between gap-3 border-t p-3"><p className="text-[10px] text-slate-500">{teamFilesAccess==="write"?"Your account can save changes if the file permission also allows it.":"This share is read-only for your current account."}</p><button onClick={saveShareFile} disabled={teamFilesAccess!=="write"} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300">Save to share</button></div></div> : null}
            {editing ? <div className="absolute inset-0 z-20 flex flex-col bg-white"><div className="flex h-11 items-center justify-between border-b px-3"><strong className="truncate text-sm">{editing.name}</strong><button onClick={() => setEditing(null)}><X className="size-4" /></button></div><textarea value={fileText} onChange={(e) => setFileText(e.target.value)} className="min-h-0 flex-1 select-text resize-none p-4 font-mono text-sm outline-none [-webkit-touch-callout:default]" /><div className="border-t p-3"><button onClick={saveText} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save file</button></div></div> : null}
          </section>
        ) : null}
      </main>

      {startOpen ? <div className={cn("absolute z-40 shadow-2xl backdrop-blur-2xl",pcOs==="windows"&&"bottom-16 left-1/2 w-[min(92vw,34rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#101b2d]/95 p-4",pcOs==="linux"&&"inset-x-4 bottom-20 top-14 rounded-2xl bg-[#21152a]/95 p-5",pcOs==="mac"&&"bottom-24 left-1/2 w-[min(90vw,30rem)] -translate-x-1/2 rounded-2xl border border-white/20 bg-white/20 p-4")}><div className="mb-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/60"><Search className="size-4"/>{pcOs==="linux"?"Type to search applications":"Search apps and files"}</div><div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-5">{[["browser","Browser",Network],["team-files","Team Files",FolderOpen],["print-center","Print",ServerCog],["updates","Update",ShieldCheck],["files",pcOs==="mac"?"Grove":"Files",FolderOpen],["settings","Settings",Settings],["terminal","Terminal",SquareTerminal],["processes",pcOs==="windows"?"Task Manager":pcOs==="linux"?"System Monitor":"Activity Monitor",Activity],["network","Network",Network],["hardware",pcOs==="windows"?"Device Manager":"System Info",Cpu],["logs",pcOs==="windows"?"Event Viewer":pcOs==="linux"?"Logs":"Console",ScrollText],["storage",pcOs==="windows"?"Disk Management":pcOs==="linux"?"Disks":"Storage Utility",HardDrive],["accounts","Users",UsersRound]].filter(([id])=>!trainingApplications.some(app=>app.id===id)||applicationInstalled(id as TrainingApplicationId,pcOs)).map(([id,label,Icon])=><button key={id as string} onClick={()=>launch(id as AppId)} className="rounded-xl p-3 hover:bg-white/10"><Icon className="mx-auto mb-2 size-7 text-cyan-200"/>{label as string}</button>)}</div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white/85">{machine.currentUser}</p><p className="truncate text-[10px] text-white/45">{machine.hostname}{pcOs==="windows" ? ` · Boot #${machine.bootCount ?? 1}` : ""}</p></div><div className="flex gap-1"><button onClick={restartWorkstation} className="rounded-lg px-3 py-2 text-[10px] font-semibold text-white/75 hover:bg-white/10">Restart</button><button onClick={shutDownWorkstation} className="rounded-lg px-3 py-2 text-[10px] font-semibold text-red-200/80 hover:bg-red-500/15">Shut down</button></div></div></div> : null}

      {pcOs==="windows" ? <footer className="absolute inset-x-0 bottom-0 z-50 flex h-14 items-center justify-center border-t border-white/10 bg-[#071426]/85 px-3 backdrop-blur-xl"><Link to="/dashboard" className="absolute left-3 flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-white/65"><ChevronLeft className="size-4"/><span className="hidden sm:inline">Exit PC</span></Link><div className="flex items-center gap-1"><button onClick={()=>setStartOpen(v=>!v)} className="grid size-10 place-items-center rounded-xl hover:bg-white/10"><span className="grid grid-cols-2 gap-[2px]">{Array.from({length:4}).map((_,i)=><span key={i} className="size-[6px] bg-cyan-300"/>)}</span></button><button onClick={()=>launch("files")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10"><FolderOpen className="size-5 text-amber-300"/></button><button onClick={()=>launch("browser")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10"><Network className="size-5 text-cyan-300"/></button><button onClick={()=>launch("terminal")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10"><SquareTerminal className="size-5 text-cyan-300"/></button></div><div className="absolute right-2 flex h-11 items-center gap-0.5 rounded-lg px-1 text-white/85"><button onClick={()=>launch("network")} title={`${networkState.summary}${networkInterface?.ip ? ` · ${networkInterface.ip}` : ""}`} className={cn("relative grid size-9 place-items-center rounded-lg hover:bg-white/10",trayNetworkState==="offline"&&"text-red-300",(trayNetworkState==="limited"||trayNetworkState==="local")&&"text-amber-300")}><Wifi className="size-4"/>{trayNetworkState!=="online"?<span className={cn("absolute bottom-1 right-1 grid size-3 place-items-center rounded-full text-[8px] font-black text-slate-950",trayNetworkState==="offline"?"bg-red-400":"bg-amber-300")}>!</span>:null}</button><button onClick={()=>{const next=clone(machine);reconcilePrintQueue(next,{...osMachines,[pcOs]:next},virtualEnvironment);saveMachine(next);launch("print-center");}} title={trayPrintError?"Printer needs attention":trayPrinting?"Print job active":"Printer ready"} className={cn("relative grid size-9 place-items-center rounded-lg hover:bg-white/10",trayPrintError&&"text-red-300",trayPrinting&&!trayPrintError&&"text-emerald-300")}><ServerCog className="size-4"/>{trayPrintError?<span className="absolute bottom-1 right-1 size-2 rounded-full bg-red-400"/>:trayPrinting?<span className="absolute bottom-1 right-1 size-2 animate-pulse rounded-full bg-emerald-400"/>:null}</button><button onClick={()=>launch("updates")} title={machine.restartRequired?"Restart required":(machine.pendingUpdates?.length??0)>0?`${machine.pendingUpdates?.length} update(s) available`:"System update ready"} className={cn("relative grid size-9 place-items-center rounded-lg hover:bg-white/10",trayUpdateAttention&&"text-amber-300")}><ShieldCheck className="size-4"/>{trayUpdateAttention?<span className="absolute bottom-1 right-1 size-2 rounded-full bg-amber-300"/>:null}</button><div className="ml-1 hidden min-w-[4.4rem] text-right text-[10px] leading-tight sm:block"><div>{new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div><div className="text-white/55">{new Date().toLocaleDateString([], {month:"numeric",day:"numeric",year:"2-digit"})}</div></div></div></footer> : pcOs==="linux" ? <><div className="absolute right-3 top-11 z-40 flex items-center gap-2 rounded-xl border border-white/10 bg-[#21152a]/80 px-2 py-1.5 text-white/80 backdrop-blur-xl"><Wifi className={cn("size-4",trayNetworkState==="offline"&&"text-red-300",trayNetworkState==="limited"&&"text-amber-300")}/><button onClick={()=>launch("print-center")} title={trayPrintError?"Printer needs attention":trayPrinting?"Print job active":"Printer ready"}><ServerCog className={cn("size-4",trayPrintError&&"text-red-300",trayPrinting&&!trayPrintError&&"text-emerald-300")}/></button></div><footer className="absolute bottom-3 left-1/2 z-50 flex h-12 -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#21152a]/80 px-2 backdrop-blur-xl"><button onClick={()=>setStartOpen(v=>!v)} className="grid size-9 place-items-center rounded-xl bg-orange-500/20"><span className="text-lg">●</span></button><button onClick={()=>launch("files")} className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><FolderOpen className="size-5 text-orange-300"/></button><button onClick={()=>launch("terminal")} className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><SquareTerminal className="size-5 text-cyan-300"/></button><Link to="/dashboard" className="grid size-9 place-items-center rounded-xl text-white/60"><ChevronLeft className="size-4"/></Link></footer></> : <><div className="absolute right-3 top-10 z-40 flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-2 py-1.5 backdrop-blur-xl"><Wifi className={cn("size-4",trayNetworkState==="offline"&&"text-red-300",trayNetworkState==="limited"&&"text-amber-300")}/><button onClick={()=>launch("print-center")}><ServerCog className={cn("size-4",trayPrintError&&"text-red-300",trayPrinting&&!trayPrintError&&"text-emerald-300")}/></button></div><footer className="absolute bottom-3 left-1/2 z-50 flex h-[4.5rem] -translate-x-1/2 items-end gap-1.5 rounded-[1.35rem] border border-white/25 bg-white/15 px-2.5 py-2 shadow-[0_20px_60px_rgba(0,0,0,.35)] backdrop-blur-2xl">{[["files","Grove",FolderOpen,"from-sky-400 to-blue-600"],["settings","Settings",Settings,"from-slate-300 to-slate-500"],["terminal","Terminal",SquareTerminal,"from-slate-700 to-slate-950"],["processes","Activity",Activity,"from-emerald-400 to-teal-600"]].map(([id,label,Icon,gradient])=><button key={id as string} onClick={()=>launch(id as AppId)} title={label as string} className="group relative grid size-12 place-items-center rounded-[.9rem] transition duration-200 hover:-translate-y-2 hover:scale-110"><span className={cn("absolute inset-1 rounded-[.8rem] bg-gradient-to-br shadow-lg",gradient as string)}/><Icon className="relative size-6 text-white drop-shadow"/>{openApp===id?<span className="absolute -bottom-1 size-1 rounded-full bg-white/90"/>:null}<span className="pointer-events-none absolute -top-8 scale-90 rounded-md bg-black/70 px-2 py-1 text-[9px] text-white opacity-0 backdrop-blur transition group-hover:scale-100 group-hover:opacity-100">{label as string}</span></button>)}<span className="mx-0.5 h-10 w-px self-center bg-white/20"/><button onClick={()=>setStartOpen(v=>!v)} title="Pear Launchpad" className="group relative grid size-12 place-items-center rounded-[.9rem] bg-white/10 transition duration-200 hover:-translate-y-2 hover:scale-110"><span className="grid grid-cols-3 gap-1">{Array.from({length:9}).map((_,i)=><span key={i} className="size-1.5 rounded-[35%] bg-lime-200 shadow-sm"/>)}</span><span className="pointer-events-none absolute -top-8 rounded-md bg-black/70 px-2 py-1 text-[9px] text-white opacity-0 transition group-hover:opacity-100">Launchpad</span></button><Link to="/dashboard" title="Exit PathOS Pear" className="group relative grid size-12 place-items-center rounded-[.9rem] text-white/75 transition duration-200 hover:-translate-y-2 hover:bg-white/10"><ChevronLeft className="size-5"/><span className="pointer-events-none absolute -top-8 rounded-md bg-black/70 px-2 py-1 text-[9px] text-white opacity-0 transition group-hover:opacity-100">Exit</span></Link></footer></>}    </div>
  );
}
