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
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { prompt } from "@/lib/terminal/machine";
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
  const [osMachines, setOsMachines] = useState<Record<PcOs, MachineState>>(() => ({ windows: sharedAttempt?.machine ?? freshWindowsMachine(), linux: createMachine({ shell: "bash", hostname: "itpath-linux" }), mac: createMachine({ shell: "bash", hostname: "itpath-mac" }) }));
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

  const runEmbeddedTerminal = () => {
    const command = terminalInput.trim();
    if (!command) return;
    const before = prompt(machine);
    const result = execute(machine, command);
    saveMachine(result.state);
    setTerminalLines((lines) => [...lines, `${before}${command}`, result.output].filter(Boolean).slice(-120));
    setTerminalInput("");
  };

  const switchOs = (next: PcOs) => {
    setPcOs(next);
    setFolder(next === "windows" ? ["Users", "student"] : ["home", "student"]);
    setTerminalLines([]);
    setOpenApp(null);
    setStartOpen(false);
  };

  const addEvent = (next: MachineState, message: string) => { next.eventLog = [...(next.eventLog ?? []), message].slice(-250); };
  const endProcess = (pid: number) => mutate((next) => { killProcess(next, String(pid)); addEvent(next, `Process PID ${pid} ended by ${next.currentUser}.`); });
  const toggleService = (name: string, running: boolean) => mutate((next) => { setServiceStatus(next, name, running ? "stopped" : "running"); addEvent(next, `Service ${name} ${running ? "stopped" : "started"} by ${next.currentUser}.`); });
  const toggleNetwork = () => mutate((next) => { const iface = primaryInterface(next); if (iface) { iface.up = !iface.up; addEvent(next, `Network interface ${iface.name} changed to ${iface.up ? "up" : "down"}.`); } });

  const addAccount = () => {
    const name = accountName.trim().replace(/\s+/g, "").toLowerCase();
    if (!name || machine.users.some((u) => u.name.toLowerCase() === name)) return;
    mutate((next) => {
      next.users.push({ name, fullName: accountName.trim(), groups: pcOs === "windows" ? ["Users"] : ["users"], admin: false, locked: false, passwordExpired: false });
      makeDir(next, pcOs === "windows" ? `C:\\Users\\${name}` : `/home/${name}`);
      addEvent(next, `User account ${name} created.`);
    });
    setAccountName("");
  };
  const toggleAdmin = (name: string) => mutate((next) => { const u = next.users.find((item) => item.name === name); if (u) { u.admin = !u.admin; u.groups = u.admin ? Array.from(new Set([...u.groups, pcOs === "windows" ? "Administrators" : pcOs === "mac" ? "admin" : "sudo"])) : u.groups.filter((g) => !["Administrators","admin","sudo"].includes(g)); addEvent(next, `Account ${name} administrator access ${u.admin ? "enabled" : "removed"}.`); } });
  const toggleLock = (name: string) => mutate((next) => { const u = next.users.find((item) => item.name === name); if (u) { u.locked = !u.locked; addEvent(next, `Account ${name} ${u.locked ? "locked" : "unlocked"}.`); } });

  const hardwareGroups = useMemo(() => {
    const iface = primaryInterface(machine);
    if (pcOs === "windows") return [
      { group: "Processors", items: [{ name: "IT PATH Virtual CPU", detail: "4 cores · 8 logical processors", status: "Working properly" }] },
      { group: "Disk drives", items: [{ name: "Virtual NVMe SSD", detail: `${machine.diskUsedPercent}% used`, status: "Working properly" }] },
      { group: "Network adapters", items: [{ name: iface?.name ?? "Ethernet Adapter", detail: iface?.up ? iface.ip : "Disabled", status: iface?.up ? "Working properly" : "Device disabled" }] },
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
      <header className="absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 bg-[#071426]/80 px-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-semibold"><Monitor className="size-4 text-cyan-300" /> {pcOs === "windows" ? "IT PATH · Windows Lab" : pcOs === "linux" ? "IT PATH · Linux Lab" : "IT PATH · macOS Lab"}</div>
        <div className="flex items-center gap-2"><select value={pcOs} onChange={(e) => switchOs(e.target.value as PcOs)} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs text-white outline-none"><option value="windows" className="text-slate-900">Windows</option><option value="linux" className="text-slate-900">Linux</option><option value="mac" className="text-slate-900">macOS</option></select><div className="flex items-center gap-2 text-xs text-white/65"><Wifi className="size-4 text-cyan-300" /><span className="hidden sm:inline">Training network</span></div></div>
      </header>

      <main className="absolute inset-x-0 bottom-14 top-12 p-3 sm:p-6">
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
                {openApp === "files" ? (pcOs === "mac" ? "Finder" : pcOs === "linux" ? "Files" : "File Explorer") : openApp === "terminal" ? "Terminal" : openApp === "processes" ? (pcOs === "windows" ? "Task Manager" : "Activity Monitor") : openApp === "network" ? "Network" : openApp === "services" ? "Services" : openApp === "hardware" ? (pcOs === "windows" ? "Device Manager" : pcOs === "linux" ? "Hardware Information" : "System Information") : openApp === "logs" ? (pcOs === "windows" ? "Event Viewer" : pcOs === "linux" ? "System Logs" : "Console") : openApp === "storage" ? (pcOs === "windows" ? "Disk Management" : pcOs === "linux" ? "Disks & Filesystems" : "Disk Utility") : openApp === "accounts" ? (pcOs === "windows" ? "Local Users & Groups" : "Users & Groups") : "Settings"}
              </div>
              <button onClick={() => setOpenApp(null)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label="Close"><X className="size-4" /></button>
            </div>

            {openApp === "files" ? (
              <div className="flex h-[calc(100%-2.75rem)]">
                <aside className="hidden w-48 shrink-0 border-r border-slate-200 bg-slate-50 p-3 sm:block">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">This PC</p>
                  {["Desktop", "Documents", "Downloads", "Pictures"].map((item) => <div key={item} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-200/70"><Folder className="size-4 text-blue-500" />{item}</div>)}
                </aside>
                <div className="min-w-0 flex-1 p-3 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <button className="grid size-9 place-items-center rounded-lg border border-slate-200 sm:hidden"><Menu className="size-4" /></button>
                    <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search className="size-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search This PC" className="min-w-0 flex-1 select-text bg-transparent text-sm outline-none [-webkit-touch-callout:default]" /></div>
                  </div>
                  <div className="mb-3 flex gap-2"><input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="New item name" className="h-9 min-w-0 flex-1 select-text rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none" /><button onClick={createFolder} className="rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium">Folder</button><button onClick={createTextFile} className="rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium">Text file</button>{clipboard ? <button onClick={pasteItem} className="rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700">Paste</button> : null}</div>
                  <div className="mb-3 flex items-center gap-2"><button disabled={folder.length === 0} onClick={() => setFolder((current) => current.slice(0, -1))} className="grid size-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-30" aria-label="Back"><ChevronLeft className="size-4" /></button><div><h2 className="text-lg font-semibold">This PC</h2><p className="text-xs text-slate-500">C:\\{folder.join("\\")}</p></div></div>
                  <div className="grid gap-2">
                    {visibleFiles.map((file) => (
                      <button key={file.name} onClick={() => openFile(file)} onContextMenu={(e) => { e.preventDefault(); showContext(file); }} onPointerDown={() => beginPress(file)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress} className="flex touch-manipulation items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-blue-50">
                        {file.kind === "folder" ? <Folder className="size-7 shrink-0 text-amber-500" /> : <HardDrive className="size-7 shrink-0 text-blue-600" />}
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{file.name}</span><span className="block text-xs text-slate-500">{file.detail}</span></span>
                        <span onClick={(e) => { e.stopPropagation(); deleteItem(file); }} className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600">Delete</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : openApp === "terminal" ? (
              <div className="flex h-[calc(100%-2.75rem)] flex-col bg-[#0b1020] text-slate-100"><div className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm">{terminalLines.length === 0 ? <p className="text-slate-400">IT PATH {pcOs === "windows" ? "Windows" : pcOs === "linux" ? "Linux" : "macOS"} training terminal. Type help to begin.</p> : terminalLines.map((line, i) => <pre key={i} className="whitespace-pre-wrap break-words">{line}</pre>)}</div><form onSubmit={(e) => { e.preventDefault(); runEmbeddedTerminal(); }} className="flex items-center gap-2 border-t border-white/10 bg-black/20 p-3"><span className="shrink-0 font-mono text-xs text-cyan-300">{prompt(machine)}</span><input autoCapitalize="none" autoCorrect="off" spellCheck={false} value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)} className="min-w-0 flex-1 select-text bg-transparent font-mono text-sm text-white outline-none [-webkit-touch-callout:default]" placeholder="Enter command" /><button className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">Run</button></form></div>
            ) : openApp === "processes" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto p-4"><div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Memory</p><strong>{machine.memoryUsedMb} / {machine.memoryTotalMb} MB</strong></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Disk used</p><strong>{machine.diskUsedPercent}%</strong></div><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Processes</p><strong>{machine.processes.length}</strong></div></div><div className="space-y-2">{machine.processes.map((proc) => <div key={proc.pid} className="flex items-center gap-3 rounded-xl border bg-white p-3"><Activity className="size-5 text-emerald-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{proc.name}</p><p className="text-xs text-slate-500">PID {proc.pid} · {proc.user} · {proc.memoryMb} MB</p></div><button onClick={() => endProcess(proc.pid)} className="rounded-lg border px-2 py-1 text-xs hover:bg-red-50 hover:text-red-600">End</button></div>)}</div></div>
            ) : openApp === "network" ? (
              <div className="p-5">{(() => { const iface = primaryInterface(machine); return <><div className="flex items-center justify-between rounded-xl border bg-white p-4"><div><h2 className="font-semibold">{iface?.name ?? "Network adapter"}</h2><p className="text-sm text-slate-500">{iface?.up ? "Connected" : "Disconnected"}</p></div><button onClick={toggleNetwork} className="rounded-lg border px-3 py-2 text-sm">{iface?.up ? "Disable" : "Enable"}</button></div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{[["IP address", iface?.ip],["Subnet mask",iface?.mask],["Gateway",iface?.gateway],["DNS",machine.dnsServers.join(", ")]].map(([k,v]) => <div key={k} className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">{k}</p><p className="font-mono">{v || "—"}</p></div>)}</div></>; })()}</div>
            ) : openApp === "accounts" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto p-4"><div className="mb-4 rounded-xl bg-slate-100 p-4"><div className="flex items-center gap-3"><UsersRound className="size-8 text-sky-600" /><div><h2 className="font-semibold">{pcOs === "windows" ? "Local Users and Groups" : "Users & Groups"}</h2><p className="text-xs text-slate-500">{pcOs === "windows" ? "Manage local workstation accounts and group membership." : pcOs === "linux" ? "Manage local accounts, sudo access and account state." : "Manage Mac users, groups and administrator access."}</p></div></div></div><div className="mb-4 flex gap-2"><input value={accountName} onChange={(e) => setAccountName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAccount()} placeholder="New user name" className="min-w-0 flex-1 select-text rounded-lg border px-3 py-2 text-sm" /><button onClick={addAccount} className="rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white">Add user</button></div><div className="space-y-2">{machine.users.map((account) => <div key={account.name} className="rounded-xl border bg-white p-3"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-50"><UserRound className="size-5 text-sky-600" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{account.fullName || account.name}</p>{account.admin ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">Administrator</span> : null}{account.locked ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Locked</span> : null}</div><p className="text-xs text-slate-500">{account.name} · {account.groups.join(", ") || "standard user"}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => toggleAdmin(account.name)} disabled={account.name === machine.currentUser} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"><ShieldCheck className="mr-1 inline size-3" />{account.admin ? "Remove admin" : pcOs === "linux" ? "Add to sudo" : "Make admin"}</button><button onClick={() => toggleLock(account.name)} disabled={account.name === machine.currentUser} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40">{account.locked ? "Unlock account" : "Lock account"}</button></div></div></div></div>)}</div></div>
            ) : openApp === "storage" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto p-4"><div className="mb-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-100 p-4"><p className="text-xs text-slate-500">Primary disk</p><p className="mt-1 font-semibold">{pcOs === "windows" ? "Disk 0" : pcOs === "linux" ? "/dev/nvme0n1" : "APPLE SSD"}</p></div><div className="rounded-xl bg-slate-100 p-4"><p className="text-xs text-slate-500">Filesystem</p><p className="mt-1 font-semibold">{pcOs === "windows" ? "NTFS" : pcOs === "linux" ? "ext4" : "APFS"}</p></div><div className="rounded-xl bg-slate-100 p-4"><p className="text-xs text-slate-500">Usage</p><p className="mt-1 font-semibold">{machine.diskUsedPercent}% used</p></div></div><div className="rounded-xl border bg-white p-4"><div className="mb-4 flex items-center gap-3"><HardDrive className="size-8 text-cyan-600" /><div><h2 className="font-semibold">{pcOs === "windows" ? "Disk 0 · Basic · Online" : pcOs === "linux" ? "NVMe Disk · mounted" : "Internal Physical Volume"}</h2><p className="text-xs text-slate-500">{pcOs === "windows" ? "GPT partition style" : pcOs === "linux" ? "GPT partition table" : "GUID Partition Map"}</p></div></div><div className="overflow-hidden rounded-lg border"><div className="h-3 bg-cyan-500" style={{ width: `${Math.max(4, machine.diskUsedPercent)}%` }} /><div className="p-3"><p className="text-sm font-medium">{pcOs === "windows" ? "(C:) · NTFS · Healthy (Boot, Page File, Primary Partition)" : pcOs === "linux" ? "/ · ext4 · mounted read/write" : "Macintosh HD · APFS · Mounted"}</p><p className="mt-1 text-xs text-slate-500">{machine.diskUsedPercent}% used · {100 - machine.diskUsedPercent}% free</p></div></div></div><div className="mt-4 rounded-xl border bg-white p-4"><h3 className="mb-3 text-sm font-semibold">{pcOs === "windows" ? "Volumes" : pcOs === "linux" ? "Mount points" : "APFS volumes"}</h3><div className="grid gap-2 text-sm sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="font-medium">{pcOs === "windows" ? "C:" : "/"}</p><p className="text-xs text-slate-500">{pcOs === "windows" ? "System volume · NTFS" : pcOs === "linux" ? "Root filesystem · ext4" : "System volume · APFS"}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="font-medium">{pcOs === "windows" ? "Recovery" : pcOs === "linux" ? "/home" : "Macintosh HD - Data"}</p><p className="text-xs text-slate-500">{pcOs === "windows" ? "Recovery partition" : pcOs === "linux" ? "User data on root filesystem" : "Data volume · APFS"}</p></div></div></div></div>
            ) : openApp === "logs" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto p-4"><div className="mb-4 rounded-xl bg-slate-100 p-4"><div className="flex items-center gap-3"><ScrollText className="size-8 text-amber-600" /><div><h2 className="font-semibold">{pcOs === "windows" ? "Windows Logs" : pcOs === "linux" ? "System Journal" : "System Log"}</h2><p className="text-xs text-slate-500">{machine.hostname} · {machine.eventLog?.length ?? 0} recorded events</p></div></div></div><div className="space-y-2">{[...(machine.eventLog ?? [])].reverse().map((event, index) => { const warning = /fail|error|denied|down|stopped/i.test(event); return <div key={`${index}-${event}`} className="flex gap-3 rounded-xl border bg-white p-3"><div className={cn("mt-1 size-2 shrink-0 rounded-full", warning ? "bg-amber-500" : "bg-blue-500")} /><div className="min-w-0"><p className="text-sm">{event}</p><p className="mt-1 text-[11px] text-slate-400">{warning ? "Warning" : "Information"} · {pcOs === "windows" ? "System" : pcOs === "linux" ? "journal" : "system.log"}</p></div></div>; })}{!(machine.eventLog?.length) ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No system events recorded yet. Normal system actions will appear here.</div> : null}</div></div>
            ) : openApp === "hardware" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto p-4"><div className="mb-4 rounded-xl bg-slate-100 p-4"><div className="flex items-center gap-3"><Monitor className="size-8 text-violet-600" /><div><h2 className="font-semibold">{machine.hostname}</h2><p className="text-xs text-slate-500">{pcOs === "windows" ? "Device Manager · simulated workstation hardware" : pcOs === "linux" ? "Hardware probe · simulated Linux workstation" : "System Information · simulated Mac workstation"}</p></div></div></div><div className="space-y-4">{hardwareGroups.map((section) => <section key={section.group}><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.group}</h3><div className="space-y-2">{section.items.map((item) => <div key={item.name} className="flex items-center gap-3 rounded-xl border bg-white p-3"><div className="grid size-9 place-items-center rounded-lg bg-violet-50">{section.group.toLowerCase().includes("memory") ? <MemoryStick className="size-5 text-violet-600" /> : <Cpu className="size-5 text-violet-600" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-slate-500">{item.detail}</p></div><span className={cn("rounded-full px-2 py-1 text-[10px] font-medium", /disabled|down|inactive/i.test(item.status) ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{item.status}</span></div>)}</div></section>)}</div></div>
            ) : openApp === "services" ? (
              <div className="h-[calc(100%-2.75rem)] overflow-y-auto p-4"><div className="space-y-2">{machine.services.map((svc) => <div key={svc.name} className="flex items-center gap-3 rounded-xl border bg-white p-3"><ServerCog className="size-5 text-violet-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{svc.display}</p><p className="text-xs text-slate-500">{svc.name} · {svc.startType} · {svc.status}</p></div><button onClick={() => toggleService(svc.name, svc.status === "running")} className="rounded-lg border px-2 py-1 text-xs">{svc.status === "running" ? "Stop" : "Start"}</button></div>)}</div></div>
            ) : (
              <div className="p-5">
                <h2 className="text-xl font-semibold">System</h2>
                <p className="mt-1 text-sm text-slate-500">Safe simulated settings. Changes will eventually affect the same virtual machine used by labs and the terminal.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {["Network & internet", "Services", "System", "Accounts", "Storage"].map((item) => <button key={item} onClick={() => item === "Network & internet" ? launch("network") : item === "Services" ? launch("services") : undefined} className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-medium hover:bg-blue-50">{item}</button>)}
                </div>
              </div>
            )}
            {propertiesItem ? <div className="absolute inset-0 z-40 flex items-end bg-black/25 sm:items-center sm:justify-center" onClick={() => setPropertiesItem(null)}><div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:w-[28rem] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}><h3 className="font-semibold">{pcOs === "windows" ? "Properties · Security" : pcOs === "linux" ? "Properties · Permissions" : "Get Info · Sharing & Permissions"}</h3><p className="mb-4 truncate text-xs text-slate-500">{propertiesItem.name}</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-600">Owner<input value={propertyOwner} onChange={(e) => setPropertyOwner(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs text-slate-600">Group<input value={propertyGroup} onChange={(e) => setPropertyGroup(e.target.value)} className="mt-1 w-full select-text rounded-lg border px-3 py-2 text-sm" /></label></div><div className="mt-3"><p className="mb-2 text-xs font-medium text-slate-600">{pcOs === "windows" ? "Permission level (training representation)" : "Unix mode"}</p><div className="flex flex-wrap gap-2">{["644","600","755","700"].map((mode) => <button key={mode} onClick={() => setPropertyMode(mode)} className={cn("rounded-lg border px-3 py-2 text-xs", propertyMode === mode && "border-blue-500 bg-blue-50 text-blue-700")}>{mode} · {mode === "644" ? "owner write / others read" : mode === "600" ? "owner only" : mode === "755" ? "owner write / all execute" : "owner only execute"}</button>)}</div><input value={propertyMode} onChange={(e) => setPropertyMode(e.target.value.replace(/[^0-7]/g, "").slice(0,3))} inputMode="numeric" className="mt-2 w-24 select-text rounded-lg border px-3 py-2 font-mono text-sm" /></div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><p>{pcOs === "windows" ? "Security principal" : "Owner"}: {propertyOwner || "—"}</p><p>Group: {propertyGroup || "—"}</p><p>Path: {pathFor(propertiesItem.name)}</p></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setPropertiesItem(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={saveProperties} disabled={!/^[0-7]{3}$/.test(propertyMode)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Apply</button></div></div></div> : null}
            {contextItem ? <div className="absolute inset-0 z-30 flex items-end bg-black/20 sm:items-center sm:justify-center" onClick={() => setContextItem(null)}><div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:w-80 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-3"><p className="truncate text-sm font-semibold">{contextItem.name}</p><p className="text-xs text-slate-500">{contextItem.kind === "folder" ? "Folder" : contextItem.detail}</p></div><div className="mb-3 flex gap-2"><input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="min-w-0 flex-1 select-text rounded-lg border px-3 py-2 text-sm" /><button onClick={renameItem} className="rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white">Rename</button></div><div className="grid grid-cols-2 gap-2 text-sm"><button onClick={() => { openFile(contextItem); setContextItem(null); }} className="rounded-lg bg-slate-100 p-3">Open</button><button onClick={() => copyItem(false)} className="rounded-lg bg-slate-100 p-3">Copy</button><button onClick={() => copyItem(true)} className="rounded-lg bg-slate-100 p-3">Cut</button><button onClick={() => deleteItem(contextItem)} className="rounded-lg bg-red-50 p-3 text-red-600">Delete</button><button onClick={() => showProperties(contextItem)} className="col-span-2 rounded-lg bg-slate-100 p-3">Properties / Permissions</button></div><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><p>Location: {pathFor(contextItem.name)}</p></div></div></div> : null}
            {editing ? <div className="absolute inset-0 z-20 flex flex-col bg-white"><div className="flex h-11 items-center justify-between border-b px-3"><strong className="truncate text-sm">{editing.name}</strong><button onClick={() => setEditing(null)}><X className="size-4" /></button></div><textarea value={fileText} onChange={(e) => setFileText(e.target.value)} className="min-h-0 flex-1 select-text resize-none p-4 font-mono text-sm outline-none [-webkit-touch-callout:default]" /><div className="border-t p-3"><button onClick={saveText} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save file</button></div></div> : null}
          </section>
        ) : null}
      </main>

      {startOpen ? (
        <div className="absolute bottom-16 left-1/2 z-40 w-[min(92vw,34rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#101b2d]/95 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/60"><Search className="size-4" />Search apps and files</div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-5">
            <button onClick={() => launch("files")} className="rounded-xl p-3 hover:bg-white/10"><FolderOpen className="mx-auto mb-2 size-7 text-amber-300" />Explorer</button>
            <button onClick={() => launch("settings")} className="rounded-xl p-3 hover:bg-white/10"><Settings className="mx-auto mb-2 size-7" />Settings</button>
            <button onClick={() => launch("terminal")} className="rounded-xl p-3 hover:bg-white/10"><SquareTerminal className="mx-auto mb-2 size-7 text-cyan-300" />Terminal</button><button onClick={() => launch("processes")} className="rounded-xl p-3 hover:bg-white/10"><Activity className="mx-auto mb-2 size-7 text-emerald-300" />Processes</button><button onClick={() => launch("network")} className="rounded-xl p-3 hover:bg-white/10"><Network className="mx-auto mb-2 size-7 text-blue-300" />Network</button><button onClick={() => launch("hardware")} className="rounded-xl p-3 hover:bg-white/10"><Cpu className="mx-auto mb-2 size-7 text-violet-300" />Hardware</button><button onClick={() => launch("logs")} className="rounded-xl p-3 hover:bg-white/10"><ScrollText className="mx-auto mb-2 size-7 text-amber-300" />Logs</button><button onClick={() => launch("storage")} className="rounded-xl p-3 hover:bg-white/10"><HardDrive className="mx-auto mb-2 size-7 text-cyan-300" />Storage</button><button onClick={() => launch("accounts")} className="rounded-xl p-3 hover:bg-white/10"><UsersRound className="mx-auto mb-2 size-7 text-sky-300" />Users</button>
          </div>
        </div>
      ) : null}

      <footer className={cn("absolute inset-x-0 bottom-0 z-50 flex h-14 items-center justify-center border-t border-white/10 px-3 backdrop-blur-xl", pcOs === "windows" && "bg-[#071426]/85", pcOs === "linux" && "bg-[#1d1025]/88", pcOs === "mac" && "bottom-2 left-1/2 right-auto w-auto -translate-x-1/2 rounded-2xl border bg-white/15 shadow-2xl")}>
        <Link to="/dashboard" className="absolute left-3 flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white"><ChevronLeft className="size-4" /><span className="hidden sm:inline">Exit PC</span></Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setStartOpen((value) => !value)} className={cn("grid size-10 place-items-center rounded-xl hover:bg-white/10", startOpen && "bg-white/10")} aria-label="Start"><span className="grid grid-cols-2 gap-[2px]">{Array.from({length:4}).map((_,i)=><span key={i} className="size-[6px] bg-cyan-300" />)}</span></button>
          <button onClick={() => launch("files")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10" aria-label="File Explorer"><FolderOpen className="size-5 text-amber-300" /></button>
          <button onClick={() => launch("terminal")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10" aria-label="Terminal"><SquareTerminal className="size-5 text-cyan-300" /></button>
        </div>
      </footer>
    </div>
  );
}
