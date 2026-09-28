/**
 * A safe, fully simulated computer.
 *
 * Nothing here touches the real device: the filesystem, users, permissions,
 * processes, services and network are plain data held in one serialisable
 * object, so a session can be saved, restored and resumed later.
 */

export type ShellKind = "cmd" | "powershell" | "bash" | "mac" | "android" | "ios";
export type PlatformKind = "windows" | "linux" | "macos" | "android" | "ios";

export interface VfsNode {
  type: "dir" | "file";
  name: string;
  /** File contents. Directories use `children`. */
  content?: string;
  children?: Record<string, VfsNode>;
  owner: string;
  group: string;
  /** Octal permission string, e.g. "644". Windows paths use it for read-only checks too. */
  mode: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memoryMb: number;
  /** Set when the process is the cause of a scenario fault. */
  note?: string;
}

export interface ServiceInfo {
  name: string;
  display: string;
  status: "running" | "stopped";
  startType: "auto" | "manual" | "disabled";
  /** Written to the service log when a start is attempted and fails. */
  failReason?: string;
}

export interface NetInterface {
  name: string;
  mac: string;
  ip: string;
  mask: string;
  gateway: string;
  dhcp: boolean;
  up: boolean;
}

export interface UserAccount {
  name: string;
  fullName: string;
  groups: string[];
  admin: boolean;
  locked: boolean;
  passwordExpired: boolean;
}

export interface NetworkTarget {
  /** Hostname or IP the learner may probe. */
  host: string;
  ip?: string;
  reachable: boolean;
  latencyMs?: number;
  /** Ports that answer a connection test. */
  openPorts?: number[];
}

export interface MachineState {
  shell: ShellKind;
  /** Operating-system identity is separate from the active shell. */
  platform: PlatformKind;
  hostname: string;
  currentUser: string;
  /** True when the shell is running elevated (sudo -i, Run as administrator). */
  elevated: boolean;
  /** Absolute path segments of the working directory, without the drive on Windows. */
  cwd: string[];
  drive: string;
  users: UserAccount[];
  root: VfsNode;
  processes: ProcessInfo[];
  services: ServiceInfo[];
  interfaces: NetInterface[];
  dnsServers: string[];
  /** Name resolution the simulated resolver can answer. */
  dnsRecords: Record<string, string>;
  /** Cached bad answers cleared by a DNS flush. */
  dnsCache: Record<string, string>;
  targets: NetworkTarget[];
  firewallEnabled: boolean;
  blockedPorts: number[];
  env: Record<string, string>;
  diskUsedPercent: number;
  memoryTotalMb: number;
  memoryUsedMb: number;
  osName: string;
  history: string[];
  nextPid: number;
  /** Lines appended by services, for journalctl / Get-EventLog style reads. */
  eventLog: string[];
}

export interface ExecResult {
  state: MachineState;
  output: string;
  /** True when the command failed, so the UI and evaluator can tell errors apart. */
  error: boolean;
  /** Clears the transcript (clear, cls, Clear-Host). */
  cleared?: boolean;
}

/* ------------------------------------------------------------------ */
/* Filesystem helpers                                                  */
/* ------------------------------------------------------------------ */

export function dir(name: string, owner = "root", mode = "755"): VfsNode {
  return { type: "dir", name, children: {}, owner, group: owner, mode };
}

export function file(name: string, content: string, owner = "root", mode = "644"): VfsNode {
  return { type: "file", name, content, owner, group: owner, mode };
}

export function clone(state: MachineState): MachineState {
  return JSON.parse(JSON.stringify(state)) as MachineState;
}

export function isWindows(state: MachineState): boolean {
  return state.platform ? state.platform === "windows" : state.shell === "cmd" || state.shell === "powershell";
}

export function isMac(state: MachineState): boolean {
  return state.platform ? state.platform === "macos" : state.shell === "mac";
}

/** Android and iOS build on the same Unix-style tree as Linux. */
export function isMobile(state: MachineState | ShellKind): boolean {
  const shell = typeof state === "string" ? state : state.shell;
  return shell === "android" || shell === "ios";
}

export function sep(state: MachineState): string {
  return isWindows(state) ? "\\" : "/";
}

/** Human readable working directory, in the shell's own style. */
export function promptPath(state: MachineState): string {
  if (isWindows(state)) {
    return `${state.drive}\\${state.cwd.join("\\")}`.replace(/\\$/, "") || `${state.drive}\\`;
  }
  const home = homeDir(state).join("/");
  const here = state.cwd.join("/");
  if (here === home) return "~";
  if (home && here.startsWith(`${home}/`)) return `~/${here.slice(home.length + 1)}`;
  return `/${here}`;
}

