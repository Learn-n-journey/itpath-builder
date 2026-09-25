import type { Difficulty } from "@/lib/app-data/types";
import {
  createMachine,
  findService,
  getNode,
  resolvePath,
  type MachineState,
  type MachineSpec,
  type ShellKind,
} from "./machine";

export type TerminalGoal =
  | { id: string; description: string; kind: "dns_cache_empty" }
  | { id: string; description: string; kind: "service_running"; target: string }
  | { id: string; description: string; kind: "process_absent"; target: string }
  | { id: string; description: string; kind: "user_unlocked"; target: string }
  | { id: string; description: string; kind: "file_mode"; target: string; expected: string }
  | { id: string; description: string; kind: "path_exists"; target: string }
  | { id: string; description: string; kind: "path_absent"; target: string }
  | { id: string; description: string; kind: "port_unblocked"; target: string };

export interface TerminalScenario {
  id: string;
  topicId: string;
  shell: ShellKind;
  title: string;
  brief: string;
  environment: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  goals: TerminalGoal[];
  diagnosticGroups: string[][];
  efficientCommandCount: number;
  hints: string[];
  /** Optional exact instructions revealed after each hint (index-aligned with hints). Derived from diagnosticGroups when absent. */
  hintSteps?: string[][];
  explanation: string;
  reasoningKeywords: string[];
  misconceptionRules: Array<{ pattern: string; label: string }>;
  machineSpec?: MachineSpec;
  source?: "curated" | "random" | "ai";
}

