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
import { trainingTickets } from "@/lib/training/tickets";
import { execute } from "@/lib/terminal/shells";
import { clone, copyPath, createMachine, getNode, killProcess, makeDir, movePath, primaryInterface, removePath, setServiceStatus, writeFile, type MachineState, type VfsNode } from "@/lib/terminal/machine";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/virtual-pc")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Virtual PC | IT PATH" },
      { name: "description", content: "Practice working inside a safe, responsive virtual Windows-style computer." },
    ],
  }),
  component: VirtualPcPage,
});

type AppId = "files" | "settings" | "terminal" | "processes" | "network" | "services" | "hardware" | "logs" | "storage" | "accounts";
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

function VirtualPcPage() {
  const { user, actions } = useAppState();
  const sharedAttempt = user.terminalAttempts.find((attempt) => attempt.scenarioId === SHARED_WINDOWS_SCENARIO && attempt.status === "in_progress");
  const [fallbackMachine] = useState<MachineState>(() => freshWindowsMachine());
  const [pcOs, setPcOs] = useState<PcOs>("windows");
  const [osMachines, setOsMachines] = useState<Record<PcOs, MachineState>>(() => ({ windows: sharedAttempt?.machine ?? freshWindowsMachine(), linux: createMachine({ shell: "bash", hostname: "itpath-linux" }), mac: createMachine({ shell: "mac", hostname: "itpath-mac" }) }));
  const machine = pcOs === "windows" ? (sharedAttempt?.machine ?? osMachines.windows ?? fallbackMachine) : osMachines[pcOs];
  const [folder, setFolder] = useState<string[]>(["Users", "student"]);
  const [openApp, setOpenApp] = useState<AppId | null>("files");
  const [startOpen, setStartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftName, setDraftName] = useState("");
  const [editing, setEditing] = useState<VirtualFile | null>(null);
  const [fileText, setFileText] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [accountName, setAccountName] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeFault, setActiveFault] = useState<TrainingFault | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketVerified, setTicketVerified] = useState(false);
  const [ticketEvidence, setTicketEvidence] = useState<string[]>([]);
  const [gaylHelpLevel, setGaylHelpLevel] = useState(0);
  const [netIp, setNetIp] = useState("");
  const [netMask, setNetMask] = useState("");
  const [netGateway, setNetGateway] = useState("");
  const [netDns, setNetDns] = useState("");
  const [contextItem, setContextItem] = useState<VirtualFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [propertiesItem, setPropertiesItem] = useState<VirtualFile | null>(null);
  const [propertyOwner, setPropertyOwner] = useState("");
  const [propertyGroup, setPropertyGroup] = useState("");
  const [propertyMode, setPropertyMode] = useState("");
  const [clipboard, setClipboard] = useState<{ item: VirtualFile; from: string; cut: boolean } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNode = getNode(machine, folder);
  const visibleFiles = useMemo(
    () => entries(currentNode).filter((file) => file.name.toLowerCase().includes(query.toLowerCase())),
    [currentNode, query],
  );

  const pathFor = (name?: string) => {
    const parts = [...folder, ...(name ? [name] : [])];
    return pcOs === "windows" ? `C:\\${parts.join("\\")}` : `/${parts.join("/")}`;
  };
  const saveMachine = (next: MachineState) => {
    setOsMachines((current) => ({ ...current, [pcOs]: next }));
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`itpath-virtualpc-ticket-${pcOs}`);
      if (!saved) { setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); return; }
      const parsed = JSON.parse(saved) as { ticketId: string; fault: TrainingFault; verified?: boolean };
      setActiveTicketId(parsed.ticketId); setActiveFault(parsed.fault); setTicketVerified(Boolean(parsed.verified)); setTicketEvidence((parsed as any).evidence ?? []); setGaylHelpLevel((parsed as any).helpLevel ?? 0);
    } catch { setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); }
  }, [pcOs]);

  useEffect(() => {
    if (!activeTicketId || !activeFault) return;
    localStorage.setItem(`itpath-virtualpc-ticket-${pcOs}`, JSON.stringify({ ticketId: activeTicketId, fault: activeFault, verified: ticketVerified, evidence: ticketEvidence, helpLevel: gaylHelpLevel }));
  }, [activeTicketId, activeFault, ticketVerified, ticketEvidence, gaylHelpLevel, pcOs]);

  const activeTicket = trainingTickets.find((ticket) => ticket.id === activeTicketId);
  const repairReady = Boolean(activeFault && trainingFaultResolved(machine, activeFault));
  const ticketResolved = repairReady && ticketVerified;
  const startTicket = (ticketId: string) => {
    const ticket = trainingTickets.find((item) => item.id === ticketId);
    if (!ticket || activeTicketId) return;
    const next = clone(machine);
    const fault = injectTrainingFault(next, ticket.fault);
    saveMachine(next);
    setActiveTicketId(ticket.id); setActiveFault(fault); setTicketVerified(false); setTicketEvidence(["Ticket opened"]); setGaylHelpLevel(0); setTicketOpen(true); setTerminalLines([]);
  };
  const verifyTicket = () => {
    if (!activeFault) return;
    const passed = trainingFaultResolved(machine, activeFault);
    setTicketVerified(passed); setTicketEvidence((items) => [...items, passed ? "Fix verified successfully" : "Verification attempted; issue remains"].slice(-40));
    if (passed) mutate((next) => { addEvent(next, `Help desk ticket ${activeTicketId?.replace("ticket-","") ?? ""} verified resolved.`); });
  };
  const closeTicket = () => {
    if (!ticketResolved) return;
    localStorage.removeItem(`itpath-virtualpc-ticket-${pcOs}`);
    setActiveTicketId(null); setActiveFault(null); setTicketVerified(false); setTicketEvidence([]); setGaylHelpLevel(0); setTicketOpen(false);
  };
  const cleanupStorage = () => {
    recordEvidence("GUI: storage cleanup performed");
    mutate((next) => { reclaimTrainingDiskSpace(next, 12); });
  };

  const recordEvidence = (message: string) => { if (activeTicketId) setTicketEvidence((items) => [...items, message].slice(-40)); };
  const gaylHelp = () => { if (!activeFault) return; setGaylHelpLevel((level) => Math.min(3, level + 1)); recordEvidence(`GAYL assistance requested (level ${Math.min(3, gaylHelpLevel + 1)})`); };
  const gaylMessage = !activeFault ? "" : gaylHelpLevel === 0 ? "I’ll stay out of the way unless you need me." : gaylHelpLevel === 1 ? "Start with evidence. Inspect the part of the system connected to the symptom before changing anything." : gaylHelpLevel === 2 ? ({dns:"Compare the DNS configuration with the network path, then test name resolution.",adapter:"Check whether the primary network interface is enabled and has a usable configuration.",gateway:"Inspect the default route or gateway before changing addressing.",service:"Identify the service tied to the failed feature and inspect its current state.",disk:"Check disk usage and identify safe temporary or cached data before deleting anything.",account:"Inspect the affected user's account state before enabling or resetting it.",driver:"Open Device Manager and inspect the network adapter's device status before changing it."} as Record<string,string>)[activeFault.kind] : ({dns:"Repair the invalid DNS server, then test hostname resolution again.",adapter:"Re-enable the affected network interface, then verify connectivity.",gateway:"Restore a valid default gateway and verify off-subnet connectivity.",service:"Start the stopped required service and confirm it remains running.",disk:"Reclaim enough safe storage to bring usage below the warning threshold.",account:"Use an administrative account-management tool to enable the affected user, then verify the account state.",driver:"The adapter reports a driver start failure. Restore the previous working driver, then verify the adapter and connectivity."} as Record<string,string>)[activeFault.kind];

  const runEmbeddedTerminal = () => {
    const command = terminalInput.trim();
    if (!command) return;
    const before = prompt(machine);
    const result = execute(machine, command);
    saveMachine(result.state);
    setTerminalLines((lines) => [...lines, `${before}${command}`, result.output].filter(Boolean).slice(-120));
    recordEvidence(`Terminal: ${command}`);
    setTerminalInput("");
  };

  const switchOs = (next: PcOs) => {
    setPcOs(next);
    setFolder(next === "windows" ? ["Users", "student"] : next === "mac" ? ["Users", "student"] : ["home", "student"]);
    setTerminalLines([]);
    setOpenApp(null);
    setStartOpen(false);
  };

  const addEvent = (next: MachineState, message: string) => { next.eventLog = [...(next.eventLog ?? []), message].slice(-250); };
  const endProcess = (pid: number) => { recordEvidence(`GUI: ended process PID ${pid}`); mutate((next) => { killProcess(next, String(pid)); addEvent(next, `Process PID ${pid} ended by ${next.currentUser}.`); }); };
  const toggleService = (name: string, running: boolean) => { recordEvidence(`GUI: ${running ? "stopped" : "started"} service ${name}`); mutate((next) => { setServiceStatus(next, name, running ? "stopped" : "running"); addEvent(next, `Service ${name} ${running ? "stopped" : "started"} by ${next.currentUser}.`); }); };
  const toggleNetwork = () => { const iface = primaryInterface(machine); recordEvidence(`GUI: ${iface?.up ? "disabled" : "enabled"} network interface ${iface?.name ?? ""}`); mutate((next) => { const target = primaryInterface(next); if (target) { target.up = !target.up; addEvent(next, `Network interface ${target.name} changed to ${target.up ? "up" : "down"}.`); } }); };
  const beginNetworkEdit = () => { const iface = primaryInterface(machine); recordEvidence("GUI: inspected network configuration"); setNetIp(iface?.ip ?? ""); setNetMask(iface?.mask ?? ""); setNetGateway(iface?.gateway ?? ""); setNetDns(machine.dnsServers.join(", ")); };
  const saveNetwork = (dhcp: boolean) => { recordEvidence(`GUI: saved network configuration (${dhcp ? "DHCP" : "manual"})`); mutate((next) => { const iface = primaryInterface(next); if (!iface) return; iface.dhcp = dhcp; if (dhcp) { iface.ip = "10.0.0.54"; iface.mask = "255.255.255.0"; iface.gateway = "10.0.0.1"; next.dnsServers = ["10.0.0.10"]; } else { if (netIp.trim()) iface.ip = netIp.trim(); if (netMask.trim()) iface.mask = netMask.trim(); iface.gateway = netGateway.trim(); next.dnsServers = netDns.split(",").map((v) => v.trim()).filter(Boolean); } addEvent(next, `${pcOs === "windows" ? "TCP/IP" : pcOs === "linux" ? "Network interface" : "Network service"} configuration updated (${dhcp ? "DHCP" : "manual"}).`); }); };

  const addAccount = () => {
    const name = accountName.trim().replace(/\s+/g, "").toLowerCase();
    if (!name || machine.users.some((u) => u.name.toLowerCase() === name)) return;
    mutate((next) => {
      next.users.push({ name, fullName: accountName.trim(), groups: pcOs === "windows" ? ["Users"] : ["users"], admin: false, locked: false, passwordExpired: false });
      makeDir(next, pcOs === "windows" ? `C:\\Users\\${name}` : pcOs === "mac" ? `/Users/${name}` : `/home/${name}`);
      addEvent(next, `User account ${name} created.`);
    });
    setAccountName("");
  };
  const toggleAdmin = (name: string) => { recordEvidence(`GUI: changed administrator access for ${name}`); mutate((next) => { const u = next.users.find((item) => item.name === name); if (u) { u.admin = !u.admin; u.groups = u.admin ? Array.from(new Set([...u.groups, pcOs === "windows" ? "Administrators" : pcOs === "mac" ? "admin" : "sudo"])) : u.groups.filter((g) => !["Administrators","admin","sudo"].includes(g)); addEvent(next, `Account ${name} administrator access ${u.admin ? "enabled" : "removed"}.`); } }); };
  const toggleLock = (name: string) => { const current=machine.users.find((u)=>u.name===name); recordEvidence(`GUI: ${current?.locked ? "unlocked" : "locked"} account ${name}`); mutate((next) => { const u = next.users.find((item) => item.name === name); if (u) { u.locked = !u.locked; addEvent(next, `Account ${name} ${u.locked ? "locked" : "unlocked"}.`); } }); };

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
      { group: "Hardware Overview", items: [{ name: "Processor", detail: "Virtual Apple-compatible training CPU", status: "Normal" }, { name: "Memory", detail: `${machine.memoryTotalMb} MB`, status: "Normal" }] },
      { group: "Storage", items: [{ name: "Virtual SSD", detail: `${machine.diskUsedPercent}% used`, status: "S.M.A.R.T. status: Verified" }] },
      { group: "Network", items: [{ name: iface?.name ?? "en0", detail: iface?.up ? iface.ip : "Inactive", status: iface?.up ? "Active" : "Inactive" }] },
    ];
  }, [machine, pcOs]);

  const launch = (app: AppId) => {
    setOpenApp(app);
    setStartOpen(false);
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[#071426] text-white select-none [-webkit-touch-callout:none] overscroll-none">
      <div className={cn("absolute inset-0", pcOs === "windows" && "bg-[radial-gradient(circle_at_72%_18%,rgba(38,140,255,.34),transparent_32%),linear-gradient(145deg,#061426_0%,#0b2140_50%,#174c82_100%)]", pcOs === "linux" && "bg-[radial-gradient(circle_at_25%_25%,rgba(255,110,40,.26),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(104,63,180,.34),transparent_35%),linear-gradient(145deg,#24102e,#3c174b_48%,#171128)]", pcOs === "mac" && "bg-[radial-gradient(circle_at_70%_20%,rgba(80,190,255,.34),transparent_30%),radial-gradient(circle_at_25%_80%,rgba(255,120,190,.24),transparent_35%),linear-gradient(145deg,#16304c,#315a75_48%,#70526f)]")} />
      <button onClick={()=>setTicketOpen(v=>!v)} className="absolute bottom-20 right-3 z-40 rounded-xl border border-cyan-300/30 bg-[#0d1b2e]/95 px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur-xl sm:right-4">Tickets{activeTicket ? ` · ${activeTicket.id.replace("ticket-","")}` : ""}</button>
      {ticketOpen ? <div className="absolute bottom-32 right-3 z-50 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#0d1b2e]/95 shadow-2xl backdrop-blur-2xl sm:right-4"><div className="flex items-center justify-between border-b border-white/10 p-4"><div><b>Help Desk Queue</b><p className="text-xs text-slate-400">Diagnose from symptoms. The cause is hidden.</p></div><button onClick={()=>setTicketOpen(false)}><X className="size-4"/></button></div>{activeTicket ? <div className="p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-cyan-300">#{activeTicket.id.replace("ticket-","")}</span><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold",ticketResolved?"bg-emerald-500/20 text-emerald-300":"bg-amber-500/20 text-amber-200")}>{ticketResolved?"Resolved":"Open"}</span></div><h3 className="font-semibold">{activeTicket.title}</h3><p className="mt-1 text-xs text-slate-400">{activeTicket.requester} · {activeTicket.environment}</p><p className="mt-3 text-sm leading-6 text-slate-200">{activeTicket.brief}</p><div className="mt-4 rounded-xl bg-white/5 p-3"><b className="text-xs">Verification</b>{activeTicket.verification.map(item=><p key={item} className="mt-1 text-xs text-slate-300">• {item}</p>)}</div><div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3"><div className="flex items-center justify-between"><b className="text-xs text-violet-200">GAYL</b><button onClick={gaylHelp} className="rounded-lg border border-violet-300/30 px-2 py-1 text-[10px] text-violet-100">{gaylHelpLevel>=3?"Explain":"Need help?"}</button></div><p className="mt-2 text-xs leading-5 text-slate-200">{gaylMessage}</p><p className="mt-2 text-[10px] text-slate-400">Assistance level {gaylHelpLevel}/3 · recorded with this attempt</p></div><details className="mt-3 rounded-xl bg-white/5 p-3"><summary className="cursor-pointer text-xs font-semibold">Troubleshooting evidence · {ticketEvidence.length}</summary><div className="mt-2 max-h-28 overflow-y-auto">{ticketEvidence.map((item,index)=><p key={index} className="mt-1 text-[10px] text-slate-400">{index+1}. {item}</p>)}</div></details>{ticketResolved?<button onClick={closeTicket} className="mt-4 w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950">Close resolved ticket</button>:<button onClick={verifyTicket} className="mt-4 w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">{repairReady?"Verify fix":"Verify fix"}</button>}</div> : <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">{trainingTickets.map(ticket=><button key={ticket.id} onClick={()=>startTicket(ticket.id)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-cyan-400/50"><span className="text-[10px] text-cyan-300">#{ticket.id.replace("ticket-","")} · {ticket.requester}</span><p className="mt-1 text-sm font-semibold">{ticket.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-400">{ticket.brief}</p></button>)}</div>}</div> : null}
      {pcOs === "mac" ? <header className="absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-between border-b border-white/10 bg-black/25 px-3 text-xs backdrop-blur-xl"><div className="flex items-center gap-4"><b className="text-cyan-200">IT PATH</b><b>Finder</b><span className="hidden sm:inline">File</span><span className="hidden sm:inline">Edit</span><span className="hidden sm:inline">View</span><span className="hidden sm:inline">Go</span><span className="hidden sm:inline">Window</span></div><div className="flex items-center gap-3"><Wifi className="size-3.5"/><span>{machine.hostname}</span><select value={pcOs} onChange={(e)=>switchOs(e.target.value as PcOs)} className="rounded bg-white/10 px-1 py-0.5 text-[10px]"><option value="windows" className="text-black">Windows</option><option value="linux" className="text-black">Linux</option><option value="mac" className="text-black">macOS</option></select></div></header> : pcOs === "linux" ? <header className="absolute inset-x-0 top-0 z-30 flex h-10 items-center justify-between bg-[#21152a]/90 px-3 text-xs backdrop-blur-xl"><button onClick={()=>setStartOpen(v=>!v)} className="rounded-lg px-3 py-1.5 font-semibold hover:bg-white/10">Activities</button><b className="text-cyan-200">IT PATH · Linux</b><div className="flex items-center gap-3"><Wifi className="size-3.5"/><span className="hidden sm:inline">{machine.hostname}</span><select value={pcOs} onChange={(e)=>switchOs(e.target.value as PcOs)} className="rounded bg-white/10 px-1 py-0.5"><option value="windows" className="text-black">Windows</option><option value="linux" className="text-black">Linux</option><option value="mac" className="text-black">macOS</option></select></div></header> : <header className="absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 bg-[#071426]/80 px-3 backdrop-blur-xl"><div className="flex items-center gap-2 text-sm font-semibold"><Monitor className="size-4 text-cyan-300"/>IT PATH · Windows Lab</div><div className="flex items-center gap-2"><select value={pcOs} onChange={(e)=>switchOs(e.target.value as PcOs)} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs"><option value="windows" className="text-black">Windows</option><option value="linux" className="text-black">Linux</option><option value="mac" className="text-black">macOS</option></select><Wifi className="size-4 text-cyan-300"/></div></header>}

      <main className={cn("absolute inset-x-0 p-3 sm:p-6",pcOs==="mac"?"bottom-20 top-8":pcOs==="linux"?"bottom-16 top-10":"bottom-14 top-12")}>
        <div className="grid w-24 gap-5 text-center text-xs">
          <button onClick={() => launch("files")} className="rounded-xl p-2 hover:bg-white/10"><FolderOpen className="mx-auto mb-1 size-8 text-amber-300" /> {pcOs === "windows" ? "File Explorer" : pcOs === "linux" ? "Files" : "Finder"}</button>
          <button onClick={() => launch("settings")} className="rounded-xl p-2 hover:bg-white/10"><Settings className="mx-auto mb-1 size-8 text-slate-200" /> {pcOs === "linux" ? "System" : "Settings"}</button>
          <button onClick={() => launch("terminal")} className="rounded-xl p-2 hover:bg-white/10"><SquareTerminal className="mx-auto mb-1 size-8 text-cyan-300" />Terminal</button>
          <button onClick={() => launch("processes")} className="rounded-xl p-2 hover:bg-white/10"><Activity className="mx-auto mb-1 size-8 text-emerald-300" />{pcOs === "windows" ? "Task Manager" : "Activity"}</button>
          <button onClick={() => launch("hardware")} className="rounded-xl p-2 hover:bg-white/10"><Cpu className="mx-auto mb-1 size-8 text-violet-300" />{pcOs === "windows" ? "Device Manager" : pcOs === "linux" ? "Hardware" : "System Info"}</button>
          <button onClick={() => launch("logs")} className="rounded-xl p-2 hover:bg-white/10"><ScrollText className="mx-auto mb-1 size-8 text-amber-300" />{pcOs === "windows" ? "Event Viewer" : pcOs === "linux" ? "Logs" : "Console"}</button>
          <button onClick={() => launch("storage")} className="rounded-xl p-2 hover:bg-white/10"><HardDrive className="mx-auto mb-1 size-8 text-cyan-300" />{pcOs === "windows" ? "Disk Management" : pcOs === "linux" ? "Disks" : "Disk Utility"}</button>
          <button onClick={() => launch("accounts")} className="rounded-xl p-2 hover:bg-white/10"><UsersRound className="mx-auto mb-1 size-8 text-sky-300" />{pcOs === "windows" ? "Users" : pcOs === "linux" ? "Users & Groups" : "Users & Groups"}</button>
        </div>

        {openApp ? (
          <section className="absolute inset-2 top-2 overflow-hidden rounded-2xl border border-white/15 bg-[#f7f9fc] text-slate-900 shadow-2xl sm:inset-x-[8%] sm:inset-y-[5%] lg:inset-x-[16%]">
            <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {openApp === "files" ? <FolderOpen className="size-4 text-blue-600" /> : openApp === "terminal" ? <SquareTerminal className="size-4 text-slate-700" /> : openApp === "processes" ? <Activity className="size-4 text-emerald-600" /> : openApp === "network" ? <Network className="size-4 text-blue-600" /> : openApp === "services" ? <ServerCog className="size-4 text-violet-600" /> : openApp === "hardware" ? <Cpu className="size-4 text-violet-600" /> : openApp === "logs" ? <ScrollText className="size-4 text-amber-600" /> : openApp === "storage" ? <HardDrive className="size-4 text-cyan-600" /> : openApp === "accounts" ? <UsersRound className="size-4 text-sky-600" /> : <Settings className="size-4 text-blue-600" />}
                {openApp === "files" ? (pcOs === "mac" ? "Finder" : pcOs === "linux" ? "Files" : "File Explorer") : openApp === "terminal" ? "Terminal" : openApp === "processes" ? (pcOs === "windows" ? "Task Manager" : pcOs === "linux" ? "System Monitor" : "Activity Monitor") : openApp === "network" ? "Network" : openApp === "services" ? "Services" : openApp === "hardware" ? (pcOs === "windows" ? "Device Manager" : pcOs === "linux" ? "Hardware Information" : "System Information") : openApp === "logs" ? (pcOs === "windows" ? "Event Viewer" : pcOs === "linux" ? "System Logs" : "Console") : openApp === "storage" ? (pcOs === "windows" ? "Disk Management" : pcOs === "linux" ? "Disks & Filesystems" : "Disk Utility") : openApp === "accounts" ? (pcOs === "windows" ? "Local Users & Groups" : "Users & Groups") : "Settings"}
              </div>
              <button onClick={() => setOpenApp(null)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button>
            </div>

            {openApp === "files" ? (
              pcOs === "windows" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-white"><aside className="hidden w-48 shrink-0 border-r bg-slate-50 p-3 sm:block"><p className="mb-2 text-xs font-semibold text-slate-500">File Explorer</p>{["Home","Desktop","Documents","Downloads","Pictures","This PC"].map((item) => <div key={item} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-blue-100"><Folder className="size-4 text-amber-500" />{item}</div>)}</aside><div className="min-w-0 flex-1 p-3"><div className="mb-2 flex gap-2"><button disabled={folder.length===0} onClick={() => setFolder(x=>x.slice(0,-1))} className="rounded-md border px-3">←</button><div className="min-w-0 flex-1 rounded-md border bg-slate-50 px-3 py-2 font-mono text-xs">C:\\{folder.join("\\")}</div></div><div className="mb-3 flex flex-wrap gap-2"><input value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="New item" className="select-text min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"/><button onClick={createFolder} className="rounded-md border px-3 text-xs">New folder</button><button onClick={createTextFile} className="rounded-md border px-3 text-xs">New text file</button>{clipboard?<button onClick={pasteItem} className="rounded-md bg-blue-50 px-3 text-xs text-blue-700">Paste</button>:null}</div><div className="divide-y rounded-md border">{visibleFiles.map(file=><button key={file.name} onClick={()=>openFile(file)} onContextMenu={(e)=>{e.preventDefault();showContext(file)}} onPointerDown={()=>beginPress(file)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress} className="flex w-full touch-manipulation items-center gap-3 p-2 text-left hover:bg-blue-50">{file.kind==="folder"?<Folder className="size-5 text-amber-500"/>:<HardDrive className="size-5 text-blue-600"/>}<span className="flex-1 truncate text-sm">{file.name}</span><span className="hidden text-xs text-slate-400 sm:block">{file.detail}</span></button>)}</div></div></div>
              ) : pcOs === "linux" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f6f5f4]"><aside className="hidden w-44 border-r bg-[#eceae8] p-3 sm:block"><p className="mb-3 text-xs font-semibold">Places</p>{["Recent","Starred","Home","Desktop","Documents","Downloads","Trash"].map(item=><div key={item} className="rounded-lg px-3 py-2 text-xs hover:bg-orange-100">{item}</div>)}</aside><div className="min-w-0 flex-1 p-4"><div className="mb-4 flex items-center gap-2"><button disabled={folder.length===0} onClick={()=>setFolder(x=>x.slice(0,-1))} className="rounded-full bg-white px-3 py-2 shadow-sm">←</button><div className="font-semibold">{folder.at(-1) ?? "Home"}</div><div className="ml-auto rounded-full bg-white px-3 py-2 text-xs shadow-sm">☰</div></div><div className="mb-3 flex gap-2"><input value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="Name" className="select-text min-w-0 flex-1 rounded-lg border px-3 py-2"/><button onClick={createFolder} className="rounded-lg bg-orange-600 px-3 text-xs text-white">Folder</button><button onClick={createTextFile} className="rounded-lg border bg-white px-3 text-xs">File</button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visibleFiles.map(file=><button key={file.name} onClick={()=>openFile(file)} onContextMenu={(e)=>{e.preventDefault();showContext(file)}} onPointerDown={()=>beginPress(file)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress} className="touch-manipulation rounded-xl bg-white p-4 text-center shadow-sm">{file.kind==="folder"?<Folder className="mx-auto mb-2 size-10 text-orange-500"/>:<HardDrive className="mx-auto mb-2 size-10 text-slate-500"/>}<span className="block truncate text-xs">{file.name}</span></button>)}</div></div></div>
              ) : (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f5f5f7]"><aside className="hidden w-48 border-r border-black/10 bg-white/65 p-3 sm:block"><p className="mb-2 text-[10px] font-semibold uppercase text-slate-400">Favorites</p>{["AirDrop","Recents","Applications","Desktop","Documents","Downloads"].map((item,i)=><div key={item} className={cn("rounded-md px-3 py-1.5 text-xs",i===4&&"bg-blue-500 text-white")}>{item}</div>)}<p className="mb-2 mt-4 text-[10px] font-semibold uppercase text-slate-400">Locations</p><div className="rounded-md px-3 py-1.5 text-xs">Macintosh HD</div></aside><div className="min-w-0 flex-1 p-4"><div className="mb-4 flex items-center"><button disabled={folder.length===0} onClick={()=>setFolder(x=>x.slice(0,-1))} className="mr-2 rounded-md px-2 py-1 text-slate-500">‹</button><h2 className="font-semibold">{folder.at(-1) ?? "Documents"}</h2><div className="ml-auto flex gap-1"><span className="rounded-md bg-white px-2 py-1 text-xs">▦</span><span className="rounded-md bg-white px-2 py-1 text-xs">☷</span></div></div><div className="mb-3 flex gap-2"><input value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="New item" className="select-text min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2"/><button onClick={createFolder} className="rounded-lg bg-white px-3 text-xs shadow-sm">New Folder</button>{clipboard?<button onClick={pasteItem} className="rounded-lg bg-blue-500 px-3 text-xs text-white">Paste</button>:null}</div><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{visibleFiles.map(file=><button key={file.name} onClick={()=>openFile(file)} onContextMenu={(e)=>{e.preventDefault();showContext(file)}} onPointerDown={()=>beginPress(file)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress} className="touch-manipulation rounded-xl p-3 text-center hover:bg-black/5">{file.kind==="folder"?<Folder className="mx-auto mb-2 size-12 text-blue-500"/>:<HardDrive className="mx-auto mb-2 size-12 text-slate-500"/>}<span className="block truncate text-xs">{file.name}</span></button>)}</div></div></div>
              )
            ) : openApp === "terminal" ? (
              <div className="flex h-[calc(100%-2.75rem)] flex-col bg-[#0b1020] text-slate-100"><div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm">{terminalLines.length === 0 ? <p className="text-slate-400">IT PATH {pcOs === "windows" ? "Windows" : pcOs === "linux" ? "Linux" : "macOS"} training terminal. Type help to begin.</p> : terminalLines.map((line, i) => <pre key={i} className="whitespace-pre-wrap break-words">{line}</pre>)}</div><form onSubmit={(e) => { e.preventDefault(); runEmbeddedTerminal(); }} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3"><span className="shrink-0 font-mono text-xs text-cyan-300">{prompt(machine)}</span><input autoCapitalize="none" autoCorrect="off" spellCheck={false} value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)} className="min-w-0 flex-1 select-text bg-transparent font-mono text-sm text-white outline-none [-webkit-touch-callout:default]" placeholder="Enter command" /><button className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">Run</button></form></div>
            ) : openApp === "processes" ? (
              pcOs === "windows" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-white p-4"><div className="mb-3 flex gap-4 border-b text-xs"><span className="border-b-2 border-cyan-500 pb-2 font-semibold">Processes</span><span>Performance</span><span>Users</span><span>Details</span></div><div className="mb-3 grid grid-cols-3 gap-2 text-xs"><div className="rounded bg-slate-50 p-2">Memory <b>{Math.round(machine.memoryUsedMb/machine.memoryTotalMb*100)}%</b></div><div className="rounded bg-slate-50 p-2">Disk <b>{machine.diskUsedPercent}%</b></div><div className="rounded bg-slate-50 p-2">Processes <b>{machine.processes.length}</b></div></div>{machine.processes.map(proc=><div key={proc.pid} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-2 py-2 text-xs"><div><b>{proc.name}</b><p className="text-slate-400">PID {proc.pid} · {proc.user}</p></div><span>{proc.memoryMb} MB</span><button onClick={()=>endProcess(proc.pid)} className="rounded border px-2 py-1">End task</button></div>)}</div>
              ) : pcOs === "linux" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f6f5f4] p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">System Monitor</h2><p className="text-xs text-slate-500">Processes · Resources · File Systems</p></div><span className="rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">IT PATH Linux</span></div><div className="space-y-2">{machine.processes.map(proc=><div key={proc.pid} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm"><Activity className="size-5 text-orange-600"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{proc.name}</p><p className="text-xs text-slate-500">{proc.user} · PID {proc.pid} · {proc.cpu.toFixed(1)}% CPU · {proc.memoryMb} MB</p></div><button onClick={()=>endProcess(proc.pid)} className="rounded-lg border px-2 py-1 text-xs">End Process</button></div>)}</div></div>
              ) : (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f5f5f7] p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Activity Monitor</h2><p className="text-xs text-slate-500">CPU · Memory · Energy · Disk · Network</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">IT PATH macOS</span></div><div className="overflow-hidden rounded-xl border border-black/10 bg-white">{machine.processes.map(proc=><div key={proc.pid} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-3 py-2 text-xs last:border-0"><div><b>{proc.name}</b><p className="text-slate-400">{proc.user} · PID {proc.pid}</p></div><span>{proc.cpu.toFixed(1)}% CPU</span><button onClick={()=>endProcess(proc.pid)} className="rounded-full border px-2 py-1">Stop</button></div>)}</div></div>
              )
            ) : openApp === "network" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto",pcOs==="windows"?"bg-[#f7f9fc]":pcOs==="linux"?"bg-[#f6f5f4]":"bg-[#f5f5f7]")}>{(() => { const iface=primaryInterface(machine); return pcOs==="windows" ? <div className="p-5"><h2 className="text-xl font-semibold">Network & internet</h2><p className="mb-4 text-sm text-slate-500">{iface?.up?"Connected":"Disconnected"} · {iface?.name}</p><div className="rounded-xl border bg-white p-4"><div className="flex justify-between"><b>Ethernet</b><button onClick={toggleNetwork} className="rounded border px-3 py-1 text-xs">{iface?.up?"Disable":"Enable"}</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{[["IPv4 address",iface?.ip],["DNS servers",machine.dnsServers.join(", ")],["Default gateway",iface?.gateway],["Assignment",iface?.dhcp?"Automatic (DHCP)":"Manual"]].map(([k,v])=><div key={k} className="rounded-lg bg-slate-50 p-3 text-xs"><span className="text-slate-500">{k}</span><p className="mt-1 font-mono">{v||"—"}</p></div>)}</div><button onClick={beginNetworkEdit} className="mt-4 rounded-lg bg-cyan-50 px-3 py-2 text-xs text-cyan-800">Edit IP assignment</button></div></div> : pcOs==="linux" ? <div className="flex min-h-full"><aside className="hidden w-44 border-r bg-[#eceae8] p-3 sm:block"><b className="text-sm">Network</b><div className="mt-3 rounded-lg bg-orange-100 px-3 py-2 text-xs">Wired</div><div className="mt-2 px-3 py-2 text-xs">VPN</div></aside><div className="flex-1 p-5"><h2 className="text-xl font-semibold">Wired</h2><div className="mt-4 rounded-xl bg-white p-4 shadow-sm"><div className="flex justify-between"><div><b>{iface?.name}</b><p className="text-xs text-slate-500">{iface?.up?"Connected":"Disconnected"}</p></div><button onClick={toggleNetwork} className="rounded-full border px-3 text-xs">{iface?.up?"On":"Off"}</button></div><div className="mt-4 font-mono text-xs">IPv4 {iface?.ip||"—"}<br/>Gateway {iface?.gateway||"—"}<br/>DNS {machine.dnsServers.join(", ")||"—"}</div><button onClick={beginNetworkEdit} className="mt-4 rounded-lg border px-3 py-2 text-xs">IPv4 Settings</button></div></div></div> : <div className="flex min-h-full"><aside className="hidden w-48 border-r border-black/10 bg-white/70 p-3 sm:block"><b className="text-sm">Network</b><div className="mt-3 rounded-lg bg-blue-500 px-3 py-2 text-xs text-white">Ethernet</div><div className="mt-2 px-3 py-2 text-xs">VPN</div></aside><div className="flex-1 p-5"><h2 className="text-xl font-semibold">Ethernet</h2><div className="mt-4 rounded-xl border border-black/10 bg-white p-4"><div className="flex justify-between"><div><b>{iface?.up?"Connected":"Not Connected"}</b><p className="text-xs text-slate-500">{iface?.name}</p></div><button onClick={toggleNetwork} className="rounded-full border px-3 text-xs">{iface?.up?"Details…":"Connect"}</button></div><div className="mt-4 grid gap-2 text-xs"><p>IP Address <span className="float-right font-mono">{iface?.ip||"—"}</span></p><p>Router <span className="float-right font-mono">{iface?.gateway||"—"}</span></p><p>DNS <span className="float-right font-mono">{machine.dnsServers.join(", ")||"—"}</span></p></div><button onClick={beginNetworkEdit} className="mt-4 rounded-lg bg-blue-500 px-3 py-2 text-xs text-white">TCP/IP & DNS…</button></div></div></div>; })()}</div>
            ) : openApp === "accounts" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto p-4",pcOs==="linux"&&"bg-[#f6f5f4]",pcOs==="mac"&&"bg-[#f5f5f7]")}><div className="mb-4"><h2 className="font-semibold">{pcOs==="windows"?"Accounts":pcOs==="linux"?"Users":"Users & Groups"}</h2><p className="text-xs text-slate-500">{pcOs==="windows"?"Local workstation accounts and group membership.":pcOs==="linux"?"Local users, account state and sudo access.":"Mac users, staff/admin groups and account access."}</p></div><div className="mb-4 flex gap-2"><input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder={pcOs==="mac"?"New account name":"New user name"} className="min-w-0 flex-1 select-text rounded-lg border bg-white px-3 py-2 text-sm"/><button onClick={addAccount} className={cn("rounded-lg px-4 text-sm font-semibold text-white",pcOs==="linux"?"bg-orange-600":pcOs==="mac"?"bg-blue-500":"bg-cyan-600")}>Add</button></div><div className={cn("space-y-2",pcOs==="windows"&&"rounded-xl border bg-white p-2")}>{machine.users.map(account=><div key={account.name} className="flex items-center gap-3 rounded-xl border bg-white p-3"><UserRound className={cn("size-7",pcOs==="linux"?"text-orange-600":pcOs==="mac"?"text-blue-500":"text-cyan-600")}/><div className="min-w-0 flex-1"><b className="text-sm">{account.fullName||account.name}</b><p className="text-xs text-slate-500">{account.name} · {account.admin?(pcOs==="linux"?"sudo":pcOs==="mac"?"admin":"Administrator"):"Standard"}{account.locked?" · Locked":""}</p></div><button onClick={()=>toggleAdmin(account.name)} disabled={account.name===machine.currentUser} className="rounded border px-2 py-1 text-xs">{account.admin?"Standard":pcOs==="linux"?"sudo":"Admin"}</button><button onClick={()=>toggleLock(account.name)} disabled={account.name===machine.currentUser} className="rounded border px-2 py-1 text-xs">{account.locked?"Unlock":"Lock"}</button></div>)}</div></div>
            ) : openApp === "storage" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto p-4",pcOs==="linux"&&"bg-[#f6f5f4]",pcOs==="mac"&&"bg-[#f5f5f7]")}><div className="mb-4"><h2 className="font-semibold">{pcOs==="windows"?"Disk Management":pcOs==="linux"?"Disks":"Disk Utility"}</h2><p className="text-xs text-slate-500">{pcOs==="windows"?"Disk 0 · Basic · Online":pcOs==="linux"?"/dev/nvme0n1 · GUID Partition Table":"APPLE SSD · GUID Partition Map"}</p></div><div className={cn("rounded-xl border bg-white p-4",pcOs==="linux"&&"shadow-sm")}><div className="flex items-center gap-3"><HardDrive className={cn("size-9",pcOs==="linux"?"text-orange-600":pcOs==="mac"?"text-blue-500":"text-cyan-600")}/><div><b>{pcOs==="windows"?"(C:)":pcOs==="linux"?"/dev/nvme0n1p2":"Macintosh HD"}</b><p className="text-xs text-slate-500">{pcOs==="windows"?"NTFS · Healthy (Boot, Primary Partition)":pcOs==="linux"?"ext4 · mounted at /":"APFS · Mounted"}</p></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full",pcOs==="linux"?"bg-orange-500":pcOs==="mac"?"bg-blue-500":"bg-cyan-500")} style={{width:`${Math.max(4,machine.diskUsedPercent)}%`}}/></div><p className="mt-2 text-xs text-slate-500">{machine.diskUsedPercent}% used · {100-machine.diskUsedPercent}% available</p>{machine.diskUsedPercent>=90?<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-900">Storage is critically low</p><p className="mt-1 text-xs text-amber-800">{pcOs==="windows"?"Temporary files and cached data can be removed safely.":pcOs==="linux"?"Cached package and temporary data can be cleaned up.":"Caches and temporary system data can be reviewed and removed."}</p><button onClick={cleanupStorage} className={cn("mt-3 rounded-lg px-3 py-2 text-xs font-semibold text-white",pcOs==="linux"?"bg-orange-600":pcOs==="mac"?"bg-blue-500":"bg-cyan-700")}>{pcOs==="windows"?"Clean temporary files":pcOs==="linux"?"Clean temporary data":"Review & clean storage"}</button></div>:null}</div><div className="mt-4 grid gap-2 sm:grid-cols-2">{(pcOs==="windows"?[["System","C: · NTFS"],["Recovery","Recovery partition"]]:pcOs==="linux"?[["Root","/ · ext4"],["Home","/home · user data"]]:[["System","Macintosh HD · APFS"],["Data","Macintosh HD - Data · APFS"]]).map(([a,b])=><div key={a} className="rounded-xl border bg-white p-3"><b className="text-sm">{a}</b><p className="text-xs text-slate-500">{b}</p></div>)}</div></div>
            ) : openApp === "logs" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto p-4",pcOs==="linux"&&"bg-[#f6f5f4]",pcOs==="mac"&&"bg-[#f5f5f7]")}><div className="mb-4"><h2 className="font-semibold">{pcOs==="windows"?"Event Viewer":pcOs==="linux"?"Logs":"Console"}</h2><p className="text-xs text-slate-500">{pcOs==="windows"?"Windows Logs · System":pcOs==="linux"?"systemd journal · current boot":"system.log · All Messages"} · {machine.eventLog?.length??0} events</p></div><div className={cn(pcOs==="windows"?"rounded border bg-white":"space-y-2")}>{[...(machine.eventLog??[])].reverse().map((event,index)=>{const warning=/fail|error|denied|down|stopped/i.test(event);return <div key={index} className={cn("text-xs",pcOs==="windows"?"grid grid-cols-[80px_1fr_100px] border-b p-2":"rounded-xl border bg-white p-3")}><span className={warning?"text-amber-600":"text-slate-500"}>{warning?"Warning":"Information"}</span><span className="break-words">{event}</span><span className="text-slate-400">{pcOs==="windows"?"System":pcOs==="linux"?"journal":"system.log"}</span></div>})}{!(machine.eventLog?.length)?<div className="p-8 text-center text-sm text-slate-500">No recorded system events.</div>:null}</div></div>
            ) : openApp === "hardware" ? (
              pcOs === "windows" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-white"><aside className="hidden w-52 border-r bg-slate-50 p-3 sm:block"><p className="mb-2 text-xs font-semibold text-slate-500">{machine.hostname}</p>{["Audio inputs and outputs","Disk drives","Display adapters","Network adapters","Processors","System devices"].map((x) => <div key={x} className="rounded px-2 py-1.5 text-xs hover:bg-blue-100">{x}</div>)}</aside><div className="min-w-0 flex-1 overflow-y-auto p-4"><div className="mb-3 border-b pb-2 text-xs text-slate-500">Device Manager · View devices by type</div>{hardwareGroups.map((section) => <div key={section.group} className="mb-2"><div className="mb-1 flex items-center gap-2 text-sm font-medium"><ChevronLeft className="size-3 -rotate-90" />{section.group}</div>{section.items.map((item) => <div key={item.name} className="ml-5 flex items-center gap-2 py-1.5 text-sm"><Cpu className="size-4 text-slate-500" /><span className="flex-1">{item.name}</span><span className="text-xs text-slate-400">{item.status}</span>{section.group==="Network adapters"&&machine.networkDriverHealthy===false?<button onClick={repairNetworkDriver} className="rounded border border-blue-300 px-2 py-1 text-[10px] text-blue-700">Roll Back Driver</button>:null}</div>)}</div>)}</div></div>
              ) : pcOs === "linux" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f6f5f4] p-4"><div className="mx-auto max-w-3xl"><div className="mb-4 rounded-lg bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">Hardware</p><h2 className="mt-1 text-xl font-semibold">{machine.hostname}</h2><p className="text-sm text-slate-500">Ubuntu-style system overview</p></div><div className="grid gap-3 sm:grid-cols-2">{hardwareGroups.flatMap((section) => section.items.map((item) => <div key={section.group+item.name} className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs font-medium text-orange-700">{section.group}</p><p className="mt-1 font-medium">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.detail} · {item.status}</p></div>))}</div></div></div>
              ) : (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f5f5f7]"><aside className="hidden w-52 border-r border-black/10 bg-white/70 p-3 sm:block"><p className="mb-3 text-xs font-semibold text-slate-500">System Information</p>{["Hardware","Network","Software"].map((x,i) => <div key={x} className={cn("rounded-md px-2 py-1.5 text-xs", i===0 && "bg-blue-500 text-white")}>{x}</div>)}</aside><div className="min-w-0 flex-1 overflow-y-auto p-5"><h2 className="mb-4 text-lg font-semibold">Hardware Overview</h2><div className="rounded-xl border border-black/10 bg-white p-4 text-sm">{[["Model Name","IT PATH Virtual Mac"],["Computer Name",machine.hostname],["Processor","Virtual Apple-compatible CPU"],["Memory",`${machine.memoryTotalMb} MB`],["Storage",`${100-machine.diskUsedPercent}% available`]].map(([k,v]) => <div key={k} className="grid grid-cols-2 border-b py-2 last:border-0"><span className="text-right text-slate-500">{k}:</span><span className="pl-4">{v}</span></div>)}</div><h3 className="mb-2 mt-5 text-sm font-semibold">Hardware Details</h3>{hardwareGroups.map((section) => <div key={section.group} className="mb-3 rounded-xl border border-black/10 bg-white p-3"><p className="mb-2 text-xs font-semibold text-slate-500">{section.group}</p>{section.items.map((item) => <div key={item.name} className="py-1 text-sm">{item.name}<span className="ml-2 text-xs text-slate-400">{item.detail}</span></div>)}</div>)}</div></div>
              )
            ) : openApp === "services" ? (
              <div className={cn("h-[calc(100%-2.75rem)] overflow-y-auto p-4", pcOs === "linux" && "bg-[#f6f5f4]", pcOs === "mac" && "bg-[#f5f5f7]")}><div className="mb-4"><h2 className="font-semibold">{pcOs === "windows" ? "Services" : pcOs === "linux" ? "systemd Services" : "Launch Agents & Daemons"}</h2><p className="text-xs text-slate-500">{pcOs === "windows" ? "Manage Windows background services and startup type." : pcOs === "linux" ? "Training view of systemd units. Terminal changes with systemctl appear here." : "Training view of launchd-managed services. Terminal changes with launchctl appear here."}</p></div><div className="space-y-2">{machine.services.map((svc)=><div key={svc.name} className="flex items-center gap-3 rounded-xl border bg-white p-3"><ServerCog className={cn("size-5",pcOs==="windows"?"text-cyan-600":pcOs==="linux"?"text-orange-600":"text-blue-600")}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{svc.display}</p><p className="text-xs text-slate-500">{pcOs==="windows"?svc.name:pcOs==="linux"?`${svc.name}.service`:`com.itpath.${svc.name}`} · {svc.startType} · {svc.status}</p></div><button onClick={()=>toggleService(svc.name,svc.status==="running")} className="rounded-lg border px-2 py-1 text-xs">{svc.status==="running"?"Stop":"Start"}</button></div>)}</div></div>
            ) : (
              pcOs === "windows" ? (
                <div className="h-[calc(100%-2.75rem)] overflow-y-auto bg-[#f7f9fc] p-5"><div className="mb-5"><h2 className="text-xl font-semibold">Settings</h2><p className="text-sm text-slate-500">{machine.hostname} · IT PATH Windows workstation</p></div><div className="grid gap-3 sm:grid-cols-2">{[["System","Display, sound, storage and device information",null],["Bluetooth & devices","Hardware and connected devices","hardware"],["Network & internet","Wi-Fi, Ethernet, IP and DNS","network"],["Accounts","Local users and administrator access","accounts"],["Storage","Volumes and disk usage","storage"],["Services","Background services and startup","services"]].map(([name,desc,target])=><button key={name} onClick={()=>target&&launch(target as AppId)} className="rounded-xl border bg-white p-4 text-left hover:border-cyan-400"><b>{name}</b><p className="mt-1 text-xs text-slate-500">{desc}</p></button>)}</div></div>
              ) : pcOs === "linux" ? (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f6f5f4]"><aside className="hidden w-48 border-r bg-[#eceae8] p-3 sm:block"><b className="text-sm">Settings</b>{["Network","Users","System","Storage","Hardware"].map(x=><div key={x} className="mt-2 rounded-lg px-3 py-2 text-xs hover:bg-orange-100">{x}</div>)}</aside><div className="min-w-0 flex-1 overflow-y-auto p-5"><h2 className="text-xl font-semibold">System Settings</h2><p className="mb-5 text-sm text-slate-500">{machine.hostname} · IT PATH Linux workstation</p><div className="grid gap-3 sm:grid-cols-2">{[["Network","Connections, IPv4 and DNS","network"],["Users","Accounts and sudo access","accounts"],["System Monitor","Processes and resources","processes"],["Disks","Storage and filesystems","storage"],["Hardware","Devices and system information","hardware"],["Services","systemd units","services"]].map(([name,desc,target])=><button key={name} onClick={()=>launch(target as AppId)} className="rounded-xl bg-white p-4 text-left shadow-sm hover:ring-1 hover:ring-orange-400"><b>{name}</b><p className="mt-1 text-xs text-slate-500">{desc}</p></button>)}</div></div></div>
              ) : (
                <div className="flex h-[calc(100%-2.75rem)] bg-[#f5f5f7]"><aside className="hidden w-52 border-r border-black/10 bg-white/70 p-3 sm:block"><b className="text-sm">System Settings</b>{["Network","Users & Groups","General","Storage","Privacy & Security"].map((x,i)=><div key={x} className={cn("mt-2 rounded-lg px-3 py-2 text-xs",i===0&&"bg-blue-500 text-white")}>{x}</div>)}</aside><div className="min-w-0 flex-1 overflow-y-auto p-5"><h2 className="text-xl font-semibold">System Settings</h2><p className="mb-5 text-sm text-slate-500">{machine.hostname} · IT PATH Mac</p><div className="space-y-3">{[["Network","Network services, TCP/IP and DNS","network"],["Users & Groups","Local users and administrator access","accounts"],["General / Storage","APFS volumes and disk usage","storage"],["System Information","Hardware and software details","hardware"],["Activity Monitor","Processes and resource use","processes"],["Launch Agents & Daemons","Background services managed by launchd","services"]].map(([name,desc,target])=><button key={name} onClick={()=>launch(target as AppId)} className="flex w-full items-center rounded-xl border border-black/10 bg-white p-4 text-left hover:bg-blue-50"><div><b>{name}</b><p className="text-xs text-slate-500">{desc}</p></div><ChevronLeft className="ml-auto size-4 rotate-180 text-slate-400"/></button>)}</div></div></div>
              )
            )}
            {propertiesItem ? <div className="absolute inset-0 z-40 flex items-end bg-black/25 sm:items-center sm:justify-center" onClick={() => setPropertiesItem(null)}><div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:w-[28rem] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}><h3 className="font-semibold">{pcOs === "windows" ? "Properties · Security" : pcOs === "linux" ? "Properties · Permissions" : "Get Info · Sharing & Permissions"}</h3><p className="mb-4 truncate text-xs text-slate-500">{propertiesItem.name}</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-600">Owner<input value={propertyOwner} onChange={(e) => setPropertyOwner(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs text-slate-600">Group<input value={propertyGroup} onChange={(e) => setPropertyGroup(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 text-sm" /></label></div><div className="mt-3"><p className="mb-2 text-xs font-medium text-slate-600">{pcOs === "windows" ? "Permission level (training representation)" : "Unix mode"}</p><div className="flex flex-wrap gap-2">{["644","600","755","700"].map((mode) => <button key={mode} onClick={() => setPropertyMode(mode)} className={cn("rounded-lg border px-3 py-2 text-xs", propertyMode === mode && "border-blue-500 bg-blue-50 text-blue-700")}>{mode} · {mode === "644" ? "owner write / others read" : mode === "600" ? "owner only" : mode === "755" ? "owner write / all execute" : "owner only execute"}</button>)}</div><input value={propertyMode} onChange={(e) => setPropertyMode(e.target.value.replace(/[^0-7]/g, "").slice(0,3))} inputMode="numeric" className="mt-2 w-24 select-text rounded-lg border px-3 py-2 font-mono text-sm" /></div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><p>{pcOs === "windows" ? "Security principal" : "Owner"}: {propertyOwner || "—"}</p><p>Group: {propertyGroup || "—"}</p><p>Path: {pathFor(propertiesItem.name)}</p></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setPropertiesItem(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={saveProperties} disabled={!/^[0-7]{3}$/.test(propertyMode)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Apply</button></div></div></div> : null}
            {contextItem ? <div className="absolute inset-0 z-30 flex items-end bg-black/20 sm:items-center sm:justify-center" onClick={() => setContextItem(null)}><div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:w-80 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-3"><p className="truncate text-sm font-semibold">{contextItem.name}</p><p className="text-xs text-slate-500">{contextItem.kind === "folder" ? "Folder" : contextItem.detail}</p></div><div className="mb-3 flex gap-2"><input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="min-w-0 flex-1 select-text rounded-lg border px-3 py-2 text-sm" /><button onClick={renameItem} className="rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white">Rename</button></div><div className="grid grid-cols-2 gap-2 text-sm"><button onClick={() => { openFile(contextItem); setContextItem(null); }} className="rounded-lg bg-slate-100 p-3">Open</button><button onClick={() => copyItem(false)} className="rounded-lg bg-slate-100 p-3">Copy</button><button onClick={() => copyItem(true)} className="rounded-lg bg-slate-100 p-3">Cut</button><button onClick={() => deleteItem(contextItem)} className="rounded-lg bg-red-50 p-3 text-red-600">Delete</button><button onClick={() => showProperties(contextItem)} className="col-span-2 rounded-lg bg-slate-100 p-3">Properties / Permissions</button></div><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><p>Location: {pathFor(contextItem.name)}</p></div></div></div> : null}
            {editing ? <div className="absolute inset-0 z-20 flex flex-col bg-white"><div className="flex h-11 items-center justify-between border-b px-3"><strong className="truncate text-sm">{editing.name}</strong><button onClick={() => setEditing(null)}><X className="size-4" /></button></div><textarea value={fileText} onChange={(e) => setFileText(e.target.value)} className="min-h-0 flex-1 select-text resize-none p-4 font-mono text-sm outline-none [-webkit-touch-callout:default]" /><div className="border-t p-3"><button onClick={saveText} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save file</button></div></div> : null}
          </section>
        ) : null}
      </main>

      {startOpen ? <div className={cn("absolute z-40 shadow-2xl backdrop-blur-2xl",pcOs==="windows"&&"bottom-16 left-1/2 w-[min(92vw,34rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#101b2d]/95 p-4",pcOs==="linux"&&"inset-x-4 bottom-20 top-14 rounded-2xl bg-[#21152a]/95 p-5",pcOs==="mac"&&"bottom-24 left-1/2 w-[min(90vw,30rem)] -translate-x-1/2 rounded-2xl border border-white/20 bg-white/20 p-4")}><div className="mb-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/60"><Search className="size-4"/>{pcOs==="linux"?"Type to search applications":"Search apps and files"}</div><div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-5">{[["files","Files",FolderOpen],["settings","Settings",Settings],["terminal","Terminal",SquareTerminal],["processes",pcOs==="windows"?"Task Manager":pcOs==="linux"?"System Monitor":"Activity Monitor",Activity],["network","Network",Network],["hardware",pcOs==="windows"?"Device Manager":"System Info",Cpu],["logs",pcOs==="windows"?"Event Viewer":pcOs==="linux"?"Logs":"Console",ScrollText],["storage",pcOs==="windows"?"Disk Management":pcOs==="linux"?"Disks":"Disk Utility",HardDrive],["accounts","Users",UsersRound]].map(([id,label,Icon])=><button key={id as string} onClick={()=>launch(id as AppId)} className="rounded-xl p-3 hover:bg-white/10"><Icon className="mx-auto mb-2 size-7 text-cyan-200"/>{label as string}</button>)}</div></div> : null}

      {pcOs==="windows" ? <footer className="absolute inset-x-0 bottom-0 z-50 flex h-14 items-center justify-center border-t border-white/10 bg-[#071426]/85 px-3 backdrop-blur-xl"><Link to="/dashboard" className="absolute left-3 flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-white/65"><ChevronLeft className="size-4"/><span className="hidden sm:inline">Exit PC</span></Link><div className="flex items-center gap-1"><button onClick={()=>setStartOpen(v=>!v)} className="grid size-10 place-items-center rounded-xl hover:bg-white/10"><span className="grid grid-cols-2 gap-[2px]">{Array.from({length:4}).map((_,i)=><span key={i} className="size-[6px] bg-cyan-300"/>)}</span></button><button onClick={()=>launch("files")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10"><FolderOpen className="size-5 text-amber-300"/></button><button onClick={()=>launch("terminal")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10"><SquareTerminal className="size-5 text-cyan-300"/></button></div></footer> : pcOs==="linux" ? <footer className="absolute bottom-3 left-1/2 z-50 flex h-12 -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#21152a]/80 px-2 backdrop-blur-xl"><button onClick={()=>setStartOpen(v=>!v)} className="grid size-9 place-items-center rounded-xl bg-orange-500/20"><span className="text-lg">●</span></button><button onClick={()=>launch("files")} className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><FolderOpen className="size-5 text-orange-300"/></button><button onClick={()=>launch("terminal")} className="grid size-9 place-items-center rounded-xl hover:bg-white/10"><SquareTerminal className="size-5 text-cyan-300"/></button><Link to="/dashboard" className="grid size-9 place-items-center rounded-xl text-white/60"><ChevronLeft className="size-4"/></Link></footer> : <footer className="absolute bottom-2 left-1/2 z-50 flex h-16 -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/20 bg-white/15 px-2 shadow-2xl backdrop-blur-xl"><button onClick={()=>launch("files")} className="grid size-11 place-items-center rounded-xl bg-blue-500/20"><FolderOpen className="size-6 text-blue-200"/></button><button onClick={()=>launch("settings")} className="grid size-11 place-items-center rounded-xl hover:bg-white/10"><Settings className="size-6 text-slate-200"/></button><button onClick={()=>launch("terminal")} className="grid size-11 place-items-center rounded-xl hover:bg-white/10"><SquareTerminal className="size-6 text-slate-100"/></button><button onClick={()=>setStartOpen(v=>!v)} className="grid size-11 place-items-center rounded-xl hover:bg-white/10"><span className="grid grid-cols-3 gap-0.5">{Array.from({length:9}).map((_,i)=><span key={i} className="size-1 rounded-full bg-cyan-200"/>)}</span></button><Link to="/dashboard" className="grid size-11 place-items-center rounded-xl text-white/60"><ChevronLeft className="size-5"/></Link></footer>}    </div>
  );
}