export function prompt(state: MachineState): string {
  if (state.shell === "cmd") return `${promptPath(state)}>`;
  if (state.shell === "powershell") return `PS ${promptPath(state)}>`;
  if (state.shell === "mac") return `${state.hostname}:${promptPath(state)} ${state.currentUser}$ `;
  if (state.shell === "ios") return `${state.hostname} support>`;
  if (state.shell === "android") return `${state.hostname}:${promptPath(state)}${state.elevated ? "#" : "$"} `;
  return `${state.currentUser}@${state.hostname}:${promptPath(state)}${state.elevated ? "#" : "$"} `;
}

export function homeDir(state: MachineState): string[] {
  if (isWindows(state)) return ["Users", state.currentUser];
  if (state.shell === "android") return ["sdcard"];
  if (state.shell === "ios") return ["device"];
  if (isMac(state)) return state.currentUser === "root" ? ["var", "root"] : ["Users", state.currentUser];
  return state.currentUser === "root" ? ["root"] : ["home", state.currentUser];
}

/** Turns any user supplied path into absolute segments. */
export function resolvePath(state: MachineState, input: string): string[] {
  let raw = input.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (raw === "") return [...state.cwd];

  const windows = isWindows(state);
  if (windows) raw = raw.replace(/\//g, "\\");
  const splitter = windows ? "\\" : "/";

  let segments: string[];
  if (windows && /^[a-zA-Z]:/.test(raw)) {
    segments = raw.slice(2).split(splitter);
  } else if (raw.startsWith(splitter)) {
    segments = raw.split(splitter);
  } else if (!windows && (raw === "~" || raw.startsWith("~/"))) {
    segments = [...homeDir(state), ...raw.slice(2).split("/")];
  } else if (windows && raw.startsWith("~")) {
    segments = [...homeDir(state), ...raw.slice(1).split(splitter)];
  } else {
    segments = [...state.cwd, ...raw.split(splitter)];
  }

  const out: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out;
}

export function displayPath(state: MachineState, segments: string[]): string {
  return isWindows(state)
    ? `${state.drive}\\${segments.join("\\")}`
    : `/${segments.join("/")}`;
}

export function getNode(state: MachineState, segments: string[]): VfsNode | null {
  let node: VfsNode = state.root;
  for (const segment of segments) {
    if (node.type !== "dir" || !node.children) return null;
    const next = node.children[segment] ?? findCaseInsensitive(node, segment, state);
    if (!next) return null;
    node = next;
  }
  return node;
}

function findCaseInsensitive(node: VfsNode, name: string, state: MachineState): VfsNode | undefined {
  if (!isWindows(state) || !node.children) return undefined;
  const key = Object.keys(node.children).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? node.children[key] : undefined;
}

export function parentOf(state: MachineState, segments: string[]): VfsNode | null {
  return getNode(state, segments.slice(0, -1));
}

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

function modeDigit(node: VfsNode, position: 0 | 1 | 2): number {
  const digits = node.mode.padStart(3, "0").slice(-3);
  return Number.parseInt(digits[position] ?? "0", 10);
}

export function canRead(state: MachineState, node: VfsNode): boolean {
  if (state.elevated || state.currentUser === "root") return true;
  if (isWindows(state)) return node.owner === state.currentUser || node.mode !== "600";
  const position = node.owner === state.currentUser ? 0 : 2;
  return (modeDigit(node, position) & 4) === 4;
}

export function canWrite(state: MachineState, node: VfsNode): boolean {
  if (state.elevated || state.currentUser === "root") return true;
  if (isWindows(state)) return node.owner === state.currentUser || node.mode !== "444";
  const position = node.owner === state.currentUser ? 0 : 2;
  return (modeDigit(node, position) & 2) === 2;
}

export function canExecute(state: MachineState, node: VfsNode): boolean {
  if (state.elevated || state.currentUser === "root") return true;
  const position = node.owner === state.currentUser ? 0 : 2;
  return (modeDigit(node, position) & 1) === 1;
}

export function permissionString(node: VfsNode): string {
  const digits = node.mode.padStart(3, "0").slice(-3).split("").map((d) => Number.parseInt(d, 10));
  const rwx = (value: number) =>
    `${value & 4 ? "r" : "-"}${value & 2 ? "w" : "-"}${value & 1 ? "x" : "-"}`;
  return `${node.type === "dir" ? "d" : "-"}${rwx(digits[0] ?? 0)}${rwx(digits[1] ?? 0)}${rwx(digits[2] ?? 0)}`;
}

/* ------------------------------------------------------------------ */
/* Network helpers                                                     */
/* ------------------------------------------------------------------ */

export function primaryInterface(state: MachineState): NetInterface | undefined {
  return state.interfaces.find((iface) => iface.name !== "lo" && iface.name !== "Loopback");
}

export function resolveHost(state: MachineState, host: string): string | null {
  const key = host.toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  const hostsFile = getNode(state, isWindows(state)
    ? ["Windows", "System32", "drivers", "etc", "hosts"]
    : ["etc", "hosts"]);
  if (hostsFile?.content) {
    for (const line of hostsFile.content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [ip, ...names] = trimmed.split(/\s+/);
      if (ip && names.some((name) => name.toLowerCase() === key)) return ip;
    }
  }
  if (state.dnsCache[key]) return state.dnsCache[key] as string;
  if (state.dnsServers.length === 0) return null;
  return state.dnsRecords[key] ?? null;
}

export function findTarget(state: MachineState, hostOrIp: string): NetworkTarget | undefined {
  const key = hostOrIp.toLowerCase();
  const ip = resolveHost(state, hostOrIp);
  return state.targets.find(
    (target) => target.host.toLowerCase() === key || (ip !== null && target.ip === ip),
  );
}

/** True when the machine has a usable address and an up link. */
export function hasLink(state: MachineState): boolean {
  const iface = primaryInterface(state);
  return Boolean(iface && iface.up && iface.ip && !iface.ip.startsWith("169.254."));
}

/* ------------------------------------------------------------------ */
/* Machine construction                                                */
/* ------------------------------------------------------------------ */

export interface MachineSpec {
  shell: ShellKind;
  hostname?: string;
  user?: string;
  elevated?: boolean;
  /** Extra files, keyed by absolute path. */
  files?: Record<string, string>;
  /** Extra directories, by absolute path. */
  dirs?: string[];
  /** Permission overrides, by absolute path: "owner:group:mode". */
  perms?: Record<string, string>;
  users?: UserAccount[];
  processes?: ProcessInfo[];
  services?: ServiceInfo[];
  interfaces?: NetInterface[];
  dnsServers?: string[];
  dnsRecords?: Record<string, string>;
  dnsCache?: Record<string, string>;
  targets?: NetworkTarget[];
  firewallEnabled?: boolean;
  blockedPorts?: number[];
  diskUsedPercent?: number;
  memoryUsedMb?: number;
  eventLog?: string[];
  cwd?: string;
}

function insert(root: VfsNode, segments: string[], node: VfsNode) {
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    current.children ??= {};
    const existing = current.children[segment];
    if (!existing || existing.type !== "dir") {
      current.children[segment] = dir(segment);
    }
    current = current.children[segment] as VfsNode;
  }
  current.children ??= {};
  const last = segments[segments.length - 1];
  if (last) current.children[last] = node;
}

