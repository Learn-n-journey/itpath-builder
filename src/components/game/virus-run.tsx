/**
 * Virus Run.
 *
 * A small arcade game: you play a virus loose inside a computer. Each level
 * is one system (boot sector, CPU cache, RAM, and so on) rendered as a
 * block-based maze. Collect the data packets, avoid the antivirus daemons,
 * and reach the open port to slip deeper into the machine. Levels are
 * build through a 20-level campaign, then continue in Endless Mode with
 * remixed systems that keep getting harder.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
  Pause,
  Play,
  Package,
  RotateCcw,
  Shield,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLS = 31;
const ROWS = 21;
const PLAYER_SPEED = 5.2; // cells per second
const BASE_GUARD_SPEED = 2.4;
const MAX_GUARD_SPEED = 5.4;
const MAX_INTEGRITY = 3;
const STORAGE_KEY = "itpath:virus-run:v1";

interface StageTheme {
  system: string;
  hint: string;
  bg: string;
  wall: string;
  wallEdge: string;
}

const STAGES: StageTheme[] = [
  { system: "Boot Sector", hint: "The firmware is half awake.", bg: "#0b1220", wall: "#1c2a44", wallEdge: "#2a3c5f" },
  { system: "CPU Cache", hint: "Everything here is hot and fast.", bg: "#0d1117", wall: "#2b2233", wallEdge: "#40304e" },
  { system: "System RAM", hint: "Lost pages drift between banks.", bg: "#08131a", wall: "#123044", wallEdge: "#1c4763" },
  { system: "GPU Memory", hint: "Parallel lanes, parallel guards.", bg: "#120d18", wall: "#33204d", wallEdge: "#4b2f6e" },
  { system: "Storage Drive", hint: "Sectors stack like corridors.", bg: "#101410", wall: "#234a24", wallEdge: "#316332" },
  { system: "Network Stack", hint: "Packets route around you.", bg: "#0a1020", wall: "#1b325c", wallEdge: "#294a85" },
  { system: "Kernel Space", hint: "Root guards patrol every ring.", bg: "#160d0d", wall: "#4d2020", wallEdge: "#702f2f" },
  { system: "Firewall", hint: "The perimeter fights back.", bg: "#1a1005", wall: "#5c3a10", wallEdge: "#835416" },
  { system: "File System", hint: "Directories branch into locked paths.", bg: "#0c1518", wall: "#1d3a40", wallEdge: "#2d5961" },
  { system: "Process Table", hint: "Running processes compete for space.", bg: "#121019", wall: "#332b45", wallEdge: "#4d4166" },
  { system: "System Configuration", hint: "One wrong setting can change the whole machine.", bg: "#15110d", wall: "#49351f", wallEdge: "#684c2d" },
  { system: "DNS Resolver", hint: "Names race toward the right destination.", bg: "#08151b", wall: "#174354", wallEdge: "#216078" },
  { system: "Router Gateway", hint: "Every route leads somewhere else.", bg: "#0b1119", wall: "#26364c", wallEdge: "#374e6d" },
  { system: "Switch Fabric", hint: "Connections change at wire speed.", bg: "#0b1512", wall: "#24443a", wallEdge: "#356455" },
  { system: "Authentication Server", hint: "Identity checks guard every door.", bg: "#160e18", wall: "#4c244f", wallEdge: "#6d3471" },
  { system: "Database", hint: "Structured records hide the path forward.", bg: "#10140d", wall: "#344725", wallEdge: "#4c6636" },
  { system: "Web Server", hint: "Requests pile up from every direction.", bg: "#0c121a", wall: "#253c59", wallEdge: "#36577f" },
  { system: "Cloud Network", hint: "The machine is no longer in one place.", bg: "#0a1418", wall: "#1f4650", wallEdge: "#2d6572" },
  { system: "Security Operations Center", hint: "Every sensor is looking for you.", bg: "#170d10", wall: "#50242d", wallEdge: "#733440" },
  { system: "Core Infrastructure", hint: "Everything you survived converges here.", bg: "#171205", wall: "#574716", wallEdge: "#7d6620" },
];

interface Best {
  bestLevel: number;
  packets: number;
  currentLevel: number;
}

function readBest(): Best {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Best>;
      const bestLevel = Math.max(0, Number(parsed.bestLevel) || 0);
      const currentLevel = Math.max(1, Number(parsed.currentLevel) || bestLevel + 1 || 1);
      return {
        bestLevel,
        packets: Math.max(0, Number(parsed.packets) || 0),
        currentLevel,
      };
    }
  } catch {
    /* ignore */
  }
  return { bestLevel: 0, packets: 0, currentLevel: 1 };
}

function writeBest(best: Best): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
  } catch {
    /* ignore */
  }
}


function virusSound(kind:"packet"|"power"|"alert"|"hit"|"exit"|"boss"){
  if(typeof window==="undefined")return;
  const Ctx=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctx)return;
  const ctx=(virusSound as unknown as {ctx?:AudioContext}).ctx??new Ctx();(virusSound as unknown as {ctx?:AudioContext}).ctx=ctx;if(ctx.state==="suspended")void ctx.resume();
  const now=ctx.currentTime,master=ctx.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(kind==="hit"?0.13:0.075,now+.008);master.gain.exponentialRampToValueAtTime(.0001,now+.35);master.connect(ctx.destination);
  const tone=(f:number,d=.14,type:OscillatorType="sine",delay=0,slide=1)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,now+delay);o.frequency.exponentialRampToValueAtTime(Math.max(35,f*slide),now+delay+d);g.gain.setValueAtTime(.0001,now+delay);g.gain.exponentialRampToValueAtTime(.6,now+delay+.006);g.gain.exponentialRampToValueAtTime(.0001,now+delay+d);o.connect(g);g.connect(master);o.start(now+delay);o.stop(now+delay+d+.02);};
  if(kind==="packet"){tone(620,.09,"triangle",0,1.25);tone(880,.12,"sine",.06,1.08);}
  if(kind==="power"){tone(180,.22,"sawtooth",0,2.4);tone(720,.24,"sine",.08,.9);}
  if(kind==="alert"){tone(220,.08,"square");tone(220,.08,"square",.12);}
  if(kind==="hit"){tone(120,.28,"sawtooth",0,.55);tone(70,.3,"square",.04,.72);}
  if(kind==="exit"){tone(330,.18,"triangle");tone(495,.18,"triangle",.12);tone(740,.28,"sine",.24,1.12);}
  if(kind==="boss"){tone(82,.45,"sawtooth",0,1.4);tone(164,.4,"triangle",.18,.82);}
}

// --- Maze generation -------------------------------------------------------

type Grid = number[][]; // 0 = open, 1 = wall

function generateMaze(): Grid {
  const grid: Grid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(1));
  const stack: [number, number][] = [[1, 1]];
  grid[1]![1] = 0;
  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1]!;
  const dirs: [number, number][] = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = dirs[i]!;
    dirs[i] = dirs[j]!;
    dirs[j] = tmp;
  }
  let carved = false;
  for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && grid[ny]![nx] === 1) {
        grid[cy + dy / 2]![cx + dx / 2] = 0;
        grid[ny]![nx] = 0;
        stack.push([nx, ny]);
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }
  // Punch a few loops so guards can never wall the player in.
  const extra = Math.floor(COLS * ROWS * 0.045);
  for (let i = 0; i < extra; i++) {
    const x = 1 + Math.floor(Math.random() * (COLS - 2));
    const y = 1 + Math.floor(Math.random() * (ROWS - 2));
    if (grid[y]![x] === 1) grid[y]![x] = 0;
  }
  return grid;
}

/** Breadth-first distance field from a cell; -1 for unreachable. */
function distanceField(grid: Grid, sx: number, sy: number): number[][] {
  const dist = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(-1));
  const queue: [number, number][] = [[sx, sy]];
  dist[sy]![sx] = 0;
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++]!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as [number, number][]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && grid[ny]![nx] === 0 && dist[ny]![nx] === -1) {
        dist[ny]![nx] = dist[y]![x]! + 1;
        queue.push([nx, ny]);
      }
    }
  }
  return dist;
}

// --- Entities --------------------------------------------------------------

interface Packet {
  x: number;
  y: number;
  taken: boolean;
}

type GuardKind = "scanner" | "hunter" | "interceptor" | "warden";
type PowerKind = "cloak" | "overclock" | "emp" | "magnet";
interface PowerUp { x:number; y:number; kind:PowerKind; taken:boolean; }

type UpgradeKind = "packet-sniffer" | "cache-boost" | "ghost-protocol" | "emp-amplifier" | "data-magnet" | "kernel-boost";
interface RunUpgrade { kind: UpgradeKind; name: string; detail: string; }
const RUN_UPGRADES: RunUpgrade[] = [
  { kind: "packet-sniffer", name: "Packet Sniffer", detail: "Data packets pulse more visibly through the system." },
  { kind: "cache-boost", name: "Cache Boost", detail: "Overclock lasts 35% longer per stack." },
  { kind: "ghost-protocol", name: "Ghost Protocol", detail: "Cloak lasts 35% longer per stack." },
  { kind: "emp-amplifier", name: "EMP Amplifier", detail: "EMP disables antivirus longer." },
  { kind: "data-magnet", name: "Data Magnet", detail: "Collect packets from farther away." },
  { kind: "kernel-boost", name: "Kernel Boost", detail: "Permanent movement speed increase for this run." },
];

function pickUpgradeChoices(): RunUpgrade[] {
  return [...RUN_UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
}

type GuardState = "patrol" | "suspicious" | "chase" | "search";

interface Guard {
  kind: GuardKind;
  state: GuardState;
  stateTimer: number;
  awareness: number;
  lastKnownX: number;
  lastKnownY: number;
  stunned: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  detection: number;
  fromX: number;
  fromY: number;
}

interface Player {
  x: number;
  y: number;
  tx: number;
  ty: number;
  moving: boolean;
  invuln: number;
}

interface RunState {
  level: number;
  theme: StageTheme;
  grid: Grid;
  packets: Packet[];
  powerUps: PowerUp[];
  activePower: { kind: PowerKind; left: number } | null;
  streak: number;
  streakTimer: number;
  boss: boolean;
  bossPhase: number;
  bossNodes: number;
  bossNodesRequired: number;
  bossTitle: string;
  required: number;
  collected: number;
  port: { x: number; y: number };
  portOpen: boolean;
  player: Player;
  guards: Guard[];
  integrity: number;
  packetsTotal: number;
  systemClock: number;
  hazardPulse: number;
}

function buildLevel(level: number): RunState {
  // Levels 1-20 form the campaign. Beyond 20, Endless Mode remixes all systems.
  const theme = STAGES[(level - 1) % STAGES.length]!;
  const grid = generateMaze();
  const spawn = { x: 1, y: 1 };
  const dist = distanceField(grid, spawn.x, spawn.y);
  // Port at the farthest reachable cell.
  let port = { x: COLS - 2, y: ROWS - 2 };
  let far = -1;
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      const d = dist[y]![x]!;
      if (d > far) {
        far = d;
        port = { x, y };
      }
    }
  }

  const required = Math.min(3 + Math.floor((level - 1) / 2), 10);
  const packets: Packet[] = [];
  const candidates: { x: number; y: number }[] = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (grid[y]![x] === 0 && dist[y]![x]! > 4 && !(x === port.x && y === port.y)) {
        candidates.push({ x, y });
      }
    }
  }
  candidates.sort(() => Math.random() - 0.5);
  for (let i = 0; i < required && i < candidates.length; i++) {
    packets.push({ x: candidates[i]!.x, y: candidates[i]!.y, taken: false });
  }

  // Campaign bosses punctuate each five-level chapter. Endless Mode keeps
  // that five-level boss cadence after the campaign is complete.
  const boss = level % 5 === 0;
  const bossNodesRequired = boss ? (level >= 20 ? 4 : level >= 15 ? 3 : 2) : 0;
  const bossTitle = !boss ? "" : level === 5 ? "STORAGE SENTINEL" : level === 10 ? "PROCESS WARDEN" : level === 15 ? "AUTHENTICATION GUARDIAN" : level === 20 ? "CORE DEFENDER" : "ENDLESS DEFENDER";
  const guardCount = Math.min((boss ? 5 : 2) + Math.floor(level * 0.7), 14);
  const guardSpeed = Math.min(BASE_GUARD_SPEED + (level - 1) * 0.16, MAX_GUARD_SPEED);
  const detection = 6 + Math.min(level, 9);
  const guards: Guard[] = [];
  // Spawn enemies by real maze-path distance. Coordinate distance can put a
  // guard physically close behind a wall or inside the player's first corridor.
  const minSpawnPath = boss ? 18 : 15;
  const openCells = candidates.filter((c) => (dist[c.y]?.[c.x] ?? -1) >= minSpawnPath);
  for (let i = 0; i < guardCount && openCells.length > 0; i++) {
    const cell = openCells.splice(Math.floor(Math.random() * openCells.length), 1)[0]!;
    const kinds: GuardKind[] = boss ? ["hunter","interceptor","warden","scanner"] : ["scanner","hunter","interceptor"];
    const kind = kinds[i % kinds.length]!;
    guards.push({ kind, state:"patrol", stateTimer:0, awareness:0, lastKnownX:cell.x, lastKnownY:cell.y, stunned: 0, x: cell.x, y: cell.y, tx: cell.x, ty: cell.y, speed: guardSpeed * (kind==="interceptor"?1.08:kind==="warden"?.9:1), detection: detection + (kind==="hunter"?5:kind==="warden"?2:0), fromX: cell.x, fromY: cell.y });
  }

  const powerUps: PowerUp[] = [];
  const powerKinds: PowerKind[] = ["cloak","overclock","emp","magnet"];
  const powerCells = candidates.filter(c => Math.abs(c.x-spawn.x)+Math.abs(c.y-spawn.y)>7);
  for(let i=0;i<Math.min(boss?3:2,powerCells.length);i++){const cell=powerCells[(i*17+level*7)%powerCells.length]!;powerUps.push({x:cell.x,y:cell.y,kind:powerKinds[(level+i)%powerKinds.length]!,taken:false});}

  return {
    level,
    theme,
    grid,
    packets,
    powerUps,
    activePower: null,
    streak: 0,
    streakTimer: 0,
    boss,
    bossPhase: boss ? 1 : 0,
    bossNodes: 0,
    bossNodesRequired,
    bossTitle,
    required,
    collected: 0,
    port,
    portOpen: false,
    player: { x: spawn.x, y: spawn.y, tx: spawn.x, ty: spawn.y, moving: false, invuln: 3 },
    guards,
    integrity: MAX_INTEGRITY,
    packetsTotal: packets.length,
    systemClock: 0,
    hazardPulse: 0,
  };
}