export const terminalScenarios: TerminalScenario[] = [
  {
    id: "terminal-cmd-stale-dns",
    topicId: "topic-dns-fundamentals",
    shell: "cmd",
    title: "The intranet resolves to an old address",
    brief: "A Windows user can reach the gateway, but intranet.corp.local is resolving to the retired server at 10.0.0.99. Diagnose the layer at fault and restore name resolution.",
    environment: "Windows 11 workstation on the corporate LAN. Use the simulated CMD prompt only.",
    difficulty: "gentle",
    estimatedMinutes: 10,
    goals: [{ id: "flush", description: "Remove the stale DNS resolver entry", kind: "dns_cache_empty" }],
    diagnosticGroups: [["ipconfig", "ping 10.0.0.1"], ["nslookup intranet.corp.local", "ping intranet.corp.local"]],
    efficientCommandCount: 4,
    hints: ["Test the local network separately from name resolution.", "Compare a direct IP test with a hostname lookup.", "CMD can clear cached resolver answers with ipconfig /flushdns."],
    hintSteps: [["ping 10.0.0.1"], ["nslookup intranet.corp.local", "ping intranet.corp.local"], ["ipconfig /flushdns", "nslookup intranet.corp.local"]],
    explanation: "The network path was healthy. A stale local resolver cache sent the hostname to 10.0.0.99, so flushing that cache allowed the current DNS record to be used.",
    reasoningKeywords: ["dns", "cache", "hostname", "ip", "flush"],
    misconceptionRules: [{ pattern: "route delete|format|del .*hosts", label: "Used a destructive fix before isolating DNS" }],
  },
  {
    id: "terminal-cmd-print-service",
    topicId: "topic-command-line-fundamentals",
    shell: "cmd",
    title: "Print jobs remain queued",
    brief: "Users cannot print from an administrator CMD session. Inspect the Print Spooler, restore it, and verify its final state.",
    environment: "Windows 11 support workstation with an elevated CMD prompt.",
    difficulty: "standard",
    estimatedMinutes: 12,
    goals: [{ id: "spooler", description: "Return the Print Spooler service to running", kind: "service_running", target: "Spooler" }],
    diagnosticGroups: [["sc query spooler", "net start"], ["sc start spooler", "net start spooler"]],
    efficientCommandCount: 3,
    hints: ["Printing depends on a Windows service.", "Use sc query to inspect a named service.", "Start Spooler, then query it again to verify."],
    hintSteps: [["net start"], ["sc query spooler"], ["sc start spooler", "sc query spooler"]],
    explanation: "The Spooler service was stopped. Querying it established the cause; starting it and checking again restored the print dependency.",
    reasoningKeywords: ["spooler", "service", "stopped", "start", "verify"],
    misconceptionRules: [{ pattern: "del |rd |format", label: "Deleted data for a service-state problem" }],
  },
  {
    id: "terminal-powershell-locked-user",
    topicId: "topic-command-line-fundamentals",
    shell: "powershell",
    title: "A local support account is disabled",
    brief: "The local account helpdesk2 cannot sign in. Confirm its state, elevate safely, enable it, and verify the change.",
    environment: "Windows 11 PowerShell opened as a standard user.",
    difficulty: "standard",
    estimatedMinutes: 14,
    goals: [{ id: "unlock", description: "Enable the helpdesk2 local account", kind: "user_unlocked", target: "helpdesk2" }],
    diagnosticGroups: [["get-localuser", "get-localuser -name helpdesk2"], ["start-process powershell -verb runas"], ["enable-localuser -name helpdesk2"]],
    efficientCommandCount: 4,
    hints: ["Inspect the account before changing it.", "This change requires an elevated shell.", "Use Start-Process powershell -Verb RunAs, then Enable-LocalUser."],
    explanation: "The account existed but was disabled. The correct path was to confirm that state, elevate, enable only that account, and verify Enabled became True.",
    reasoningKeywords: ["disabled", "account", "elevated", "enable", "verify"],
    misconceptionRules: [{ pattern: "remove-item|disable-localuser", label: "Tried to remove or further disable the affected account" }],
  },
  {
    id: "terminal-powershell-memory-process",
    topicId: "topic-command-line-fundamentals",
    shell: "powershell",
    title: "A workstation is low on memory",
    brief: "The workstation has become unresponsive. Identify the abnormal process, stop only that process, and confirm memory use returns to a safe level.",
    environment: "Windows 11 PowerShell. The affected process belongs to the signed-in user.",
    difficulty: "challenging",
    estimatedMinutes: 15,
    goals: [{ id: "process", description: "Stop the runaway backup-agent process", kind: "process_absent", target: "backup-agent.exe" }],
    diagnosticGroups: [["get-process"], ["stop-process -name backup-agent", "stop-process -id 4450"], ["get-computerinfo", "get-process"]],
    efficientCommandCount: 4,
    hints: ["List processes and compare memory use.", "Stop-Process accepts either -Name or -Id.", "After stopping it, inspect processes or free memory again."],
    explanation: "backup-agent.exe was consuming most available memory. Stopping that single user process was proportionate; terminating system services or rebooting would hide the cause.",
    reasoningKeywords: ["backup-agent", "memory", "process", "stop", "verify"],
    misconceptionRules: [{ pattern: "stop-process -name system|stop-process -id 4", label: "Tried to terminate a protected system process" }],
  },
  {
    id: "terminal-linux-web-service",
    topicId: "topic-command-line-fundamentals",
    shell: "bash",
    title: "The internal web service is down",
    brief: "The Linux server responds to network tests, but its web page is unavailable. Diagnose nginx, restore it, and prove the service is running.",
    environment: "Ubuntu server as a sudo-capable standard user.",
    difficulty: "standard",
    estimatedMinutes: 14,
    goals: [{ id: "nginx", description: "Return nginx to running", kind: "service_running", target: "nginx" }],
    diagnosticGroups: [["ping intranet.corp.local", "curl intranet.corp.local"], ["systemctl status nginx"], ["sudo systemctl start nginx", "sudo systemctl restart nginx"]],
    efficientCommandCount: 5,
    hints: ["First separate reachability from the application service.", "systemctl status shows a service's state.", "Use sudo systemctl start nginx, then check its status."],
    explanation: "The host and route were available, but nginx was stopped. Checking service state before restarting it isolated the fault without changing unrelated network settings.",
    reasoningKeywords: ["nginx", "service", "network", "stopped", "verify"],
    misconceptionRules: [{ pattern: "chmod 777|rm -rf", label: "Used broad permissions or destructive deletion for a stopped service" }],
  },
  {
    id: "terminal-linux-permissions",
    topicId: "topic-command-line-fundamentals",
    shell: "bash",
    title: "A deployment script cannot run",
    brief: "The release script /opt/deploy/release.sh exists but cannot be executed by its owner. Inspect it and apply the least-permissive repair.",
    environment: "Ubuntu deployment host. The script belongs to student and should not be writable by other users.",
    difficulty: "challenging",
    estimatedMinutes: 16,
    goals: [{ id: "mode", description: "Set release.sh to owner rwx, group rx, others rx (755)", kind: "file_mode", target: "/opt/deploy/release.sh", expected: "755" }],
    diagnosticGroups: [["ls -l /opt/deploy/release.sh"], ["chmod 755 /opt/deploy/release.sh"]],
    efficientCommandCount: 3,
    hints: ["Inspect the current permission bits with ls -l.", "The owner needs read, write and execute; everyone else needs read and execute.", "That permission set is represented by 755."],
    hintSteps: [["ls -l /opt/deploy/release.sh"], ["chmod u=rwx,go=rx /opt/deploy/release.sh"], ["chmod 755 /opt/deploy/release.sh", "ls -l /opt/deploy/release.sh"]],
    explanation: "The script lacked execute permission. Mode 755 adds execution while keeping write access limited to the owner; 777 would expose an unnecessary integrity risk.",
    reasoningKeywords: ["execute", "permission", "owner", "755", "least privilege"],
    misconceptionRules: [{ pattern: "chmod 777", label: "Granted write access to everyone instead of applying least privilege" }],
  },
  {
    id: "terminal-cmd-dhcp-renewal", topicId: "topic-ip-addressing", shell: "cmd",
    title: "A workstation has an APIPA address", brief: "A Windows workstation assigned itself a 169.254 address and cannot reach company systems. Inspect its configuration, renew its DHCP lease, and verify normal connectivity.",
    environment: "Windows 11 workstation with an elevated CMD prompt.", difficulty: "standard", estimatedMinutes: 12,
    goals: [{ id: "address", description: "Restore a valid DHCP address and gateway", kind: "path_exists", target: "C:\\Users\\student" }],
    diagnosticGroups: [["ipconfig /all", "ipconfig"], ["ipconfig /release"], ["ipconfig /renew"], ["ping 10.0.0.1"]], efficientCommandCount: 5,
    hints: ["Inspect the current IPv4 address and gateway.", "Release the invalid lease before requesting a fresh one.", "Use ipconfig /renew, then test the gateway."],
    hintSteps: [["ipconfig /all"], ["ipconfig /release"], ["ipconfig /renew", "ping 10.0.0.1"]],
    explanation: "The self-assigned APIPA address showed DHCP had not supplied a usable lease. Releasing and renewing restored the workstation's valid address and default gateway.",
    reasoningKeywords: ["apipa", "dhcp", "lease", "renew", "gateway"], misconceptionRules: [{ pattern: "flushdns", label: "Treated an address-assignment fault as a DNS-cache problem" }],
    machineSpec: {
      shell: "cmd",
      interfaces: [{ name: "Ethernet", up: true, dhcp: true, ip: "169.254.18.4", mask: "255.255.0.0", gateway: "", mac: "00-15-5D-3C-11-04" }],
    },
  },
  {
    id: "terminal-cmd-update-service", topicId: "topic-windows-administration", shell: "cmd",
    title: "Windows Update will not start", brief: "Updates fail because the Windows Update service is stopped. Inspect the service, restore it, and verify that it is running.",
    environment: "Windows 11 workstation with an elevated CMD prompt.", difficulty: "standard", estimatedMinutes: 10,
    goals: [{ id: "service", description: "Start the Windows Update service", kind: "service_running", target: "wuauserv" }],
    diagnosticGroups: [["sc query wuauserv"], ["sc start wuauserv", "net start wuauserv"], ["sc query wuauserv"]], efficientCommandCount: 3,
    hints: ["Query wuauserv first.", "Use sc start or net start from this elevated prompt.", "Query the service after the repair."], explanation: "The update service was stopped. A targeted service start restored it without changing unrelated components.",
    reasoningKeywords: ["wuauserv", "service", "stopped", "start", "verify"], misconceptionRules: [{ pattern: "del|format", label: "Used a destructive action for a service-state fault" }],
  },
  {
    id: "terminal-cmd-runaway-sync", topicId: "topic-operating-systems", shell: "cmd",
    title: "File synchronization consumes the workstation", brief: "A sync process is consuming excessive memory. Identify it, terminate only the faulty process, and confirm it is gone.",
    environment: "Windows 11 support workstation in an elevated CMD session.", difficulty: "challenging", estimatedMinutes: 12,
    goals: [{ id: "process", description: "Stop sync-worker.exe", kind: "process_absent", target: "sync-worker.exe" }],
    diagnosticGroups: [["tasklist"], ["taskkill /im sync-worker.exe", "taskkill /pid 4872"], ["tasklist"]], efficientCommandCount: 3,
    hints: ["List running processes and compare memory use.", "Taskkill accepts /IM with an image name or /PID.", "List processes again to verify."], explanation: "The abnormal sync worker, not Windows itself, consumed the memory. Ending only that process was the least disruptive repair.",
    reasoningKeywords: ["process", "memory", "tasklist", "taskkill", "verify"], misconceptionRules: [{ pattern: "taskkill .*system", label: "Tried to terminate a protected system process" }],
    machineSpec: { shell: "cmd", elevated: true, memoryUsedMb: 7600, processes: [{ pid: 4, name: "System", user: "SYSTEM", cpu: 0.2, memoryMb: 24 }, { pid: 4872, name: "sync-worker.exe", user: "student", cpu: 81, memoryMb: 4100 }] },
  },
  {
    id: "terminal-powershell-dns-cache", topicId: "topic-dns-fundamentals", shell: "powershell",
    title: "PowerShell finds an outdated application server", brief: "The network is healthy, but app.corp.local is cached to a retired address. Prove name resolution is the fault and clear the stale answer.",
    environment: "Windows 11 PowerShell as a support technician.", difficulty: "standard", estimatedMinutes: 10,
    goals: [{ id: "flush", description: "Clear the stale DNS client cache", kind: "dns_cache_empty" }],
    diagnosticGroups: [["test-connection 10.0.0.1"], ["resolve-dnsname app.corp.local"], ["clear-dnsclientcache"]], efficientCommandCount: 4,
    hints: ["Test the gateway independently.", "Resolve the hostname before changing anything.", "Use Clear-DnsClientCache."], explanation: "Direct connectivity worked while the cached hostname answer was wrong. Clearing the client cache removed the stale record.",
    reasoningKeywords: ["dns", "cache", "resolve", "hostname", "clear"], misconceptionRules: [{ pattern: "remove-item .*hosts", label: "Changed the hosts file without evidence it caused the fault" }],
    machineSpec: { shell: "powershell", dnsRecords: { "app.corp.local": "10.0.0.20" }, dnsCache: { "app.corp.local": "10.0.0.88" }, targets: [{ host: "10.0.0.1", ip: "10.0.0.1", reachable: true, latencyMs: 2, openPorts: [53] }, { host: "app.corp.local", ip: "10.0.0.20", reachable: true, latencyMs: 4, openPorts: [443] }] },
  },
  {
    id: "terminal-powershell-update-service", topicId: "topic-windows-administration", shell: "powershell",
    title: "A required Windows service is disabled", brief: "Windows Update cannot run because wuauserv is disabled and stopped. Inspect it, set an appropriate startup type, start it, and verify the result.",
    environment: "Windows 11 PowerShell opened as a standard user.", difficulty: "challenging", estimatedMinutes: 15,
    goals: [{ id: "service", description: "Return wuauserv to running", kind: "service_running", target: "wuauserv" }],
    diagnosticGroups: [["get-service -name wuauserv"], ["start-process powershell -verb runas"], ["set-service -name wuauserv -startuptype manual"], ["start-service -name wuauserv"], ["get-service -name wuauserv"]], efficientCommandCount: 5,
    hints: ["Inspect the service state first.", "Elevate PowerShell before changing service configuration.", "Set StartupType to Manual, then start and verify it."],
    hintSteps: [["Get-Service -Name wuauserv"], ["Start-Process powershell -Verb RunAs"], ["Set-Service -Name wuauserv -StartupType Manual", "Start-Service -Name wuauserv", "Get-Service -Name wuauserv"]],
    explanation: "The disabled startup type blocked the service. Elevating, changing only that setting, and starting the service restored update functionality.",
    reasoningKeywords: ["disabled", "service", "startup", "elevate", "verify"], misconceptionRules: [{ pattern: "remove-item|stop-service", label: "Tried to remove data or stop an already unavailable service" }],
    machineSpec: { shell: "powershell", services: [{ name: "wuauserv", display: "Windows Update", status: "stopped", startType: "disabled" }] },
  },
  {
    id: "terminal-powershell-runaway-indexer", topicId: "topic-operating-systems", shell: "powershell",
    title: "Search indexing overwhelms a laptop", brief: "A user reports freezing and high memory use. Find the abnormal index-helper process, stop it, and verify resource use.",
    environment: "Windows 11 PowerShell under the affected user's account.", difficulty: "standard", estimatedMinutes: 12,
    goals: [{ id: "process", description: "Stop index-helper.exe", kind: "process_absent", target: "index-helper.exe" }],
    diagnosticGroups: [["get-process"], ["stop-process -name index-helper", "stop-process -id 5091"], ["get-process", "get-computerinfo"]], efficientCommandCount: 4,
    hints: ["Get-Process shows working-set memory.", "Stop only the outlier by name or ID.", "Inspect the process list or free memory afterward."], explanation: "The index helper was the clear resource outlier. Stopping only it restored memory while preserving system processes.",
    reasoningKeywords: ["process", "memory", "outlier", "stop", "verify"], misconceptionRules: [{ pattern: "stop-process -name system|stop-process -id 4", label: "Tried to stop a protected system process" }],
    machineSpec: { shell: "powershell", memoryUsedMb: 7900, processes: [{ pid: 4, name: "System", user: "SYSTEM", cpu: 0.2, memoryMb: 24 }, { pid: 5091, name: "index-helper.exe", user: "student", cpu: 74, memoryMb: 4700 }] },
  },
  {
    id: "terminal-linux-ssh-service", topicId: "topic-remote-access", shell: "bash",
    title: "Remote administration stopped working", brief: "The server is reachable, but administrators cannot connect over SSH. Inspect the service, restore it, and verify that it is listening again.",
    environment: "Ubuntu server with a sudo-capable account.", difficulty: "standard", estimatedMinutes: 13,
    goals: [{ id: "ssh", description: "Return SSH to running", kind: "service_running", target: "ssh" }],
    diagnosticGroups: [["ping 10.0.0.1"], ["systemctl status ssh"], ["sudo systemctl start ssh", "sudo systemctl restart ssh"], ["ss", "netstat", "systemctl status ssh"]], efficientCommandCount: 5,
    hints: ["Separate host reachability from the remote-access service.", "Inspect ssh with systemctl.", "Start it with sudo and verify its state or listening sockets."],
    hintSteps: [["ping 10.0.0.1"], ["systemctl status ssh"], ["sudo systemctl start ssh", "systemctl status ssh"]],
    explanation: "The host was online, but SSH was stopped. Restoring only that service brought remote administration back.",
    reasoningKeywords: ["ssh", "service", "reachability", "start", "verify"], misconceptionRules: [{ pattern: "ufw disable|chmod 777", label: "Weakened security instead of isolating the stopped service" }],
  },
  {
    id: "terminal-linux-firewall-web", topicId: "topic-firewalls", shell: "bash",
    title: "The web service runs but clients cannot connect", brief: "nginx is running, yet TCP port 80 is blocked locally. Confirm service health, inspect the firewall, allow only the required port, and verify access.",
    environment: "Ubuntu web server with sudo access.", difficulty: "challenging", estimatedMinutes: 16,
    goals: [{ id: "port", description: "Allow TCP port 80 through the local firewall", kind: "port_unblocked", target: "80" }],
    diagnosticGroups: [["systemctl status nginx"], ["sudo ufw status", "ufw status"], ["sudo ufw allow 80"], ["curl intranet.corp.local"]], efficientCommandCount: 5,
    hints: ["Confirm nginx is already healthy.", "Inspect UFW rules before changing them.", "Allow port 80 specifically rather than disabling the firewall."],
    hintSteps: [["systemctl status nginx"], ["sudo ufw status"], ["sudo ufw allow 80", "curl intranet.corp.local"]],
    explanation: "The application service was healthy, but a local firewall rule denied port 80. A narrow allow rule restored access without removing firewall protection.",
    reasoningKeywords: ["firewall", "port 80", "nginx", "allow", "least privilege"], misconceptionRules: [{ pattern: "ufw disable", label: "Disabled the entire firewall instead of allowing the required port" }],
    machineSpec: { shell: "bash", blockedPorts: [80] },
  },
  {
    id: "terminal-linux-runaway-report", topicId: "topic-linux-fundamentals", shell: "bash",
    title: "A reporting process exhausts memory", brief: "The server is swapping heavily. Identify the runaway report-worker process, stop only it, and confirm memory has recovered.",
    environment: "Ubuntu application server as the process owner.", difficulty: "standard", estimatedMinutes: 12,
    goals: [{ id: "process", description: "Stop report-worker", kind: "process_absent", target: "report-worker" }],
    diagnosticGroups: [["free", "top", "ps"], ["kill 6120", "pkill report-worker"], ["free", "ps", "top"]], efficientCommandCount: 4,
    hints: ["Compare processes and memory consumption.", "Use kill with the PID or pkill with the exact process name.", "Check free memory afterward."], explanation: "report-worker was the memory outlier. Ending that user process recovered capacity without disrupting core services.",
    reasoningKeywords: ["memory", "process", "report-worker", "kill", "verify"], misconceptionRules: [{ pattern: "kill 1|pkill systemd", label: "Tried to terminate the init process" }],
    machineSpec: { shell: "bash", memoryUsedMb: 7950, processes: [{ pid: 1, name: "systemd", user: "root", cpu: 0.1, memoryMb: 12 }, { pid: 6120, name: "report-worker", user: "student", cpu: 86, memoryMb: 4800 }] },
  },
  {
    id: "terminal-linux-create-evidence", topicId: "topic-linux-fundamentals", shell: "bash",
    title: "Prepare an incident evidence folder", brief: "Create /home/student/evidence so diagnostic output can be collected without placing files in a system directory. Verify the folder exists.",
    environment: "Ubuntu workstation as student.", difficulty: "gentle", estimatedMinutes: 7,
    goals: [{ id: "folder", description: "Create /home/student/evidence", kind: "path_exists", target: "/home/student/evidence" }],
    diagnosticGroups: [["pwd", "ls"], ["mkdir /home/student/evidence", "mkdir evidence"], ["ls"]], efficientCommandCount: 3,
    hints: ["Confirm your current directory.", "mkdir creates a directory.", "List the parent folder afterward."], explanation: "Creating a dedicated evidence directory under the user's home keeps collected diagnostics organized without requiring elevated access.",
    reasoningKeywords: ["directory", "evidence", "mkdir", "home", "verify"], misconceptionRules: [{ pattern: "sudo mkdir /etc|rm -rf", label: "Used unnecessary privilege or destructive deletion" }],
  },
  {
    id: "terminal-android-battery-drain",
    topicId: "topic-mobile-troubleshooting",
    shell: "android",
    title: "A phone dies before lunch",
    brief: "A field engineer's Android phone drops to 20 percent by midday. Find the app holding the device awake and stop it, then confirm the device is stable.",
    environment: "Android 14 handset connected over adb. You are in a simulated adb shell.",
    difficulty: "gentle",
    estimatedMinutes: 10,
    goals: [{ id: "stop-drain", description: "Stop the app that is draining the battery", kind: "process_absent", target: "com.android.chrome" }],
    diagnosticGroups: [["dumpsys battery", "adb devices"], ["ps|top|pm list packages"]],
    efficientCommandCount: 4,
    hints: ["Read the battery report before changing anything.", "dumpsys battery names the top consumer.", "am force-stop stops a named package."],
    hintSteps: [["dumpsys battery"], ["ps", "dumpsys battery"], ["am force-stop com.android.chrome", "dumpsys battery"]],
    explanation: "Battery statistics named the browser as the top consumer. Force-stopping it removed the drain; the correct long-term fix is restricting its background activity.",
    reasoningKeywords: ["battery", "app", "drain", "force-stop", "evidence"],
    misconceptionRules: [{ pattern: "reset|wipe|factory", label: "Reached for a factory reset before identifying the cause" }],
    machineSpec: { shell: "android" },
  },
  {
    id: "terminal-android-wifi-off",
    topicId: "topic-mobile-connectivity",
    shell: "android",
    title: "No Wi-Fi on a warehouse handset",
    brief: "A warehouse Android scanner cannot reach the intranet. Confirm which radio is off, restore it, and verify connectivity.",
    environment: "Android 14 rugged handset on the corporate wireless network.",
    difficulty: "gentle",
    estimatedMinutes: 8,
    goals: [{ id: "wifi-on", description: "Turn the Wi-Fi radio back on", kind: "service_running", target: "wifi" }],
    diagnosticGroups: [["dumpsys wifi", "settings list"], ["ping 10.0.0.1|ping intranet.corp.local"]],
    efficientCommandCount: 3,
    hints: ["Check the radio state before blaming the network.", "dumpsys wifi reports whether the radio is on.", "svc wifi enable turns the radio back on."],
    hintSteps: [["ping 10.0.0.1"], ["dumpsys wifi"], ["svc wifi enable", "ping 10.0.0.1"]],
    explanation: "The Wi-Fi radio had been switched off, so nothing on the local network was reachable. Enabling it restored service without touching the access point.",
    reasoningKeywords: ["wifi", "radio", "off", "enable", "verify"],
    misconceptionRules: [{ pattern: "rm -rf|factory|wipe", label: "Used a destructive action for a settings problem" }],
    machineSpec: { shell: "android", services: [
      { name: "wifi", display: "Wi-Fi radio", status: "stopped", startType: "auto" },
      { name: "bluetooth", display: "Bluetooth radio", status: "running", startType: "auto" },
      { name: "data", display: "Mobile data", status: "running", startType: "auto" },
      { name: "nfc", display: "NFC controller", status: "running", startType: "auto" },
      { name: "location", display: "Location services", status: "running", startType: "auto" },
      { name: "sync", display: "Account sync", status: "running", startType: "auto" },
    ] },
  },
  {
    id: "terminal-android-mail-cache",
    topicId: "topic-mobile-configuration-and-apps",
    shell: "android",
    title: "Corporate mail app crashes on launch",
    brief: "The company mail app closes immediately on one Android phone. Inspect the app data, clear its corrupt cache, and confirm the file is gone.",
    environment: "Android 14 handset with the corporate mail app installed.",
    difficulty: "standard",
    estimatedMinutes: 12,
    goals: [{ id: "clear-cache", description: "Remove the corrupt cached mail state", kind: "path_absent", target: "/data/data/com.corp.mail/cache/mail.tmp" }],
    diagnosticGroups: [["pm list packages", "ls /data/data/com.corp.mail"], ["logcat|dumpsys sync"]],
    efficientCommandCount: 5,
    hints: ["List the installed packages to confirm the exact package name.", "Look inside the app's data directory for cached state.", "pm clear com.corp.mail wipes the app's data and cache."],
    hintSteps: [["pm list packages"], ["ls /data/data/com.corp.mail/cache"], ["pm clear com.corp.mail", "ls /data/data/com.corp.mail/cache"]],
    explanation: "A corrupt cached sync file crashed the app at launch. Clearing the app data removed it, and the account signs in again on next launch.",
    reasoningKeywords: ["cache", "app", "crash", "clear", "package"],
    misconceptionRules: [{ pattern: "factory|wipe|rm -rf /", label: "Wiped the device instead of the single app" }],
    machineSpec: { shell: "android" },
  },
  {
    id: "terminal-ios-icloud-sync",
    topicId: "topic-mobile-configuration-and-apps",
    shell: "ios",
    title: "Contacts stopped syncing on an iPhone",
    brief: "A manager's iPhone has not synced for four days. Check the sync state in the support console, turn the failing service back on, and verify.",
    environment: "Managed iPhone 15. Apple devices have no shell, so you work in the simulated support console.",
    difficulty: "gentle",
    estimatedMinutes: 9,
    goals: [{ id: "icloud", description: "Restore iCloud sync", kind: "service_running", target: "icloud" }],
    diagnosticGroups: [["device info|sync status"], ["logs|network status"]],
    efficientCommandCount: 4,
    hints: ["Type help to see what the console can do.", "sync status shows which services are on.", "sync on icloud re-enables the service."],
    hintSteps: [["help"], ["sync status"], ["sync on icloud", "sync status"]],
    explanation: "iCloud sync had been switched off, so nothing reached the account. Re-enabling it restored syncing without a reset or restore.",
    reasoningKeywords: ["sync", "icloud", "account", "enable", "verify"],
    misconceptionRules: [{ pattern: "mdm wipe|network reset", label: "Erased or reset before checking the sync setting" }],
    machineSpec: { shell: "ios", services: [
      { name: "wifi", display: "Wi-Fi", status: "running", startType: "auto" },
      { name: "bluetooth", display: "Bluetooth", status: "running", startType: "auto" },
      { name: "cellular", display: "Cellular data", status: "running", startType: "auto" },
      { name: "icloud", display: "iCloud sync", status: "stopped", startType: "auto" },
      { name: "mail", display: "Mail account", status: "running", startType: "auto" },
      { name: "mdm", display: "Mobile device management", status: "running", startType: "auto" },
      { name: "findmy", display: "Find My iPhone", status: "running", startType: "auto" },
    ] },
  },
  {
    id: "terminal-ios-restrictive-profile",
    topicId: "topic-mobile-security-and-mdm",
    shell: "ios",
    title: "An old profile blocks the corporate app",
    brief: "A leftover configuration profile from a previous employer is blocking app installs. Find it in the support console and remove it.",
    environment: "Company-owned iPhone 15 enrolled in management.",
    difficulty: "standard",
    estimatedMinutes: 11,
    goals: [{ id: "profile", description: "Remove the outdated restrictions profile", kind: "path_absent", target: "/profiles/legacy-restrictions.mobileconfig" }],
    diagnosticGroups: [["mdm status|device info"], ["profiles list"]],
    efficientCommandCount: 4,
    hints: ["Check the management state before removing anything.", "profiles list shows what is installed.", "profiles remove <name> deletes a single profile."],
    hintSteps: [["mdm status"], ["profiles list"], ["profiles remove legacy-restrictions.mobileconfig", "profiles list"]],
    explanation: "A stale restrictions profile survived the device handover and blocked installs. Removing that one profile fixed it without wiping the phone.",
    reasoningKeywords: ["profile", "restriction", "mdm", "remove", "verify"],
    misconceptionRules: [{ pattern: "mdm wipe", label: "Wiped a working device instead of removing one profile" }],
    machineSpec: { shell: "ios", files: {
      "/profiles/legacy-restrictions.mobileconfig": "PayloadDisplayName: Legacy Restrictions\nBlocks: App installation\n",
      "/profiles/corp-wifi.mobileconfig": "PayloadDisplayName: Corp Wi-Fi\n",
    } },
  },
  {
    id: "terminal-ios-network-reset",
    topicId: "topic-mobile-troubleshooting",
    shell: "ios",
    title: "iPhone reaches the wrong intranet server",
    brief: "An iPhone keeps loading a retired intranet server while other devices are fine. Confirm the cached lookups and clear them.",
    environment: "iPhone 15 on the corporate Wi-Fi network.",
    difficulty: "standard",
    estimatedMinutes: 10,
    goals: [{ id: "flush", description: "Clear the cached network lookups", kind: "dns_cache_empty" }],
    diagnosticGroups: [["network status|device info"], ["logs|sync status"]],
    efficientCommandCount: 4,
    hints: ["Check the network state before changing settings.", "network status reports how many lookups are cached.", "network reset clears saved networks and cached lookups."],
    hintSteps: [["network status"], ["logs"], ["network reset", "network status"]],
    explanation: "The phone held a cached answer pointing at the retired server. Resetting network settings cleared it; warn the user that saved Wi-Fi passwords are cleared too.",
    reasoningKeywords: ["cache", "dns", "reset", "network", "verify"],
    misconceptionRules: [{ pattern: "mdm wipe|profiles remove", label: "Erased data for a cached-lookup problem" }],
    machineSpec: { shell: "ios", dnsCache: { "intranet.corp.local": "10.0.0.99" } },
  },
  {
    id: "terminal-cmd-backup-ticket-log",
    topicId: "topic-command-line-fundamentals",
    shell: "cmd",
    title: "Preserve a support log before cleanup",
    brief: "A technician needs to preserve a support log before making changes. Confirm the source file, copy it to a backup location, and verify the copy exists.",
    environment: "Windows 11 support workstation in CMD.",
    difficulty: "gentle",
    estimatedMinutes: 9,
    goals: [{ id: "backup", description: "Create a backup copy of the support log", kind: "path_exists", target: "C:\\Users\\student\\Documents\\readme-backup.txt" }],
    diagnosticGroups: [["dir C:\\Users\\student\\Documents", "type C:\\Users\\student\\Documents\\readme.txt"], ["copy C:\\Users\\student\\Documents\\readme.txt C:\\Users\\student\\Documents\\readme-backup.txt"], ["dir C:\\Users\\student\\Documents"]],
    efficientCommandCount: 3,
    hints: ["Confirm the source file before copying it.", "CMD uses copy with a source and destination.", "List the folder again after the copy."],
    hintSteps: [["dir C:\\Users\\student\\Documents"], ["copy C:\\Users\\student\\Documents\\readme.txt C:\\Users\\student\\Documents\\readme-backup.txt"], ["dir C:\\Users\\student\\Documents"]],
    explanation: "The original file was confirmed before a targeted copy created the backup. Verifying the destination prevents assuming that a command succeeded.",
    reasoningKeywords: ["backup", "copy", "source", "destination", "verify"],
    misconceptionRules: [{ pattern: "del |erase |format", label: "Deleted data while the task was to preserve it" }],
  },
  {
    id: "terminal-cmd-quarantine-temp-file",
    topicId: "topic-command-line-fundamentals",
    shell: "cmd",
    title: "Remove a known temporary artifact",
    brief: "A confirmed temporary artifact is left in C:\\Temp after a support tool exits. Verify the file, remove only that artifact, and confirm it is gone.",
    environment: "Windows 11 support workstation in an elevated CMD prompt.",
    difficulty: "standard",
    estimatedMinutes: 10,
    goals: [{ id: "remove", description: "Remove the confirmed temporary artifact", kind: "path_absent", target: "C:\\Temp\\support.tmp" }],
    diagnosticGroups: [["dir C:\\Temp", "type C:\\Temp\\support.tmp"], ["del C:\\Temp\\support.tmp"], ["dir C:\\Temp"]],
    efficientCommandCount: 3,
    hints: ["Inspect C:\\Temp before deleting anything.", "Delete only support.tmp.", "List the directory afterward to verify."],
    hintSteps: [["dir C:\\Temp"], ["del C:\\Temp\\support.tmp"], ["dir C:\\Temp"]],
    explanation: "The file was identified before deletion, then removed by exact path and verified absent. This models targeted cleanup rather than broad deletion.",
    reasoningKeywords: ["temporary", "file", "delete", "targeted", "verify"],
    misconceptionRules: [{ pattern: "format|del C:\\\\Temp\\\\\*", label: "Used a broad destructive command instead of targeting the confirmed file" }],
    machineSpec: { shell: "cmd", files: { "C:\\Temp\\support.tmp": "temporary support artifact\r\n" } },
  },
  {
    id: "terminal-powershell-create-case-folder",
    topicId: "topic-command-line-fundamentals",
    shell: "powershell",
    title: "Create a folder for incident evidence",
    brief: "A support case needs a dedicated evidence folder before logs are collected. Inspect the destination, create the folder, and verify it exists.",
    environment: "Windows 11 PowerShell under the signed-in support user.",
    difficulty: "gentle",
    estimatedMinutes: 9,
    goals: [{ id: "folder", description: "Create the incident evidence folder", kind: "path_exists", target: "C:\\Users\\student\\Documents\\Case-1042" }],
    diagnosticGroups: [["get-childitem C:\\Users\\student\\Documents"], ["new-item -itemtype directory -path C:\\Users\\student\\Documents\\Case-1042"], ["get-childitem C:\\Users\\student\\Documents"]],
    efficientCommandCount: 3,
    hints: ["Inspect the parent folder first.", "New-Item can create a directory.", "List the parent folder again to verify."],
    hintSteps: [["Get-ChildItem C:\\Users\\student\\Documents"], ["New-Item -ItemType Directory -Path C:\\Users\\student\\Documents\\Case-1042"], ["Get-ChildItem C:\\Users\\student\\Documents"]],
    explanation: "Creating a dedicated evidence folder keeps troubleshooting artifacts organized. The final listing verifies the requested state rather than relying on command output alone.",
    reasoningKeywords: ["folder", "evidence", "new-item", "directory", "verify"],
    misconceptionRules: [{ pattern: "remove-item|format", label: "Removed data while preparing an evidence location" }],
  },
  {
    id: "terminal-powershell-remove-stale-cache-file",
    topicId: "topic-command-line-fundamentals",
    shell: "powershell",
    title: "Clear a confirmed stale cache file",
    brief: "An application has a confirmed stale cache marker in the user's Documents folder. Inspect it, remove only that file, and verify the result.",
    environment: "Windows 11 PowerShell under the affected user's account.",
    difficulty: "standard",
    estimatedMinutes: 10,
    goals: [{ id: "cache", description: "Remove the stale cache marker", kind: "path_absent", target: "C:\\Users\\student\\Documents\\app-cache.tmp" }],
    diagnosticGroups: [["get-childitem C:\\Users\\student\\Documents", "get-content C:\\Users\\student\\Documents\\app-cache.tmp"], ["remove-item C:\\Users\\student\\Documents\\app-cache.tmp"], ["get-childitem C:\\Users\\student\\Documents"]],
    efficientCommandCount: 3,
    hints: ["Confirm the exact file first.", "Remove-Item deletes a specific item.", "List the folder again after the change."],
    hintSteps: [["Get-ChildItem C:\\Users\\student\\Documents"], ["Remove-Item C:\\Users\\student\\Documents\\app-cache.tmp"], ["Get-ChildItem C:\\Users\\student\\Documents"]],
    explanation: "The cache marker was verified before a narrow removal. The follow-up listing confirms the intended change without deleting unrelated user data.",
    reasoningKeywords: ["cache", "remove-item", "file", "targeted", "verify"],
    misconceptionRules: [{ pattern: "remove-item .*documents.*recurse", label: "Used recursive deletion where one confirmed file was the target" }],
    machineSpec: { shell: "powershell", files: { "C:\\Users\\student\\Documents\\app-cache.tmp": "stale=true\r\n" } },
  },
  {
    id: "terminal-linux-create-backup-directory",
    topicId: "topic-linux-filesystem",
    shell: "bash",
    title: "Prepare a backup directory",
    brief: "Before maintenance, create a dedicated backup directory under your home folder. Inspect the location, create it, and verify it is present.",
    environment: "Ubuntu support workstation as the student user.",
    difficulty: "gentle",
    estimatedMinutes: 8,
    goals: [{ id: "backup-dir", description: "Create /home/student/backup", kind: "path_exists", target: "/home/student/backup" }],
    diagnosticGroups: [["pwd", "ls /home/student"], ["mkdir /home/student/backup"], ["ls /home/student"]],
    efficientCommandCount: 3,
    hints: ["Confirm your current location and inspect the home folder.", "mkdir creates a directory.", "List the home folder again to verify."],
    hintSteps: [["ls /home/student"], ["mkdir /home/student/backup"], ["ls /home/student"]],
    explanation: "The directory was created only after checking the destination. Verifying it afterward completes the change-and-check workflow used in real administration.",
    reasoningKeywords: ["directory", "backup", "mkdir", "home", "verify"],
    misconceptionRules: [{ pattern: "rm -rf", label: "Used destructive deletion while preparing a backup location" }],
  },
  {
    id: "terminal-linux-remove-stale-lock",
    topicId: "topic-linux-filesystem",
    shell: "bash",
    title: "A stale lock file blocks a support task",
    brief: "A support utility has exited, but its confirmed stale lock file remains. Inspect the file, remove only the lock, and verify it is gone.",
    environment: "Ubuntu support workstation as the student user.",
    difficulty: "standard",
    estimatedMinutes: 10,
    goals: [{ id: "lock", description: "Remove the stale support lock file", kind: "path_absent", target: "/home/student/support.lock" }],
    diagnosticGroups: [["ls -l /home/student/support.lock", "cat /home/student/support.lock"], ["rm /home/student/support.lock"], ["ls /home/student"]],
    efficientCommandCount: 3,
    hints: ["Inspect the exact lock file before changing it.", "rm can remove the single confirmed file.", "List the directory afterward to verify."],
    hintSteps: [["ls -l /home/student/support.lock"], ["rm /home/student/support.lock"], ["ls /home/student"]],
    explanation: "The stale lock was positively identified and removed by exact path. This avoids broad cleanup commands that could damage unrelated files.",
    reasoningKeywords: ["lock", "stale", "rm", "targeted", "verify"],
    misconceptionRules: [{ pattern: "rm -rf /|chmod 777", label: "Used an unnecessarily broad or unsafe action" }],
    machineSpec: { shell: "bash", files: { "/home/student/support.lock": "pid=4217\nstate=stale\n" } },
  },
  {
    id: "terminal-android-bluetooth-off",
    topicId: "topic-mobile-connectivity",
    shell: "android",
    title: "A scanner will not reconnect over Bluetooth",
    brief: "A paired warehouse scanner stopped reconnecting after the phone was restarted. Check the Bluetooth radio state, enable it, and verify the setting.",
    environment: "Android 14 managed handset connected to warehouse accessories.",
    difficulty: "gentle",
    estimatedMinutes: 8,
    goals: [{ id: "bluetooth", description: "Restore the Bluetooth radio", kind: "service_running", target: "bluetooth" }],
    diagnosticGroups: [["settings list", "dumpsys bluetooth"], ["svc bluetooth enable"], ["settings list"]],
    efficientCommandCount: 3,
    hints: ["Check whether Bluetooth is actually enabled before changing pairing.", "The settings list exposes radio state.", "svc bluetooth enable restores the radio."],
    hintSteps: [["settings list"], ["svc bluetooth enable"], ["settings list"]],
    explanation: "The accessory was not the fault; the handset's Bluetooth radio was off. Restoring the radio first is less disruptive than deleting pairings or resetting the device.",
    reasoningKeywords: ["bluetooth", "radio", "disabled", "enable", "verify"],
    misconceptionRules: [{ pattern: "pm clear|factory|wipe", label: "Reset app or device data for a disabled radio" }],
    machineSpec: { shell: "android", services: [
      { name: "wifi", display: "Wi-Fi radio", status: "running", startType: "auto" },
      { name: "bluetooth", display: "Bluetooth radio", status: "stopped", startType: "auto" },
      { name: "data", display: "Mobile data", status: "running", startType: "auto" },
      { name: "nfc", display: "NFC controller", status: "running", startType: "auto" },
      { name: "location", display: "Location services", status: "running", startType: "auto" },
      { name: "sync", display: "Account sync", status: "running", startType: "auto" },
    ] },
  },
  {
    id: "terminal-android-sync-disabled",
    topicId: "topic-mobile-configuration-and-apps",
    shell: "android",
    title: "Work data stopped syncing",
    brief: "A managed Android phone still has network access, but work data no longer updates. Inspect the device settings, restore account sync, and verify it remains enabled.",
    environment: "Android 14 corporate handset with working Wi-Fi.",
    difficulty: "standard",
    estimatedMinutes: 10,
    goals: [{ id: "sync", description: "Restore account sync", kind: "service_running", target: "sync" }],
    diagnosticGroups: [["ping 10.0.0.1"], ["settings list"], ["svc sync enable"], ["settings list"]],
    efficientCommandCount: 4,
    hints: ["Prove network connectivity before changing sync settings.", "Inspect the service toggles.", "Enable only sync, then verify."],
    hintSteps: [["ping 10.0.0.1"], ["settings list"], ["svc sync enable", "settings list"]],
    explanation: "Connectivity was healthy, but account sync itself was disabled. Re-enabling that single service restored updates without resetting network or app data.",
    reasoningKeywords: ["sync", "network", "setting", "enable", "verify"],
    misconceptionRules: [{ pattern: "svc wifi disable|factory|wipe", label: "Changed healthy connectivity or erased the device instead of restoring sync" }],
    machineSpec: { shell: "android", services: [
      { name: "wifi", display: "Wi-Fi radio", status: "running", startType: "auto" },
      { name: "bluetooth", display: "Bluetooth radio", status: "running", startType: "auto" },
      { name: "data", display: "Mobile data", status: "running", startType: "auto" },
      { name: "nfc", display: "NFC controller", status: "running", startType: "auto" },
      { name: "location", display: "Location services", status: "running", startType: "auto" },
      { name: "sync", display: "Account sync", status: "stopped", startType: "auto" },
    ] },
  },
  {
    id: "terminal-ios-mail-sync-off",
    topicId: "topic-mobile-configuration-and-apps",
    shell: "ios",
    title: "Mail stopped updating on a managed iPhone",
    brief: "The iPhone is online and iCloud is healthy, but the managed mail account has stopped syncing. Inspect sync state, restore Mail, and verify.",
    environment: "Managed iPhone 15 in the simulated support console.",
    difficulty: "gentle",
    estimatedMinutes: 8,
    goals: [{ id: "mail", description: "Restore Mail account sync", kind: "service_running", target: "mail" }],
    diagnosticGroups: [["network status"], ["sync status"], ["sync on mail"], ["sync status"]],
    efficientCommandCount: 4,
    hints: ["Confirm the phone still has connectivity.", "Check the individual sync services.", "Turn Mail sync on, then check status again."],
    hintSteps: [["network status"], ["sync status"], ["sync on mail", "sync status"]],
    explanation: "The network and iCloud were healthy; only Mail sync was disabled. Restoring that service fixed the symptom without resetting the phone.",
    reasoningKeywords: ["mail", "sync", "network", "enable", "verify"],
    misconceptionRules: [{ pattern: "mdm wipe|network reset", label: "Reset or erased a connected device for a single disabled sync service" }],
    machineSpec: { shell: "ios", services: [
      { name: "wifi", display: "Wi-Fi", status: "running", startType: "auto" },
      { name: "bluetooth", display: "Bluetooth", status: "running", startType: "auto" },
      { name: "cellular", display: "Cellular data", status: "running", startType: "auto" },
      { name: "icloud", display: "iCloud sync", status: "running", startType: "auto" },
      { name: "mail", display: "Mail account", status: "stopped", startType: "auto" },
      { name: "mdm", display: "Mobile device management", status: "running", startType: "auto" },
      { name: "findmy", display: "Find My iPhone", status: "running", startType: "auto" },
    ] },
  },
  {
    id: "terminal-ios-remove-test-profile",
    topicId: "topic-mobile-security-and-mdm",
    shell: "ios",
    title: "A retired test profile remains installed",
    brief: "A managed iPhone still carries a retired test configuration profile. Confirm management is healthy, identify the profile, remove only it, and verify.",
    environment: "Company-owned iPhone 15 enrolled in MDM.",
    difficulty: "standard",
    estimatedMinutes: 10,
    goals: [{ id: "profile", description: "Remove the retired test profile", kind: "path_absent", target: "/profiles/retired-test.mobileconfig" }],
    diagnosticGroups: [["mdm status"], ["profiles list"], ["profiles remove retired-test.mobileconfig"], ["profiles list"]],
    efficientCommandCount: 4,
    hints: ["Check MDM status before modifying profiles.", "List installed profiles and identify the retired one.", "Remove only retired-test.mobileconfig and list profiles again."],
    hintSteps: [["mdm status"], ["profiles list"], ["profiles remove retired-test.mobileconfig", "profiles list"]],
    explanation: "MDM was healthy, so the problem was limited to one obsolete profile. Removing only that profile preserves the active corporate configuration.",
    reasoningKeywords: ["profile", "mdm", "retired", "remove", "verify"],
    misconceptionRules: [{ pattern: "mdm wipe", label: "Wiped the device instead of removing one obsolete profile" }],
    machineSpec: { shell: "ios", files: {
      "/profiles/retired-test.mobileconfig": "PayloadDisplayName: Retired Test Profile\n",
      "/profiles/corp-wifi.mobileconfig": "PayloadDisplayName: Corp Wi-Fi\n",
    } },
  }
];