function baseLinuxRoot(user: string): VfsNode {
  const root = dir("/");
  const add = (path: string, node: VfsNode) => insert(root, path.split("/").filter(Boolean), node);
  for (const folder of ["bin", "etc", "var", "var/log", "usr", "usr/local", "tmp", "opt", "home", "root", "srv"]) {
    add(folder, dir(folder.split("/").pop() as string));
  }
  add(`home/${user}`, dir(user, user, "755"));
  add(`home/${user}/documents`, dir("documents", user, "755"));
  add(`home/${user}/notes.txt`, file("notes.txt", "Remember: check the link before blaming DNS.\n", user, "644"));
  add("etc/hosts", file("hosts", "127.0.0.1 localhost\n::1 localhost\n", "root", "644"));
  add("etc/resolv.conf", file("resolv.conf", "nameserver 10.0.0.1\n", "root", "644"));
  add("etc/passwd", file("passwd", `root:x:0:0:root:/root:/bin/bash\n${user}:x:1000:1000::/home/${user}:/bin/bash\n`, "root", "644"));
  add("etc/fstab", file("fstab", "/dev/sda1 / ext4 defaults 0 1\n", "root", "644"));
  add("var/log/syslog", file("syslog", "system boot completed\n", "root", "640"));
  return root;
}