// --- Component -------------------------------------------------------------

type Phase = "menu" | "playing" | "paused" | "gameover" | "levelclear" | "upgrade";

export function VirusRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<RunState | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const distFieldRef = useRef<number[][] | null>(null);
  const fieldAgeRef = useRef(0);
  const keysRef = useRef<string[]>([]);
  const queuedDirRef = useRef<string | null>(null);
  const travelDirRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const levelClearTimerRef = useRef(0);
  const lastAlertSoundRef = useRef(0);
  const shakeRef = useRef({ strength: 0, until: 0 });
  const bestRef = useRef<Best>({ bestLevel: 0, packets: 0, currentLevel: 1 });
  const upgradesRef = useRef<Record<UpgradeKind, number>>({
    "packet-sniffer": 0, "cache-boost": 0, "ghost-protocol": 0,
    "emp-amplifier": 0, "data-magnet": 0, "kernel-boost": 0,
  });

  const [phase, setPhase] = useState<Phase>("menu");
  const [upgradeChoices, setUpgradeChoices] = useState<RunUpgrade[]>([]);
  const [upgradeCount, setUpgradeCount] = useState(0);
  const [mobileLandscape, setMobileLandscape] = useState(false);
  const fxRef = useRef<{ x: number; y: number; born: number; kind: "packet" | "hit" | "exit" | "power" | "near" }[]>([]);
  const [hud, setHud] = useState({ level: 1, integrity: MAX_INTEGRITY, collected: 0, required: 3, system: "", hint: "", bestLevel: 0, bestPackets: 0, streak: 0, power: "", boss: false, bossTitle: "", bossPhase: 0, bossNodes: 0, bossNodesRequired: 0 });

  useEffect(() => {
    const syncOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setMobileLandscape(landscape);
      document.documentElement.classList.toggle("virus-run-landscape", landscape);
    };
    syncOrientation();
    window.addEventListener("resize", syncOrientation);
    window.addEventListener("orientationchange", syncOrientation);
    return () => {
      window.removeEventListener("resize", syncOrientation);
      window.removeEventListener("orientationchange", syncOrientation);
      document.documentElement.classList.remove("virus-run-landscape");
    };
  }, []);

  useEffect(() => {
    if (!mobileLandscape) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    window.scrollTo(0, 0);
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [mobileLandscape]);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const syncHud = useCallback((run: RunState) => {
    setHud((h) => ({
      ...h,
      level: run.level,
      integrity: run.integrity,
      collected: run.collected,
      required: run.required,
      system: run.theme.system,
      hint: run.theme.hint,
      bestLevel: bestRef.current.bestLevel,
      bestPackets: bestRef.current.packets,
      streak: run.streak,
      power: run.activePower ? `${run.activePower.kind.toUpperCase()} ${Math.ceil(run.activePower.left)}s` : "",
      boss: run.boss,
      bossTitle: run.bossTitle,
      bossPhase: run.bossPhase,
      bossNodes: run.bossNodes,
      bossNodesRequired: run.bossNodesRequired,
    }));
  }, []);

  const startRun = useCallback(() => {
    bestRef.current = readBest();
    upgradesRef.current = {
      "packet-sniffer": 0, "cache-boost": 0, "ghost-protocol": 0,
      "emp-amplifier": 0, "data-magnet": 0, "kernel-boost": 0,
    };
    setUpgradeCount(0);
    setUpgradeChoices([]);
    runRef.current = buildLevel(bestRef.current.currentLevel);
    distFieldRef.current = null;
    fieldAgeRef.current = 999;
    keysRef.current = [];
    queuedDirRef.current = null;
    travelDirRef.current = null;
    syncHud(runRef.current);
    setPhaseBoth("playing");
    lastRef.current = 0;
  }, [setPhaseBoth, syncHud]);

  const resume = useCallback(() => setPhaseBoth("playing"), [setPhaseBoth]);
  const pause = useCallback(() => setPhaseBoth("paused"), [setPhaseBoth]);

  // Open directly into a playable run. The old menu left the canvas with no
  // maze, packets, guards, or player until Start was pressed.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    startRun();
  }, [startRun]);

  // --- Input ---
  useEffect(() => {
    const DIRS: Record<string, string> = {
      ArrowUp: "up", KeyW: "up",
      ArrowDown: "down", KeyS: "down",
      ArrowLeft: "left", KeyA: "left",
      ArrowRight: "right", KeyD: "right",
    };
    const onDown = (e: KeyboardEvent) => {
      const dir = DIRS[e.code];
      if (dir) {
        e.preventDefault();
        const list = keysRef.current.filter((k) => k !== dir);
        list.push(dir);
        keysRef.current = list;
      } else if (e.code === "Escape" || e.code === "KeyP") {
        if (phaseRef.current === "playing") pause();
        else if (phaseRef.current === "paused") resume();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const dir = DIRS[e.code];
      if (dir) keysRef.current = keysRef.current.filter((k) => k !== dir);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [pause, resume]);

  // Pause when the tab hides.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phaseRef.current === "playing") setPhaseBoth("paused");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [setPhaseBoth]);

  // --- Main loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DIR_VECS: Record<string, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };

    const stepEntity = (
      ex: number, ey: number, tx: number, ty: number, speed: number, dt: number,
    ): { x: number; y: number; arrived: boolean } => {
      const dx = tx - ex;
      const dy = ty - ey;
      const dist = Math.hypot(dx, dy);
      const travel = speed * dt;
      if (dist <= travel) return { x: tx, y: ty, arrived: true };
      return { x: ex + (dx / dist) * travel, y: ey + (dy / dist) * travel, arrived: false };
    };

    const update = (run: RunState, dt: number) => {
      const p = run.player;
      run.systemClock += dt;
      run.hazardPulse = (run.hazardPulse + dt) % 8;

      // Timers, combo decay and temporary abilities.
      if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
      if(run.streakTimer>0){run.streakTimer-=dt;if(run.streakTimer<=0)run.streak=0;}
      if(run.activePower){run.activePower.left-=dt;if(run.activePower.left<=0)run.activePower=null;}
      for(const g of run.guards)if(g.stunned>0)g.stunned=Math.max(0,g.stunned-dt);

      // Refresh the distance field from the player every 0.25s.
      fieldAgeRef.current += dt;
      if (fieldAgeRef.current > 0.25 || !distFieldRef.current) {
        distFieldRef.current = distanceField(run.grid, Math.round(p.x), Math.round(p.y));
        fieldAgeRef.current = 0;
      }
      const field = distFieldRef.current!;

      // Player movement, cell to cell. Turns are buffered and the current
      // travel direction continues through corridors, Pac-Man style.
      if (!p.moving) {
        const cx = Math.round(p.x), cy = Math.round(p.y);
        const requested = queuedDirRef.current ?? keysRef.current[keysRef.current.length - 1] ?? null;
        const canMove = (dir: string | null) => {
          if (!dir) return false;
          const [dx, dy] = DIR_VECS[dir]!;
          return run.grid[cy + dy]?.[cx + dx] === 0;
        };
        let nextDir: string | null = null;
        if (canMove(requested)) nextDir = requested;
        else if (canMove(travelDirRef.current)) nextDir = travelDirRef.current;
        if (nextDir) {
          const [dx, dy] = DIR_VECS[nextDir]!;
          p.x = cx; p.y = cy;
          p.tx = cx + dx; p.ty = cy + dy;
          p.moving = true;
          travelDirRef.current = nextDir;
          if (requested === nextDir) queuedDirRef.current = null;
        } else {
          travelDirRef.current = null;
        }
      }
      if (p.moving) {
        let playerSpeed=PLAYER_SPEED * (1 + upgradesRef.current["kernel-boost"] * 0.08);
        if(run.activePower?.kind==="overclock")playerSpeed*=1.55;
        if(run.theme.system==="CPU Cache")playerSpeed*=1.08;
        if(run.theme.system==="Network Stack" && (Math.round(p.y)%4===0))playerSpeed*=1.22;
        if(run.theme.system==="GPU Memory" && (Math.round(p.x)%5===0))playerSpeed*=1.12;
        if(run.theme.system==="Storage Drive")playerSpeed*=0.94;
        // Each computer system has a distinct traversal rhythm.
        if(run.theme.system==="Boot Sector" && run.hazardPulse<1.5)playerSpeed*=0.82;
        if(run.theme.system==="GPU Memory" && (Math.round(p.y)%3===0))playerSpeed*=1.18;
        if(run.theme.system==="Network Stack" && (Math.round(p.y)%4===0))playerSpeed*=1.12;
        const r = stepEntity(p.x, p.y, p.tx, p.ty, playerSpeed, dt);
        p.x = r.x;
        p.y = r.y;
        if (r.arrived) {
          p.x = p.tx; p.y = p.ty; p.moving = false;
        }
      }

      // Packets.
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      for (const packet of run.packets) {
        const magnetRange = upgradesRef.current["data-magnet"] * 0.7;
        if (!packet.taken && (packet.x === px && packet.y === py || (magnetRange > 0 && Math.hypot(packet.x - p.x, packet.y - p.y) <= magnetRange))) {
          packet.taken = true;
          run.collected += 1;
          run.streak = Math.min(5, run.streak + 1); run.streakTimer = 4.5;
          fxRef.current.push({ x: packet.x, y: packet.y, born: performance.now(), kind: "packet" });virusSound("packet");
          if (run.collected >= run.required) {
            if (!run.boss) run.portOpen = true;
            else run.bossPhase = Math.max(run.bossPhase, 2);
          }
          syncHud(run);
        }
      }

      // Boss breach phase: after collecting the normal packets, the security
      // core exposes breach nodes one at a time. Touch the pulsing core to break
      // each layer; the final breach opens the exit.
      if (run.boss && run.bossPhase >= 2 && !run.portOpen) {
        const coreX = Math.floor(COLS / 2), coreY = Math.floor(ROWS / 2);
        let target = { x: coreX, y: coreY };
        if (run.grid[target.y]?.[target.x] !== 0) {
          let best: {x:number;y:number;d:number}|null=null;
          for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(run.grid[y]?.[x]===0){const d=Math.abs(x-coreX)+Math.abs(y-coreY);if(!best||d<best.d)best={x,y,d};}
          if(best)target={x:best.x,y:best.y};
        }
        if (px === target.x && py === target.y) {
          run.bossNodes += 1;
          run.bossPhase = 3;
          // A breach destabilizes the whole security layer.
          for (let burst = 0; burst < 7 + run.bossNodes * 3; burst++) {
            fxRef.current.push({x:target.x + (Math.random()-.5)*2.4,y:target.y + (Math.random()-.5)*2.4,born:performance.now()-burst*18,kind:run.bossNodes>=run.bossNodesRequired?"exit":"power"});
          }
          p.invuln = Math.max(p.invuln, 1.1);
          for (const g of run.guards) g.stunned = Math.max(g.stunned, 1.4);
          fxRef.current.push({x:target.x,y:target.y,born:performance.now(),kind:"power"});
          shakeRef.current={strength:run.bossNodes>=run.bossNodesRequired?(run.level===20?14:10):6,until:performance.now()+(run.bossNodes>=run.bossNodesRequired?520:240)};
          virusSound("boss");
          if (run.bossNodes >= run.bossNodesRequired) {
            run.portOpen = true;
            run.bossPhase = 4;
          } else {
            // Require a short repositioning window before the next core layer.
            run.bossPhase = 2;
            p.x = 1; p.y = 1; p.tx = 1; p.ty = 1; p.moving = false;
            queuedDirRef.current = null; travelDirRef.current = null;
          }
          syncHud(run);
        }
      }

      // Power-ups.
      for(const power of run.powerUps){
        if(!power.taken && power.x===px && power.y===py){
          power.taken=true;
          const stacks = power.kind === "cloak" ? upgradesRef.current["ghost-protocol"] : power.kind === "overclock" ? upgradesRef.current["cache-boost"] : 0;
          const powerDuration = (power.kind==="emp"?5:8) * (1 + stacks * 0.35);
          run.activePower={kind:power.kind,left:powerDuration};run.streakTimer=5;
          fxRef.current.push({x:power.x,y:power.y,born:performance.now(),kind:"power"});virusSound("power");
          if(power.kind==="emp")for(const g of run.guards)g.stunned=5 + upgradesRef.current["emp-amplifier"] * 2.5;
          if(run.theme.system==="System RAM"){
            const jumps: {x:number;y:number}[]=[];for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(run.grid[y]?.[x]===0&&Math.abs(x-px)+Math.abs(y-py)>12)jumps.push({x,y});
            const jump=jumps[Math.floor(Math.random()*jumps.length)];if(jump){p.x=jump.x;p.y=jump.y;p.tx=jump.x;p.ty=jump.y;p.moving=false;p.invuln=Math.max(p.invuln,.6);}
          }
          syncHud(run);
        }
      }

      // System hazards are intentionally readable and non-lethal on their own.
      // They change the chase without invalidating a generated maze route.
      const pulse = run.hazardPulse;
      if (run.theme.system === "System RAM" && pulse < dt + 0.02 && p.invuln <= 0) {
        // A memory-page fault briefly interrupts movement.
        p.moving = false;
        p.tx = Math.round(p.x); p.ty = Math.round(p.y);
      }
      if (run.theme.system === "Kernel Space" && pulse > 3.7 && pulse < 4.2 && p.invuln <= 0 && run.activePower?.kind !== "cloak") {
        // Kernel scan: short exposure window, communicated by the ring sweep.
        p.invuln = Math.max(p.invuln, 0.18);
        for (const g of run.guards) g.detection += 0.02;
      }
      if (run.theme.system === "Firewall" && pulse > 5.2 && pulse < 6.6 && p.moving) {
        // Firewall sweep slows traversal but never seals a corridor.
        p.x -= (p.x - p.tx) * Math.min(0.018, dt * 0.4);
        p.y -= (p.y - p.ty) * Math.min(0.018, dt * 0.4);
      }
      // Campaign systems 9-20 add readable pressure without blocking routes.
      if (run.theme.system === "File System" && pulse > 2.8 && pulse < 3.8 && p.moving) {
        p.x -= (p.x - p.tx) * Math.min(0.012, dt * 0.28); p.y -= (p.y - p.ty) * Math.min(0.012, dt * 0.28);
      }
      if (run.theme.system === "Process Table" && pulse > 5.8) {
        for (const g of run.guards) g.stunned = Math.max(0, g.stunned - dt * 0.35);
      }
      if (run.theme.system === "System Configuration" && pulse < 1.1 && p.moving) {
        p.invuln = Math.max(p.invuln, 0.08);
      }
      if (run.theme.system === "DNS Resolver" && Math.round(p.y) % 4 === 0) {
        p.invuln = Math.max(p.invuln, 0.05);
      }
      if (run.theme.system === "Router Gateway" && Math.round(p.x) % 6 === 0 && p.moving) {
        p.x += (p.tx - p.x) * Math.min(0.025, dt * 0.55); p.y += (p.ty - p.y) * Math.min(0.025, dt * 0.55);
      }
      if (run.theme.system === "Switch Fabric" && Math.round(p.y) % 3 === 0 && p.moving) {
        p.x += (p.tx - p.x) * Math.min(0.03, dt * 0.65); p.y += (p.ty - p.y) * Math.min(0.03, dt * 0.65);
      }
      if (run.theme.system === "Authentication Server" && pulse > 3.4 && pulse < 4.3 && run.activePower?.kind !== "cloak") {
        for (const g of run.guards) g.detection += 0.015;
      }
      if (run.theme.system === "Database" && Math.round(p.x) % 5 === 0 && p.moving) {
        p.x -= (p.x - p.tx) * Math.min(0.01, dt * 0.22);
      }
      if (run.theme.system === "Web Server" && pulse > 1.5 && pulse < 2.5) {
        for (const g of run.guards) g.detection += 0.01;
      }
      if (run.theme.system === "Cloud Network" && Math.round(p.y) % 5 === 0 && p.moving) {
        p.x += (p.tx - p.x) * Math.min(0.02, dt * 0.45); p.y += (p.ty - p.y) * Math.min(0.02, dt * 0.45);
      }
      if (run.theme.system === "Security Operations Center" && pulse > 4.5 && pulse < 5.4 && run.activePower?.kind !== "cloak") {
        for (const g of run.guards) g.detection += 0.025;
      }
      if (run.theme.system === "Core Infrastructure") {
        if (pulse > 5.2 && pulse < 6.2 && p.moving) { p.x -= (p.x - p.tx) * Math.min(0.012, dt * 0.3); p.y -= (p.y - p.ty) * Math.min(0.012, dt * 0.3); }
        if (pulse > 2.8 && pulse < 3.5) for (const g of run.guards) g.detection += 0.012;
      }

      // Boss-specific encounter rhythms. These remain non-lethal by themselves:
      // they alter movement/detection while the breach objective stays readable.
      if (run.boss) {
        // Every successful core breach escalates the encounter. The multiplier
        // stays bounded so late phases feel urgent without becoming unavoidable.
        const breachEscalation = 1 + Math.min(run.bossNodes, run.bossNodesRequired) * 0.12;
        if (run.level === 5) {
          // Storage Sentinel: a rotating seek cycle alternates slow and fast traversal.
          if (pulse > 1.8 && pulse < 3.0 && p.moving) {
            p.x -= (p.x - p.tx) * Math.min(0.016, dt * 0.36);
            p.y -= (p.y - p.ty) * Math.min(0.016, dt * 0.36);
          }
        } else if (run.level === 10) {
          // Process Warden: scheduler bursts temporarily accelerate active daemons.
          if (pulse > 4.8 - run.bossNodes * .12 && pulse < 6.0) for (const g of run.guards) g.detection += 0.018 * breachEscalation;
        } else if (run.level === 15) {
          // Authentication Guardian: credential scan exposes uncloaked movement.
          if (pulse > 2.6 && pulse < 3.7 && run.activePower?.kind !== "cloak") {
            for (const g of run.guards) g.detection += (p.moving ? 0.03 : 0.012) * breachEscalation;
          }
        } else if (run.level === 20) {
          // Core Defender: cycles seek pressure, detection and a firewall-style drag.
          if (pulse > 1.1 - run.bossNodes * .08 && pulse < 2.0) for (const g of run.guards) g.detection += 0.022 * breachEscalation;
          if (pulse > 4.0 && pulse < 5.0 && p.moving) {
            p.x -= (p.x - p.tx) * Math.min(0.014, dt * 0.32);
            p.y -= (p.y - p.ty) * Math.min(0.014, dt * 0.32);
          }
        }
      }

      // Guards.
      for (const g of run.guards) {
        const gx = Math.round(g.x);
        const gy = Math.round(g.y);
        if(g.stunned>0)continue;
        const toPlayer = field[gy]?.[gx] ?? -1;
        const spawnProtected = p.invuln > 0 && Math.abs(p.x-1)<1.5 && Math.abs(p.y-1)<1.5;
        const openingGrace = run.systemClock < 3 || spawnProtected;
        const hidden = run.activePower?.kind==="cloak" || openingGrace;
        const systemDetection = run.theme.system==="Kernel Space"?2:run.theme.system==="Firewall"?1:0;
        const visible=!hidden&&toPlayer>=0;
        const suspiciousRange=(g.detection+systemDetection)*(g.kind==="scanner"?1.2:g.kind==="warden"?1.05:.88);
        const chaseRange=(g.detection+systemDetection)*(g.kind==="hunter"?1:g.kind==="interceptor"?.9:.78);
        g.stateTimer=Math.max(0,g.stateTimer-dt);
        if(visible&&toPlayer<=suspiciousRange){
          const gain=dt*(g.kind==="scanner"?1.7:g.kind==="hunter"?1.45:g.kind==="interceptor"?1.3:1.15);
          g.awareness=Math.min(1,g.awareness+gain);
          g.lastKnownX=Math.round(p.x);g.lastKnownY=Math.round(p.y);
          if(g.awareness>=1||toPlayer<=chaseRange){g.state="chase";g.stateTimer=g.kind==="hunter"?4.8:3.5;}
          else if(g.state!=="chase")g.state="suspicious";
        }else{
          g.awareness=Math.max(0,g.awareness-dt*(g.kind==="warden"?.22:.34));
          if(g.state==="chase"&&g.stateTimer<=0){g.state="search";g.stateTimer=g.kind==="hunter"?4.5:3.2;}
          else if(g.state==="suspicious"&&g.awareness<=.05){g.state="patrol";}
          else if(g.state==="search"&&g.stateTimer<=0){g.state="patrol";g.awareness=0;}
        }
        if (g.x === g.tx && g.y === g.ty) {
          const options: [number, number][] = [];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (run.grid[ny]?.[nx] === 0 && !(nx === g.fromX && ny === g.fromY)) {
              options.push([nx, ny]);
            }
          }
          if (options.length === 0) options.push([g.fromX, g.fromY]);
          let chosen: [number, number];
          if (g.state==="chase" && !hidden) {
            if(g.kind==="interceptor" && p.moving){
              options.sort((a,b)=>Math.abs(a[0]-p.tx)+Math.abs(a[1]-p.ty)-Math.abs(b[0]-p.tx)-Math.abs(b[1]-p.ty));
            } else options.sort((a,b)=>(field[a[1]]?.[a[0]]??999)-(field[b[1]]?.[b[0]]??999));
            chosen=options[0]!;
          } else if(g.state==="search"||g.state==="suspicious"){
            options.sort((a,b)=>Math.abs(a[0]-g.lastKnownX)+Math.abs(a[1]-g.lastKnownY)-Math.abs(b[0]-g.lastKnownX)-Math.abs(b[1]-g.lastKnownY));
            chosen=(Math.random()<(g.state==="search"?.78:.9)?options[0]:options[Math.floor(Math.random()*options.length)])!;
          } else {
            // Wardens favor territory near packets/exit; other types roam.
            if(g.kind==="warden"){options.sort((a,b)=>Math.min(...run.packets.filter(q=>!q.taken).map(q=>Math.abs(a[0]-q.x)+Math.abs(a[1]-q.y)),Math.abs(a[0]-run.port.x)+Math.abs(a[1]-run.port.y))-Math.min(...run.packets.filter(q=>!q.taken).map(q=>Math.abs(b[0]-q.x)+Math.abs(b[1]-q.y)),Math.abs(b[0]-run.port.x)+Math.abs(b[1]-run.port.y)));chosen=options[0]!;}
            else chosen=options[Math.floor(Math.random()*options.length)]!;
          }
          g.fromX = gx;
          g.fromY = gy;
          g.tx = chosen[0];
          g.ty = chosen[1];
        }
        let systemGuardSpeed = 1;
        if (run.theme.system === "CPU Cache") systemGuardSpeed = 1.08;
        if (run.theme.system === "Storage Drive") systemGuardSpeed = 0.9;
        if (run.theme.system === "Firewall" && pulse > 5.2 && pulse < 6.6) systemGuardSpeed = 1.12;
        if (run.theme.system === "Process Table" && pulse > 5.8) systemGuardSpeed = 1.1;
        if (run.theme.system === "Web Server" && pulse > 1.5 && pulse < 2.5) systemGuardSpeed = 1.08;
        if (run.theme.system === "Security Operations Center") systemGuardSpeed = 1.06;
        if (run.theme.system === "Core Infrastructure" && pulse > 2.8 && pulse < 3.5) systemGuardSpeed = 1.1;
        if (run.boss && run.level === 10 && pulse > 4.8 - run.bossNodes * .12 && pulse < 6.0) systemGuardSpeed *= 1.18 + run.bossNodes * .04;
        if (run.boss && run.level === 15 && pulse > 2.6 && pulse < 3.7) systemGuardSpeed *= 1.08 + run.bossNodes * .035;
        if (run.boss && run.level === 20 && pulse > 1.1 - run.bossNodes * .08 && pulse < 2.0) systemGuardSpeed *= 1.15 + run.bossNodes * .04;
        // During the opening grace period guards patrol, but do not accelerate
        // into the spawn pocket. This prevents repeated unavoidable spawn deaths.
        if (openingGrace && toPlayer >= 0 && toPlayer < 10) systemGuardSpeed *= 0.55;
        const r = stepEntity(g.x, g.y, g.tx, g.ty, g.speed * systemGuardSpeed * (g.kind==="hunter"&&!openingGrace&&toPlayer>=0&&toPlayer<=g.detection?1.12:1), dt);
        g.x = r.x;
        g.y = r.y;

        // Near misses reward risky escapes and trigger a warning burst.
        const nearDist=Math.hypot(g.x-p.x,g.y-p.y);
        if(!hidden && toPlayer>=0 && toPlayer<=2 && performance.now()-lastAlertSoundRef.current>900){virusSound("alert");lastAlertSoundRef.current=performance.now();}
        if(p.invuln<=0 && nearDist<1.05 && nearDist>=0.55 && Math.random()<dt*1.4){
          run.streak=Math.min(5,run.streak+1);run.streakTimer=3.5;
          fxRef.current.push({x:p.x,y:p.y,born:performance.now(),kind:"near"});
        }
        // Contact.
        if (p.invuln <= 0 && Math.abs(g.x - p.x) < 0.55 && Math.abs(g.y - p.y) < 0.55) {
          run.integrity -= 1;
          fxRef.current.push({ x: p.x, y: p.y, born: performance.now(), kind: "hit" });shakeRef.current={strength:7,until:performance.now()+260};virusSound("hit");
          p.x = 1;
          p.y = 1;
          p.tx = 1;
          p.ty = 1;
          p.moving = false;
          p.invuln = 3;
          // Respawn protection mirrors the opening grace period so a guard
          // cannot camp the spawn and chain multiple lives.
          for(const other of run.guards)if(Math.hypot(other.x-1,other.y-1)<9){other.stunned=Math.max(other.stunned,1.25);other.state="search";other.stateTimer=2;other.awareness=0;}
          keysRef.current = [];
          queuedDirRef.current = null;
          travelDirRef.current = null;
          syncHud(run);
          if (run.integrity <= 0) {
            // Game over: record bests honestly from this run.
            const best = readBest();
            const next: Best = {
              bestLevel: Math.max(best.bestLevel, run.level - 1),
              packets: best.packets + run.collected,
              currentLevel: 1,
            };
            writeBest(next);
            bestRef.current = next;
            setPhaseBoth("gameover");
            syncHud(run);
            return;
          }
        }
      }

      // Port.
      if (run.portOpen && px === run.port.x && py === run.port.y) {
        fxRef.current.push({ x: run.port.x, y: run.port.y, born: performance.now(), kind: "exit" });virusSound(run.boss?"boss":"exit");
        // Level cleared: fully restore integrity before the next system.
        run.integrity = MAX_INTEGRITY;
        const best = readBest();
        const next: Best = {
          bestLevel: Math.max(best.bestLevel, run.level),
          packets: best.packets + run.collected,
          currentLevel: run.level + 1,
        };
        writeBest(next);
        bestRef.current = next;
        syncHud(run);
        if (run.level % 3 === 0) {
          setUpgradeChoices(pickUpgradeChoices());
          setPhaseBoth("upgrade");
        } else {
          levelClearTimerRef.current = 1.4;
          setPhaseBoth("levelclear");
        }
        return;
      }
    };

    const draw = (run: RunState, time: number) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvasEl.width !== Math.round(rect.width * dpr)) {
        canvasEl.width = Math.round(rect.width * dpr);
        canvasEl.height = Math.round(rect.height * dpr);
      }
      const ctx2 = canvasEl.getContext("2d");
      if (!ctx2) return;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shakeLeft=Math.max(0,shakeRef.current.until-time);
      if(shakeLeft>0){const power=shakeRef.current.strength*(shakeLeft/Math.max(1,shakeRef.current.until-(time-16)));ctx2.translate(Math.sin(time*.19)*power,Math.cos(time*.23)*power*.7);}

      const cell = Math.min(rect.width / COLS, rect.height / ROWS);
      const offX = (rect.width - cell * COLS) / 2;
      const offY = (rect.height - cell * ROWS) / 2;
      const t = run.theme;

      ctx2.fillStyle = t.bg;
      ctx2.fillRect(0, 0, rect.width, rect.height);

      // Layered system substrate: faint traces and moving data current.
      const fieldGradient = ctx2.createRadialGradient(rect.width * 0.5, rect.height * 0.45, 0, rect.width * 0.5, rect.height * 0.45, rect.width * 0.7);
      fieldGradient.addColorStop(0, "rgba(45,212,191,0.08)");
      fieldGradient.addColorStop(0.55, "rgba(20,184,166,0.025)");
      fieldGradient.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx2.fillStyle = fieldGradient;
      ctx2.fillRect(0, 0, rect.width, rect.height);
      ctx2.strokeStyle = "rgba(148,163,184,0.045)";
      ctx2.lineWidth = 1;
      for (let x = offX; x <= offX + cell * COLS; x += cell) {
        ctx2.beginPath();
        ctx2.moveTo(x, offY);
        ctx2.lineTo(x, offY + cell * ROWS);
        ctx2.stroke();
      }
      for (let y = offY; y <= offY + cell * ROWS; y += cell) {
        ctx2.beginPath();
        ctx2.moveTo(offX, y);
        ctx2.lineTo(offX + cell * COLS, y);
        ctx2.stroke();
      }

      // Moving circuit current and system-specific board accents.
      ctx2.save();
      for (let lane = 0; lane < 6; lane++) {
        const y = offY + cell * (1.5 + lane * 2.6);
        const travel = ((time / (18 + lane * 3)) % (cell * COLS + cell * 4)) - cell * 2;
        ctx2.strokeStyle = lane % 2 === 0 ? "rgba(56,189,248,0.12)" : "rgba(45,212,191,0.10)";
        ctx2.lineWidth = Math.max(0.6, cell * 0.035);
        ctx2.beginPath();
        ctx2.moveTo(offX, y);
        ctx2.lineTo(offX + cell * COLS, y);
        ctx2.stroke();
        ctx2.fillStyle = lane % 2 === 0 ? "rgba(125,211,252,0.75)" : "rgba(94,234,212,0.7)";
        ctx2.shadowColor = ctx2.fillStyle;
        ctx2.shadowBlur = cell * 0.5;
        ctx2.fillRect(offX + travel, y - cell * 0.045, cell * 0.65, cell * 0.09);
      }
      ctx2.restore();

      if (run.theme.system === "CPU Cache" || run.theme.system === "System RAM" || run.theme.system === "GPU Memory") {
        ctx2.save();
        ctx2.globalAlpha = 0.12;
        ctx2.strokeStyle = run.theme.wallEdge;
        ctx2.lineWidth = Math.max(1, cell * 0.06);
        for (let bank = 0; bank < 4; bank++) {
          const bx = offX + cell * (3 + bank * 5.4);
          ctx2.strokeRect(bx, offY + cell * 1.2, cell * 2.5, cell * 0.75);
        }
        ctx2.restore();
      }

      // Stage-specific system activity gives every part of the computer its own visual language.
      ctx2.save();
      const sys = run.theme.system;
      if (sys === "Boot Sector") {
        for (let i = 0; i < 7; i++) {
          const bx = offX + cell * (2 + i * 4.35);
          const blink = 0.16 + 0.12 * Math.sin(time / 280 + i);
          ctx2.fillStyle = `rgba(250,204,21,${blink})`;
          ctx2.fillRect(bx, offY + cell * 1.15, cell * 1.7, cell * 0.16);
          ctx2.fillStyle = `rgba(125,211,252,${blink * 0.75})`;
          ctx2.fillRect(bx, offY + cell * (ROWS - 1.35), cell * 1.05, cell * 0.1);
        }
      } else if (sys === "CPU Cache") {
        for (let lane = 0; lane < 5; lane++) {
          const y = offY + cell * (2.2 + lane * 4);
          const x = offX + ((time / (8 + lane)) % (cell * COLS));
          ctx2.shadowColor = "#c084fc"; ctx2.shadowBlur = cell * 0.65;
          ctx2.fillStyle = "rgba(216,180,254,0.7)";
          ctx2.fillRect(x, y, cell * 1.25, Math.max(1, cell * 0.1));
        }
      } else if (sys === "System RAM") {
        for (let bank = 0; bank < 6; bank++) {
          const bx = offX + cell * (1.5 + bank * 5);
          const pulse = 0.08 + 0.08 * (1 + Math.sin(time / 330 + bank)) / 2;
          ctx2.fillStyle = `rgba(34,211,238,${pulse})`;
          ctx2.fillRect(bx, offY + cell * 0.9, cell * 3.2, cell * (ROWS - 1.8));
          for (let chip = 0; chip < 5; chip++) {
            ctx2.fillStyle = `rgba(103,232,249,${pulse * 1.8})`;
            ctx2.fillRect(bx + cell * 0.3, offY + cell * (2.3 + chip * 3.4), cell * 0.45, cell * 0.22);
          }
        }
      } else if (sys === "GPU Memory") {
        for (let lane = 0; lane < 9; lane++) {
          const y = offY + cell * (1.6 + lane * 2.15);
          const phase = ((time / 14 + lane * cell * 3.2) % (cell * (COLS + 4))) - cell * 2;
          ctx2.strokeStyle = "rgba(192,132,252,0.1)";
          ctx2.beginPath(); ctx2.moveTo(offX, y); ctx2.lineTo(offX + cell * COLS, y); ctx2.stroke();
          ctx2.fillStyle = "rgba(232,121,249,0.62)";
          ctx2.fillRect(offX + phase, y - cell * 0.04, cell * 0.75, cell * 0.08);
        }
      } else if (sys === "Storage Drive") {
        for (let track = 0; track < 5; track++) {
          const cx = offX + cell * (4 + track * 5.7), cy = offY + cell * (ROWS / 2);
          ctx2.strokeStyle = "rgba(74,222,128,0.13)";
          ctx2.lineWidth = Math.max(1, cell * 0.055);
          ctx2.beginPath(); ctx2.arc(cx, cy, cell * (1.2 + 0.16 * Math.sin(time / 400 + track)), 0, Math.PI * 2); ctx2.stroke();
          const a = time / 700 + track;
          ctx2.fillStyle = "rgba(134,239,172,0.55)";
          ctx2.fillRect(cx + Math.cos(a) * cell, cy + Math.sin(a) * cell, cell * 0.16, cell * 0.16);
        }
      } else if (sys === "Network Stack") {
        for (let i = 0; i < 13; i++) {
          const y = offY + cell * (1.2 + (i * 1.47) % (ROWS - 2));
          const x = offX + ((time / (11 + (i % 4) * 2) + i * cell * 2.3) % (cell * COLS));
          ctx2.fillStyle = i % 3 === 0 ? "rgba(94,234,212,0.72)" : "rgba(96,165,250,0.58)";
          ctx2.shadowColor = ctx2.fillStyle; ctx2.shadowBlur = cell * 0.45;
          roundRect(ctx2, x, y, cell * 0.48, cell * 0.24, cell * 0.07); ctx2.fill();
        }
      } else if (sys === "Kernel Space") {
        const cx = offX + cell * COLS / 2, cy = offY + cell * ROWS / 2;
        for (let ring = 0; ring < 4; ring++) {
          ctx2.strokeStyle = `rgba(248,113,113,${0.12 - ring * 0.018})`;
          ctx2.lineWidth = Math.max(1, cell * 0.07);
          ctx2.beginPath();
          ctx2.arc(cx, cy, cell * (2.2 + ring * 2.1 + 0.18 * Math.sin(time / 360 + ring)), 0, Math.PI * 2);
          ctx2.stroke();
        }
      } else if (sys === "Firewall") {
        for (let beam = 0; beam < 5; beam++) {
          const y = offY + cell * (2.4 + beam * 4);
          const pulse = 0.13 + 0.11 * (1 + Math.sin(time / 180 + beam * 1.3)) / 2;
          ctx2.strokeStyle = `rgba(251,146,60,${pulse})`;
          ctx2.lineWidth = Math.max(1, cell * 0.09);
          ctx2.setLineDash([cell * 0.7, cell * 0.45]);
          ctx2.lineDashOffset = -time / 35 - beam * cell;
          ctx2.beginPath(); ctx2.moveTo(offX, y); ctx2.lineTo(offX + cell * COLS, y); ctx2.stroke();
        }
        ctx2.setLineDash([]);
 else if (sys === "File System") {
        for(let i=0;i<7;i++){const x=offX+cell*(2+i*4.3),y=offY+cell*(2+(i%3)*6);ctx2.strokeStyle="rgba(94,234,212,.2)";ctx2.strokeRect(x,y,cell*2.2,cell*1.15);ctx2.fillStyle="rgba(94,234,212,.35)";ctx2.fillRect(x+cell*.25,y+cell*.3,cell*(.6+.35*Math.sin(time/330+i)),cell*.12);}
      } else if (sys === "Process Table") {
        for(let i=0;i<10;i++){const y=offY+cell*(1.5+i*1.85),w=cell*(2.5+2*(1+Math.sin(time/260+i))/2);ctx2.fillStyle=`rgba(192,132,252,${.08+(i%3)*.035})`;ctx2.fillRect(offX+cell*(2+(i%4)*6.5),y,w,cell*.35);}
      } else if (sys === "System Configuration") {
        for(let i=0;i<6;i++){const y=offY+cell*(2+i*3.1),x=offX+cell*(4+(i%2)*13);ctx2.strokeStyle="rgba(251,191,36,.2)";ctx2.beginPath();ctx2.moveTo(x,y);ctx2.lineTo(x+cell*8,y);ctx2.stroke();const knob=x+cell*(1+6*(1+Math.sin(time/500+i))/2);ctx2.fillStyle="rgba(253,230,138,.65)";ctx2.beginPath();ctx2.arc(knob,y,cell*.2,0,Math.PI*2);ctx2.fill();}
      } else if (sys === "DNS Resolver") {
        for(let i=0;i<12;i++){const a=time/700+i*.9,r=cell*(2+(i%4)*1.6),cx=offX+cell*COLS/2,cy=offY+cell*ROWS/2;ctx2.fillStyle="rgba(34,211,238,.45)";ctx2.beginPath();ctx2.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,cell*.12,0,Math.PI*2);ctx2.fill();}
      } else if (sys === "Router Gateway") {
        for(let i=0;i<6;i++){const x=offX+cell*(3+i*5),y=offY+cell*(3+(i%3)*6);ctx2.strokeStyle="rgba(96,165,250,.24)";ctx2.beginPath();ctx2.arc(x,y,cell*.45,0,Math.PI*2);ctx2.stroke();ctx2.beginPath();ctx2.moveTo(x,y);ctx2.lineTo(offX+cell*COLS/2,offY+cell*ROWS/2);ctx2.stroke();}
      } else if (sys === "Switch Fabric") {
        for(let i=0;i<8;i++){const y=offY+cell*(2+i*2.3),travel=((time/(10+i%3*2)+i*cell*3)%(cell*COLS));ctx2.fillStyle="rgba(74,222,128,.5)";ctx2.fillRect(offX+travel,y,cell*.55,cell*.1);}
      } else if (sys === "Authentication Server") {
        const scan=(time/18)%(cell*COLS);ctx2.fillStyle="rgba(232,121,249,.12)";ctx2.fillRect(offX+scan-cell*.4,offY,cell*.8,cell*ROWS);for(let i=0;i<5;i++){ctx2.strokeStyle="rgba(244,114,182,.2)";ctx2.strokeRect(offX+cell*(3+i*6),offY+cell*(4+(i%2)*9),cell*1.6,cell*1.2);}
      } else if (sys === "Database") {
        for(let r=0;r<7;r++){const y=offY+cell*(2+r*2.6);ctx2.fillStyle=`rgba(163,230,53,${.05+(r%2)*.035})`;ctx2.fillRect(offX+cell*2,y,cell*(COLS-4),cell*.7);for(let k=0;k<5;k++){ctx2.fillStyle="rgba(190,242,100,.22)";ctx2.fillRect(offX+cell*(3+k*5.2),y+cell*.18,cell*2.5,cell*.12);}}
      } else if (sys === "Web Server") {
        for(let i=0;i<14;i++){const y=offY+cell*(1+(i*1.37)%(ROWS-2)),x=offX+((time/(9+i%4*2)+i*cell*2)%(cell*COLS));ctx2.fillStyle=i%2?"rgba(96,165,250,.5)":"rgba(125,211,252,.42)";ctx2.fillRect(x,y,cell*.5,cell*.16);}
      } else if (sys === "Cloud Network") {
        for(let i=0;i<7;i++){const x=offX+cell*(3+(i%4)*8),y=offY+cell*(3+Math.floor(i/4)*11);ctx2.strokeStyle="rgba(103,232,249,.2)";ctx2.beginPath();ctx2.arc(x,y,cell*(.7+.08*Math.sin(time/350+i)),0,Math.PI*2);ctx2.stroke();ctx2.beginPath();ctx2.moveTo(x,y);ctx2.lineTo(offX+cell*COLS/2,offY+cell*ROWS/2);ctx2.stroke();}
      } else if (sys === "Security Operations Center") {
        const cx=offX+cell*COLS/2,cy=offY+cell*ROWS/2;for(let i=0;i<4;i++){const a=time/(420+i*80)+i;ctx2.strokeStyle=`rgba(251,113,133,${.12+i*.025})`;ctx2.beginPath();ctx2.moveTo(cx,cy);ctx2.lineTo(cx+Math.cos(a)*cell*15,cy+Math.sin(a)*cell*15);ctx2.stroke();}
      } else if (sys === "Core Infrastructure") {
        const cx=offX+cell*COLS/2,cy=offY+cell*ROWS/2;for(let i=0;i<5;i++){ctx2.strokeStyle=`rgba(250,204,21,${.08+i*.025})`;ctx2.beginPath();ctx2.arc(cx,cy,cell*(2+i*1.6+.12*Math.sin(time/250+i)),0,Math.PI*2);ctx2.stroke();}for(let i=0;i<8;i++){const a=time/500+i*Math.PI/4;ctx2.fillStyle="rgba(125,211,252,.45)";ctx2.fillRect(cx+Math.cos(a)*cell*(3+i*.5),cy+Math.sin(a)*cell*(3+i*.5),cell*.16,cell*.16);}
      }
      ctx2.restore();

      // Gameplay telegraphs: the visuals below correspond to the active system mechanic.
      ctx2.save();
      const hazardPhase = run.hazardPulse;
      if (sys === "Boot Sector" && hazardPhase < 1.5) {
        ctx2.fillStyle = "rgba(250,204,21,0.055)";
        ctx2.fillRect(offX, offY, cell * COLS, cell * ROWS);
        ctx2.fillStyle = "rgba(253,224,71,0.8)";
        ctx2.font = `bold ${Math.max(8,cell*.28)}px ui-monospace`;
        ctx2.textAlign = "left"; ctx2.fillText("BOOT SYNC", offX + cell, offY + cell * 1.1);
      } else if (sys === "System RAM" && hazardPhase < 0.7) {
        ctx2.fillStyle = "rgba(34,211,238,0.07)";
        for(let x=1;x<COLS-1;x+=4)ctx2.fillRect(offX+x*cell,offY,cell*.8,cell*ROWS);
      } else if (sys === "GPU Memory") {
        for(let y=3;y<ROWS-1;y+=3){ctx2.fillStyle="rgba(232,121,249,0.055)";ctx2.fillRect(offX,offY+y*cell,cell*COLS,cell);}
      } else if (sys === "Storage Drive") {
        const seekX = offX + (((time/55)%(COLS-2))+1)*cell;
        ctx2.fillStyle="rgba(74,222,128,0.12)";ctx2.fillRect(seekX,offY,cell*.35,cell*ROWS);
      } else if (sys === "Network Stack") {
        for(let y=4;y<ROWS-1;y+=4){ctx2.fillStyle="rgba(94,234,212,0.06)";ctx2.fillRect(offX,offY+y*cell,cell*COLS,cell);}
      } else if (sys === "Kernel Space") {
        const scan = Math.max(0,1-Math.abs(hazardPhase-3.95)/.45);
        if(scan>0){ctx2.strokeStyle=`rgba(248,113,113,${.18+scan*.4})`;ctx2.lineWidth=Math.max(2,cell*.1);const rr=cell*(2+scan*11);ctx2.beginPath();ctx2.arc(offX+cell*COLS/2,offY+cell*ROWS/2,rr,0,Math.PI*2);ctx2.stroke();}
      } else if (sys === "Firewall" && hazardPhase > 5.2 && hazardPhase < 6.6) {
        const sweep=(hazardPhase-5.2)/1.4;const x=offX+sweep*cell*COLS;
        const fg=ctx2.createLinearGradient(x-cell*2,0,x+cell*2,0);fg.addColorStop(0,"rgba(251,146,60,0)");fg.addColorStop(.5,"rgba(251,146,60,.2)");fg.addColorStop(1,"rgba(251,146,60,0)");ctx2.fillStyle=fg;ctx2.fillRect(offX,offY,cell*COLS,cell*ROWS);
 else if (sys === "File System" && hazardPhase > 2.8 && hazardPhase < 3.8) {
        ctx2.fillStyle="rgba(94,234,212,.055)";for(let x=2;x<COLS-2;x+=5)ctx2.fillRect(offX+x*cell,offY,cell,cell*ROWS);
      } else if (sys === "Process Table" && hazardPhase > 5.8) {
        ctx2.fillStyle="rgba(192,132,252,.055)";ctx2.fillRect(offX,offY,cell*COLS,cell*ROWS);
      } else if (sys === "System Configuration" && hazardPhase < 1.1) {
        ctx2.fillStyle="rgba(251,191,36,.06)";ctx2.fillRect(offX,offY,cell*COLS,cell*ROWS);
      } else if (sys === "DNS Resolver") {
        for(let y=4;y<ROWS-1;y+=4){ctx2.fillStyle="rgba(34,211,238,.045)";ctx2.fillRect(offX,offY+y*cell,cell*COLS,cell);}
      } else if (sys === "Router Gateway") {
        for(let x=6;x<COLS-1;x+=6){ctx2.fillStyle="rgba(96,165,250,.045)";ctx2.fillRect(offX+x*cell,offY,cell,cell*ROWS);}
      } else if (sys === "Switch Fabric") {
        for(let y=3;y<ROWS-1;y+=3){ctx2.fillStyle="rgba(74,222,128,.045)";ctx2.fillRect(offX,offY+y*cell,cell*COLS,cell);}
      } else if (sys === "Authentication Server" && hazardPhase > 3.4 && hazardPhase < 4.3) {
        const x=offX+((hazardPhase-3.4)/.9)*cell*COLS;ctx2.fillStyle="rgba(232,121,249,.13)";ctx2.fillRect(x-cell*.6,offY,cell*1.2,cell*ROWS);
      } else if (sys === "Database") {
        for(let x=5;x<COLS-1;x+=5){ctx2.fillStyle="rgba(163,230,53,.035)";ctx2.fillRect(offX+x*cell,offY,cell,cell*ROWS);}
      } else if (sys === "Web Server" && hazardPhase > 1.5 && hazardPhase < 2.5) {
        ctx2.fillStyle="rgba(96,165,250,.055)";ctx2.fillRect(offX,offY,cell*COLS,cell*ROWS);
      } else if (sys === "Cloud Network") {
        for(let y=5;y<ROWS-1;y+=5){ctx2.fillStyle="rgba(103,232,249,.04)";ctx2.fillRect(offX,offY+y*cell,cell*COLS,cell);}
      } else if (sys === "Security Operations Center" && hazardPhase > 4.5 && hazardPhase < 5.4) {
        const scan=Math.max(0,1-Math.abs(hazardPhase-4.95)/.45);ctx2.strokeStyle=`rgba(251,113,133,${.2+scan*.35})`;ctx2.lineWidth=Math.max(2,cell*.1);ctx2.beginPath();ctx2.arc(offX+cell*COLS/2,offY+cell*ROWS/2,cell*(2+scan*12),0,Math.PI*2);ctx2.stroke();
      } else if (sys === "Core Infrastructure") {
        if(hazardPhase>2.8&&hazardPhase<3.5){ctx2.fillStyle="rgba(250,204,21,.055)";ctx2.fillRect(offX,offY,cell*COLS,cell*ROWS);}
        if(hazardPhase>5.2&&hazardPhase<6.2){const x=offX+((hazardPhase-5.2))*cell*COLS;ctx2.fillStyle="rgba(251,146,60,.11)";ctx2.fillRect(x-cell,offY,cell*2,cell*ROWS);}
      }
      ctx2.restore();

      // High-quality ambient pass: depth vignette, scanlines, drifting motes and
      // system-colored energy. Kept behind gameplay entities so readability wins.
      ctx2.save();
      const ambientTime = time / 1000;
      for (let i = 0; i < 26; i++) {
        const seed = i * 19.37;
        const mx = offX + (((seed * 13 + ambientTime * (8 + i % 5)) % COLS) * cell);
        const my = offY + (((seed * 7 + Math.sin(ambientTime * .7 + i) * 2 + ROWS) % ROWS) * cell);
        const ma = .025 + .035 * (1 + Math.sin(ambientTime * 1.4 + i)) / 2;
        ctx2.fillStyle = `rgba(148,223,255,${ma})`;
        ctx2.beginPath(); ctx2.arc(mx, my, Math.max(.6, cell * .045), 0, Math.PI * 2); ctx2.fill();
      }
      const sweepY = offY + ((time / 38) % (cell * ROWS));
      const scanGradient = ctx2.createLinearGradient(0, sweepY - cell * 1.4, 0, sweepY + cell * 1.4);
      scanGradient.addColorStop(0, "rgba(255,255,255,0)");
      scanGradient.addColorStop(.5, "rgba(186,230,253,.035)");
      scanGradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx2.fillStyle = scanGradient; ctx2.fillRect(offX, offY, cell * COLS, cell * ROWS);
      const vignette = ctx2.createRadialGradient(rect.width/2, rect.height/2, Math.min(rect.width,rect.height)*.18, rect.width/2, rect.height/2, Math.max(rect.width,rect.height)*.68);
      vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(.72,"rgba(0,0,0,.06)");vignette.addColorStop(1,"rgba(0,0,0,.34)");
      ctx2.fillStyle=vignette;ctx2.fillRect(0,0,rect.width,rect.height);
      ctx2.restore();

      // Walls as dimensional security architecture with illuminated traces.
      const pad = cell * 0.08;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (run.grid[y]![x] === 1) {
            const bx = offX + x * cell + pad;
            const by = offY + y * cell + pad;
            const block = ctx2.createLinearGradient(bx, by, bx, by + cell);
            block.addColorStop(0, t.wallEdge);
            block.addColorStop(0.18, t.wall);
            block.addColorStop(1, t.bg);
            ctx2.fillStyle = block;
            roundRect(ctx2, offX + x * cell + pad, offY + y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.18);
            ctx2.fill();
            ctx2.strokeStyle = t.wallEdge;
            ctx2.lineWidth = 1;
            ctx2.shadowColor = t.wallEdge;
            ctx2.shadowBlur = cell * 0.18;
            ctx2.stroke();
            ctx2.shadowBlur = 0;
            ctx2.fillStyle = "rgba(255,255,255,0.025)";
            roundRect(ctx2, offX + x * cell + pad * 1.7, offY + y * cell + pad * 1.7, cell - pad * 3.4, Math.max(1, cell * 0.08), cell * 0.04);
            ctx2.fill();
            if ((x + y) % 3 === 0) {
              ctx2.strokeStyle = "rgba(45,212,191,0.16)";
              ctx2.lineWidth = Math.max(0.6, cell * 0.035);
              ctx2.beginPath();
              ctx2.moveTo(bx + cell * 0.22, by + cell * 0.62);
              ctx2.lineTo(bx + cell * 0.48, by + cell * 0.62);
              ctx2.lineTo(bx + cell * 0.63, by + cell * 0.78);
              ctx2.stroke();
            }
          }
        }
      }

      // Port.
      const pulse = 0.6 + 0.4 * Math.sin(time / 220);
      ctx2.save();
      ctx2.globalAlpha = run.portOpen ? pulse : 0.28;
      ctx2.shadowColor = "rgba(45,212,191,0.85)";
      ctx2.shadowBlur = run.portOpen ? cell * 1.2 : 0;
      const portGradient = ctx2.createRadialGradient(offX + (run.port.x + 0.5) * cell, offY + (run.port.y + 0.5) * cell, 0, offX + (run.port.x + 0.5) * cell, offY + (run.port.y + 0.5) * cell, cell * 0.65);
      portGradient.addColorStop(0, "#ccfbf1");
      portGradient.addColorStop(0.35, "#2dd4bf");
      portGradient.addColorStop(1, "rgba(13,148,136,0.2)");
      ctx2.fillStyle = portGradient;
      roundRect(ctx2, offX + run.port.x * cell + pad, offY + run.port.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.3);
      ctx2.fill();
      ctx2.restore();
      ctx2.fillStyle = run.portOpen ? "#04211d" : "rgba(4,33,29,0.55)";
      ctx2.font = `bold ${cell * 0.5}px ui-monospace, monospace`;
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.fillText(">", offX + (run.port.x + 0.5) * cell, offY + (run.port.y + 0.55) * cell);
      if (run.portOpen) {
        const portalX = offX + (run.port.x + 0.5) * cell;
        const portalY = offY + (run.port.y + 0.5) * cell;
        ctx2.save();
        ctx2.strokeStyle = "rgba(94,234,212,0.78)";
        ctx2.lineWidth = Math.max(1, cell * 0.07);
        for (let ring = 0; ring < 3; ring++) {
          ctx2.beginPath();
          ctx2.arc(portalX, portalY, cell * (0.48 + ring * 0.13), time / (380 + ring * 110), time / (380 + ring * 110) + Math.PI * 1.3);
          ctx2.stroke();
        }
        ctx2.fillStyle = "#99f6e4";
        ctx2.font = `bold ${Math.max(7, cell * 0.24)}px ui-monospace, monospace`;
        ctx2.fillText("EXIT", portalX, portalY - cell * 0.75);
        ctx2.restore();
      }

      // Data packets: faceted luminous cores with orbital rings.
      for (const packet of run.packets) {
        if (packet.taken) continue;
        ctx2.save();
        const packetX=offX+(packet.x+.5)*cell,packetY=offY+(packet.y+.5)*cell;
        const playerX=offX+(run.player.x+.5)*cell,playerY=offY+(run.player.y+.5)*cell;
        const packetDist=Math.hypot(packet.x-run.player.x,packet.y-run.player.y);
        if(packetDist<3.2){
          const pull=Math.max(0,1-packetDist/3.2);
          ctx2.strokeStyle=`rgba(125,211,252,${.08+pull*.28})`;ctx2.lineWidth=Math.max(1,cell*.035);
          ctx2.setLineDash([cell*.12,cell*.18]);ctx2.lineDashOffset=-time/55;
          ctx2.beginPath();ctx2.moveTo(packetX,packetY);ctx2.quadraticCurveTo((packetX+playerX)/2+Math.sin(time/140+packet.x)*cell*.35,(packetY+playerY)/2+Math.cos(time/150+packet.y)*cell*.35,playerX,playerY);ctx2.stroke();ctx2.setLineDash([]);
        }
        ctx2.translate(packetX,packetY);
        const attractPulse=packetDist<2.2?1+.1*Math.sin(time/75):1;ctx2.scale(attractPulse,attractPulse);
        ctx2.rotate(time / 850 + packet.x);
        const sniffStacks = upgradesRef.current["packet-sniffer"];
        if (sniffStacks > 0) {
          const sniffPulse = 0.22 + 0.12 * Math.sin(time / 180 + packet.x);
          ctx2.strokeStyle = "rgba(125,211,252," + sniffPulse + ")";
          ctx2.lineWidth = Math.max(1, cell * 0.05);
          ctx2.beginPath();
          ctx2.arc(0, 0, cell * (0.75 + sniffStacks * 0.18), 0, Math.PI * 2);
          ctx2.stroke();
        }
        const s = cell * 0.28;
        ctx2.shadowColor = "#7dd3fc";
        ctx2.shadowBlur = cell * 0.85;
        const collectibleFill = ctx2.createLinearGradient(-s, -s, s, s);
        collectibleFill.addColorStop(0, "#f0f9ff");
        collectibleFill.addColorStop(0.45, "#38bdf8");
        collectibleFill.addColorStop(1, "#0e7490");
        ctx2.fillStyle = collectibleFill;
        ctx2.beginPath();
        ctx2.moveTo(0, -s); ctx2.lineTo(s, 0); ctx2.lineTo(0, s); ctx2.lineTo(-s, 0); ctx2.closePath(); ctx2.fill();
        ctx2.strokeStyle = "#bae6fd";
        ctx2.lineWidth = Math.max(0.8, cell * 0.045);
        ctx2.beginPath();
        ctx2.moveTo(0, -s); ctx2.lineTo(0, s);
        ctx2.moveTo(-s, 0); ctx2.lineTo(0, s * 0.42); ctx2.lineTo(s, 0);
        ctx2.stroke();
        ctx2.shadowBlur = 0;
        ctx2.strokeStyle = "rgba(125,211,252,0.72)";
        ctx2.lineWidth = Math.max(1, cell * 0.07);
        ctx2.beginPath(); ctx2.arc(0, 0, s * 1.65, 0.25, Math.PI * 1.55); ctx2.stroke();
        ctx2.restore();
      }

      // Power-ups.
      for(const power of run.powerUps){if(power.taken)continue;const x=offX+(power.x+.5)*cell,y=offY+(power.y+.5)*cell;ctx2.save();ctx2.translate(x,y);ctx2.rotate(time/700);ctx2.shadowColor="#facc15";ctx2.shadowBlur=cell*.9;ctx2.strokeStyle="#fde68a";ctx2.lineWidth=Math.max(1,cell*.08);ctx2.beginPath();ctx2.arc(0,0,cell*.32,0,Math.PI*2);ctx2.stroke();ctx2.fillStyle="#facc15";ctx2.font=`bold ${cell*.34}px ui-monospace`;ctx2.textAlign="center";ctx2.textBaseline="middle";ctx2.rotate(-time/700);ctx2.fillText(power.kind==="cloak"?"C":power.kind==="overclock"?"O":power.kind==="emp"?"E":"M",0,0);ctx2.restore();}

      // Boss encounter telegraphs. Every pressure window is announced visually
      // before or while its matching mechanic is active.
      if(run.boss){
        ctx2.save();
        if(run.level===5){
          const angle=time/620;const cx=offX+cell*COLS/2,cy=offY+cell*ROWS/2;
          ctx2.strokeStyle="rgba(134,239,172,.34)";ctx2.lineWidth=Math.max(2,cell*.09);ctx2.beginPath();ctx2.moveTo(cx,cy);ctx2.lineTo(cx+Math.cos(angle)*cell*18,cy+Math.sin(angle)*cell*18);ctx2.stroke();
          ctx2.fillStyle="rgba(134,239,172,.75)";ctx2.font=`bold ${Math.max(8,cell*.25)}px ui-monospace`;ctx2.textAlign="left";ctx2.fillText("SEEK SWEEP",offX+cell,offY+cell*1.2);
        }else if(run.level===10){
          const active=hazardPhase>4.8&&hazardPhase<6;ctx2.fillStyle=active?"rgba(192,132,252,.10)":"rgba(192,132,252,.035)";for(let y=2;y<ROWS-1;y+=3)ctx2.fillRect(offX,offY+y*cell,cell*COLS,cell*.55);
          if(active){ctx2.fillStyle="rgba(216,180,254,.85)";ctx2.font=`bold ${Math.max(8,cell*.25)}px ui-monospace`;ctx2.textAlign="left";ctx2.fillText("SCHEDULER BURST",offX+cell,offY+cell*1.2);}
        }else if(run.level===15){
          const active=hazardPhase>2.6&&hazardPhase<3.7;const x=offX+(((time/22)%(cell*COLS)));ctx2.fillStyle=active?"rgba(244,114,182,.16)":"rgba(244,114,182,.05)";ctx2.fillRect(x-cell,offY,cell*2,cell*ROWS);
          if(active){ctx2.fillStyle="rgba(251,207,232,.9)";ctx2.font=`bold ${Math.max(8,cell*.25)}px ui-monospace`;ctx2.textAlign="left";ctx2.fillText("IDENTITY SCAN",offX+cell,offY+cell*1.2);}
        }else if(run.level===20){
          const activeA=hazardPhase>1.1&&hazardPhase<2,activeB=hazardPhase>4&&hazardPhase<5;
          if(activeA){const rr=cell*(3+(hazardPhase-1.1)*10);ctx2.strokeStyle="rgba(251,113,133,.5)";ctx2.lineWidth=Math.max(2,cell*.11);ctx2.beginPath();ctx2.arc(offX+cell*COLS/2,offY+cell*ROWS/2,rr,0,Math.PI*2);ctx2.stroke();}
          if(activeB){const x=offX+((hazardPhase-4))*cell*COLS;ctx2.fillStyle="rgba(251,146,60,.15)";ctx2.fillRect(x-cell,offY,cell*2,cell*ROWS);}
          ctx2.fillStyle="rgba(254,240,138,.88)";ctx2.font=`bold ${Math.max(8,cell*.25)}px ui-monospace`;ctx2.textAlign="left";ctx2.fillText(activeA?"CORE SCAN":activeB?"LOCKDOWN SWEEP":"CORE DEFENDER",offX+cell,offY+cell*1.2);
        }
        ctx2.restore();
      }

      // Boss security core: sealed during packet collection, then visibly
      // vulnerable during the breach phase.
      if(run.boss){
        const coreCell=(()=>{const cx=Math.floor(COLS/2),cy=Math.floor(ROWS/2);if(run.grid[cy]?.[cx]===0)return{x:cx,y:cy};let best:{x:number;y:number;d:number}|null=null;for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(run.grid[y]?.[x]===0){const d=Math.abs(x-cx)+Math.abs(y-cy);if(!best||d<best.d)best={x,y,d};}return best??{x:cx,y:cy};})();
        const bx=offX+(coreCell.x+.5)*cell,by=offY+(coreCell.y+.5)*cell;ctx2.save();
        const vulnerable=run.bossPhase>=2&&!run.portOpen;
        ctx2.globalAlpha=vulnerable?.72+.2*Math.sin(time/105):.24+.08*Math.sin(time/160);
        ctx2.strokeStyle=vulnerable?"#fef08a":"#fb7185";ctx2.shadowColor=vulnerable?"#facc15":"#ef4444";ctx2.shadowBlur=cell*(vulnerable?2:1.4);ctx2.lineWidth=Math.max(2,cell*.12);
        const damageRatio=run.bossNodes/Math.max(1,run.bossNodesRequired);
        for(let i=0;i<3;i++){
          const broken=i<Math.floor(damageRatio*3);
          ctx2.setLineDash(broken?[cell*.18,cell*.22]:[]);
          ctx2.lineDashOffset=-time/(55+i*15);
          ctx2.beginPath();ctx2.arc(bx,by,cell*(.65+i*.28),time/(260+i*70),time/(260+i*70)+Math.PI*(broken?.72:1.45));ctx2.stroke();
        }
        ctx2.setLineDash([]);
        if(run.bossNodes>0){
          for(let spark=0;spark<4+run.bossNodes*2;spark++){const a=time/(90+spark*9)+spark*2.1,r=cell*(.45+(spark%3)*.28);ctx2.strokeStyle=`rgba(254,240,138,${.25+.12*Math.sin(time/80+spark)})`;ctx2.beginPath();ctx2.moveTo(bx+Math.cos(a)*r*.35,by+Math.sin(a)*r*.35);ctx2.lineTo(bx+Math.cos(a)*r,by+Math.sin(a)*r);ctx2.stroke();}
        }
        ctx2.fillStyle=vulnerable?"rgba(254,240,138,.75)":"rgba(251,113,133,.3)";ctx2.beginPath();ctx2.arc(bx,by,cell*(.25+.05*Math.sin(time/(120-Math.min(60,run.bossNodes*12)))),0,Math.PI*2);ctx2.fill();
        ctx2.fillStyle=vulnerable?"#fef9c3":"#fecdd3";ctx2.font=`bold ${Math.max(8,cell*.24)}px ui-monospace`;ctx2.textAlign="center";ctx2.fillText(vulnerable?`BREACH ${run.bossNodes+1}/${run.bossNodesRequired}`:"CORE SEALED",bx,by-cell*1.25);
        ctx2.restore();
      }

      // Antivirus sentinels: shield-like drones with scanning lenses.
      // Reuse the distance field maintained by the update loop. Previously this
      // renderer referenced update()'s local "field" variable, which throws
      // after packets are drawn and prevents guards and the player from rendering.
      const renderField =
        distFieldRef.current ??
        distanceField(run.grid, Math.round(run.player.x), Math.round(run.player.y));
      for (const g of run.guards) {
        const cx = offX + (g.x + 0.5) * cell;
        const cy = offY + (g.y + 0.5) * cell;
        ctx2.save();
        const aim = Math.atan2(run.player.y - g.y, run.player.x - g.x);
        const distanceToRunner = renderField[Math.round(g.y)]?.[Math.round(g.x)] ?? -1;
        const alerted = g.stunned<=0 && g.state==="chase";
        const suspicious = g.stunned<=0 && g.state==="suspicious";
        const searching = g.stunned<=0 && g.state==="search";
        ctx2.translate(cx, cy);
        if(g.stunned>0)ctx2.globalAlpha=.35+.2*Math.sin(time/80);
        if(alerted && g.stunned<=0){const alarm=.72+.28*Math.sin(time/55);ctx2.strokeStyle=`rgba(254,202,202,${alarm})`;ctx2.lineWidth=Math.max(1.5,cell*.08);ctx2.beginPath();ctx2.arc(0,0,cell*(.58+.12*Math.sin(time/70)),0,Math.PI*2);ctx2.stroke();ctx2.fillStyle="rgba(254,226,226,.95)";ctx2.font=`bold ${Math.max(8,cell*.3)}px ui-monospace`;ctx2.textAlign="center";ctx2.fillText("!",0,-cell*.72);}
        else if(suspicious){ctx2.strokeStyle="rgba(253,224,71,.72)";ctx2.lineWidth=Math.max(1,cell*.065);ctx2.beginPath();ctx2.arc(0,0,cell*(.52+.08*g.awareness),0,Math.PI*2);ctx2.stroke();ctx2.fillStyle="rgba(254,249,195,.95)";ctx2.font=`bold ${Math.max(8,cell*.25)}px ui-monospace`;ctx2.textAlign="center";ctx2.fillText("?",0,-cell*.68);}
        else if(searching){ctx2.strokeStyle="rgba(251,146,60,.52)";ctx2.setLineDash([cell*.1,cell*.1]);ctx2.lineDashOffset=-time/90;ctx2.beginPath();ctx2.arc(0,0,cell*.58,0,Math.PI*2);ctx2.stroke();ctx2.setLineDash([]);}
        ctx2.rotate(aim);
        const coneLength = cell * (alerted ? 3.4 : suspicious ? 2.8 : searching ? 2.55 : 2.25);
        const coneWidth = cell * (alerted ? 1.35 : suspicious ? 1.05 : 0.9);
        const cone = ctx2.createLinearGradient(0, 0, coneLength, 0);
        cone.addColorStop(0, alerted ? "rgba(248,113,113,0.32)" : "rgba(248,113,113,0.16)");
        cone.addColorStop(1, "rgba(248,113,113,0)");
        ctx2.fillStyle = cone;
        ctx2.beginPath();
        ctx2.moveTo(cell * 0.2, 0);
        ctx2.lineTo(coneLength, -coneWidth);
        ctx2.lineTo(coneLength, coneWidth);
        ctx2.closePath();
        ctx2.fill();
        ctx2.rotate(Math.PI / 2);
        const s = cell * 0.82;
        ctx2.shadowColor = "rgba(248,113,113,0.75)";
        ctx2.shadowBlur = cell * 0.72;
        const guardGradient = ctx2.createLinearGradient(0, -s / 2, 0, s / 2);
        guardGradient.addColorStop(0, "#fecaca"); guardGradient.addColorStop(0.22, "#ef4444"); guardGradient.addColorStop(1, "#7f1d1d");
        ctx2.fillStyle = guardGradient;
        ctx2.beginPath();
        ctx2.moveTo(0, -s * 0.52); ctx2.lineTo(s * 0.42, -s * 0.22); ctx2.lineTo(s * 0.34, s * 0.3); ctx2.lineTo(0, s * 0.54); ctx2.lineTo(-s * 0.34, s * 0.3); ctx2.lineTo(-s * 0.42, -s * 0.22); ctx2.closePath(); ctx2.fill();
        ctx2.shadowBlur = 0;
        ctx2.fillStyle = "#2a0b0b"; ctx2.beginPath(); ctx2.arc(0, -s * 0.06, s * 0.16, 0, Math.PI * 2); ctx2.fill();
        ctx2.fillStyle = "#fee2e2"; ctx2.beginPath(); ctx2.arc(0, -s * 0.08, s * 0.065, 0, Math.PI * 2); ctx2.fill();
        ctx2.strokeStyle = "rgba(254,202,202,0.65)"; ctx2.lineWidth = Math.max(0.8, cell * 0.045); ctx2.beginPath(); ctx2.arc(0, 0, s * 0.68, time / 500, time / 500 + Math.PI * 1.15); ctx2.stroke();
        ctx2.restore();
      }

      // Runner trail: dissolving data fragments imply motion through the system.
      const trailX = offX + (run.player.x + 0.5) * cell;
      const trailY = offY + (run.player.y + 0.5) * cell;
      ctx2.save();
      for (let i = 0; i < 5; i++) {
        const angle = time / 420 + i * 1.7;
        const distance = cell * (0.55 + i * 0.24);
        const size = Math.max(1.5, cell * (0.11 - i * 0.012));
        ctx2.globalAlpha = 0.32 - i * 0.045;
        ctx2.fillStyle = i % 2 === 0 ? "#5eead4" : "#38bdf8";
        ctx2.fillRect(trailX - Math.cos(angle) * distance - size / 2, trailY - Math.sin(angle) * distance - size / 2, size, size);
      }
      ctx2.restore();

      // Player: layered bio-digital organism with nucleus, membrane and orbit.
      const pcx = offX + (run.player.x + 0.5) * cell;
      const pcy = offY + (run.player.y + 0.5) * cell;
      const moving=run.player.moving;
      const dx=run.player.tx-run.player.x,dy=run.player.ty-run.player.y;
      const travelAngle=moving?Math.atan2(dy,dx):0;
      const wobble = 1 + 0.055 * Math.sin(time / 105);
      ctx2.save();
      if (run.player.invuln > 0) ctx2.globalAlpha = 0.45 + 0.4 * Math.sin(time / 60);
      ctx2.translate(pcx,pcy);ctx2.rotate(travelAngle);ctx2.scale(moving?1.12:1,moving?.9:1);ctx2.translate(-pcx,-pcy);
      const r = cell * 0.42 * wobble;
      ctx2.shadowColor = "rgba(45,212,191,0.95)";
      ctx2.shadowBlur = cell * 1.15;
      const organism = ctx2.createRadialGradient(pcx - r * 0.28, pcy - r * 0.3, r * 0.08, pcx, pcy, r);
      organism.addColorStop(0, "#f0fdfa"); organism.addColorStop(0.24, "#5eead4"); organism.addColorStop(0.7, "#14b8a6"); organism.addColorStop(1, "#115e59");
      ctx2.fillStyle = organism;
      ctx2.beginPath(); ctx2.arc(pcx, pcy, r, 0, Math.PI * 2); ctx2.fill();
      ctx2.shadowBlur = 0;
      ctx2.strokeStyle = "rgba(153,246,228,0.9)";
      ctx2.lineWidth = Math.max(1, cell * 0.075);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + time / 900;
        ctx2.beginPath();
        ctx2.moveTo(pcx + Math.cos(a) * r, pcy + Math.sin(a) * r);
        ctx2.quadraticCurveTo(pcx + Math.cos(a + 0.12) * r * 1.3, pcy + Math.sin(a + 0.12) * r * 1.3, pcx + Math.cos(a) * r * 1.52, pcy + Math.sin(a) * r * 1.52);
        ctx2.stroke();
      }
      ctx2.strokeStyle = "rgba(94,234,212,0.62)"; ctx2.lineWidth = Math.max(0.8, cell * 0.045); ctx2.beginPath(); ctx2.ellipse(pcx, pcy, r * 1.48, r * 0.72, time / 650, 0, Math.PI * 2); ctx2.stroke();
      ctx2.fillStyle = "rgba(4,47,46,0.88)"; ctx2.beginPath(); ctx2.arc(pcx, pcy, r * 0.34, 0, Math.PI * 2); ctx2.fill();
      ctx2.fillStyle = "#ccfbf1"; ctx2.beginPath(); ctx2.arc(pcx - r * 0.11, pcy - r * 0.12, r * 0.1, 0, Math.PI * 2); ctx2.fill();
      ctx2.restore();
      if(run.player.invuln>0){
        ctx2.save();const shieldPulse=.72+.18*Math.sin(time/85);ctx2.strokeStyle=`rgba(103,232,249,${shieldPulse})`;ctx2.lineWidth=Math.max(1.5,cell*.09);ctx2.shadowColor="#22d3ee";ctx2.shadowBlur=cell*.7;ctx2.beginPath();ctx2.arc(pcx,pcy,cell*(.68+.05*Math.sin(time/100)),0,Math.PI*2);ctx2.stroke();ctx2.shadowBlur=0;
        ctx2.fillStyle="rgba(207,250,254,.95)";ctx2.font=`bold ${Math.max(8,cell*.25)}px ui-monospace`;ctx2.textAlign="center";ctx2.fillText(`SAFE ${Math.max(1,Math.ceil(run.player.invuln))}`,pcx,pcy-cell*.9);ctx2.restore();
      }

      // Event effects: packet bursts, antivirus damage shockwaves and exit surges.
      fxRef.current = fxRef.current.filter((fx) => time - fx.born < (fx.kind === "exit" ? 1200 : 850));
      for (const fx of fxRef.current) {
        const age = Math.max(0, time - fx.born);
        const life = fx.kind === "exit" ? 1200 : 850;
        const q = Math.min(1, age / life);
        const fxX = offX + (fx.x + 0.5) * cell;
        const fxY = offY + (fx.y + 0.5) * cell;
        const rgb = fx.kind === "hit" ? "248,113,113" : fx.kind === "exit" ? "94,234,212" : fx.kind === "power" ? "250,204,21" : fx.kind === "near" ? "251,146,60" : "125,211,252";
        ctx2.save();
        ctx2.globalAlpha = 1 - q;
        ctx2.strokeStyle = `rgba(${rgb},${0.9 * (1 - q)})`;
        ctx2.lineWidth = Math.max(1, cell * (0.12 - q * 0.07));
        for (let ring = 0; ring < (fx.kind === "exit" ? 4 : 2); ring++) {
          ctx2.beginPath();
          ctx2.arc(fxX, fxY, cell * (0.25 + q * (1.4 + ring * 0.42)), 0, Math.PI * 2);
          ctx2.stroke();
        }
        const particles = fx.kind === "exit" ? 22 : fx.kind === "hit" ? 16 : 12;
        for (let i = 0; i < particles; i++) {
          const a = (i / particles) * Math.PI * 2 + (fx.born % 97) * 0.03;
          const d = cell * q * (0.7 + (i % 5) * 0.22);
          const s = Math.max(1, cell * (0.11 - q * 0.055));
          ctx2.fillStyle = `rgba(${rgb},${0.95 * (1 - q)})`;
          ctx2.fillRect(fxX + Math.cos(a) * d - s / 2, fxY + Math.sin(a) * d - s / 2, s, s);
        }
        ctx2.restore();
      }

      // A soft moving light sweep makes the larger maze feel alive without obscuring paths.
      ctx2.save();
      const sweepX = offX + ((time / 32) % (cell * (COLS + 8))) - cell * 4;
      const sweep = ctx2.createLinearGradient(sweepX - cell * 2, 0, sweepX + cell * 2, 0);
      sweep.addColorStop(0, "rgba(56,189,248,0)");
      sweep.addColorStop(0.5, "rgba(56,189,248,0.045)");
      sweep.addColorStop(1, "rgba(56,189,248,0)");
      ctx2.fillStyle = sweep;
      ctx2.fillRect(offX, offY, cell * COLS, cell * ROWS);
      ctx2.restore();

      // Dynamic danger vignette intensifies when antivirus closes in.
      let nearest=99;for(const g of run.guards)if(g.stunned<=0)nearest=Math.min(nearest,Math.hypot(g.x-run.player.x,g.y-run.player.y));
      if(nearest<3.2){const danger=Math.max(0,1-nearest/3.2);ctx2.save();const dg=ctx2.createRadialGradient(rect.width/2,rect.height/2,rect.width*.22,rect.width/2,rect.height/2,rect.width*.72);dg.addColorStop(0,"rgba(127,29,29,0)");dg.addColorStop(1,`rgba(239,68,68,${danger*.2*(.75+.25*Math.sin(time/90))})`);ctx2.fillStyle=dg;ctx2.fillRect(0,0,rect.width,rect.height);ctx2.restore();}

      // Restrained edge vignette keeps the field focused without retro scanlines.
      ctx2.strokeStyle = "rgba(255,255,255,0.08)";
      ctx2.lineWidth = 1;
      ctx2.strokeRect(offX + 0.5, offY + 0.5, cell * COLS - 1, cell * ROWS - 1);
    };

    const frame = (time: number) => {
      rafRef.current = requestAnimationFrame(frame);
      const run = runRef.current;
      if (!run) return;
      const last = lastRef.current || time;
      const dt = Math.min((time - last) / 1000, 0.05);
      lastRef.current = time;

      if (phaseRef.current === "playing") update(run, dt);
      if (phaseRef.current === "levelclear") {
        levelClearTimerRef.current -= dt;
        if (levelClearTimerRef.current <= 0) {
          runRef.current = buildLevel(run.level + 1);
          if(runRef.current.boss)virusSound("boss");
          distFieldRef.current = null;
          fieldAgeRef.current = 999;
          keysRef.current = [];
          syncHud(runRef.current);
          setPhaseBoth("playing");
        }
      }
      draw(run, time);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [setPhaseBoth, syncHud]);

  const chooseUpgrade = useCallback((upgrade: RunUpgrade) => {
    upgradesRef.current[upgrade.kind] += 1;
    setUpgradeCount((value) => value + 1);
    const current = runRef.current;
    if (!current) return;
    runRef.current = buildLevel(current.level + 1);
    if (runRef.current.boss) virusSound("boss");
    distFieldRef.current = null;
    fieldAgeRef.current = 999;
    keysRef.current = [];
    syncHud(runRef.current);
    setPhaseBoth("playing");
    lastRef.current = 0;
  }, [setPhaseBoth, syncHud]);

  // Mobile steering uses a single buffered direction. Keeping the last direction
  // active lets players make clean maze turns without continuously holding a tiny target.
  const pressDir = (dir: string) => {
    // Keep a requested turn queued until the next legal intersection.
    queuedDirRef.current = dir;
    keysRef.current = [dir];
  };
  const releaseDir = (dir: string) => {
    keysRef.current = keysRef.current.filter((k) => k !== dir);
  };
  const releaseAllDirs = () => {
    keysRef.current = [];
  };

  // Drag-to-steer on the play area: touch and drag, and the virus follows
  // the direction of your finger relative to where you first touched down.
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const steerFromDrag = (dx: number, dy: number) => {
    // A generous swipe threshold prevents accidental turns while still allowing
    // short flicks. Once selected, the direction remains buffered until changed.
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    const axisBias = 1.06;
    const horizontal = Math.abs(dx) > Math.abs(dy) * axisBias;
    const vertical = Math.abs(dy) > Math.abs(dx) * axisBias;
    const dir = horizontal ? (dx > 0 ? "right" : "left") : vertical ? (dy > 0 ? "down" : "up") : Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    queuedDirRef.current = dir;
    keysRef.current = [dir];
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== "touch") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    steerFromDrag(e.clientX - drag.x, e.clientY - drag.y);
  };
  const onCanvasPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current && e.pointerId === dragRef.current.id) {
      dragRef.current = null;
      // Keep the last swipe direction buffered. The maze movement code naturally
      // stops at walls and takes the turn when that direction becomes available.
    }
  };

  const run = runRef.current;
  const overlay =
    phase === "menu" ? (
      <Overlay>
        <VirusCoreGraphic />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Containment protocol</p>
        <h3 className="font-display text-3xl font-bold uppercase">Virus Run</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          You are the virus. Collect every data packet on the system, stay away from the antivirus daemons,
          then reach the open port to slip deeper. Breach 20 systems to clear the campaign, then keep
          pushing through remixed systems in Endless Mode.
        </p>
        <div className="flex flex-col items-center gap-1 font-mono text-xs text-muted-foreground">
          <span>20-system campaign · major encounters at 5, 10, 15 and 20 · Endless Mode after level 20</span>
          <span>Arrow keys or WASD to move, Esc to pause.</span>
          <span>On touch screens, drag on the play area, use the arrow pad, or tilt the stick in its middle.</span>
        </div>
        <Button onClick={startRun} className="mt-3 min-w-48">
          <Play className="size-4" aria-hidden /> Start the infection
        </Button>
        {hud.bestLevel > 0 && (
          <p className="font-mono text-xs text-muted-foreground">
            Deepest breach: system {hud.bestLevel} · {hud.bestPackets} packets harvested
          </p>
        )}
      </Overlay>
    ) : phase === "paused" ? (
      <Overlay>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">System held</p>
        <h3 className="font-display text-2xl font-bold">Paused</h3>
        <div className="mt-2 flex gap-3">
          <Button onClick={resume}>
            <Play className="size-4" aria-hidden /> Resume
          </Button>
          <Button onClick={startRun} variant="outline">
            <RotateCcw className="size-4" aria-hidden /> Restart
          </Button>
        </div>
      </Overlay>
    ) : phase === "levelclear" ? (
      <Overlay>
        <ShieldCheck className="size-10 text-primary" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Access granted</p>
        <h3 className="font-display text-3xl font-bold uppercase tracking-wide text-primary">System breached</h3>
        <div className="h-px w-40 bg-gradient-to-r from-transparent via-primary to-transparent" aria-hidden />
        <p className="text-sm text-muted-foreground">{hud.boss ? (hud.level === 20 ? "CORE DEFENDER destroyed · campaign breached · Endless Mode unlocked." : hud.bossTitle + " defeated · routing deeper…") : "Entering the next system…"}</p>
      </Overlay>
    ) : phase === "upgrade" ? (
      <Overlay>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Mutation available</p>
        <h3 className="font-display text-2xl font-bold uppercase">Evolve the virus</h3>
        <p className="max-w-sm text-sm text-muted-foreground">Choose one upgrade. It lasts for the rest of this run and can stack if it appears again.</p>
        <div className="mt-2 grid w-full gap-2 sm:grid-cols-3">
          {upgradeChoices.map((upgrade) => {
            const currentStacks = upgradesRef.current[upgrade.kind];
            return (
              <button key={upgrade.kind} type="button" onClick={() => chooseUpgrade(upgrade)} className="rounded-xl border border-primary/20 bg-background/60 p-3 text-left transition hover:border-primary/60 hover:bg-primary/10">
                <span className="block font-display text-sm font-bold text-primary">{upgrade.name}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{upgrade.detail}</span>
                <span className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{currentStacks ? "Stack " + (currentStacks + 1) : "New mutation"}</span>
              </button>
            );
          })}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">{upgradeCount} mutation{upgradeCount === 1 ? "" : "s"} active this run</p>
      </Overlay>
    ) : phase === "gameover" ? (
      <Overlay>
        <Shield className="size-10 text-destructive" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-destructive">Connection terminated</p>
        <h3 className="font-display text-3xl font-bold uppercase tracking-wide text-destructive">Quarantined</h3>
        <p className="text-sm text-muted-foreground">
          The antivirus found you on system {hud.level}. You harvested {hud.collected} packets this breach.
        </p>
        {hud.bestLevel > 0 && (
          <p className="font-mono text-xs text-muted-foreground">
            Deepest breach so far: system {hud.bestLevel}
          </p>
        )}
        <Button onClick={startRun} className="mt-2">
          <RotateCcw className="size-4" aria-hidden /> Run again
        </Button>
      </Overlay>
    ) : null;

  return (
    <div className={cn("virus-game mx-auto w-full max-w-5xl select-none [-webkit-user-select:none] [-webkit-touch-callout:none]", mobileLandscape && "fixed inset-0 z-[100] m-0 h-[100dvh] w-[100dvw] max-w-none overflow-hidden overscroll-none bg-black p-0 touch-none")}>
      <div className={cn("mb-3 overflow-hidden rounded-xl border border-primary/25 bg-background/80 shadow-2xl backdrop-blur-xl", mobileLandscape && "pointer-events-none absolute inset-x-0 top-0 z-30 m-0 border-0 bg-transparent shadow-none backdrop-blur-none")}>
        <div className={cn("flex items-center justify-between gap-3 border-b border-primary/15 px-3 py-2.5 sm:px-4", mobileLandscape && "pointer-events-auto absolute right-[max(8px,env(safe-area-inset-right))] top-[max(8px,env(safe-area-inset-top))] w-fit rounded-xl border bg-background/85 p-1 shadow-lg backdrop-blur-md")}>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold uppercase tracking-[0.12em] text-primary">Virus Run</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">Collect data · Avoid detection · Reach the exit</p>
          </div>
          {(phase === "playing" || phase === "paused") && (
            <Button onClick={phase === "playing" ? pause : resume} aria-label={phase === "playing" ? "Pause" : "Resume"} variant="outline" size="icon" className="shrink-0">
              {phase === "playing" ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            </Button>
          )}
        </div>
        <div className={cn("grid grid-cols-5 divide-x divide-primary/15", mobileLandscape && "pointer-events-auto absolute left-[max(8px,env(safe-area-inset-left))] top-[max(8px,env(safe-area-inset-top))] w-fit grid-cols-4 overflow-hidden rounded-xl border border-primary/20 bg-background/85 shadow-lg backdrop-blur-md")}>
          <GameStat label="Level" value={hud.level} />
          <div className={cn(mobileLandscape && "hidden")}><GameStat label="System" value={hud.boss ? hud.bossTitle : hud.system || "—"} accent /></div>
          <GameStat label={hud.boss && hud.bossPhase >= 2 ? "Breach" : "Packets"} value={hud.boss && hud.bossPhase >= 2 ? `${hud.bossNodes}/${hud.bossNodesRequired}` : `${hud.collected}/${hud.required}`} />
          <GameStat label={hud.power ? "Power" : "Streak"} value={hud.power || (hud.streak>1 ? `x${hud.streak}` : "—")} accent={Boolean(hud.power || hud.streak>1)} />
          <div className="px-2 py-2.5 sm:px-4">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]">Integrity</p>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: MAX_INTEGRITY }).map((_, i) => (
                <Heart key={i} className={cn("size-4", i < hud.integrity ? "fill-destructive text-destructive" : "text-muted-foreground/30")} aria-hidden />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={cn("relative overflow-hidden rounded-lg border border-border/80 bg-card/75 p-1.5 shadow-2xl backdrop-blur-xl", mobileLandscape && "absolute bottom-0 left-0 top-0 m-0 h-[100dvh] w-[calc(100dvw-176px-env(safe-area-inset-right))] rounded-none border-0 bg-black p-0 shadow-none")}>
        <canvas
          ref={canvasRef}
           className={cn("block w-full touch-none select-none rounded-md aspect-[31/21] [-webkit-user-select:none] [-webkit-touch-callout:none]", mobileLandscape && "h-[100dvh] w-full max-w-none rounded-none aspect-auto")}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerEnd}
          onPointerCancel={onCanvasPointerEnd}
        />
        {overlay}
      </div>

      {/* Phone controls: one large thumb stick. The playfield itself also supports drag-to-steer. */}
      <div className={cn("mt-3 flex items-center justify-between gap-4 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] md:hidden", mobileLandscape && "absolute bottom-0 right-0 top-0 z-40 m-0 flex w-[calc(176px+env(safe-area-inset-right))] items-center justify-center border-l border-primary/15 bg-background/80 pb-0 pl-2 pr-[max(10px,env(safe-area-inset-right))] pt-0 shadow-2xl backdrop-blur-xl")} aria-label="Mobile game controls">
        <p className={cn("max-w-[12rem] text-xs leading-relaxed text-muted-foreground", mobileLandscape && "hidden")}>Swipe the maze to steer, or flick the thumb stick. Your last direction stays active until you steer again.</p>
        <Joystick onDir={(dir) => pressDir(dir)} onRelease={releaseAllDirs} mobile />
      </div>
    </div>
  );
}