export function buildScenarioMachine(scenario: TerminalScenario): MachineState {
  if (scenario.machineSpec) return createMachine(scenario.machineSpec);
  if (scenario.id === "terminal-cmd-stale-dns") {
    return createMachine({ shell: "cmd", dnsCache: { "intranet.corp.local": "10.0.0.99" } });
  }
  if (scenario.id === "terminal-cmd-print-service") {
    const machine = createMachine({ shell: "cmd", elevated: true });
    const service = findService(machine, "Spooler");
    if (service) service.status = "stopped";
    return machine;
  }
  if (scenario.id === "terminal-powershell-locked-user") {
    const machine = createMachine({ shell: "powershell" });
    machine.users.push({ name: "helpdesk2", fullName: "Help Desk Backup", groups: ["Users"], admin: false, locked: true, passwordExpired: false });
    return machine;
  }
  if (scenario.id === "terminal-powershell-memory-process") {
    const machine = createMachine({ shell: "powershell", memoryUsedMb: 7720 });
    machine.processes.push({ pid: 4450, name: "backup-agent.exe", user: "student", cpu: 78.4, memoryMb: 4520, note: "runaway process" });
    return machine;
  }
  if (scenario.id === "terminal-linux-web-service") {
    const machine = createMachine({ shell: "bash" });
    const service = findService(machine, "nginx");
    if (service) service.status = "stopped";
    return machine;
  }
  if (scenario.goals.some((goal) => goal.kind === "service_running")) {
    const machine = createMachine({ shell: scenario.shell, elevated: scenario.shell === "cmd" });
    for (const goal of scenario.goals) {
      if (goal.kind !== "service_running") continue;
      const service = findService(machine, goal.target);
      if (service) service.status = "stopped";
    }
    return machine;
  }
  if (scenario.shell === "bash") {
    return createMachine({
      shell: "bash",
      dirs: ["/opt/deploy"],
      files: { "/opt/deploy/release.sh": "#!/bin/bash\necho Deploying IT PATH\n" },
      perms: { "/opt/deploy/release.sh": "student:student:644" },
    });
  }
  return createMachine({ shell: scenario.shell });
}