function baseMacRoot(user: string): VfsNode {
  const root = dir("/");
  const add = (path: string, node: VfsNode) => insert(root, path.split("/").filter(Boolean), node);
  for (const folder of ["Applications", "Library", "System", "Users", `Users/${user}`, `Users/${user}/Desktop`, `Users/${user}/Documents`, `Users/${user}/Downloads`, "Volumes", "private", "private/etc", "private/var", "usr", "usr/bin", "usr/local", "bin", "sbin", "var"]) {
    add(folder, dir(folder.split("/").pop() as string, folder.startsWith("Users/") ? user : "root", "755"));
  }
  add(`Users/${user}/Documents/IT PATH Lab Notes.txt`, file("IT PATH Lab Notes.txt", "macOS training workstation notes.\\n", user, "644"));
  add("private/etc/hosts", file("hosts", "127.0.0.1 localhost\\n::1 localhost\\n", "root", "644"));
  add("private/etc/passwd", file("passwd", `root:*:0:0:System Administrator:/var/root:/bin/sh\\n${user}:*:501:20:Standard User:/Users/${user}:/bin/zsh\\n`, "root", "644"));
  return root;
}

function baseWindowsRoot(user: string): VfsNode {
  const root = dir("C:");
  const add = (path: string, node: VfsNode) => insert(root, path.split("\\").filter(Boolean), node);
  for (const folder of [
    "Windows",
    "Windows\\System32",
    "Windows\\System32\\drivers",
    "Windows\\System32\\drivers\\etc",
    "Windows\\Logs",
    "Program Files",
    "Users",
    `Users\\${user}`,
    `Users\\${user}\\Documents`,
    `Users\\${user}\\Desktop`,
    "Temp",
  ]) {
    add(folder, dir(folder.split("\\").pop() as string, "Administrator", "755"));
  }
  add(
    "Windows\\System32\\drivers\\etc\\hosts",
    file("hosts", "# Copyright (c) 1993-2009 Microsoft Corp.\n127.0.0.1 localhost\n", "Administrator", "644"),
  );
  add(
    `Users\\${user}\\Documents\\readme.txt`,
    file("readme.txt", "Company laptop. Log tickets in the helpdesk queue.\r\n", user, "644"),
  );
  return root;
}

function baseAndroidRoot(user: string): VfsNode {
  const root = dir("/");
  const add = (path: string, node: VfsNode) => insert(root, path.split("/").filter(Boolean), node);
  for (const folder of ["system", "data", "data/data", "data/local", "data/local/tmp", "sdcard", "sdcard/Download", "sdcard/DCIM", "sdcard/Android", "cache", "storage"]) {
    add(folder, dir(folder.split("/").pop() as string, user, "755"));
  }
  add("sdcard/Download/support-notes.txt", file("support-notes.txt", "Battery drops fast after the last app update.\n", user, "644"));
  add("data/data/com.corp.mail", dir("com.corp.mail", user, "700"));
  add("data/data/com.corp.mail/cache", dir("cache", user, "700"));
  add("data/data/com.corp.mail/cache/mail.tmp", file("mail.tmp", "corrupt sync state\n", user, "600"));
  add("system/build.prop", file("build.prop", "ro.product.model=Pixel 8\nro.build.version.release=14\n", "root", "644"));
  add("etc/hosts", file("hosts", "127.0.0.1 localhost\n", "root", "644"));
  return root;
}

function baseIosRoot(user: string): VfsNode {
  const root = dir("/");
  const add = (path: string, node: VfsNode) => insert(root, path.split("/").filter(Boolean), node);
  for (const folder of ["device", "profiles", "backups", "apps", "logs"]) {
    add(folder, dir(folder.split("/").pop() as string, user, "755"));
  }
  add("device/summary.txt", file("summary.txt", "iPhone 15 · iOS 17.5 · 128 GB · battery health 87%\n", user, "644"));
  add("logs/sync.log", file("sync.log", "iCloud sync last completed 4 days ago\n", user, "644"));
  add("etc/hosts", file("hosts", "127.0.0.1 localhost\n", "root", "644"));
  return root;
}

