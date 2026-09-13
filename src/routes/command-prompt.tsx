import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, RotateCcw, Terminal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/command-prompt")({
  head: () => ({
    meta: [
      { title: "Command Prompt — IT PATH" },
      { name: "description", content: "Practice Windows command-line skills in a safe virtual command prompt." },
    ],
  }),
  component: CommandPrompt,
});

type Entry = { type: "file" | "dir"; content?: string };
type FileSystem = Record<string, Entry>;

type Line = {
  kind: "input" | "output" | "error";
  text: string;
};

const initialFileSystem: FileSystem = {
  "C:\\": { type: "dir" },
  "C:\\Users": { type: "dir" },
  "C:\\Users\\Student": { type: "dir" },
  "C:\\Users\\Student\\Desktop": { type: "dir" },
  "C:\\Users\\Student\\Documents": { type: "dir" },
  "C:\\Users\\Student\\Documents\\notes.txt": { type: "file", content: "IT PATH practice notes\nRemember: commands are interpreted by a shell." },
  "C:\\Windows": { type: "dir" },
  "C:\\Windows\\System32": { type: "dir" },
};

const starterLines: Line[] = [
  { kind: "output", text: "Microsoft Windows [Version 11.0.26100.1]" },
  { kind: "output", text: "IT PATH Virtual Command Prompt — safe practice environment" },
  { kind: "output", text: "Type help to see available commands." },
];

const commandHelp: Record<string, string> = {
  cd: "Change the current directory. Example: cd Documents or cd ..",
  cls: "Clear the terminal screen.",
  dir: "List files and folders in the current directory.",
  echo: "Display text. Example: echo Hello IT",
  help: "Show available commands or get help for one command.",
  hostname: "Display the simulated computer name.",
  ipconfig: "Display simulated network configuration.",
  mkdir: "Create a virtual directory. Example: mkdir lab",
  ping: "Simulate a network connectivity test. Example: ping 8.8.8.8",
  pwd: "Show the current directory.",
  systeminfo: "Display simulated system information.",
  type: "Display the contents of a text file. Example: type notes.txt",
  ver: "Display the simulated Windows version.",
  whoami: "Display the simulated current user.",
};

function normalizePath(path: string) {
  const cleaned = path.replaceAll("/", "\\").replace(/\\+$/, "") || "C:";
  return cleaned.length === 2 && cleaned[1] === ":" ? `${cleaned}\\` : cleaned;
}

function resolvePath(current: string, input: string) {
  const value = input.trim();
  if (!value) return current;

  let parts: string[];
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    parts = value.split(/\\|\//);
  } else {
    parts = `${current}${current.endsWith("\\") ? "" : "\\"}${value}`.split(/\\|\//);
  }

  const drive = parts.shift() || "C:";
  const result: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") result.pop();
    else result.push(part);
  }

  return normalizePath([drive, ...result].join("\\"));
}

function childrenOf(fs: FileSystem, current: string) {
  const prefix = current.endsWith("\\") ? current : `${current}\\`;
  return Object.entries(fs)
    .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("\\"))
    .map(([path, entry]) => ({ name: path.slice(prefix.length), ...entry }))
    .sort((a, b) => Number(b.type === "dir") - Number(a.type === "dir") || a.name.localeCompare(b.name));
}