function GameStat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="min-w-0 px-2 py-2.5 sm:px-4">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-xs font-bold sm:text-sm", accent && "text-primary")}>{value}</p>
    </div>
  );
}

function VirusCoreGraphic() {
  return (
    <div className="relative mb-3 flex size-32 items-center justify-center sm:size-40" aria-hidden>
      <span className="absolute inset-1/4 rounded-full bg-primary/25 blur-2xl" />
      <svg viewBox="0 0 180 180" className="relative size-full overflow-visible">
        <defs>
          <radialGradient id="virus-core" cx="35%" cy="28%" r="70%">
            <stop offset="0" stopColor="var(--color-primary-foreground)" />
            <stop offset="0.2" stopColor="var(--color-primary)" />
            <stop offset="0.7" stopColor="var(--color-progress)" />
            <stop offset="1" stopColor="var(--color-background)" />
          </radialGradient>
          <filter id="virus-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g className="origin-center animate-[spin_18s_linear_infinite]" fill="none" stroke="var(--color-primary)" strokeOpacity=".62">
          <ellipse cx="90" cy="90" rx="76" ry="39" transform="rotate(24 90 90)" />
          <ellipse cx="90" cy="90" rx="69" ry="31" transform="rotate(-42 90 90)" strokeOpacity=".28" />
        </g>
        <g filter="url(#virus-glow)" stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return <line key={i} x1={90 + Math.cos(angle) * 42} y1={90 + Math.sin(angle) * 42} x2={90 + Math.cos(angle) * 61} y2={90 + Math.sin(angle) * 61} />;
          })}
        </g>
        <circle cx="90" cy="90" r="44" fill="url(#virus-core)" stroke="var(--color-primary-foreground)" strokeOpacity=".36" />
        <circle cx="90" cy="90" r="20" fill="var(--color-background)" fillOpacity=".72" stroke="var(--color-primary)" strokeWidth="2" />
        <circle cx="83" cy="82" r="6" fill="var(--color-primary-foreground)" opacity=".9" />
        <circle cx="55" cy="142" r="4" fill="var(--color-primary)" />
        <circle cx="149" cy="72" r="3" fill="var(--color-progress)" />
      </svg>
    </div>
  );
}