export function createMachine(spec: MachineSpec): MachineState {
  const windows = spec.shell === "cmd" || spec.shell === "powershell";
  const mac = spec.shell === "mac";
  const android = spec.shell === "android";
  const ios = spec.shell === "ios";
  const user = spec.user ?? (android ? "shell" : ios ? "support" : "student");
  const hostname =
    spec.hostname ??
    (windows ? "WS-041" : mac ? "itpath-mac" : android ? "pixel-8" : ios ? "iPhone-Sales-04" : "lab-linux-01");
  const root = windows
    ? baseWindowsRoot(user)
    : mac
      ? baseMacRoot(user)
      : android
      ? baseAndroidRoot(user)
      : ios
        ? baseIosRoot(user)
        : baseLinuxRoot(user);

  const state: MachineState = {
    shell: spec.shell,
    platform: windows ? "windows" : mac ? "macos" : android ? "android" : ios ? "ios" : "linux",
    hostname,
    currentUser: user,
    // CMD scenarios are written as elevated support sessions; PowerShell scenarios
    // teach elevation explicitly with Start-Process -Verb RunAs.
    elevated: spec.elevated ?? spec.shell === "cmd",
    cwd: windows ? ["Users", user] : mac ? ["Users", user] : android ? ["sdcard"] : ios ? ["device"] : ["home", user],
    drive: "C:",
    users: spec.users ?? [
      {
        name: user,
        fullName: "Standard user",
        groups: windows ? ["Users"] : [user, "sudo"],
        admin: false,
        locked: false,
        passwordExpired: false,
      },
      {
        name: windows ? "Administrator" : "root",
        fullName: "Built-in administrator",
        groups: windows ? ["Administrators"] : ["root"],
        admin: true,
        locked: false,
        passwordExpired: false,
      },
    ],
    root,
    processes: spec.processes ?? defaultProcesses(spec.shell, user),
    services: spec.services ?? defaultServices(spec.shell),
    interfaces: spec.interfaces ?? defaultInterfaces(spec.shell),
    dnsServers: spec.dnsServers ?? ["10.0.0.1"],
    dnsRecords: spec.dnsRecords ?? {
      "intranet.corp.local": "10.0.0.20",
      "fileserver.corp.local": "10.0.0.25",
      "example.com": "93.184.216.34",
    },
    dnsCache: spec.dnsCache ?? {},
    targets: spec.targets ?? defaultTargets(),
    firewallEnabled: spec.firewallEnabled ?? true,
    blockedPorts: spec.blockedPorts ?? [],
    env: windows
      ? { USERNAME: user, COMPUTERNAME: hostname, PATH: "C:\\Windows\\System32" }
      : {
          USER: user,
          HOSTNAME: hostname,
          PATH: android ? "/system/bin:/system/xbin" : "/usr/local/bin:/usr/bin:/bin",
          HOME: android ? "/sdcard" : ios ? "/device" : mac ? `/Users/${user}` : `/home/${user}`,
        },
    diskUsedPercent: spec.diskUsedPercent ?? 46,
    memoryTotalMb: 8192,
    memoryUsedMb: spec.memoryUsedMb ?? 3100,
    osName: windows
      ? "Microsoft Windows 11 Pro 10.0.22631"
      : mac
        ? "macOS 15 Sequoia"
        : android
        ? "Android 14 (Pixel 8)"
        : ios
          ? "iOS 17.5 (iPhone 15)"
          : "Ubuntu 22.04.4 LTS",
    history: [],
    nextPid: 4200,
    eventLog: spec.eventLog ?? [],
  };

  for (const path of spec.dirs ?? []) {
    const segments = resolvePath(state, path);
    insert(state.root, segments, dir(segments[segments.length - 1] as string, user, "755"));
  }
  for (const [path, content] of Object.entries(spec.files ?? {})) {
    const segments = resolvePath(state, path);
    insert(state.root, segments, file(segments[segments.length - 1] as string, content, user, "644"));
  }
  for (const [path, rule] of Object.entries(spec.perms ?? {})) {
    const node = getNode(state, resolvePath(state, path));
    if (!node) continue;
    const [owner, group, mode] = rule.split(":");
    if (owner) node.owner = owner;
    if (group) node.group = group;
    if (mode) node.mode = mode;
  }
  if (spec.cwd) state.cwd = resolvePath(state, spec.cwd);

  return state;
}