export function goalMet(state: MachineState, goal: TerminalGoal): boolean {
  if (goal.kind === "dns_cache_empty") return Object.keys(state.dnsCache).length === 0;
  if (goal.kind === "service_running") return findService(state, goal.target)?.status === "running";
  if (goal.kind === "process_absent") {
    return !state.processes.some((process) => process.name.toLowerCase() === goal.target.toLowerCase());
  }
  if (goal.kind === "user_unlocked") {
    return state.users.some((user) => user.name.toLowerCase() === goal.target.toLowerCase() && !user.locked);
  }
  const node = getNode(state, resolvePath(state, goal.target));
  if (goal.kind === "path_exists") return Boolean(node);
  if (goal.kind === "path_absent") return !node;
  if (goal.kind === "port_unblocked") return !state.blockedPorts.includes(Number.parseInt(goal.target, 10));
  return node?.mode === goal.expected;
}

export function scenariosForShell(shell: ShellKind): TerminalScenario[] {
  return terminalScenarios.filter((scenario) => scenario.shell === shell);
}

/**
 * Exact commands/instructions to reveal after a given hint. Uses explicit
 * hintSteps when the scenario defines them; otherwise maps the hint position
 * onto the scenario's diagnostic groups (first hint → first diagnostics,
 * final hint → the repair/verification stage). Alternate commands joined by
 * "|" are shown as separate options.
 */
