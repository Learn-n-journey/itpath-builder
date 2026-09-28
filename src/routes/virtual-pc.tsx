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
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { createMachine, getNode, type MachineState, type VfsNode } from "@/lib/terminal/machine";
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

type AppId = "files" | "settings";
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
  const { user } = useAppState();
  const sharedAttempt = user.terminalAttempts.find((attempt) => attempt.scenarioId === SHARED_WINDOWS_SCENARIO && attempt.status === "in_progress");
  const [fallbackMachine] = useState<MachineState>(() => freshWindowsMachine());
  const machine = sharedAttempt?.machine ?? fallbackMachine;
  const [folder, setFolder] = useState<string[]>(["Users", machine.currentUser]);
  const [openApp, setOpenApp] = useState<AppId | null>("files");
  const [startOpen, setStartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const currentNode = getNode(machine, folder);
  const visibleFiles = useMemo(
    () => entries(currentNode).filter((file) => file.name.toLowerCase().includes(query.toLowerCase())),
    [currentNode, query],
  );

  const openFile = (item: VirtualFile) => {
    if (item.kind === "folder") setFolder((current) => [...current, item.name]);
  };

  const launch = (app: AppId) => {
    setOpenApp(app);
    setStartOpen(false);
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[#071426] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(38,140,255,.32),transparent_32%),radial-gradient(circle_at_35%_75%,rgba(116,72,255,.22),transparent_35%),linear-gradient(145deg,#071426_0%,#0b2140_48%,#102a50_100%)]" />
      <header className="absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 bg-[#071426]/80 px-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-semibold"><Monitor className="size-4 text-cyan-300" /> IT PATH Virtual PC</div>
        <div className="flex items-center gap-2 text-xs text-white/65"><Wifi className="size-4 text-cyan-300" /><span className="hidden sm:inline">Training network</span></div>
      </header>

      <main className="absolute inset-x-0 bottom-14 top-12 p-3 sm:p-6">
        <div className="grid w-24 gap-5 text-center text-xs">
          <button onClick={() => launch("files")} className="rounded-xl p-2 hover:bg-white/10"><FolderOpen className="mx-auto mb-1 size-8 text-amber-300" />File Explorer</button>
          <button onClick={() => launch("settings")} className="rounded-xl p-2 hover:bg-white/10"><Settings className="mx-auto mb-1 size-8 text-slate-200" />Settings</button>
          <Link to="/command-line" className="rounded-xl p-2 hover:bg-white/10"><SquareTerminal className="mx-auto mb-1 size-8 text-cyan-300" />Terminal</Link>
        </div>

        {openApp ? (
          <section className="absolute inset-2 top-2 overflow-hidden rounded-2xl border border-white/15 bg-[#f7f9fc] text-slate-900 shadow-2xl sm:inset-x-[8%] sm:inset-y-[5%] lg:inset-x-[16%]">
            <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {openApp === "files" ? <FolderOpen className="size-4 text-blue-600" /> : <Settings className="size-4 text-blue-600" />}
                {openApp === "files" ? "File Explorer" : "Settings"}
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
                  <div className="mb-4 flex items-center gap-2">
                    <button className="grid size-9 place-items-center rounded-lg border border-slate-200 sm:hidden"><Menu className="size-4" /></button>
                    <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"><Search className="size-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search This PC" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
                  </div>
                  <div className="mb-3 flex items-center gap-2"><button disabled={folder.length === 0} onClick={() => setFolder((current) => current.slice(0, -1))} className="grid size-8 place-items-center rounded-lg border border-slate-200 disabled:opacity-30" aria-label="Back"><ChevronLeft className="size-4" /></button><div><h2 className="text-lg font-semibold">This PC</h2><p className="text-xs text-slate-500">C:\\{folder.join("\\")}</p></div></div>
                  <div className="grid gap-2">
                    {visibleFiles.map((file) => (
                      <button key={file.name} onClick={() => openFile(file)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-blue-50">
                        {file.kind === "folder" ? <Folder className="size-7 shrink-0 text-amber-500" /> : <HardDrive className="size-7 shrink-0 text-blue-600" />}
                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{file.name}</span><span className="block text-xs text-slate-500">{file.detail}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <h2 className="text-xl font-semibold">System</h2>
                <p className="mt-1 text-sm text-slate-500">Safe simulated settings. Changes will eventually affect the same virtual machine used by labs and the terminal.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {["Network & internet", "System", "Accounts", "Storage"].map((item) => <button key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-medium hover:bg-blue-50">{item}</button>)}
                </div>
              </div>
            )}
          </section>
        ) : null}
      </main>

      {startOpen ? (
        <div className="absolute bottom-16 left-1/2 z-40 w-[min(92vw,34rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#101b2d]/95 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/60"><Search className="size-4" />Search apps and files</div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-5">
            <button onClick={() => launch("files")} className="rounded-xl p-3 hover:bg-white/10"><FolderOpen className="mx-auto mb-2 size-7 text-amber-300" />Explorer</button>
            <button onClick={() => launch("settings")} className="rounded-xl p-3 hover:bg-white/10"><Settings className="mx-auto mb-2 size-7" />Settings</button>
            <Link to="/command-line" className="rounded-xl p-3 hover:bg-white/10"><SquareTerminal className="mx-auto mb-2 size-7 text-cyan-300" />Terminal</Link>
          </div>
        </div>
      ) : null}

      <footer className="absolute inset-x-0 bottom-0 z-50 flex h-14 items-center justify-center border-t border-white/10 bg-[#071426]/85 px-3 backdrop-blur-xl">
        <Link to="/dashboard" className="absolute left-3 flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-white/65 hover:bg-white/10 hover:text-white"><ChevronLeft className="size-4" /><span className="hidden sm:inline">Exit PC</span></Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setStartOpen((value) => !value)} className={cn("grid size-10 place-items-center rounded-xl hover:bg-white/10", startOpen && "bg-white/10")} aria-label="Start"><span className="grid grid-cols-2 gap-[2px]">{Array.from({length:4}).map((_,i)=><span key={i} className="size-[6px] bg-cyan-300" />)}</span></button>
          <button onClick={() => launch("files")} className="grid size-10 place-items-center rounded-xl hover:bg-white/10" aria-label="File Explorer"><FolderOpen className="size-5 text-amber-300" /></button>
          <Link to="/command-line" className="grid size-10 place-items-center rounded-xl hover:bg-white/10" aria-label="Terminal"><SquareTerminal className="size-5 text-cyan-300" /></Link>
        </div>
      </footer>
    </div>
  );
}