function defaultProcesses(shell: ShellKind, user: string): ProcessInfo[] {
  if (shell === "android") {
    return [
      { pid: 1, name: "init", user: "root", cpu: 0.1, memoryMb: 10 },
      { pid: 540, name: "system_server", user: "system", cpu: 1.2, memoryMb: 320 },
      { pid: 1822, name: "com.android.launcher", user, cpu: 0.6, memoryMb: 180 },
      { pid: 2104, name: "com.corp.mail", user, cpu: 1.4, memoryMb: 210 },
      { pid: 2380, name: "com.android.chrome", user, cpu: 2.1, memoryMb: 340 },
    ];
  }
  if (shell === "ios") {
    return [
      { pid: 1, name: "launchd", user: "root", cpu: 0.1, memoryMb: 8 },
      { pid: 220, name: "Mail", user, cpu: 0.8, memoryMb: 150 },
      { pid: 318, name: "Safari", user, cpu: 1.6, memoryMb: 280 },
      { pid: 402, name: "Maps", user, cpu: 2.4, memoryMb: 260 },
    ];
  }
  if (shell === "bash") {
    return [
      { pid: 1, name: "systemd", user: "root", cpu: 0.1, memoryMb: 12 },
      { pid: 412, name: "sshd", user: "root", cpu: 0.0, memoryMb: 9 },
      { pid: 633, name: "cron", user: "root", cpu: 0.0, memoryMb: 4 },
      { pid: 1104, name: "bash", user, cpu: 0.1, memoryMb: 6 },
      { pid: 1288, name: "nginx", user: "www-data", cpu: 0.4, memoryMb: 48 },
    ];
  }
  return [
    { pid: 4, name: "System", user: "SYSTEM", cpu: 0.2, memoryMb: 24 },
    { pid: 812, name: "svchost.exe", user: "SYSTEM", cpu: 0.4, memoryMb: 96 },
    { pid: 1420, name: "explorer.exe", user, cpu: 1.1, memoryMb: 184 },
    { pid: 2208, name: "msedge.exe", user, cpu: 3.4, memoryMb: 512 },
    { pid: 3316, name: "OneDrive.exe", user, cpu: 0.6, memoryMb: 142 },
  ];
}

function defaultServices(shell: ShellKind): ServiceInfo[] {
  if (shell === "android") {
    return [
      { name: "wifi", display: "Wi-Fi radio", status: "running", startType: "auto" },
      { name: "bluetooth", display: "Bluetooth radio", status: "running", startType: "auto" },
      { name: "data", display: "Mobile data", status: "running", startType: "auto" },
      { name: "nfc", display: "NFC controller", status: "running", startType: "auto" },
      { name: "location", display: "Location services", status: "running", startType: "auto" },
      { name: "sync", display: "Account sync", status: "running", startType: "auto" },
    ];
  }
  if (shell === "ios") {
    return [
      { name: "wifi", display: "Wi-Fi", status: "running", startType: "auto" },
      { name: "bluetooth", display: "Bluetooth", status: "running", startType: "auto" },
      { name: "cellular", display: "Cellular data", status: "running", startType: "auto" },
      { name: "icloud", display: "iCloud sync", status: "running", startType: "auto" },
      { name: "mail", display: "Mail account", status: "running", startType: "auto" },
      { name: "mdm", display: "Mobile device management", status: "running", startType: "auto" },
      { name: "findmy", display: "Find My iPhone", status: "running", startType: "auto" },
    ];
  }
  if (shell === "bash") {
    return [
      { name: "ssh", display: "OpenBSD Secure Shell server", status: "running", startType: "auto" },
      { name: "cron", display: "Regular background program processing", status: "running", startType: "auto" },
      { name: "nginx", display: "A high performance web server", status: "running", startType: "auto" },
      { name: "ufw", display: "Uncomplicated firewall", status: "running", startType: "auto" },
      { name: "systemd-resolved", display: "Network Name Resolution", status: "running", startType: "auto" },
    ];
  }
  return [
    { name: "Dhcp", display: "DHCP Client", status: "running", startType: "auto" },
    { name: "Dnscache", display: "DNS Client", status: "running", startType: "auto" },
    { name: "Spooler", display: "Print Spooler", status: "running", startType: "auto" },
    { name: "wuauserv", display: "Windows Update", status: "stopped", startType: "manual" },
    { name: "LanmanWorkstation", display: "Workstation", status: "running", startType: "auto" },
    { name: "MpsSvc", display: "Windows Defender Firewall", status: "running", startType: "auto" },
  ];
}

function defaultInterfaces(shell: ShellKind): NetInterface[] {
  if (shell === "android" || shell === "ios") {
    return [
      { name: "lo", mac: "00:00:00:00:00:00", ip: "127.0.0.1", mask: "255.0.0.0", gateway: "", dhcp: false, up: true },
      { name: "wlan0", mac: "a4:50:46:12:8c:31", ip: "10.0.0.88", mask: "255.255.255.0", gateway: "10.0.0.1", dhcp: true, up: true },
      { name: "rmnet0", mac: "a4:50:46:12:8c:32", ip: "100.72.14.9", mask: "255.255.255.0", gateway: "100.72.14.1", dhcp: true, up: true },
    ];
  }
  if (shell === "bash") {
    return [
      { name: "lo", mac: "00:00:00:00:00:00", ip: "127.0.0.1", mask: "255.0.0.0", gateway: "", dhcp: false, up: true },
      { name: "ens33", mac: "00:0c:29:4b:11:07", ip: "10.0.0.54", mask: "255.255.255.0", gateway: "10.0.0.1", dhcp: true, up: true },
    ];
  }
  return [
    { name: "Ethernet", mac: "3C-52-82-1A-9F-04", ip: "10.0.0.54", mask: "255.255.255.0", gateway: "10.0.0.1", dhcp: true, up: true },
  ];
}