export function hintStepsFor(scenario: TerminalScenario, hintIndex: number): string[] {
  const explicit = scenario.hintSteps?.[hintIndex];
  if (explicit && explicit.length > 0) return explicit;
  const groups = scenario.diagnosticGroups;
  if (groups.length === 0) return [];
  const hintCount = Math.max(1, scenario.hints.length);
  const ratio = hintCount <= 1 ? 1 : hintIndex / (hintCount - 1);
  const groupIndex = Math.min(groups.length - 1, Math.round(ratio * (groups.length - 1)));
  return (groups[groupIndex] ?? []).flatMap((entry) => entry.split("|").map((command) => command.trim()).filter(Boolean));
}

const hostnames = ["LAB-017", "OPS-204", "HELP-033", "BRANCH-112"];
const contexts = ["after a routine update", "during a busy support shift", "after a user reported intermittent failures", "during a scheduled maintenance check"];

export function randomizeTerminalScenario(base: TerminalScenario): TerminalScenario {
  const nonce = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const hostname = hostnames[Math.floor(Math.random() * hostnames.length)] ?? "LAB-017";
  const context = contexts[Math.floor(Math.random() * contexts.length)] ?? contexts[0];
  return {
    ...base,
    id: `${base.id}-random-${nonce}`,
    title: `${base.title}, ${hostname}`,
    brief: `${base.brief} This variation occurs ${context}.`,
    environment: `${base.environment} Virtual host: ${hostname}.`,
    machineSpec: { ...(base.machineSpec ?? { shell: base.shell }), shell: base.shell, hostname },
    source: "random",
  };
}

export function randomTerminalScenario(
  shell: ShellKind,
  attempts: Array<{ scenarioId: string; topicId: string }>,
  weakTopicIds: string[],
  currentId?: string,
): TerminalScenario {
  const pool = scenariosForShell(shell).filter((item) => item.id !== currentId);
  const ranked = pool.map((scenario) => ({
    scenario,
    weight: (weakTopicIds.includes(scenario.topicId) ? 5 : 1) + (attempts.some((item) => item.scenarioId.startsWith(scenario.id)) ? 0 : 4) + Math.random(),
  })).sort((a, b) => b.weight - a.weight);
  return randomizeTerminalScenario((ranked[0]?.scenario ?? scenariosForShell(shell)[0]) as TerminalScenario);
}