function Joystick({ onDir, onRelease, mobile = false }: { onDir: (dir: string) => void; onRelease: () => void; mobile?: boolean }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const holdingRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const steer = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const mag = Math.hypot(dx, dy);
    const max = rect.width / 2 - 13; // keep the knob inside the ring
    if (mag > max) {
      dx = (dx / mag) * max;
      dy = (dy / mag) * max;
    }
    setKnob({ x: dx, y: dy });
    if (mag < 6) return;
    // Snap every deliberate gesture to one of four directions. This is a maze,
    // not an analog movement game, so diagonal input should never be ambiguous.
    if (Math.abs(dx) >= Math.abs(dy)) onDir(dx > 0 ? "right" : "left");
    else onDir(dy > 0 ? "down" : "up");
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="Movement stick"
      className={cn("relative flex touch-none select-none items-center justify-center rounded-full border border-border bg-card/90 shadow-lg backdrop-blur-xl [-webkit-user-select:none] [-webkit-touch-callout:none]", mobile ? "size-36" : "size-16")}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        holdingRef.current = true;
        steer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (holdingRef.current) steer(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        holdingRef.current = false;
        setKnob({ x: 0, y: 0 });
        // Direction stays buffered after release for smoother corridor travel.
      }}
      onPointerCancel={() => {
        holdingRef.current = false;
        setKnob({ x: 0, y: 0 });
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="absolute inset-2 rounded-full border border-dashed border-border/60" aria-hidden />
      <ChevronUp className="pointer-events-none absolute top-2 size-5 text-primary/70" aria-hidden />
      <ChevronDown className="pointer-events-none absolute bottom-2 size-5 text-primary/70" aria-hidden />
      <ChevronLeft className="pointer-events-none absolute left-2 size-5 text-primary/70" aria-hidden />
      <ChevronRight className="pointer-events-none absolute right-2 size-5 text-primary/70" aria-hidden />
      <span
        className={cn("pointer-events-none absolute rounded-full border border-primary/40 bg-primary/20 shadow-md transition-transform duration-75", mobile ? "size-14" : "size-7")}
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        aria-hidden
      />
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-1.5 z-10 flex items-center justify-center rounded-md bg-background/72 p-3 backdrop-blur-md sm:p-4">
      <div className="flex w-full max-w-lg flex-col items-center justify-center gap-2 rounded-lg border border-border/70 bg-card/72 p-4 text-center shadow-2xl backdrop-blur-2xl sm:p-8">
        {children}
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