function defaultTargets(): NetworkTarget[] {
  return [
    { host: "10.0.0.1", ip: "10.0.0.1", reachable: true, latencyMs: 2, openPorts: [53, 80, 443] },
    { host: "intranet.corp.local", ip: "10.0.0.20", reachable: true, latencyMs: 4, openPorts: [80, 443] },
    { host: "fileserver.corp.local", ip: "10.0.0.25", reachable: true, latencyMs: 3, openPorts: [445] },
    { host: "example.com", ip: "93.184.216.34", reachable: true, latencyMs: 24, openPorts: [80, 443] },
    { host: "8.8.8.8", ip: "8.8.8.8", reachable: true, latencyMs: 18, openPorts: [53] },
  ];
}

/* ------------------------------------------------------------------ */
/* Shared command actions, used by all three shells                    */
/* ------------------------------------------------------------------ */

export function readFile(state: MachineState, path: string): { text?: string; error?: string } {
  const segments = resolvePath(state, path);
  const node = getNode(state, segments);
  if (!node) return { error: "not_found" };
  if (node.type === "dir") return { error: "is_dir" };
  if (!canRead(state, node)) return { error: "denied" };
  return { text: node.content ?? "" };
}

export function writeFile(
  state: MachineState,
  path: string,
  content: string,
  append: boolean,
): string | null {
  const segments = resolvePath(state, path);
  const parent = parentOf(state, segments);
  if (!parent || parent.type !== "dir") return "not_found";
  const name = segments[segments.length - 1] as string;
  parent.children ??= {};
  const existing = parent.children[name];
  if (existing) {
    if (existing.type === "dir") return "is_dir";
    if (!canWrite(state, existing)) return "denied";
    existing.content = append ? `${existing.content ?? ""}${content}` : content;
    return null;
  }
  if (!canWrite(state, parent)) return "denied";
  parent.children[name] = file(name, content, state.elevated ? "root" : state.currentUser, "644");
  return null;
}

export function makeDir(state: MachineState, path: string): string | null {
  const segments = resolvePath(state, path);
  const parent = parentOf(state, segments);
  if (!parent || parent.type !== "dir") return "not_found";
  const name = segments[segments.length - 1] as string;
  parent.children ??= {};
  if (parent.children[name]) return "exists";
  if (!canWrite(state, parent)) return "denied";
  parent.children[name] = dir(name, state.elevated ? "root" : state.currentUser, "755");
  return null;
}

export function removePath(state: MachineState, path: string, recursive: boolean): string | null {
  const segments = resolvePath(state, path);
  if (segments.length === 0) return "denied";
  const parent = parentOf(state, segments);
  const node = getNode(state, segments);
  if (!parent || !node || !parent.children) return "not_found";
  if (node.type === "dir" && !recursive && Object.keys(node.children ?? {}).length > 0) {
    return "not_empty";
  }
  if (!canWrite(state, node) || !canWrite(state, parent)) return "denied";
  const key = Object.keys(parent.children).find(
    (name) => name === segments[segments.length - 1] || (isWindows(state) && name.toLowerCase() === (segments[segments.length - 1] as string).toLowerCase()),
  );
  if (!key) return "not_found";
  delete parent.children[key];
  return null;
}

export function copyPath(state: MachineState, from: string, to: string): string | null {
  const source = getNode(state, resolvePath(state, from));
  if (!source) return "not_found";
  if (!canRead(state, source)) return "denied";
  const targetSegments = resolvePath(state, to);
  const existingTarget = getNode(state, targetSegments);
  const finalSegments =
    existingTarget?.type === "dir" ? [...targetSegments, source.name] : targetSegments;
  const parent = parentOf(state, finalSegments);
  if (!parent || parent.type !== "dir" || !canWrite(state, parent)) return "denied";
  parent.children ??= {};
  const copy = JSON.parse(JSON.stringify(source)) as VfsNode;
  copy.name = finalSegments[finalSegments.length - 1] as string;
  parent.children[copy.name] = copy;
  return null;
}

export function movePath(state: MachineState, from: string, to: string): string | null {
  const copyError = copyPath(state, from, to);
  if (copyError) return copyError;
  return removePath(state, from, true);
}