function CommandPrompt() {
  const [fs, setFs] = useState<FileSystem>(initialFileSystem);
  const [currentDir, setCurrentDir] = useState("C:\\Users\\Student");
  const [lines, setLines] = useState<Line[]>(starterLines);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompt = useMemo(() => `${currentDir}>`, [currentDir]);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight });
  }, [lines]);

  const reset = () => {
    setFs(initialFileSystem);
    setCurrentDir("C:\\Users\\Student");
    setLines(starterLines);
    setInput("");
    setHistory([]);
    setHistoryIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const execute = (rawCommand: string) => {
    const commandLine = rawCommand.trim();
    if (!commandLine) return;

    const [rawName, ...args] = commandLine.split(/\s+/);
    const command = rawName.toLowerCase();
    const rest = args.join(" ");
    const next: Line[] = [{ kind: "input", text: `${prompt}${commandLine}` }];

    if (command === "cls" || command === "clear") {
      setLines([]);
      return;
    }

    if (command === "help") {
      if (args[0] && commandHelp[args[0].toLowerCase()]) {
        next.push({ kind: "output", text: `${args[0].toUpperCase()} — ${commandHelp[args[0].toLowerCase()]}` });
      } else if (args[0]) {
        next.push({ kind: "error", text: `No help available for '${args[0]}'.` });
      } else {
        next.push({ kind: "output", text: "Available commands:" });
        next.push({ kind: "output", text: Object.keys(commandHelp).join("   ") });
        next.push({ kind: "output", text: "Tip: this is a simulator. Commands never access your real computer." });
      }
    } else if (command === "dir") {
      const entries = childrenOf(fs, currentDir);
      next.push({ kind: "output", text: ` Directory of ${currentDir}` });
      next.push({ kind: "output", text: "" });
      if (!entries.length) next.push({ kind: "output", text: "<DIR>          ." });
      entries.forEach((entry) => {
        next.push({ kind: "output", text: `${entry.type === "dir" ? "<DIR>" : "     "}          ${entry.name}` });
      });
    } else if (command === "cd") {
      if (!rest) {
        next.push({ kind: "output", text: currentDir });
      } else {
        const target = resolvePath(currentDir, rest);
        if (fs[target]?.type === "dir") setCurrentDir(target);
        else next.push({ kind: "error", text: `The system cannot find the path specified: ${rest}` });
      }
    } else if (command === "pwd") {
      next.push({ kind: "output", text: currentDir });
    } else if (command === "echo") {
      next.push({ kind: "output", text: rest });
    } else if (command === "whoami") {
      next.push({ kind: "output", text: "ITPATH\\student" });
    } else if (command === "hostname") {
      next.push({ kind: "output", text: "ITPATH-LAB01" });
    } else if (command === "ver") {
      next.push({ kind: "output", text: "Microsoft Windows [Version 11.0.26100.1]" });
    } else if (command === "ipconfig") {
      next.push({ kind: "output", text: "Windows IP Configuration" });
      next.push({ kind: "output", text: "" });
      next.push({ kind: "output", text: "Ethernet adapter Ethernet:" });
      next.push({ kind: "output", text: "   IPv4 Address . . . . . . . . . : 192.168.1.25" });
      next.push({ kind: "output", text: "   Subnet Mask . . . . . . . . . : 255.255.255.0" });
      next.push({ kind: "output", text: "   Default Gateway . . . . . . . : 192.168.1.1" });
    } else if (command === "ping") {
      const target = args[0] || "127.0.0.1";
      next.push({ kind: "output", text: `Pinging ${target} with 32 bytes of data:` });
      next.push({ kind: "output", text: `Reply from ${target}: bytes=32 time=12ms TTL=57` });
      next.push({ kind: "output", text: `Reply from ${target}: bytes=32 time=10ms TTL=57` });
      next.push({ kind: "output", text: "Ping statistics: Sent = 2, Received = 2, Lost = 0 (0% loss)" });
    } else if (command === "systeminfo") {
      next.push({ kind: "output", text: "Host Name:                 ITPATH-LAB01" });
      next.push({ kind: "output", text: "OS Name:                   Microsoft Windows 11 Pro" });
      next.push({ kind: "output", text: "System Type:               x64-based PC" });
      next.push({ kind: "output", text: "Total Physical Memory:     16,384 MB" });
    } else if (command === "mkdir" || command === "md") {
      if (!rest) {
        next.push({ kind: "error", text: "The syntax of the command is incorrect." });
      } else {
        const target = resolvePath(currentDir, rest);
        if (fs[target]) next.push({ kind: "error", text: "A file or directory with that name already exists." });
        else {
          setFs((value) => ({ ...value, [target]: { type: "dir" } }));
          next.push({ kind: "output", text: `Created directory ${target}` });
        }
      }
    } else if (command === "type" || command === "cat") {
      if (!rest) next.push({ kind: "error", text: "The syntax of the command is incorrect." });
      else {
        const target = resolvePath(currentDir, rest);
        const entry = fs[target];
        if (entry?.type === "file") {
          (entry.content || "").split("\n").forEach((line) => next.push({ kind: "output", text: line }));
        } else next.push({ kind: "error", text: `The system cannot find the file specified: ${rest}` });
      }
    } else {
      next.push({ kind: "error", text: `'${rawName}' is not recognized as an internal or external command.` });
      next.push({ kind: "output", text: "Type help for a list of supported commands." });
    }

    setLines((value) => [...value, ...next]);
    setHistory((value) => [commandLine, ...value.filter((item) => item !== commandLine)].slice(0, 30));
    setHistoryIndex(-1);
    setInput("");
  };

  return (
    <>
      <PageHeader
        title="Virtual Command Prompt"
        description="Practice command-line skills in a safe Windows-style environment. Nothing here runs on your actual computer."
        actions={
          <Button variant="outline" onClick={reset}>
            <RotateCcw /> Reset lab
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="overflow-hidden rounded-xl border border-border bg-[#0b0f0c] shadow-sm" onClick={() => inputRef.current?.focus()}>
          <div className="flex items-center gap-2 border-b border-white/10 bg-[#151a16] px-4 py-2.5 text-xs text-white/70">
            <Terminal className="size-4" />
            <span>IT PATH Command Prompt</span>
            <span className="ml-auto">Virtual Lab</span>
          </div>
          <div ref={terminalRef} className="h-[520px] overflow-y-auto p-4 font-mono text-[13px] leading-6 text-white/90 sm:p-5">
            {lines.map((line, index) => (
              <div key={`${index}-${line.text}`} className={line.kind === "error" ? "text-red-300" : line.kind === "input" ? "text-white" : "text-white/80"}>
                {line.text || "\u00a0"}
              </div>
            ))}
            <form
              className="flex items-center"
              onSubmit={(event) => {
                event.preventDefault();
                execute(input);
              }}
            >
              <span className="mr-2 shrink-0 text-white">{prompt}</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (history.length) {
                      const nextIndex = Math.min(historyIndex + 1, history.length - 1);
                      setHistoryIndex(nextIndex);
                      setInput(history[nextIndex]);
                    }
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    const nextIndex = historyIndex - 1;
                    setHistoryIndex(nextIndex);
                    setInput(nextIndex < 0 ? "" : history[nextIndex]);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-white outline-none"
                autoComplete="off"
                spellCheck={false}
                aria-label="Command input"
              />
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <Terminal className="size-4 text-primary" /> Quick commands
            </div>
            <div className="space-y-1.5">
              {["help", "dir", "cd Documents", "ipconfig", "ping 8.8.8.8", "systeminfo"].map((command) => (
                <button
                  key={command}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left font-mono text-xs hover:bg-muted"
                  onClick={() => {
                    setInput(command);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  {command}
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-medium">Practice safely</p>
            <p className="mt-1 text-muted-foreground">This simulator uses a virtual file system. It cannot change files, settings, or network connections on your device.</p>
            <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={() => { setLines([]); setInput(""); inputRef.current?.focus(); }}>
              <Trash2 /> Clear screen
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
