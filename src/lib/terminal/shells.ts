/**
 * Command interpreters for the three simulated shells.
 *
 * Every command reads and writes the simulated machine only. Unknown commands
 * fail the way the real shell would, so learners get honest feedback instead of
 * a silent success.
 */
import {
  canRead,
  canWrite,
  clone,
  copyPath,
  displayPath,
  findService,
  findTarget,
  getNode,
  hasLink,
  isAdmin,
  killProcess,
  listDir,
  makeDir,
  movePath,
  permissionString,
  pingHost,
  primaryInterface,
  promptPath,
  readFile,
  removePath,
  resolveHost,
  resolvePath,
  setServiceStatus,
  writeFile,
  type ExecResult,
  type MachineState,
  type VfsNode,
} from "./machine";

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

function ok(state: MachineState, lines: string | string[]): ExecResult {
  return { state, output: Array.isArray(lines) ? lines.join("\n") : lines, error: false };
}

function fail(state: MachineState, lines: string | string[]): ExecResult {
  return { state, output: Array.isArray(lines) ? lines.join("\n") : lines, error: true };
}

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

function padStart(value: string | number, width: number): string {
  return String(value).padStart(width);
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function execute(previous: MachineState, rawInput: string): ExecResult {
  const state = clone(previous);
  const input = rawInput.trim();
  if (!input) return ok(state, "");
  state.history = [...state.history, input].slice(-200);

  // Pipe support: a single trailing filter is enough for real troubleshooting.
  const [head, ...pipes] = input.split("|").map((part) => part.trim());
  let result = runSingle(state, head ?? "");
  for (const stage of pipes) {
    result = applyFilter(result, stage);
  }
  return result;
}

function applyFilter(result: ExecResult, stage: string): ExecResult {
  const tokens = tokenize(stage);
  const name = (tokens[0] ?? "").toLowerCase();
  const needle = (tokens.find((token, index) => index > 0 && !token.startsWith("-")) ?? "").toLowerCase();
  const lines = result.output.split("\n");
  if (["grep", "findstr", "select-string", "sls", "where-object", "where", "?"].includes(name)) {
    const matched = lines.filter((line) => line.toLowerCase().includes(needle));
    return { ...result, output: matched.join("\n") };
  }
  if (["head", "select-object", "select"].includes(name)) {
    const count = Number.parseInt(tokens.find((t) => /^\d+$/.test(t)) ?? "10", 10);
    return { ...result, output: lines.slice(0, count).join("\n") };
  }
  if (name === "tail") {
    const count = Number.parseInt(tokens.find((t) => /^\d+$/.test(t)) ?? "10", 10);
    return { ...result, output: lines.slice(-count).join("\n") };
  }
  if (["wc", "measure-object", "measure"].includes(name)) {
    return { ...result, output: String(lines.filter(Boolean).length) };
  }
  if (["sort", "sort-object"].includes(name)) {
    return { ...result, output: [...lines].sort().join("\n") };
  }
  if (["more", "less", "out-host", "format-table", "ft", "format-list", "fl"].includes(name)) {
    return result;
  }
  return { ...result, output: result.output, error: result.error };
}

function runSingle(state: MachineState, input: string): ExecResult {
  // Output redirection, available in every shell.
  const redirect = /\s(>>|>)\s*("[^"]+"|\S+)\s*$/.exec(input);
  let command = input;
  if (redirect) command = input.slice(0, redirect.index);

  const result =
    state.shell === "bash"
      ? runBash(state, command)
      : state.shell === "android"
        ? runAndroid(state, command)
        : state.shell === "ios"
          ? runIos(state, command)
          : state.shell === "cmd"
            ? runCmd(state, command)
            : runPowerShell(state, command);

  if (redirect && !result.error) {
    const path = (redirect[2] as string).replace(/^"(.*)"$/, "$1");
    const error = writeFile(
      result.state,
      path,
      `${result.output}${result.output.endsWith("\n") ? "" : "\n"}`,
      redirect[1] === ">>",
    );
    if (error) return fail(result.state, `Cannot write to ${path}: ${error.replace("_", " ")}`);
    return ok(result.state, "");
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Linux / bash                                                        */
/* ------------------------------------------------------------------ */

function runBash(state: MachineState, input: string): ExecResult {
  let tokens = tokenize(input);
  let name = (tokens[0] ?? "").toLowerCase();

  if (name === "sudo") {
    if (tokens.length === 1) return fail(state, "usage: sudo command");
    const account = state.users.find((user) => user.name === state.currentUser);
    if (!account?.groups.includes("sudo") && !account?.admin && state.currentUser !== "root") {
      return fail(state, `${state.currentUser} is not in the sudoers file. This incident will be reported.`);
    }
    state.elevated = true;
    tokens = tokens.slice(1);
    name = (tokens[0] ?? "").toLowerCase();
    if (name === "-i" || name === "su") {
      state.currentUser = "root";
      state.cwd = ["root"];
      return ok(state, "");
    }
    const nested = runBashCommand(state, name, tokens.slice(1), input);
    nested.state.elevated = state.currentUser === "root";
    return nested;
  }

  return runBashCommand(state, name, tokens.slice(1), input);
}

function runBashCommand(
  state: MachineState,
  name: string,
  args: string[],
  raw: string,
): ExecResult {
  const flags = args.filter((arg) => arg.startsWith("-"));
  const operands = args.filter((arg) => !arg.startsWith("-"));
  const hasFlag = (...letters: string[]) =>
    flags.some((flag) => letters.some((letter) => flag.includes(letter)));

  switch (name) {
    case "":
      return ok(state, "");
    case "clear":
      return { state, output: "", error: false, cleared: true };
    case "pwd":
      return ok(state, `/${state.cwd.join("/")}`);
    case "whoami":
      return ok(state, state.currentUser);
    case "hostname":
      return ok(state, state.hostname);
    case "uname":
      return ok(
        state,
        hasFlag("a")
          ? `Linux ${state.hostname} 5.15.0-105-generic #115-Ubuntu SMP x86_64 GNU/Linux`
          : "Linux",
      );
    case "id": {
      const account = state.users.find((user) => user.name === state.currentUser);
      const uid = state.currentUser === "root" ? 0 : 1000;
      return ok(
        state,
        `uid=${uid}(${state.currentUser}) gid=${uid}(${state.currentUser}) groups=${(account?.groups ?? []).join(",")}`,
      );
    }
    case "groups":
      return ok(
        state,
        (state.users.find((user) => user.name === state.currentUser)?.groups ?? []).join(" "),
      );
    case "echo":
      return ok(state, expandEnv(state, raw.replace(/^\s*echo\s*/i, "").replace(/^"(.*)"$/, "$1")));
    case "env":
      return ok(state, Object.entries(state.env).map(([key, value]) => `${key}=${value}`));
    case "history":
      return ok(state, state.history.map((entry, index) => `${padStart(index + 1, 5)}  ${entry}`));
    case "cd": {
      const target = operands[0] ?? `/home/${state.currentUser}`;
      const segments = resolvePath(state, target);
      const node = getNode(state, segments);
      if (!node) return fail(state, `bash: cd: ${target}: No such file or directory`);
      if (node.type !== "dir") return fail(state, `bash: cd: ${target}: Not a directory`);
      if (!canRead(state, node)) return fail(state, `bash: cd: ${target}: Permission denied`);
      state.cwd = segments;
      return ok(state, "");
    }
    case "ls": {
      const target = operands[0] ?? ".";
      const listing = listDir(state, target);
      if (listing.error === "not_found") {
        return fail(state, `ls: cannot access '${target}': No such file or directory`);
      }
      if (listing.error === "denied") {
        return fail(state, `ls: cannot open directory '${target}': Permission denied`);
      }
      const nodes = listing.nodes ?? [];
      if (hasFlag("l")) {
        const rows = nodes.map(
          (node) =>
            `${permissionString(node)} 1 ${pad(node.owner, 10)} ${pad(node.group, 10)} ${padStart(
              node.type === "dir" ? 4096 : (node.content ?? "").length,
              7,
            )} Sep 12 09:14 ${node.name}`,
        );
        return ok(state, [`total ${nodes.length * 4}`, ...rows]);
      }
      const visible = hasFlag("a") ? nodes : nodes.filter((node) => !node.name.startsWith("."));
      return ok(state, visible.map((node) => node.name).join("  "));
    }
    case "cat": {
      if (operands.length === 0) return fail(state, "cat: missing operand");
      const out: string[] = [];
      for (const path of operands) {
        const read = readFile(state, path);
        if (read.error === "not_found") return fail(state, `cat: ${path}: No such file or directory`);
        if (read.error === "is_dir") return fail(state, `cat: ${path}: Is a directory`);
        if (read.error === "denied") return fail(state, `cat: ${path}: Permission denied`);
        out.push(read.text ?? "");
      }
      return ok(state, out.join("\n").replace(/\n$/, ""));
    }
    case "head":
    case "tail": {
      const path = operands[0];
      if (!path) return fail(state, `${name}: missing operand`);
      const read = readFile(state, path);
      if (read.error) return fail(state, `${name}: ${path}: ${bashFsError(read.error)}`);
      const count = Number.parseInt(flags.find((f) => /^-\d+$/.test(f))?.slice(1) ?? "10", 10);
      const lines = (read.text ?? "").split("\n");
      return ok(state, name === "head" ? lines.slice(0, count) : lines.slice(-count));
    }
    case "grep": {
      const needle = operands[0];
      const path = operands[1];
      if (!needle || !path) return fail(state, "usage: grep PATTERN FILE");
      const read = readFile(state, path);
      if (read.error) return fail(state, `grep: ${path}: ${bashFsError(read.error)}`);
      const matches = (read.text ?? "")
        .split("\n")
        .filter((line) => line.toLowerCase().includes(needle.toLowerCase()));
      return matches.length > 0 ? ok(state, matches) : ok(state, "");
    }
    case "touch": {
      const path = operands[0];
      if (!path) return fail(state, "touch: missing file operand");
      const error = writeFile(state, path, getNode(state, resolvePath(state, path)) ? "" : "", false);
      return error ? fail(state, `touch: cannot touch '${path}': ${bashFsError(error)}`) : ok(state, "");
    }
    case "mkdir": {
      const path = operands[0];
      if (!path) return fail(state, "mkdir: missing operand");
      const error = makeDir(state, path);
      if (error === "exists") return fail(state, `mkdir: cannot create directory '${path}': File exists`);
      return error ? fail(state, `mkdir: cannot create directory '${path}': ${bashFsError(error)}`) : ok(state, "");
    }
    case "rm": {
      const path = operands[0];
      if (!path) return fail(state, "rm: missing operand");
      const error = removePath(state, path, hasFlag("r", "R", "f"));
      if (error === "not_empty") return fail(state, `rm: cannot remove '${path}': Is a directory`);
      return error ? fail(state, `rm: cannot remove '${path}': ${bashFsError(error)}`) : ok(state, "");
    }
    case "rmdir": {
      const path = operands[0];
      if (!path) return fail(state, "rmdir: missing operand");
      const error = removePath(state, path, false);
      if (error === "not_empty") return fail(state, `rmdir: failed to remove '${path}': Directory not empty`);
      return error ? fail(state, `rmdir: failed to remove '${path}': ${bashFsError(error)}`) : ok(state, "");
    }
    case "cp":
    case "mv": {
      const [from, to] = operands;
      if (!from || !to) return fail(state, `${name}: missing destination file operand`);
      const error = name === "cp" ? copyPath(state, from, to) : movePath(state, from, to);
      return error ? fail(state, `${name}: cannot stat '${from}': ${bashFsError(error)}`) : ok(state, "");
    }
    case "chmod": {
      const [mode, path] = operands;
      if (!mode || !path) return fail(state, "chmod: missing operand");
      const node = getNode(state, resolvePath(state, path));
      if (!node) return fail(state, `chmod: cannot access '${path}': No such file or directory`);
      if (node.owner !== state.currentUser && !state.elevated && state.currentUser !== "root") {
        return fail(state, `chmod: changing permissions of '${path}': Operation not permitted`);
      }
      if (!/^[0-7]{3,4}$/.test(mode)) return fail(state, `chmod: invalid mode: '${mode}'`);
      node.mode = mode.slice(-3);
      return ok(state, "");
    }
    case "chown": {
      const [owner, path] = operands;
      if (!owner || !path) return fail(state, "chown: missing operand");
      if (!state.elevated && state.currentUser !== "root") {
        return fail(state, `chown: changing ownership of '${path}': Operation not permitted`);
      }
      const node = getNode(state, resolvePath(state, path));
      if (!node) return fail(state, `chown: cannot access '${path}': No such file or directory`);
      const [user, group] = owner.split(":");
      if (user) node.owner = user;
      node.group = group ?? user ?? node.group;
      return ok(state, "");
    }
    case "find": {
      const base = operands[0] ?? ".";
      const nameFlagIndex = args.indexOf("-name");
      const pattern = nameFlagIndex >= 0 ? args[nameFlagIndex + 1]?.replace(/\*/g, "") : undefined;
      const results: string[] = [];
      walk(state, resolvePath(state, base), (node, segments) => {
        if (!pattern || node.name.includes(pattern)) results.push(`/${segments.join("/")}`);
      });
      return ok(state, results);
    }
    case "df":
      return ok(state, [
        "Filesystem     1K-blocks      Used Available Use% Mounted on",
        `/dev/sda1       51474912  ${padStart(Math.round(514749 * state.diskUsedPercent), 8)}  ${padStart(
          Math.round(514749 * (100 - state.diskUsedPercent)),
          8,
        )}  ${state.diskUsedPercent}% /`,
      ]);
    case "free":
      return ok(state, [
        "               total        used        free",
        `Mem:        ${padStart(state.memoryTotalMb, 8)}    ${padStart(state.memoryUsedMb, 8)}    ${padStart(
          state.memoryTotalMb - state.memoryUsedMb,
          8,
        )}`,
      ]);
    case "ps":
    case "top":
      return ok(state, [
        "  PID USER       %CPU  %MEM COMMAND",
        ...state.processes.map(
          (proc) =>
            `${padStart(proc.pid, 5)} ${pad(proc.user, 10)} ${padStart(proc.cpu.toFixed(1), 5)} ${padStart(
              ((proc.memoryMb / state.memoryTotalMb) * 100).toFixed(1),
              5,
            )} ${proc.name}`,
        ),
      ]);
    case "kill":
    case "pkill": {
      const target = operands[0];
      if (!target) return fail(state, `${name}: usage: ${name} pid | name`);
      const error = killProcess(state, target);
      if (error === "not_found") return fail(state, `${name}: (${target}) - No such process`);
      if (error === "denied") return fail(state, `${name}: (${target}) - Operation not permitted`);
      return ok(state, "");
    }
    case "systemctl": {
      const action = (operands[0] ?? "").toLowerCase();
      const service = operands[1];
      if (action === "list-units" || !action) {
        return ok(state, [
          "UNIT                        LOAD   ACTIVE   SUB     DESCRIPTION",
          ...state.services.map(
            (svc) =>
              `${pad(`${svc.name}.service`, 28)}loaded ${pad(svc.status === "running" ? "active" : "inactive", 9)}${pad(
                svc.status === "running" ? "running" : "dead",
                8,
              )}${svc.display}`,
          ),
        ]);
      }
      if (!service) return fail(state, "systemctl: missing unit name");
      const found = findService(state, service);
      if (!found) return fail(state, `Unit ${service}.service could not be found.`);
      if (action === "status") {
        return ok(state, [
          `● ${found.name}.service - ${found.display}`,
          `     Loaded: loaded (/lib/systemd/system/${found.name}.service; ${found.startType})`,
          `     Active: ${found.status === "running" ? "active (running)" : "inactive (dead)"}`,
          found.failReason && found.status === "stopped" ? `      Error: ${found.failReason}` : "",
        ].filter(Boolean));
      }
      if (["start", "stop", "restart"].includes(action)) {
        if (action !== "stop") {
          const stopFirst = setServiceStatus(state, found.name, "stopped");
          if (stopFirst.error === "denied") {
            return fail(state, "Failed to restart: Interactive authentication required. Use sudo.");
          }
        }
        const outcome = setServiceStatus(
          state,
          found.name,
          action === "stop" ? "stopped" : "running",
        );
        if (outcome.error === "denied") {
          return fail(state, `Failed to ${action} ${found.name}.service: Interactive authentication required. Use sudo.`);
        }
        if (outcome.error === "disabled") {
          return fail(state, `Failed to start ${found.name}.service: Unit is masked.`);
        }
        if (outcome.error === "failed") {
          return fail(state, [
            `Job for ${found.name}.service failed.`,
            `See "systemctl status ${found.name}" and "journalctl -xe" for details.`,
            outcome.reason ?? "",
          ].filter(Boolean));
        }
        return ok(state, "");
      }
      if (action === "enable" || action === "disable") {
        if (!state.elevated && state.currentUser !== "root") {
          return fail(state, "Interactive authentication required. Use sudo.");
        }
        found.startType = action === "enable" ? "auto" : "disabled";
        return ok(state, `${action === "enable" ? "Created" : "Removed"} symlink /etc/systemd/system/multi-user.target.wants/${found.name}.service`);
      }
      return fail(state, `Unknown operation ${action}.`);
    }
    case "journalctl":
      return ok(
        state,
        state.eventLog.length > 0 ? state.eventLog.slice(0, 25) : ["-- No entries --"],
      );
    case "ip": {
      if ((operands[0] ?? "").startsWith("a")) return ok(state, ipAddrOutput(state));
      if ((operands[0] ?? "").startsWith("r")) {
        const iface = primaryInterface(state);
        return ok(
          state,
          iface?.gateway
            ? [`default via ${iface.gateway} dev ${iface.name} proto dhcp`, `${subnetOf(iface.ip)}/24 dev ${iface.name} proto kernel scope link src ${iface.ip}`]
            : ["(no default route)"],
        );
      }
      return fail(state, 'Usage: ip [ OPTIONS ] OBJECT { addr | route | link }');
    }
    case "ifconfig":
      return ok(state, ipAddrOutput(state));
    case "ping": {
      const host = operands[0];
      if (!host) return fail(state, "ping: usage error: Destination address required");
      const result = pingHost(state, host);
      return result.ok ? ok(state, result.lines) : fail(state, result.lines);
    }
    case "dig":
    case "host":
    case "nslookup": {
      const host = operands.find((operand) => !operand.startsWith("@"));
      if (!host) return fail(state, `${name}: missing hostname`);
      const ip = resolveHost(state, host);
      if (state.dnsServers.length === 0) {
        return fail(state, `;; connection timed out; no servers could be reached`);
      }
      if (!ip) {
        return fail(state, [
          `Server:  ${state.dnsServers[0]}`,
          `** server can't find ${host}: NXDOMAIN`,
        ]);
      }
      return ok(state, [
        `Server:  ${state.dnsServers[0]}`,
        `Address: ${state.dnsServers[0]}#53`,
        "",
        `Name:    ${host}`,
        `Address: ${ip}`,
      ]);
    }
    case "traceroute": {
      const host = operands[0];
      if (!host) return fail(state, "traceroute: missing host operand");
      const ip = resolveHost(state, host);
      if (!ip) return fail(state, `traceroute: unknown host ${host}`);
      const iface = primaryInterface(state);
      const target = findTarget(state, ip);
      const hops = [`1  ${iface?.gateway ?? "10.0.0.1"}  1.204 ms`];
      if (target?.reachable) hops.push(`2  ${ip}  ${(target.latencyMs ?? 10).toFixed(3)} ms`);
      else hops.push("2  * * *", "3  * * *");
      return ok(state, [`traceroute to ${host} (${ip}), 30 hops max`, ...hops]);
    }
    case "ss":
    case "netstat":
      return ok(state, [
        "Proto Local Address          Foreign Address        State",
        ...state.services
          .filter((svc) => svc.status === "running")
          .map(
            (svc, index) =>
              `tcp   0.0.0.0:${[22, 80, 53, 443, 631][index] ?? 8080 + index}${" ".repeat(10)}0.0.0.0:*              LISTEN`,
          ),
      ]);
    case "curl":
    case "wget": {
      const url = operands[0];
      if (!url) return fail(state, `${name}: no URL specified`);
      const host = url.replace(/^https?:\/\//, "").split("/")[0] as string;
      const ip = resolveHost(state, host);
      if (!ip) return fail(state, `${name}: (6) Could not resolve host: ${host}`);
      const target = findTarget(state, host);
      if (!target?.reachable) return fail(state, `${name}: (28) Failed to connect to ${host}: Connection timed out`);
      return ok(state, ["HTTP/1.1 200 OK", "content-type: text/html", "", `<html><body>${host}</body></html>`]);
    }
    case "ufw": {
      const action = (operands[0] ?? "status").toLowerCase();
      if (action === "status") {
        return ok(state, [
          `Status: ${state.firewallEnabled ? "active" : "inactive"}`,
          ...(state.blockedPorts.length > 0
            ? ["", "To                Action      From", ...state.blockedPorts.map((port) => `${pad(String(port), 18)}DENY        Anywhere`)]
            : []),
        ]);
      }
      if (!state.elevated && state.currentUser !== "root") {
        return fail(state, "ERROR: You need to be root to run this script");
      }
      if (action === "enable" || action === "disable") {
        state.firewallEnabled = action === "enable";
        return ok(state, `Firewall ${action === "enable" ? "is active and enabled on system startup" : "stopped and disabled on system startup"}`);
      }
      if (action === "allow") {
        const port = Number.parseInt(operands[1] ?? "", 10);
        state.blockedPorts = state.blockedPorts.filter((blocked) => blocked !== port);
        return ok(state, "Rule updated");
      }
      if (action === "deny") {
        const port = Number.parseInt(operands[1] ?? "", 10);
        if (Number.isFinite(port)) state.blockedPorts = [...new Set([...state.blockedPorts, port])];
        return ok(state, "Rule updated");
      }
      return fail(state, "ERROR: Invalid syntax");
    }
    case "useradd":
    case "adduser": {
      const user = operands[0];
      if (!user) return fail(state, `${name}: missing operand`);
      if (!state.elevated && state.currentUser !== "root") {
        return fail(state, `${name}: Permission denied.`);
      }
      if (state.users.some((account) => account.name === user)) {
        return fail(state, `${name}: user '${user}' already exists`);
      }
      state.users.push({
        name: user,
        fullName: user,
        groups: [user],
        admin: false,
        locked: false,
        passwordExpired: true,
      });
      makeDir(state, `/home/${user}`);
      return ok(state, "");
    }
    case "usermod": {
      const groupIndex = args.findIndex((arg) => arg === "-aG" || arg === "-G");
      const group = args[groupIndex + 1];
      const user = operands[operands.length - 1];
      if (!state.elevated && state.currentUser !== "root") return fail(state, "usermod: Permission denied.");
      const account = state.users.find((item) => item.name === user);
      if (!account) return fail(state, `usermod: user '${user}' does not exist`);
      if (group) account.groups = [...new Set([...account.groups, group])];
      if (args.includes("-U")) account.locked = false;
      if (args.includes("-L")) account.locked = true;
      return ok(state, "");
    }
    case "passwd": {
      const user = operands[0] ?? state.currentUser;
      const account = state.users.find((item) => item.name === user);
      if (!account) return fail(state, `passwd: user '${user}' does not exist`);
      if (user !== state.currentUser && !state.elevated && state.currentUser !== "root") {
        return fail(state, "passwd: You may not view or modify password information for other users.");
      }
      account.passwordExpired = false;
      account.locked = false;
      return ok(state, `passwd: password updated successfully for ${user}`);
    }
    case "su": {
      const user = operands[0] ?? "root";
      if (!state.elevated && state.currentUser !== "root") {
        return fail(state, "su: Authentication failure (use sudo -i on this machine)");
      }
      state.currentUser = user;
      state.cwd = user === "root" ? ["root"] : ["home", user];
      return ok(state, "");
    }
    case "exit":
      if (state.currentUser !== "student") {
        state.currentUser = "student";
        state.elevated = false;
        state.cwd = ["home", "student"];
        return ok(state, "logout");
      }
      return ok(state, "logout");
    case "man":
    case "help":
      return ok(state, bashHelp(operands[0]));
    default:
      return fail(state, `${name}: command not found`);
  }
}

function bashFsError(code: string): string {
  if (code === "not_found") return "No such file or directory";
  if (code === "denied") return "Permission denied";
  if (code === "is_dir") return "Is a directory";
  if (code === "exists") return "File exists";
  return code;
}

function ipAddrOutput(state: MachineState): string[] {
  const lines: string[] = [];
  state.interfaces.forEach((iface, index) => {
    lines.push(
      `${index + 1}: ${iface.name}: <${iface.up ? "UP,BROADCAST,RUNNING" : "NO-CARRIER"}> mtu 1500 state ${iface.up ? "UP" : "DOWN"}`,
    );
    lines.push(`    link/ether ${iface.mac}`);
    if (iface.ip) lines.push(`    inet ${iface.ip}/${maskToCidr(iface.mask)} scope global ${iface.name}`);
    else lines.push("    (no address assigned)");
  });
  return lines;
}

function subnetOf(ip: string): string {
  return `${ip.split(".").slice(0, 3).join(".")}.0`;
}

function maskToCidr(mask: string): number {
  return mask
    .split(".")
    .map((octet) => Number.parseInt(octet, 10).toString(2).split("1").length - 1)
    .reduce((total, bits) => total + bits, 0);
}

function walk(
  state: MachineState,
  segments: string[],
  visit: (node: VfsNode, segments: string[]) => void,
) {
  const node = getNode(state, segments);
  if (!node) return;
  visit(node, segments);
  if (node.type === "dir") {
    for (const child of Object.values(node.children ?? {})) {
      walk(state, [...segments, child.name], visit);
    }
  }
}

function expandEnv(state: MachineState, text: string): string {
  return text.replace(/\$(\w+)|%(\w+)%/g, (match, a, b) => state.env[a ?? b] ?? match);
}

function bashHelp(topic?: string): string[] {
  if (topic) return [`${topic}: see the lesson notes. This simulator supports the common flags only.`];
  return [
    "Available here: ls cd pwd cat head tail grep find touch mkdir rm rmdir cp mv chmod chown",
    "                ps kill systemctl journalctl service ip ifconfig ping dig nslookup traceroute",
    "                ss netstat curl ufw useradd usermod passwd su sudo df free uname id whoami history clear",
  ];
}

/* ------------------------------------------------------------------ */
/* Windows CMD                                                         */
/* ------------------------------------------------------------------ */

function runCmd(state: MachineState, input: string): ExecResult {
  const tokens = tokenize(input);
  const name = (tokens[0] ?? "").toLowerCase();
  const args = tokens.slice(1);
  const switches = args.filter((arg) => arg.startsWith("/")).map((arg) => arg.toLowerCase());
  const operands = args.filter((arg) => !arg.startsWith("/"));

  switch (name) {
    case "":
      return ok(state, "");
    case "cls":
      return { state, output: "", error: false, cleared: true };
    case "echo":
      return ok(state, expandEnv(state, input.replace(/^\s*echo\s*/i, "")));
    case "whoami":
      return ok(state, `${state.hostname.toLowerCase()}\\${state.currentUser}`);
    case "runas": {
      state.elevated = true;
      return ok(state, "Elevated command prompt started. Administrative commands are now allowed.");
    }
    case "hostname":
      return ok(state, state.hostname);
    case "ver":
      return ok(state, ["", state.osName, ""]);
    case "set":
      return ok(state, Object.entries(state.env).map(([key, value]) => `${key}=${value}`));
    case "cd":
    case "chdir": {
      if (operands.length === 0) return ok(state, promptPath(state));
      const segments = resolvePath(state, operands[0] as string);
      const node = getNode(state, segments);
      if (!node || node.type !== "dir") return fail(state, "The system cannot find the path specified.");
      state.cwd = segments;
      return ok(state, "");
    }
    case "dir": {
      const listing = listDir(state, operands[0] ?? ".");
      if (listing.error) return fail(state, "File Not Found");
      const nodes = listing.nodes ?? [];
      return ok(state, [
        ` Volume in drive C has no label.`,
        ` Directory of ${promptPath(state)}`,
        "",
        ...nodes.map(
          (node) =>
            `09/12/2026  09:14 AM    ${pad(node.type === "dir" ? "<DIR>" : String((node.content ?? "").length), 14)}${node.name}`,
        ),
        `${padStart(nodes.filter((node) => node.type === "file").length, 15)} File(s)`,
        `${padStart(nodes.filter((node) => node.type === "dir").length, 15)} Dir(s)`,
      ]);
    }
    case "type": {
      const path = operands[0];
      if (!path) return fail(state, "The syntax of the command is incorrect.");
      const read = readFile(state, path);
      if (read.error === "not_found") return fail(state, "The system cannot find the file specified.");
      if (read.error === "denied") return fail(state, "Access is denied.");
      if (read.error === "is_dir") return fail(state, "Access is denied.");
      return ok(state, (read.text ?? "").replace(/\r/g, ""));
    }
    case "copy": {
      const [from, to] = operands;
      if (!from || !to) return fail(state, "The syntax of the command is incorrect.");
      const error = copyPath(state, from, to);
      if (error === "denied") return fail(state, "Access is denied.");
      if (error) return fail(state, "The system cannot find the file specified.");
      return ok(state, "        1 file(s) copied.");
    }
    case "move": {
      const [from, to] = operands;
      if (!from || !to) return fail(state, "The syntax of the command is incorrect.");
      const error = movePath(state, from, to);
      if (error === "denied") return fail(state, "Access is denied.");
      if (error) return fail(state, "The system cannot find the file specified.");
      return ok(state, "        1 file(s) moved.");
    }
    case "del":
    case "erase": {
      const path = operands[0];
      if (!path) return fail(state, "The syntax of the command is incorrect.");
      const error = removePath(state, path, switches.includes("/s"));
      if (error === "denied") return fail(state, "Access is denied.");
      if (error) return fail(state, "Could Not Find " + path);
      return ok(state, "");
    }
    case "md":
    case "mkdir": {
      const path = operands[0];
      if (!path) return fail(state, "The syntax of the command is incorrect.");
      const error = makeDir(state, path);
      if (error === "exists") return fail(state, "A subdirectory or file " + path + " already exists.");
      if (error === "denied") return fail(state, "Access is denied.");
      return error ? fail(state, "The system cannot find the path specified.") : ok(state, "");
    }
    case "rd":
    case "rmdir": {
      const path = operands[0];
      if (!path) return fail(state, "The syntax of the command is incorrect.");
      const error = removePath(state, path, switches.includes("/s"));
      if (error === "not_empty") return fail(state, "The directory is not empty.");
      if (error === "denied") return fail(state, "Access is denied.");
      return error ? fail(state, "The system cannot find the file specified.") : ok(state, "");
    }
    case "findstr": {
      const needle = operands[0];
      const path = operands[1];
      if (!needle || !path) return fail(state, "FINDSTR: Bad command line");
      const read = readFile(state, path);
      if (read.error) return fail(state, "FINDSTR: Cannot open " + path);
      return ok(
        state,
        (read.text ?? "").split("\n").filter((line) => line.toLowerCase().includes(needle.toLowerCase())),
      );
    }
    case "ipconfig": {
      if (switches.includes("/flushdns")) {
        state.dnsCache = {};
        return ok(state, ["", "Windows IP Configuration", "", "Successfully flushed the DNS Resolver Cache."]);
      }
      if (switches.includes("/release")) {
        for (const iface of state.interfaces) {
          if (iface.dhcp) {
            iface.ip = "0.0.0.0";
            iface.gateway = "";
          }
        }
        return ok(state, ["", "Windows IP Configuration", "", "   IPv4 Address. . . . . . . . . . . : 0.0.0.0"]);
      }
      if (switches.includes("/renew")) {
        const iface = primaryInterface(state);
        if (!iface) return fail(state, "No operation can be performed while media is disconnected.");
        if (!iface.up) {
          return fail(state, [
            "",
            "An error occurred while renewing interface Ethernet:",
            "unable to contact your DHCP server. Request has timed out.",
          ]);
        }
        iface.ip = "10.0.0.54";
        iface.gateway = "10.0.0.1";
        iface.mask = "255.255.255.0";
        return ok(state, ipconfigOutput(state, false));
      }
      return ok(state, ipconfigOutput(state, switches.includes("/all")));
    }
    case "ping": {
      const host = operands[0];
      if (!host) return fail(state, "Usage: ping [-t] [-a] target_name");
      const result = pingHost(state, host);
      return result.ok ? ok(state, result.lines) : fail(state, result.lines);
    }
    case "tracert": {
      const host = operands[0];
      if (!host) return fail(state, "Usage: tracert target_name");
      const ip = resolveHost(state, host);
      if (!ip) return fail(state, `Unable to resolve target system name ${host}.`);
      const target = findTarget(state, ip);
      const iface = primaryInterface(state);
      return ok(state, [
        `Tracing route to ${host} [${ip}]`,
        "over a maximum of 30 hops:",
        "",
        `  1     1 ms     1 ms     1 ms  ${iface?.gateway ?? "10.0.0.1"}`,
        target?.reachable
          ? `  2    ${target.latencyMs ?? 10} ms    ${target.latencyMs ?? 10} ms    ${target.latencyMs ?? 10} ms  ${ip}`
          : "  2     *        *        *     Request timed out.",
        "",
        "Trace complete.",
      ]);
    }
    case "nslookup": {
      const host = operands[0];
      if (!host) return ok(state, [`Default Server:  dns.corp.local`, `Address:  ${state.dnsServers[0] ?? "(none)"}`]);
      if (state.dnsServers.length === 0) {
        return fail(state, ["*** Can't find server name: No DNS servers configured"]);
      }
      const ip = resolveHost(state, host);
      if (!ip) {
        return fail(state, [
          `Server:  dns.corp.local`,
          `Address:  ${state.dnsServers[0]}`,
          "",
          `*** dns.corp.local can't find ${host}: Non-existent domain`,
        ]);
      }
      return ok(state, [
        `Server:  dns.corp.local`,
        `Address:  ${state.dnsServers[0]}`,
        "",
        "Non-authoritative answer:",
        `Name:    ${host}`,
        `Address:  ${ip}`,
      ]);
    }
    case "netstat":
      return ok(state, [
        "Active Connections",
        "",
        "  Proto  Local Address          Foreign Address        State",
        "  TCP    10.0.0.54:139          0.0.0.0:0              LISTENING",
        "  TCP    10.0.0.54:445          10.0.0.25:445          ESTABLISHED",
      ]);
    case "arp":
      return ok(state, [
        `Interface: ${primaryInterface(state)?.ip ?? "0.0.0.0"} --- 0x5`,
        "  Internet Address      Physical Address      Type",
        "  10.0.0.1              aa-bb-cc-11-22-33     dynamic",
      ]);
    case "route":
      return ok(state, [
        "IPv4 Route Table",
        "Network Destination        Netmask          Gateway       Interface",
        `          0.0.0.0          0.0.0.0     ${pad(primaryInterface(state)?.gateway || "On-link", 14)}${primaryInterface(state)?.ip ?? ""}`,
      ]);
    case "tasklist":
      return ok(state, [
        "Image Name                     PID Mem Usage",
        "========================= ======== ============",
        ...state.processes.map(
          (proc) => `${pad(proc.name, 26)}${padStart(proc.pid, 8)} ${padStart(`${proc.memoryMb.toLocaleString()} K`, 12)}`,
        ),
      ]);
    case "taskkill": {
      const pidIndex = args.findIndex((arg) => arg.toLowerCase() === "/pid");
      const imIndex = args.findIndex((arg) => arg.toLowerCase() === "/im");
      const target = pidIndex >= 0 ? args[pidIndex + 1] : imIndex >= 0 ? args[imIndex + 1] : undefined;
      if (!target) return fail(state, "ERROR: Invalid syntax. Use taskkill /IM name /F or /PID number /F");
      const error = killProcess(state, target);
      if (error === "denied") return fail(state, `ERROR: The process "${target}" could not be terminated. Access is denied.`);
      if (error) return fail(state, `ERROR: The process "${target}" not found.`);
      return ok(state, `SUCCESS: Sent termination signal to the process "${target}".`);
    }
    case "sc": {
      const action = (operands[0] ?? "").toLowerCase();
      const serviceName = operands[1];
      if (action === "query" && !serviceName) {
        return ok(
          state,
          state.services.flatMap((svc) => [
            `SERVICE_NAME: ${svc.name}`,
            `        STATE              : ${svc.status === "running" ? "4  RUNNING" : "1  STOPPED"}`,
            "",
          ]),
        );
      }
      if (!serviceName) return fail(state, "The specified service does not exist as an installed service.");
      const svc = findService(state, serviceName);
      if (!svc) return fail(state, "[SC] OpenService FAILED 1060: The specified service does not exist.");
      if (action === "query") {
        return ok(state, [
          `SERVICE_NAME: ${svc.name}`,
          `        STATE              : ${svc.status === "running" ? "4  RUNNING" : "1  STOPPED"}`,
          `        START_TYPE         : ${svc.startType === "auto" ? "2   AUTO_START" : svc.startType === "manual" ? "3   DEMAND_START" : "4   DISABLED"}`,
        ]);
      }
      if (action === "start" || action === "stop") {
        const outcome = setServiceStatus(state, svc.name, action === "start" ? "running" : "stopped");
        if (outcome.error === "denied") return fail(state, "[SC] OpenService FAILED 5: Access is denied.\nRun: runas /user:Administrator cmd");
        if (outcome.error === "disabled") return fail(state, "[SC] StartService FAILED 1058: The service cannot be started because it is disabled.");
        if (outcome.error === "failed") return fail(state, `[SC] StartService FAILED 1053: ${outcome.reason ?? "The service did not respond in a timely fashion."}`);
        return ok(state, `SERVICE_NAME: ${svc.name}\n        STATE              : ${action === "start" ? "4  RUNNING" : "1  STOPPED"}`);
      }
      if (action === "config") {
        if (!isAdmin(state)) return fail(state, "[SC] OpenService FAILED 5: Access is denied.\nRun: runas /user:Administrator cmd");
        const start = args.find((arg) => arg.toLowerCase().startsWith("start="));
        const value = start?.split("=")[1]?.toLowerCase();
        if (value === "auto") svc.startType = "auto";
        if (value === "demand") svc.startType = "manual";
        if (value === "disabled") svc.startType = "disabled";
        return ok(state, "[SC] ChangeServiceConfig SUCCESS");
      }
      return fail(state, "[SC] Unknown command");
    }
    case "net": {
      const action = (operands[0] ?? "").toLowerCase();
      if (action === "user") {
        const account = operands[1];
        if (!account) {
          return ok(state, ["User accounts for \\\\" + state.hostname, "", ...state.users.map((user) => user.name)]);
        }
        const found = state.users.find((user) => user.name.toLowerCase() === account.toLowerCase());
        if (!found) return fail(state, "The user name could not be found.");
        if (args.some((arg) => arg.toLowerCase() === "/active:yes")) {
          if (!isAdmin(state)) return fail(state, "System error 5 has occurred. Access is denied.\nThis command needs an elevated prompt. Run: runas /user:Administrator cmd");
          found.locked = false;
          return ok(state, "The command completed successfully.");
        }
        return ok(state, [
          `User name                    ${found.name}`,
          `Full Name                    ${found.fullName}`,
          `Account active               ${found.locked ? "No" : "Yes"}`,
          `Password expired             ${found.passwordExpired ? "Yes" : "No"}`,
          `Local Group Memberships      ${found.groups.map((group) => `*${group}`).join(" ")}`,
        ]);
      }
      if (action === "start" || action === "stop") {
        const serviceName = operands.slice(1).join(" ");
        if (!serviceName) {
          return ok(state, ["These Windows services are started:", "", ...state.services.filter((svc) => svc.status === "running").map((svc) => `   ${svc.display}`)]);
        }
        const outcome = setServiceStatus(state, serviceName, action === "start" ? "running" : "stopped");
        if (outcome.error === "not_found") return fail(state, "The service name is invalid.");
        if (outcome.error === "denied") return fail(state, "System error 5 has occurred. Access is denied.\nThis command needs an elevated prompt. Run: runas /user:Administrator cmd");
        if (outcome.error === "disabled") return fail(state, "The service cannot be started because it is disabled.");
        if (outcome.error === "failed") return fail(state, `The service did not start: ${outcome.reason ?? "unknown error"}`);
        return ok(state, `The ${serviceName} service was ${action === "start" ? "started" : "stopped"} successfully.`);
      }
      if (action === "localgroup") {
        return ok(state, ["Aliases for \\\\" + state.hostname, "", "*Administrators", "*Users"]);
      }
      return fail(state, "The syntax of this command is: NET USER | NET START | NET STOP | NET LOCALGROUP");
    }
    case "systeminfo":
      return ok(state, [
        `Host Name:                 ${state.hostname}`,
        `OS Name:                   ${state.osName}`,
        `System Type:               x64-based PC`,
        `Total Physical Memory:     ${state.memoryTotalMb.toLocaleString()} MB`,
        `Available Physical Memory: ${(state.memoryTotalMb - state.memoryUsedMb).toLocaleString()} MB`,
        `Logon Server:              \\\\DC01`,
      ]);
    case "chkdsk":
      return ok(state, [
        "The type of the file system is NTFS.",
        "Stage 1: Examining basic file system structure ...",
        "Windows has scanned the file system and found no problems.",
        `  ${state.diskUsedPercent}% of disk space in use.`,
      ]);
    case "sfc":
      return ok(state, [
        "Beginning system scan.  This process will take some time.",
        "Windows Resource Protection did not find any integrity violations.",
      ]);
    case "gpupdate":
      return ok(state, ["Updating policy...", "", "Computer Policy update has completed successfully.", "User Policy update has completed successfully."]);
    case "shutdown":
      return ok(state, "This simulator does not restart machines, but the command syntax is accepted.");
    case "help":
      return ok(state, [
        "Supported here: dir cd type copy move del md rd findstr echo set ver cls",
        "                ipconfig ping tracert nslookup netstat arp route",
        "                tasklist taskkill sc net systeminfo chkdsk sfc gpupdate whoami hostname runas",
      ]);
    default:
      return fail(state, `'${name}' is not recognized as an internal or external command,\noperable program or batch file.`);
  }
}

function ipconfigOutput(state: MachineState, all: boolean): string[] {
  const lines = ["", "Windows IP Configuration", ""];
  for (const iface of state.interfaces) {
    lines.push(`Ethernet adapter ${iface.name}:`, "");
    if (!iface.up) {
      lines.push("   Media State . . . . . . . . . . . : Media disconnected", "");
      continue;
    }
    if (all) {
      lines.push(`   Physical Address. . . . . . . . . : ${iface.mac}`);
      lines.push(`   DHCP Enabled. . . . . . . . . . . : ${iface.dhcp ? "Yes" : "No"}`);
    }
    lines.push(`   IPv4 Address. . . . . . . . . . . : ${iface.ip || "0.0.0.0"}`);
    lines.push(`   Subnet Mask . . . . . . . . . . . : ${iface.mask || "0.0.0.0"}`);
    lines.push(`   Default Gateway . . . . . . . . . : ${iface.gateway || ""}`);
    if (all) {
      lines.push(`   DNS Servers . . . . . . . . . . . : ${state.dnsServers[0] ?? ""}`);
      for (const extra of state.dnsServers.slice(1)) {
        lines.push(`                                       ${extra}`);
      }
    }
    lines.push("");
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* PowerShell                                                          */
/* ------------------------------------------------------------------ */

const POWERSHELL_ALIASES: Record<string, string> = {
  ls: "get-childitem",
  dir: "get-childitem",
  gci: "get-childitem",
  cd: "set-location",
  sl: "set-location",
  cat: "get-content",
  type: "get-content",
  gc: "get-content",
  ps: "get-process",
  gps: "get-process",
  kill: "stop-process",
  spps: "stop-process",
  gsv: "get-service",
  cpi: "copy-item",
  copy: "copy-item",
  mi: "move-item",
  move: "move-item",
  ri: "remove-item",
  rm: "remove-item",
  del: "remove-item",
  ni: "new-item",
  sc_: "set-content",
  pwd: "get-location",
  gl: "get-location",
  cls: "clear-host",
  clear: "clear-host",
  echo: "write-output",
  write: "write-output",
  sls: "select-string",
  ping: "test-connection",
};

function runPowerShell(state: MachineState, input: string): ExecResult {
  const tokens = tokenize(input);
  const rawName = (tokens[0] ?? "").toLowerCase();
  const name = POWERSHELL_ALIASES[rawName] ?? rawName;
  const args = tokens.slice(1);
  const operands = args.filter((arg) => !arg.startsWith("-"));
  const paramValue = (param: string): string | undefined => {
    const index = args.findIndex((arg) => arg.toLowerCase() === `-${param}`);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const hasParam = (param: string) => args.some((arg) => arg.toLowerCase() === `-${param}`);

  switch (name) {
    case "":
      return ok(state, "");
    case "clear-host":
      return { state, output: "", error: false, cleared: true };
    case "get-location":
      return ok(state, ["Path", "----", promptPath(state)]);
    case "write-output":
      return ok(state, operands.join(" "));
    case "set-location": {
      const target = paramValue("path") ?? operands[0];
      if (!target) return ok(state, "");
      const segments = resolvePath(state, target);
      const node = getNode(state, segments);
      if (!node || node.type !== "dir") {
        return fail(state, `Set-Location : Cannot find path '${target}' because it does not exist.`);
      }
      state.cwd = segments;
      return ok(state, "");
    }
    case "get-childitem": {
      const target = paramValue("path") ?? operands[0] ?? ".";
      const listing = listDir(state, target);
      if (listing.error === "denied") return fail(state, `Get-ChildItem : Access to the path '${target}' is denied.`);
      if (listing.error) return fail(state, `Get-ChildItem : Cannot find path '${target}' because it does not exist.`);
      const nodes = listing.nodes ?? [];
      return ok(state, [
        `    Directory: ${promptPath(state)}`,
        "",
        "Mode                 LastWriteTime         Length Name",
        "----                 -------------         ------ ----",
        ...nodes.map(
          (node) =>
            `${pad(node.type === "dir" ? "d-----" : "-a----", 21)}${pad("9/12/2026   9:14 AM", 22)}${padStart(
              node.type === "dir" ? "" : (node.content ?? "").length,
              6,
            )} ${node.name}`,
        ),
      ]);
    }
    case "get-content": {
      const path = paramValue("path") ?? operands[0];
      if (!path) return fail(state, "Get-Content : Cannot bind argument to parameter 'Path'.");
      const read = readFile(state, path);
      if (read.error === "denied") return fail(state, `Get-Content : Access to the path '${path}' is denied.`);
      if (read.error) return fail(state, `Get-Content : Cannot find path '${path}' because it does not exist.`);
      return ok(state, (read.text ?? "").replace(/\r/g, ""));
    }
    case "set-content":
    case "add-content": {
      const path = paramValue("path") ?? operands[0];
      const value = paramValue("value") ?? operands[1] ?? "";
      if (!path) return fail(state, `${name}: Cannot bind argument to parameter 'Path'.`);
      const error = writeFile(state, path, `${value}\n`, name === "add-content");
      return error ? fail(state, `${name} : Access to the path '${path}' is denied.`) : ok(state, "");
    }
    case "new-item": {
      const path = paramValue("path") ?? operands[0];
      const type = (paramValue("itemtype") ?? "file").toLowerCase();
      if (!path) return fail(state, "New-Item : Cannot bind argument to parameter 'Path'.");
      const error = type.startsWith("dir") ? makeDir(state, path) : writeFile(state, path, "", false);
      if (error === "exists") return fail(state, `New-Item : An item with the specified name ${path} already exists.`);
      return error ? fail(state, `New-Item : Could not create '${path}'.`) : ok(state, `    Created ${path}`);
    }
    case "remove-item": {
      const path = paramValue("path") ?? operands[0];
      if (!path) return fail(state, "Remove-Item : Cannot bind argument to parameter 'Path'.");
      const error = removePath(state, path, hasParam("recurse") || hasParam("force"));
      if (error === "not_empty") {
        return fail(state, "Remove-Item : The directory is not empty. Use -Recurse to remove it.");
      }
      if (error === "denied") return fail(state, `Remove-Item : Access to the path '${path}' is denied.`);
      return error ? fail(state, `Remove-Item : Cannot find path '${path}'.`) : ok(state, "");
    }
    case "copy-item":
    case "move-item": {
      const from = paramValue("path") ?? operands[0];
      const to = paramValue("destination") ?? operands[1];
      if (!from || !to) return fail(state, `${name}: Path and Destination are required.`);
      const error = name === "copy-item" ? copyPath(state, from, to) : movePath(state, from, to);
      return error ? fail(state, `${name} : Cannot process '${from}'.`) : ok(state, "");
    }
    case "select-string": {
      const pattern = paramValue("pattern") ?? operands[0];
      const path = paramValue("path") ?? operands[1];
      if (!pattern || !path) return fail(state, "Select-String : Pattern and Path are required.");
      const read = readFile(state, path);
      if (read.error) return fail(state, `Select-String : Cannot find path '${path}'.`);
      return ok(
        state,
        (read.text ?? "")
          .split("\n")
          .filter((line) => line.toLowerCase().includes(pattern.toLowerCase()))
          .map((line) => `${path}: ${line}`),
      );
    }
    case "get-process": {
      const filter = (paramValue("name") ?? operands[0] ?? "").toLowerCase();
      const rows = state.processes.filter((proc) => !filter || proc.name.toLowerCase().includes(filter));
      if (rows.length === 0) return fail(state, `Get-Process : Cannot find a process with the name "${filter}".`);
      return ok(state, [
        "    NPM(K)    CPU(s)     WS(M)     Id ProcessName",
        "    ------    ------     -----     -- -----------",
        ...rows.map(
          (proc) =>
            `${padStart(24, 10)}${padStart(proc.cpu.toFixed(2), 10)}${padStart(proc.memoryMb, 10)}${padStart(proc.pid, 7)} ${proc.name.replace(/\.exe$/, "")}`,
        ),
      ]);
    }
    case "stop-process": {
      const target = paramValue("name") ?? paramValue("id") ?? operands[0];
      if (!target) return fail(state, "Stop-Process : Cannot bind argument to parameter 'Name'.");
      const error = killProcess(state, target);
      if (error === "denied") return fail(state, `Stop-Process : Cannot stop process "${target}" because of the following error: Access is denied.`);
      if (error) return fail(state, `Stop-Process : Cannot find a process with the name "${target}".`);
      return ok(state, "");
    }
    case "get-service": {
      const filter = (paramValue("name") ?? operands[0] ?? "").toLowerCase();
      const rows = state.services.filter(
        (svc) => !filter || svc.name.toLowerCase().includes(filter) || svc.display.toLowerCase().includes(filter),
      );
      if (rows.length === 0) return fail(state, `Get-Service : Cannot find any service with service name '${filter}'.`);
      return ok(state, [
        "Status   Name               DisplayName",
        "------   ----               -----------",
        ...rows.map((svc) => `${pad(svc.status === "running" ? "Running" : "Stopped", 9)}${pad(svc.name, 19)}${svc.display}`),
      ]);
    }
    case "start-service":
    case "stop-service":
    case "restart-service": {
      const target = paramValue("name") ?? operands[0];
      if (!target) return fail(state, `${name}: Cannot bind argument to parameter 'Name'.`);
      const desired = name === "stop-service" ? "stopped" : "running";
      if (name === "restart-service") setServiceStatus(state, target, "stopped");
      const outcome = setServiceStatus(state, target, desired);
      if (outcome.error === "not_found") return fail(state, `${name} : Cannot find any service with service name '${target}'.`);
      if (outcome.error === "denied") return fail(state, `${name} : Service '${target}' cannot be opened: Access is denied. Run PowerShell as administrator.`);
      if (outcome.error === "disabled") return fail(state, `${name} : Service '${target}' cannot be started because it is disabled.`);
      if (outcome.error === "failed") return fail(state, `${name} : Failed to start service '${target}': ${outcome.reason ?? "unknown error"}`);
      return ok(state, "");
    }
    case "set-service": {
      const target = paramValue("name") ?? operands[0];
      const startup = (paramValue("startuptype") ?? "").toLowerCase();
      const svc = target ? findService(state, target) : undefined;
      if (!svc) return fail(state, `Set-Service : Cannot find any service with service name '${target ?? ""}'.`);
      if (!isAdmin(state)) return fail(state, "Set-Service : Access is denied. Run PowerShell as administrator.");
      if (startup === "automatic") svc.startType = "auto";
      if (startup === "manual") svc.startType = "manual";
      if (startup === "disabled") svc.startType = "disabled";
      return ok(state, "");
    }
    case "get-netipaddress":
    case "get-netipconfiguration":
      return ok(
        state,
        state.interfaces.flatMap((iface) => [
          `InterfaceAlias : ${iface.name}`,
          `IPv4Address    : ${iface.ip || "(none)"}`,
          `PrefixLength   : ${iface.mask ? 24 : 0}`,
          `IPv4DefaultGateway : ${iface.gateway || "(none)"}`,
          `DNSServer      : ${state.dnsServers.join(", ") || "(none)"}`,
          `Status         : ${iface.up ? "Up" : "Disconnected"}`,
          "",
        ]),
      );
    case "test-connection": {
      const host = paramValue("computername") ?? operands[0];
      if (!host) return fail(state, "Test-Connection : Cannot bind argument to parameter 'ComputerName'.");
      const result = pingHost(state, host);
      return result.ok ? ok(state, result.lines) : fail(state, result.lines);
    }
    case "test-netconnection": {
      const host = paramValue("computername") ?? operands[0];
      const port = Number.parseInt(paramValue("port") ?? "", 10);
      if (!host) return fail(state, "Test-NetConnection : ComputerName is required.");
      const ip = resolveHost(state, host);
      if (!ip) {
        return fail(state, [
          `WARNING: Name resolution of ${host} failed`,
          `ComputerName           : ${host}`,
          "PingSucceeded          : False",
        ]);
      }
      const target = findTarget(state, ip);
      const portOpen =
        Number.isFinite(port) && Boolean(target?.openPorts?.includes(port)) && !state.blockedPorts.includes(port);
      return ok(state, [
        `ComputerName     : ${host}`,
        `RemoteAddress    : ${ip}`,
        ...(Number.isFinite(port) ? [`RemotePort       : ${port}`, `TcpTestSucceeded : ${portOpen ? "True" : "False"}`] : []),
        `PingSucceeded    : ${target?.reachable && hasLink(state) ? "True" : "False"}`,
        `InterfaceAlias   : ${primaryInterface(state)?.name ?? "Ethernet"}`,
      ]);
    }
    case "resolve-dnsname": {
      const host = paramValue("name") ?? operands[0];
      if (!host) return fail(state, "Resolve-DnsName : Name is required.");
      if (state.dnsServers.length === 0) {
        return fail(state, `Resolve-DnsName : ${host} : DNS server failure`);
      }
      const ip = resolveHost(state, host);
      if (!ip) return fail(state, `Resolve-DnsName : ${host} : DNS name does not exist`);
      return ok(state, [
        "Name                    Type   TTL   Address",
        "----                    ----   ---   -------",
        `${pad(host, 24)}A      3600  ${ip}`,
      ]);
    }
    case "clear-dnsclientcache":
      state.dnsCache = {};
      return ok(state, "");
    case "get-localuser": {
      const filter = (paramValue("name") ?? operands[0] ?? "").toLowerCase();
      const rows = state.users.filter((user) => !filter || user.name.toLowerCase() === filter);
      if (rows.length === 0) return fail(state, `Get-LocalUser : User ${filter} was not found.`);
      return ok(state, [
        "Name            Enabled Description",
        "----            ------- -----------",
        ...rows.map((user) => `${pad(user.name, 16)}${pad(user.locked ? "False" : "True", 8)}${user.fullName}`),
      ]);
    }
    case "enable-localuser":
    case "disable-localuser": {
      const target = paramValue("name") ?? operands[0];
      const account = state.users.find((user) => user.name.toLowerCase() === (target ?? "").toLowerCase());
      if (!account) return fail(state, `${name} : User ${target ?? ""} was not found.`);
      if (!isAdmin(state)) return fail(state, `${name} : Access denied. Run PowerShell as administrator.`);
      account.locked = name === "disable-localuser";
      return ok(state, "");
    }
    case "get-computerinfo":
      return ok(state, [
        `CsName                  : ${state.hostname}`,
        `OsName                  : ${state.osName}`,
        `OsTotalVisibleMemorySize: ${state.memoryTotalMb} MB`,
        `OsFreePhysicalMemory    : ${state.memoryTotalMb - state.memoryUsedMb} MB`,
      ]);
    case "get-eventlog":
    case "get-winevent":
      return ok(state, state.eventLog.length > 0 ? state.eventLog.slice(0, 25) : ["No events recorded."]);
    case "get-volume":
      return ok(state, [
        "DriveLetter FileSystem SizeRemaining      Size",
        "----------- ---------- -------------      ----",
        `C           NTFS       ${padStart(`${Math.round(500 * (100 - state.diskUsedPercent) / 100)} GB`, 13)}    500 GB`,
      ]);
    case "start-process": {
      const target = paramValue("filepath") ?? operands[0] ?? "process";
      if (hasParam("verb") && (paramValue("verb") ?? "").toLowerCase() === "runas") {
        state.elevated = true;
        return ok(state, "Elevated session started.");
      }
      state.processes.push({
        pid: state.nextPid++,
        name: target,
        user: state.currentUser,
        cpu: 0.2,
        memoryMb: 42,
      });
      return ok(state, "");
    }
    case "get-help":
      return ok(state, [
        "Supported here: Get-ChildItem Set-Location Get-Content Set-Content Add-Content New-Item Remove-Item",
        "                Copy-Item Move-Item Select-String Get-Process Stop-Process Get-Service Start-Service",
        "                Stop-Service Restart-Service Set-Service Get-NetIPConfiguration Test-Connection",
        "                Test-NetConnection Resolve-DnsName Clear-DnsClientCache Get-LocalUser Enable-LocalUser",
        "                Get-ComputerInfo Get-EventLog Get-Volume Start-Process",
      ]);
    default:
      return fail(
        state,
        `${tokens[0] ?? ""} : The term '${tokens[0] ?? ""}' is not recognized as the name of a cmdlet, function, or operable program.`,
      );
  }
}


/* ------------------------------------------------------------------ */
/* Android (adb shell)                                                 */
/* ------------------------------------------------------------------ */

function setToggle(state: MachineState, name: string, on: boolean): boolean {
  const service = state.services.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!service) return false;
  service.status = on ? "running" : "stopped";
  state.eventLog.unshift(`${new Date().toISOString()} ${service.name}: ${on ? "enabled" : "disabled"}`);
  return true;
}

function toggleState(state: MachineState, name: string): string {
  const service = state.services.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!service) return "unavailable";
  return service.status === "running" ? "on" : "off";
}

const androidHelp = [
  "Supported Android commands (adb shell):",
  "  adb devices                 list attached devices",
  "  getprop [name]              read device properties",
  "  pm list packages            list installed packages",
  "  pm clear <package>          clear an app's data and cache",
  "  am force-stop <package>     stop a running app",
  "  dumpsys battery             battery level, health and drain",
  "  dumpsys wifi | dumpsys sync subsystem status",
  "  svc wifi|data|bluetooth|nfc enable|disable",
  "  settings list | settings get <key> | settings put <key> <value>",
  "  logcat                      recent device log lines",
  "  ping, ip addr, ls, cd, cat, rm, mkdir, df, top, ps also work",
];

function runAndroid(state: MachineState, input: string): ExecResult {
  const tokens = tokenize(input);
  const name = (tokens[0] ?? "").toLowerCase();
  const args = tokens.slice(1);
  const arg = (index: number) => (args[index] ?? "").toLowerCase();

  switch (name) {
    case "help":
      return ok(state, androidHelp);
    case "adb": {
      if (arg(0) === "devices") {
        return ok(state, ["List of devices attached", `${state.hostname}\tdevice`]);
      }
      if (arg(0) === "shell") return ok(state, "Already in an adb shell session.");
      return fail(state, `adb: unknown command '${args[0] ?? ""}'`);
    }
    case "getprop": {
      const props: Record<string, string> = {
        "ro.product.model": state.hostname,
        "ro.build.version.release": "14",
        "ro.serialno": "3A11F0C2K9",
        "gsm.operator.alpha": "Corp Mobile",
        "gsm.network.type": "NR (5G)",
      };
      if (args[0]) return ok(state, props[args[0] as string] ?? "");
      return ok(state, Object.entries(props).map(([key, value]) => `[${key}]: [${value}]`));
    }
    case "pm": {
      if (arg(0) === "list" && arg(1) === "packages") {
        const packages = state.processes
          .filter((process) => process.name.includes("."))
          .map((process) => `package:${process.name}`);
        return ok(state, ["package:com.android.settings", ...packages].join("\n"));
      }
      if (arg(0) === "clear") {
        const pkg = args[1];
        if (!pkg) return fail(state, "Error: no package specified");
        const node = getNode(state, resolvePath(state, `/data/data/${pkg}`));
        if (!node) return fail(state, `Error: package ${pkg} not found`);
        node.children = { cache: { type: "dir", name: "cache", children: {}, owner: state.currentUser, group: state.currentUser, mode: "700" } };
        state.eventLog.unshift(`${new Date().toISOString()} pm clear ${pkg}`);
        return ok(state, "Success");
      }
      return fail(state, "Usage: pm list packages | pm clear <package>");
    }
    case "am": {
      if (arg(0) === "force-stop") {
        const pkg = args[1];
        if (!pkg) return fail(state, "Error: no package specified");
        const error = killProcess(state, pkg);
        return error ? fail(state, `Error: no running process for ${pkg}`) : ok(state, "");
      }
      return fail(state, "Usage: am force-stop <package>");
    }
    case "dumpsys": {
      const subsystem = arg(0);
      if (subsystem === "battery" || subsystem === "") {
        const drain = state.processes.reduce((worst, process) => (process.cpu > worst.cpu ? process : worst), state.processes[0] as ProcessLike);
        return ok(state, [
          "Current Battery Service state:",
          "  level: 41",
          "  health: good",
          "  status: discharging",
          "  temperature: 34.2C",
          `  top consumer: ${drain?.name ?? "unknown"} (${drain?.cpu ?? 0}% cpu)`,
        ]);
      }
      if (subsystem === "wifi") {
        return ok(state, [`Wi-Fi is ${toggleState(state, "wifi")}`, `  SSID: CORP-WIFI`, `  ip: ${state.interfaces.find((i) => i.name === "wlan0")?.ip ?? "none"}`]);
      }
      if (subsystem === "sync") {
        return ok(state, [`Account sync is ${toggleState(state, "sync")}`, "  last successful sync: 4 days ago"]);
      }
      if (subsystem === "bluetooth") return ok(state, `Bluetooth is ${toggleState(state, "bluetooth")}`);
      if (subsystem === "nfc") return ok(state, `NFC is ${toggleState(state, "nfc")}`);
      return fail(state, "Usage: dumpsys battery|wifi|sync|bluetooth|nfc");
    }
    case "svc": {
      const subsystem = arg(0);
      const action = arg(1);
      if (!["wifi", "data", "bluetooth", "nfc", "sync", "location"].includes(subsystem)) {
        return fail(state, "Usage: svc wifi|data|bluetooth|nfc|sync|location enable|disable");
      }
      if (action !== "enable" && action !== "disable") {
        return fail(state, "Usage: svc <subsystem> enable|disable");
      }
      const changed = setToggle(state, subsystem, action === "enable");
      if (!changed) return fail(state, `Unknown subsystem ${subsystem}`);
      return ok(state, "");
    }
    case "settings": {
      if (arg(0) === "list") {
        return ok(state, state.services.map((service) => `${service.name}=${service.status === "running" ? "1" : "0"}`));
      }
      if (arg(0) === "get") {
        const key = args[1];
        if (!key) return fail(state, "Usage: settings get <key>");
        return ok(state, toggleState(state, key) === "on" ? "1" : "0");
      }
      if (arg(0) === "put") {
        const key = args[1];
        const value = args[2];
        if (!key || value === undefined) return fail(state, "Usage: settings put <key> <value>");
        const changed = setToggle(state, key, value !== "0");
        return changed ? ok(state, "") : fail(state, `Unknown setting ${key}`);
      }
      return fail(state, "Usage: settings list|get|put");
    }
    case "logcat":
      return ok(state, state.eventLog.length > 0 ? state.eventLog.slice(0, 15) : ["--------- beginning of main", "I/System: device booted"]);
    default:
      return runBash(state, input);
  }
}

interface ProcessLike {
  name: string;
  cpu: number;
}

/* ------------------------------------------------------------------ */
/* iOS support console                                                 */
/* ------------------------------------------------------------------ */

const iosHelp = [
  "iPhone support console. Apple devices have no shell, so this is a simulated",
  "support tool with the actions a technician really has:",
  "  device info                 model, iOS version, storage, battery health",
  "  battery                     battery level and the top consuming app",
  "  network status              Wi-Fi, cellular and address details",
  "  network reset               clear cached network and DNS state",
  "  wifi|bluetooth|cellular on|off",
  "  sync status | sync on icloud|mail | sync off icloud|mail",
  "  profiles list | profiles remove <name>",
  "  mdm status | mdm lock | mdm wipe",
  "  apps list | app quit <name> | app reinstall <name>",
  "  esim list | storage | logs",
];

function iosProfiles(state: MachineState): VfsNode[] {
  const node = getNode(state, ["profiles"]);
  return Object.values(node?.children ?? {});
}

function runIos(state: MachineState, input: string): ExecResult {
  const tokens = tokenize(input);
  const name = (tokens[0] ?? "").toLowerCase();
  const args = tokens.slice(1);
  const arg = (index: number) => (args[index] ?? "").toLowerCase();

  switch (name) {
    case "help":
      return ok(state, iosHelp);
    case "device": {
      if (arg(0) && arg(0) !== "info") return fail(state, "Usage: device info");
      return ok(state, [
        `Name: ${state.hostname}`,
        `System: ${state.osName}`,
        "Storage: 128 GB (31 GB free)",
        "Battery health: 87%",
        `Supervised: ${toggleState(state, "mdm") === "on" ? "yes (managed)" : "no"}`,
      ]);
    }
    case "battery": {
      const worst = [...state.processes].sort((a, b) => b.cpu - a.cpu)[0];
      return ok(state, [
        "Battery level: 38%",
        "Battery health: 87% (peak performance capability normal)",
        `Highest usage in the last 24 hours: ${worst?.name ?? "unknown"} (${worst?.cpu ?? 0}% activity)`,
        "Low Power Mode: off",
      ]);
    }
    case "network": {
      if (arg(0) === "reset") {
        state.dnsCache = {};
        state.eventLog.unshift(`${new Date().toISOString()} network settings reset`);
        return ok(state, "Network settings reset. Saved Wi-Fi networks and cached lookups cleared.");
      }
      const wifi = state.interfaces.find((iface) => iface.name === "wlan0");
      return ok(state, [
        `Wi-Fi: ${toggleState(state, "wifi")} (SSID CORP-WIFI, ${wifi?.ip ?? "no address"})`,
        `Cellular: ${toggleState(state, "cellular")} (Corp Mobile, 5G)`,
        `Bluetooth: ${toggleState(state, "bluetooth")}`,
        `Cached lookups: ${Object.keys(state.dnsCache).length}`,
      ]);
    }
    case "wifi":
    case "bluetooth":
    case "cellular": {
      if (arg(0) !== "on" && arg(0) !== "off") return fail(state, `Usage: ${name} on|off`);
      setToggle(state, name, arg(0) === "on");
      return ok(state, `${name} ${arg(0)}`);
    }
    case "sync": {
      if (arg(0) === "status" || args.length === 0) {
        return ok(state, [
          `iCloud sync: ${toggleState(state, "icloud")}`,
          `Mail account: ${toggleState(state, "mail")}`,
          "Last successful sync: 4 days ago",
        ]);
      }
      if (arg(0) === "on" || arg(0) === "off") {
        const service = arg(1);
        if (!service) return fail(state, "Usage: sync on|off icloud|mail");
        const changed = setToggle(state, service, arg(0) === "on");
        return changed ? ok(state, `${service} sync ${arg(0)}`) : fail(state, `Unknown service ${service}`);
      }
      return fail(state, "Usage: sync status | sync on|off icloud|mail");
    }
    case "profiles": {
      if (arg(0) === "list" || args.length === 0) {
        const list = iosProfiles(state);
        return ok(state, list.length > 0 ? list.map((node) => `${node.name}`) : "No configuration profiles installed.");
      }
      if (arg(0) === "remove") {
        const target = args[1];
        if (!target) return fail(state, "Usage: profiles remove <name>");
        const error = removePath(state, `/profiles/${target}`, true);
        return error ? fail(state, `Profile ${target} not found.`) : ok(state, `Removed profile ${target}.`);
      }
      return fail(state, "Usage: profiles list | profiles remove <name>");
    }
    case "mdm": {
      if (arg(0) === "status" || args.length === 0) {
        return ok(state, [
          `Enrolment: ${toggleState(state, "mdm") === "on" ? "enrolled and reachable" : "not responding"}`,
          `Find My: ${toggleState(state, "findmy")}`,
          `Profiles installed: ${iosProfiles(state).length}`,
        ]);
      }
      if (arg(0) === "enable") {
        setToggle(state, "mdm", true);
        return ok(state, "Management channel restored.");
      }
      if (arg(0) === "lock") return ok(state, "Lost mode enabled. Device locked with a contact message.");
      if (arg(0) === "wipe") return ok(state, "Remote wipe queued. It runs when the device next checks in.");
      return fail(state, "Usage: mdm status|enable|lock|wipe");
    }
    case "apps": {
      if (arg(0) && arg(0) !== "list") return fail(state, "Usage: apps list");
      return ok(state, state.processes.map((process) => `${process.name} (${process.memoryMb} MB, ${process.cpu}% activity)`));
    }
    case "app": {
      const target = args[1];
      if (arg(0) === "quit") {
        if (!target) return fail(state, "Usage: app quit <name>");
        const error = killProcess(state, target);
        return error ? fail(state, `${target} is not running.`) : ok(state, `${target} closed.`);
      }
      if (arg(0) === "reinstall") {
        if (!target) return fail(state, "Usage: app reinstall <name>");
        killProcess(state, target);
        state.eventLog.unshift(`${new Date().toISOString()} reinstalled ${target}`);
        return ok(state, `${target} removed and reinstalled from the App Store.`);
      }
      return fail(state, "Usage: app quit <name> | app reinstall <name>");
    }
    case "esim": {
      return ok(state, [
        "Line 1: Corp Mobile (eSIM, active)",
        "Line 2: Travel Data EU (eSIM, inactive)",
        "Physical SIM: none installed",
      ]);
    }
    case "storage":
      return ok(state, [`Storage used: ${state.diskUsedPercent}%`, "128 GB total, 31 GB available"]);
    case "logs":
      return ok(state, state.eventLog.length > 0 ? state.eventLog.slice(0, 15) : ["No support events recorded yet."]);
    case "ls":
    case "cat":
    case "cd":
    case "pwd":
    case "clear":
      return runBash(state, input);
    default:
      return fail(state, `Unknown console command: ${name}. Type help for the supported actions.`);
  }
}

/** Read-only check used by scenario goals: does this path exist and contain text? */
export function fileContains(state: MachineState, path: string, needle: string): boolean {
  const node = getNode(state, resolvePath(state, path));
  if (!node || node.type !== "file") return false;
  return (node.content ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function pathExists(state: MachineState, path: string): boolean {
  return getNode(state, resolvePath(state, path)) !== null;
}

export function nodeAt(state: MachineState, path: string): VfsNode | null {
  return getNode(state, resolvePath(state, path));
}

export { canWrite, displayPath };