export function listDir(state: MachineState, path: string): { nodes?: VfsNode[]; error?: string } {
  const segments = resolvePath(state, path);
  const node = getNode(state, segments);
  if (!node) return { error: "not_found" };
  if (node.type === "file") return { nodes: [node] };
  if (!canRead(state, node)) return { error: "denied" };
  const children = Object.values(node.children ?? {});
  children.sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1,
  );
  return { nodes: children };
}

export function killProcess(state: MachineState, match: string): string | null {
  const byPid = Number.parseInt(match, 10);
  const index = state.processes.findIndex((proc) =>
    Number.isFinite(byPid) && String(proc.pid) === match
      ? true
      : proc.name.toLowerCase() === match.toLowerCase() ||
        proc.name.toLowerCase() === `${match.toLowerCase()}.exe`,
  );
  if (index === -1) return "not_found";
  const target = state.processes[index] as ProcessInfo;
  if ((target.user === "root" || target.user === "SYSTEM") && !state.elevated && state.currentUser !== "root") {
    return "denied";
  }
  state.processes.splice(index, 1);
  state.memoryUsedMb = Math.max(600, state.memoryUsedMb - target.memoryMb);
  return null;
}

export function findService(state: MachineState, name: string): ServiceInfo | undefined {
  const key = name.toLowerCase().replace(/\.service$/, "");
  return state.services.find(
    (service) => service.name.toLowerCase() === key || service.display.toLowerCase() === key,
  );
}

export function setServiceStatus(
  state: MachineState,
  name: string,
  status: "running" | "stopped",
): { error?: string; reason?: string } {
  const service = findService(state, name);
  if (!service) return { error: "not_found" };
  if (!state.elevated && state.currentUser !== "root" && !isAdmin(state)) return { error: "denied" };
  if (status === "running") {
    if (service.startType === "disabled") return { error: "disabled" };
    if (service.failReason) return { error: "failed", reason: service.failReason };
  }
  service.status = status;
  state.eventLog.unshift(
    `${new Date().toISOString()} ${service.name}: ${status === "running" ? "started" : "stopped"}`,
  );
  return {};
}

export function isAdmin(state: MachineState): boolean {
  const account = state.users.find((user) => user.name === state.currentUser);
  return Boolean(account?.admin) || state.elevated;
}

export function pingHost(state: MachineState, host: string): { lines: string[]; ok: boolean } {
  const iface = primaryInterface(state);
  if (!iface || !iface.up) {
    return { lines: ["Network interface is down. No route to host."], ok: false };
  }
  const ip = resolveHost(state, host);
  if (!ip) {
    return {
      lines:
        !isWindows(state)
          ? [`ping: ${host}: Temporary failure in name resolution`]
          : [`Ping request could not find host ${host}. Please check the name and try again.`],
      ok: false,
    };
  }
  const target = findTarget(state, ip) ?? findTarget(state, host);
  const localSubnet = ip.startsWith(iface.ip.split(".").slice(0, 3).join("."));
  const reachable =
    Boolean(target?.reachable) &&
    (localSubnet || Boolean(iface.gateway)) &&
    !iface.ip.startsWith("169.254.");
  if (!reachable) {
    return {
      lines:
        !isWindows(state)
          ? [`PING ${host} (${ip}) 56(84) bytes of data.`, "", `--- ${host} ping statistics ---`, "4 packets transmitted, 0 received, 100% packet loss"]
          : [`Pinging ${host} [${ip}] with 32 bytes of data:`, "Request timed out.", "Request timed out.", "", `Ping statistics for ${ip}:`, "    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),"],
      ok: false,
    };
  }
  const latency = target?.latencyMs ?? 5;
  if (!isWindows(state)) {
    return {
      lines: [
        `PING ${host} (${ip}) 56(84) bytes of data.`,
        ...[1, 2, 3, 4].map(
          (n) => `64 bytes from ${ip}: icmp_seq=${n} ttl=64 time=${(latency + n * 0.2).toFixed(1)} ms`,
        ),
        "",
        `--- ${host} ping statistics ---`,
        "4 packets transmitted, 4 received, 0% packet loss",
      ],
      ok: true,
    };
  }
  return {
    lines: [
      `Pinging ${host} [${ip}] with 32 bytes of data:`,
      ...[0, 1, 2, 3].map(() => `Reply from ${ip}: bytes=32 time=${latency}ms TTL=customer`.replace("customer", "128")),
      "",
      `Ping statistics for ${ip}:`,
      "    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),",
    ],
    ok: true,
  };
}
