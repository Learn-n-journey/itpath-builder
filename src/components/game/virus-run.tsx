/**
 * Virus Run.
 *
 * A small arcade game: you play a virus loose inside a computer. Each level
 * is one system (boot sector, CPU cache, RAM, and so on) rendered as a
 * block-based maze. Collect the data packets, avoid the antivirus daemons,
 * and reach the open port to slip deeper into the machine. Levels are
 * generated endlessly and each one is harder than the last.
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
  { system: "System Configuration", hint: "One setting can change the whole machine.", bg: "#15110d", wall: "#49351f", wallEdge: "#684c2d" },
  { system: "DNS Resolver", hint: "Names race toward the right destination.", bg: "#08151b", wall: "#174354", wallEdge: "#216078" },
  { system: "Router Gateway", hint: "Every route leads somewhere else.", bg: "#0b1119", wall: "#26364c", wallEdge: "#374e6d" },
  { system: "Switch Fabric", hint: "Connections change at wire speed.", bg: "#0b1512", wall: "#24443a", wallEdge: "#356455" },
  { system: "Authentication Server", hint: "Identity checks guard every door.", bg: "#160e18", wall: "#4c244f", wallEdge: "#6d3471" },
  { system: "Database", hint: "Structured records hide the path forward.", bg: "#10140d", wall: "#344725", wallEdge: "#4c6636" },
  { system: "Web Server", hint: "Requests pile up from every direction.", bg: "#0c121a", wall: "#253c59", wallEdge: "#36577f" },
  { system: "Cloud Network", hint: "The machine is no longer in one place.", bg: "#0a1418", wall: "#1f4650", wallEdge: "#2d6572" },
  { system: "Security Operations Center", hint: "Every sensor is looking for you.", bg: "#170d10", wall: "#50242d", wallEdge: "#733440" },
  { system: "Core Infrastructure", hint: "Everything converges here.", bg: "#171205", wall: "#574716", wallEdge: "#7d6620" },
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
type GuardState = "patrol" | "chase" | "search";
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

interface Guard {
  kind: GuardKind;
  stunned: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  detection: number;
  fromX: number;
  fromY: number;
  state: GuardState;
  stateTimer: number;
  lastKnownX: number;
  lastKnownY: number;
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
  bossTitle: string;
  bossBreaches: number;
  bossBreachesRequired: number;
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
  // Levels 1-20 form the campaign in order. Level 21+ continues in Endless Mode by cycling the same systems.
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

  // Major encounters close each five-level campaign chapter and keep
  // the same cadence once Endless Mode begins.
  const boss = level % 5 === 0;
  const bossTitle = !boss
    ? ""
    : level === 5
      ? "STORAGE SENTINEL"
      : level === 10
        ? "PROCESS WARDEN"
        : level === 15
          ? "AUTHENTICATION GUARDIAN"
          : level === 20
            ? "CORE DEFENDER"
            : "ENDLESS DEFENDER";
  const bossBreachesRequired = boss ? (level >= 20 ? 4 : level >= 15 ? 3 : 2) : 0;
  const guardCount = Math.min((boss ? 5 : 2) + Math.floor(level * 0.7), 14);
  const guardSpeed = Math.min(BASE_GUARD_SPEED + (level - 1) * 0.16, MAX_GUARD_SPEED);
  const detection = 6 + Math.min(level, 9);
  const guards: Guard[] = [];
  // Keep guards a meaningful maze-path distance from the player's starting cell.
  // This prevents a wall from making an enemy look far away by coordinates while
  // actually placing it only a few corridor steps from spawn.
  const minSpawnPath = boss ? 18 : 15;
  const openCells = candidates.filter(
    (c) => (dist[c.y]?.[c.x] ?? -1) >= minSpawnPath,
  );
  for (let i = 0; i < guardCount && openCells.length > 0; i++) {
    const cell = openCells.splice(Math.floor(Math.random() * openCells.length), 1)[0]!;
    const kinds: GuardKind[] = boss ? ["hunter","interceptor","warden","scanner"] : ["scanner","hunter","interceptor"];
    const kind = kinds[i % kinds.length]!;
    guards.push({ kind, stunned: 0, x: cell.x, y: cell.y, tx: cell.x, ty: cell.y, speed: guardSpeed * (kind==="interceptor"?1.08:kind==="warden"?.9:1), detection: detection + (kind==="hunter"?5:kind==="warden"?2:0), fromX: cell.x, fromY: cell.y, state: "patrol", stateTimer: 0, lastKnownX: cell.x, lastKnownY: cell.y });
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
    bossTitle,
    bossBreaches: 0,
    bossBreachesRequired,
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
  // Visual-only soft-body response. Collision rules remain grid deterministic.
  const wallSquishRef = useRef({ amount: 0, target:0, velocity:0, angle: 0 });
  const motionPhysicsRef = useRef({ turn:0, turnSign:0, reverse:0, hit:0, hitAngle:0 });
  const playerVisualRef = useRef({ heading:0, stretch:0, squish:0, spikePhase:[0,1.1,2.2,3.3,4.4,5.5] });
  const cameraRef = useRef({ power:0, angle:0 });
  const trailRef = useRef<{x:number;y:number;born:number}[]>([]);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const levelClearTimerRef = useRef(0);
  const lastAlertSoundRef = useRef(0);
  const bestRef = useRef<Best>({ bestLevel: 0, packets: 0, currentLevel: 1 });
  const upgradesRef = useRef<Record<UpgradeKind, number>>({
    "packet-sniffer": 0, "cache-boost": 0, "ghost-protocol": 0,
    "emp-amplifier": 0, "data-magnet": 0, "kernel-boost": 0,
  });

  const [phase, setPhase] = useState<Phase>("menu");
  const [upgradeChoices, setUpgradeChoices] = useState<RunUpgrade[]>([]);
  const [upgradeCount, setUpgradeCount] = useState(0);
  const [mobileLandscape, setMobileLandscape] = useState(false);
  const fxRef = useRef<{ x: number; y: number; born: number; kind: "packet" | "hit" | "exit" | "power" | "near"; targetX?: number; targetY?: number }[]>([]);
  const [hud, setHud] = useState({ level: 1, integrity: MAX_INTEGRITY, collected: 0, required: 3, system: "", hint: "", bestLevel: 0, bestPackets: 0, streak: 0, power: "", boss: false, bossTitle: "", bossBreaches: 0, bossBreachesRequired: 0 });

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
      bossBreaches: run.bossBreaches,
      bossBreachesRequired: run.bossBreachesRequired,
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
    wallSquishRef.current={amount:0,target:0,velocity:0,angle:0};
    motionPhysicsRef.current={turn:0,turnSign:0,reverse:0,hit:0,hitAngle:0};
    playerVisualRef.current={heading:0,stretch:0,squish:0,spikePhase:[0,1.1,2.2,3.3,4.4,5.5]};
    cameraRef.current={power:0,angle:0};trailRef.current=[];
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
        queuedDirRef.current = dir;
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

      // Player movement, cell to cell. Direction requests are buffered:
      // an early turn stays queued until the next cell where it is legal.
      if (!p.moving) {
        p.x = Math.round(p.x);
        p.y = Math.round(p.y);
        const cx = p.x;
        const cy = p.y;
        const queued = queuedDirRef.current ?? keysRef.current[keysRef.current.length - 1] ?? null;
        const tryDirection = (dir: string | null) => {
          if (!dir) return false;
          const [dx, dy] = DIR_VECS[dir]!;
          const nx = cx + dx;
          const ny = cy + dy;
          if (run.grid[ny]?.[nx] !== 0) return false;
          const previous=travelDirRef.current;
          if(previous && previous!==dir){
            const [odx,ody]=DIR_VECS[previous]!;
            const dot=odx*dx+ody*dy;
            if(dot<0){
              motionPhysicsRef.current.reverse=Math.max(motionPhysicsRef.current.reverse,.9);
            }else{
              const cross=odx*dy-ody*dx;
              motionPhysicsRef.current.turn=Math.max(motionPhysicsRef.current.turn,.72);
              motionPhysicsRef.current.turnSign=Math.sign(cross)||1;
            }
          }
          p.tx = nx;
          p.ty = ny;
          p.moving = true;
          travelDirRef.current = dir;
          return true;
        };
        // Prefer the player's queued turn. If it is blocked, feed a visual
        // compression impulse into the soft-body renderer before continuing.
        const queuedSucceeded = tryDirection(queued);
        if (!queuedSucceeded && queued) {
          const [qdx,qdy]=DIR_VECS[queued]!;
          if(run.grid[cy+qdy]?.[cx+qdx]!==0){
            wallSquishRef.current.target=Math.max(wallSquishRef.current.target,.72);
            wallSquishRef.current.angle=Math.atan2(qdy,qdx);
            cameraRef.current.power=Math.max(cameraRef.current.power,.12);
            cameraRef.current.angle=Math.atan2(qdy,qdx);
          }
        }
        if (!queuedSucceeded) tryDirection(travelDirRef.current);
      }
      if (p.moving) {
        let playerSpeed=PLAYER_SPEED * (1 + upgradesRef.current["kernel-boost"] * 0.08);
        // Momentum turns risky, efficient routing into a tangible advantage.
        // Each active streak tier adds 3% speed, capped at x5 (+15%).
        if (run.streak > 1 && run.streakTimer > 0) playerSpeed *= 1 + run.streak * 0.03;
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
        if (r.arrived) p.moving = false;
      }

      // Organic damped spring: compression builds, overshoots and settles instead
      // of switching between squashed and normal poses.
      const wallBody=wallSquishRef.current;
      wallBody.target=Math.max(0,wallBody.target-dt*5.2);
      const springForce=(wallBody.target-wallBody.amount)*34;
      wallBody.velocity=(wallBody.velocity+springForce*dt)*Math.exp(-7.2*dt);
      wallBody.amount+=wallBody.velocity*dt;
      if(Math.abs(wallBody.amount)<.001 && Math.abs(wallBody.velocity)<.002){wallBody.amount=0;wallBody.velocity=0;}
      const phys=motionPhysicsRef.current;
      phys.turn=Math.max(0,phys.turn-dt*5.8);
      phys.reverse=Math.max(0,phys.reverse-dt*4.6);
      phys.hit=Math.max(0,phys.hit-dt*3.6);
      cameraRef.current.power=Math.max(0,cameraRef.current.power-dt*5.5);
      if(p.moving){
        const last=trailRef.current[trailRef.current.length-1];
        if(!last || Math.hypot(last.x-p.x,last.y-p.y)>.16)trailRef.current.push({x:p.x,y:p.y,born:performance.now()});
      }
      trailRef.current=trailRef.current.filter(point=>performance.now()-point.born<360).slice(-10);

      // Packets.
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      for (const packet of run.packets) {
        const magnetRange = upgradesRef.current["data-magnet"] * 0.7;
        if (!packet.taken && (packet.x === px && packet.y === py || (magnetRange > 0 && Math.hypot(packet.x - p.x, packet.y - p.y) <= magnetRange))) {
          packet.taken = true;
          run.collected += 1;
          run.streak = Math.min(5, run.streak + 1);
          // Higher momentum gets slightly more breathing room so a skilled route
          // can be sustained without making the bonus permanent.
          run.streakTimer = 4.25 + run.streak * 0.35;
          fxRef.current.push({ x: packet.x, y: packet.y, born: performance.now(), kind: "packet", targetX:p.x, targetY:p.y });virusSound("packet");
          cameraRef.current.power=Math.max(cameraRef.current.power,.08);cameraRef.current.angle=Math.atan2(p.y-packet.y,p.x-packet.x);
          if (run.collected >= run.required && !run.boss) run.portOpen = true;
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

      // Guards.
      for (const g of run.guards) {
        const gx = Math.round(g.x);
        const gy = Math.round(g.y);
        if(g.stunned>0)continue;
        const toPlayer = field[gy]?.[gx] ?? -1;
        const hidden = run.activePower?.kind==="cloak";
        const systemDetection = run.theme.system==="Kernel Space"?2:run.theme.system==="Firewall"?1:0;
        const roleDetection =
          g.kind === "scanner" ? 3 :
          g.kind === "warden" ? 1 :
          g.kind === "interceptor" ? -1 : 0;
        const seesPlayer = !hidden && toPlayer >= 0 && toPlayer <= g.detection + systemDetection + roleDetection;
        if (seesPlayer) {
          g.state = "chase";
          g.stateTimer = g.kind === "hunter" ? 2.8 : g.kind === "warden" ? 3.4 : 1.8;
          g.lastKnownX = Math.round(p.x);
          g.lastKnownY = Math.round(p.y);
        } else if (g.state === "chase") {
          g.state = "search";
          g.stateTimer = g.kind === "hunter" ? 3.6 : g.kind === "warden" ? 4.5 : g.kind === "scanner" ? 1.8 : 2.4;
        } else if (g.state === "search") {
          g.stateTimer = Math.max(0, g.stateTimer - dt);
          if (g.stateTimer <= 0) g.state = "patrol";
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
          if (g.state === "chase") {
            if(g.kind==="interceptor" && p.moving){
              const leadX = p.tx + (p.tx - Math.round(p.x)) * 2;
              const leadY = p.ty + (p.ty - Math.round(p.y)) * 2;
              options.sort((a,b)=>Math.abs(a[0]-leadX)+Math.abs(a[1]-leadY)-Math.abs(b[0]-leadX)-Math.abs(b[1]-leadY));
            } else if (g.kind === "warden") {
              // Wardens pressure nearby junctions instead of perfectly tailing the player.
              options.sort((a,b)=>{
                const da=Math.abs(a[0]-p.x)+Math.abs(a[1]-p.y);
                const db=Math.abs(b[0]-p.x)+Math.abs(b[1]-p.y);
                const oa=((run.grid[a[1]-1]?.[a[0]]===0?1:0)+(run.grid[a[1]+1]?.[a[0]]===0?1:0)+(run.grid[a[1]]?.[a[0]-1]===0?1:0)+(run.grid[a[1]]?.[a[0]+1]===0?1:0));
                const ob=((run.grid[b[1]-1]?.[b[0]]===0?1:0)+(run.grid[b[1]+1]?.[b[0]]===0?1:0)+(run.grid[b[1]]?.[b[0]-1]===0?1:0)+(run.grid[b[1]]?.[b[0]+1]===0?1:0));
                return (da-oa*1.5)-(db-ob*1.5);
              });
            } else options.sort((a, b) => (field[a[1]]![a[0]] ?? 999) - (field[b[1]]![b[0]] ?? 999));
            chosen = options[0]!;
          } else if (g.state === "search") {
            options.sort((a,b)=>Math.abs(a[0]-g.lastKnownX)+Math.abs(a[1]-g.lastKnownY)-Math.abs(b[0]-g.lastKnownX)-Math.abs(b[1]-g.lastKnownY));
            chosen = options[0]!;
            if (chosen[0] === g.lastKnownX && chosen[1] === g.lastKnownY) g.stateTimer = Math.min(g.stateTimer, 0.6);
          } else {
            chosen = options[Math.floor(Math.random() * options.length)]!;
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
        const roleSpeed =
          g.kind === "hunter" && g.state === "chase" ? 1.16 :
          g.kind === "interceptor" && g.state === "chase" ? 1.08 :
          g.kind === "warden" && g.state === "chase" ? 0.96 :
          g.kind === "scanner" && g.state === "chase" ? 0.98 : 1;
        const r = stepEntity(g.x, g.y, g.tx, g.ty, g.speed * systemGuardSpeed * roleSpeed, dt);
        g.x = r.x;
        g.y = r.y;

        // Near misses reward risky escapes and trigger a warning burst.
        const nearDist=Math.hypot(g.x-p.x,g.y-p.y);
        if(!hidden && toPlayer>=0 && toPlayer<=2 && performance.now()-lastAlertSoundRef.current>900){virusSound("alert");lastAlertSoundRef.current=performance.now();}
        if(p.invuln<=0 && nearDist<1.05 && nearDist>=0.55 && Math.random()<dt*1.4){
          run.streak=Math.min(5,run.streak+1);
          run.streakTimer=3.5 + run.streak * 0.3;
          fxRef.current.push({x:p.x,y:p.y,born:performance.now(),kind:"near"});
        }
        // Contact.
        if (p.invuln <= 0 && Math.abs(g.x - p.x) < 0.55 && Math.abs(g.y - p.y) < 0.55) {
          run.integrity -= 1;
          // Getting caught breaks momentum immediately.
          run.streak = 0;
          run.streakTimer = 0;
          fxRef.current.push({ x: p.x, y: p.y, born: performance.now(), kind: "hit" });virusSound("hit");
          motionPhysicsRef.current.hit=1;
          motionPhysicsRef.current.hitAngle=Math.atan2(p.y-g.y,p.x-g.x);
          cameraRef.current.power=1;cameraRef.current.angle=motionPhysicsRef.current.hitAngle;
          p.x = 1;
          p.y = 1;
          p.tx = 1;
          p.ty = 1;
          p.moving = false;
          p.invuln = 3;
          keysRef.current = [];
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

      // Boss core. Once all packets are collected on a boss level, the
      // player must breach the central security core before the exit opens.
      if (run.boss && run.bossBreaches < run.bossBreachesRequired && run.collected >= run.required) {
        const coreX = Math.floor(COLS / 2);
        const coreY = Math.floor(ROWS / 2);
        if (Math.abs(p.x - coreX) < 0.8 && Math.abs(p.y - coreY) < 0.8) {
          run.bossBreaches += 1;
          if (run.bossBreaches >= run.bossBreachesRequired) {
            run.portOpen = true;
          } else {
            // Begin the next breach layer using the same packet positions.
            // Resetting them keeps this step isolated from maze generation.
            for (const packet of run.packets) packet.taken = false;
            run.collected = 0;
          }
          fxRef.current.push({ x: coreX, y: coreY, born: performance.now(), kind: "exit" });
          virusSound("boss");
          syncHud(run);
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
      const cam=cameraRef.current;
      if(cam.power>.001){
        const kick=Math.sin(time*.095)*cam.power*3.2;
        ctx2.translate(Math.cos(cam.angle)*kick,Math.sin(cam.angle)*kick);
      }

      const cell = Math.min(rect.width / COLS, rect.height / ROWS);
      const offX = (rect.width - cell * COLS) / 2;
      const offY = (rect.height - cell * ROWS) / 2;
      const t = run.theme;

      ctx2.fillStyle = t.bg;
      ctx2.fillRect(0, 0, rect.width, rect.height);

      // Premium depth pass: a subtle player-centered pool of light separates
      // navigable space from the darker security architecture.
      const playerLightX = offX + (run.player.x + 0.5) * cell;
      const playerLightY = offY + (run.player.y + 0.5) * cell;
      const playerLight = ctx2.createRadialGradient(playerLightX, playerLightY, cell * 0.2, playerLightX, playerLightY, cell * 7.5);
      playerLight.addColorStop(0, "rgba(94,234,212,0.105)");
      playerLight.addColorStop(0.38, "rgba(45,212,191,0.045)");
      playerLight.addColorStop(1, "rgba(0,0,0,0)");
      ctx2.fillStyle = playerLight;
      ctx2.fillRect(offX, offY, cell * COLS, cell * ROWS);

      // Slow ambient motes make the system feel alive without obscuring routes.
      ctx2.save();
      for (let mote = 0; mote < 18; mote++) {
        const mx = offX + (((mote * 7.31 + time / (5200 + mote * 90)) % COLS) * cell);
        const my = offY + (((mote * 4.77 + time / (7600 + mote * 120)) % ROWS) * cell);
        const alpha = 0.08 + 0.07 * Math.sin(time / 900 + mote);
        ctx2.fillStyle = `rgba(125,211,252,${Math.max(0.02, alpha)})`;
        ctx2.beginPath();
        ctx2.arc(mx, my, Math.max(0.7, cell * 0.045), 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.restore();

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
      } else if (["File System","Process Table","System Configuration"].includes(sys)) {
        // OS internals: nested panels and process lanes.
        for(let i=0;i<7;i++){
          const x=offX+cell*(1.4+(i%4)*7.4), y=offY+cell*(1.2+Math.floor(i/4)*9.2);
          ctx2.strokeStyle="rgba(96,165,250,0.12)";ctx2.lineWidth=Math.max(1,cell*.045);
          roundRect(ctx2,x,y,cell*4.6,cell*2.1,cell*.22);ctx2.stroke();
          for(let row=0;row<3;row++){ctx2.fillStyle=`rgba(125,211,252,${.09+row*.025})`;ctx2.fillRect(x+cell*.45,y+cell*(.45+row*.48),cell*(2.2+(i+row)%2),cell*.1);}
        }
      } else if (["DNS Resolver","Router Gateway","Switch Fabric"].includes(sys)) {
        // Network infrastructure: topology nodes joined by animated links.
        const nodes=[[3,4],[9,2.5],[15,6],[22,3],[27,8],[7,15],[17,16],[25,14]];
        ctx2.strokeStyle="rgba(56,189,248,0.14)";ctx2.lineWidth=Math.max(1,cell*.05);
        for(let i=1;i<nodes.length;i++){const a=nodes[i-1]!,b=nodes[i]!;ctx2.beginPath();ctx2.moveTo(offX+a[0]*cell,offY+a[1]*cell);ctx2.lineTo(offX+b[0]*cell,offY+b[1]*cell);ctx2.stroke();}
        for(let i=0;i<nodes.length;i++){const n=nodes[i]!,pulse=.14+.1*(1+Math.sin(time/300+i))/2;ctx2.fillStyle=`rgba(94,234,212,${pulse})`;ctx2.beginPath();ctx2.arc(offX+n[0]*cell,offY+n[1]*cell,cell*.28,0,Math.PI*2);ctx2.fill();}
      } else if (["Authentication Server","Security Operations Center"].includes(sys)) {
        // Security systems: radar arcs and monitored sectors.
        const cx=offX+cell*COLS/2,cy=offY+cell*ROWS/2;
        ctx2.strokeStyle="rgba(248,113,113,0.13)";ctx2.lineWidth=Math.max(1,cell*.055);
        for(let r=3;r<15;r+=3){ctx2.beginPath();ctx2.arc(cx,cy,cell*r,0,Math.PI*2);ctx2.stroke();}
        const a=time/950;ctx2.strokeStyle="rgba(251,113,133,0.24)";ctx2.beginPath();ctx2.moveTo(cx,cy);ctx2.lineTo(cx+Math.cos(a)*cell*15,cy+Math.sin(a)*cell*15);ctx2.stroke();
      } else if (["Database","Web Server","Cloud Network"].includes(sys)) {
        // Service/data systems: stacked data racks with flowing request lights.
        for(let rack=0;rack<6;rack++){const x=offX+cell*(2+rack*5.1);ctx2.fillStyle="rgba(99,102,241,0.07)";ctx2.fillRect(x,offY+cell*1.2,cell*2.6,cell*(ROWS-2.4));for(let row=0;row<8;row++){const blink=.12+.12*(1+Math.sin(time/240+rack+row))/2;ctx2.fillStyle=`rgba(129,140,248,${blink})`;ctx2.fillRect(x+cell*.35,offY+cell*(2+row*2.05),cell*1.9,cell*.12);}}
      } else if (sys === "Core Infrastructure") {
        // Final system: converging rings and spokes make the space feel central.
        const cx=offX+cell*COLS/2,cy=offY+cell*ROWS/2;
        for(let ring=1;ring<=5;ring++){ctx2.strokeStyle=`rgba(250,204,21,${.16-ring*.018})`;ctx2.lineWidth=Math.max(1,cell*.06);ctx2.beginPath();ctx2.arc(cx,cy,cell*(1.5+ring*2.15),time/(900+ring*100),time/(900+ring*100)+Math.PI*1.55);ctx2.stroke();}
        for(let spoke=0;spoke<8;spoke++){const a=spoke*Math.PI/4+time/8000;ctx2.strokeStyle="rgba(251,191,36,0.09)";ctx2.beginPath();ctx2.moveTo(cx,cy);ctx2.lineTo(cx+Math.cos(a)*cell*16,cy+Math.sin(a)*cell*16);ctx2.stroke();}
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
      }
      ctx2.restore();

      // Walls: restrained connected security architecture. Interior wall cells stay
      // dark; only edges facing playable corridors receive a bright rim. This
      // removes the tiled/neon look and gives the maze one coherent structure.
      const pad = cell * 0.055;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (run.grid[y]![x] !== 1) continue;
          const bx = offX + x * cell;
          const by = offY + y * cell;
          const wallFill = ctx2.createLinearGradient(bx, by, bx + cell, by + cell);
          wallFill.addColorStop(0, t.wall);
          wallFill.addColorStop(1, t.bg);
          ctx2.fillStyle = wallFill;
          ctx2.fillRect(bx, by, cell + 0.5, cell + 0.5);
          // Fine deterministic material grain and bevel lighting give the maze depth
          // without adding image assets or frame-to-frame noise.
          const grainSeed=(x*37+y*61)%17;
          ctx2.fillStyle="rgba(255,255,255,0.025)";
          for(let g=0;g<2;g++){
            const gx=bx+cell*((grainSeed+g*7)%13)/13;
            const gy=by+cell*((grainSeed*3+g*5)%11)/11;
            ctx2.fillRect(gx,gy,Math.max(.6,cell*.025),Math.max(.6,cell*.025));
          }
          ctx2.strokeStyle="rgba(255,255,255,0.045)";ctx2.lineWidth=Math.max(.5,cell*.018);
          ctx2.beginPath();ctx2.moveTo(bx+pad,by+pad);ctx2.lineTo(bx+cell-pad,by+pad);ctx2.stroke();
          ctx2.strokeStyle="rgba(0,0,0,0.22)";
          ctx2.beginPath();ctx2.moveTo(bx+pad,by+cell-pad);ctx2.lineTo(bx+cell-pad,by+cell-pad);ctx2.stroke();

          const topOpen = run.grid[y - 1]?.[x] === 0;
          const bottomOpen = run.grid[y + 1]?.[x] === 0;
          const leftOpen = run.grid[y]?.[x - 1] === 0;
          const rightOpen = run.grid[y]?.[x + 1] === 0;
          if (topOpen || bottomOpen || leftOpen || rightOpen) {
            const wallDist=Math.hypot((x+.5)-(run.player.x+.5),(y+.5)-(run.player.y+.5));
            const localSpec=Math.max(0,1-wallDist/4.2);
            ctx2.strokeStyle = t.wallEdge;
            ctx2.lineWidth = Math.max(1, cell * 0.055);
            ctx2.shadowColor = t.wallEdge;
            ctx2.shadowBlur = cell * 0.18;
            ctx2.beginPath();
            if (topOpen) { ctx2.moveTo(bx, by + pad); ctx2.lineTo(bx + cell, by + pad); }
            if (bottomOpen) { ctx2.moveTo(bx, by + cell - pad); ctx2.lineTo(bx + cell, by + cell - pad); }
            if (leftOpen) { ctx2.moveTo(bx + pad, by); ctx2.lineTo(bx + pad, by + cell); }
            if (rightOpen) { ctx2.moveTo(bx + cell - pad, by); ctx2.lineTo(bx + cell - pad, by + cell); }
            ctx2.stroke();
            if(localSpec>0){
              ctx2.strokeStyle=`rgba(153,246,228,${localSpec*.18})`;ctx2.lineWidth=Math.max(.6,cell*.026);
              ctx2.beginPath();
              if(topOpen) {ctx2.moveTo(bx+cell*.12,by+pad);ctx2.lineTo(bx+cell*.88,by+pad);}
              if(leftOpen) {ctx2.moveTo(bx+pad,by+cell*.12);ctx2.lineTo(bx+pad,by+cell*.88);}
              ctx2.stroke();
            }
            ctx2.shadowBlur = 0;

            // Sparse hardware detail only on exposed faces.
            if ((x * 3 + y * 5) % 11 === 0) {
              ctx2.fillStyle = "rgba(255,255,255,0.055)";
              ctx2.fillRect(bx + cell * 0.34, by + cell * 0.34, cell * 0.32, Math.max(1, cell * 0.045));
            }
          }
        }
      }

            // Dynamic local lighting is composited after wall material so nearby actors
      // appear to illuminate the architecture instead of merely glowing themselves.
      ctx2.save();
      ctx2.globalCompositeOperation="screen";
      const castLight=(gx:number,gy:number,radius:number,rgb:string,strength:number)=>{
        const lx=offX+(gx+.5)*cell,ly=offY+(gy+.5)*cell;
        const lr=cell*radius;
        const light=ctx2.createRadialGradient(lx,ly,0,lx,ly,lr);
        light.addColorStop(0,`rgba(${rgb},${strength})`);
        light.addColorStop(.28,`rgba(${rgb},${strength*.42})`);
        light.addColorStop(.7,`rgba(${rgb},${strength*.11})`);
        light.addColorStop(1,`rgba(${rgb},0)`);
        ctx2.fillStyle=light;ctx2.beginPath();ctx2.arc(lx,ly,lr,0,Math.PI*2);ctx2.fill();
      };
      // Player is the primary moving light. Powers alter both radius and hue.
      const playerLightRgb=run.activePower?.kind==="overclock"?"251,191,36":run.activePower?.kind==="emp"?"103,232,249":run.activePower?.kind==="magnet"?"250,204,21":"45,212,191";
      castLight(run.player.x,run.player.y,2.65+(run.streak>1?run.streak*.08:0),playerLightRgb,run.activePower?.kind==="cloak"?.08:.17);
      // Untaken data softly paints cyan onto nearby walls.
      for(const packet of run.packets){
        if(packet.taken)continue;
        const pd=Math.hypot(packet.x-run.player.x,packet.y-run.player.y);
        if(pd<8)castLight(packet.x,packet.y,1.15,"56,189,248",.115);
      }
      // Antivirus casts a darker red warning pool; chase state pushes it farther.
      for(const guard of run.guards){
        const gd=Math.hypot(guard.x-run.player.x,guard.y-run.player.y);
        if(gd<10)castLight(guard.x,guard.y,guard.state==="chase"?2.05:1.35,guard.stunned>0?"56,189,248":"239,68,68",guard.state==="chase"?.14:.075);
      }
      // Open exits become environmental light sources, guiding the eye naturally.
      if(run.portOpen)castLight(run.port.x,run.port.y,2.25,"94,234,212",.18);
      ctx2.restore();

      // Exit node: quiet while locked, unmistakable once the route is complete.
      const portalX = offX + (run.port.x + 0.5) * cell;
      const portalY = offY + (run.port.y + 0.5) * cell;
      ctx2.save();
      ctx2.translate(portalX, portalY);
      const portPulse = 0.5 + 0.5 * Math.sin(time / 260);
      ctx2.strokeStyle = run.portOpen ? "rgba(94,234,212,0.92)" : "rgba(100,116,139,0.34)";
      ctx2.lineWidth = Math.max(1, cell * 0.065);
      ctx2.shadowColor = run.portOpen ? "rgba(45,212,191,0.72)" : "transparent";
      ctx2.shadowBlur = run.portOpen ? cell * 0.72 : 0;
      // Four corner brackets frame the destination without filling the corridor.
      const pr=cell*.38, corner=cell*.16;
      for(let i=0;i<4;i++){ctx2.save();ctx2.rotate(i*Math.PI/2);ctx2.beginPath();ctx2.moveTo(-corner,-pr);ctx2.lineTo(pr*.2,-pr);ctx2.lineTo(pr*.2,-pr+corner);ctx2.stroke();ctx2.restore();}
      if(run.portOpen){
        ctx2.rotate(time/1100);
        ctx2.beginPath();ctx2.arc(0,0,cell*.28,0,Math.PI*1.45);ctx2.stroke();
        ctx2.rotate(-time/550);
        ctx2.strokeStyle=`rgba(153,246,228,${.45+.3*portPulse})`;
        ctx2.beginPath();ctx2.arc(0,0,cell*.18,0,Math.PI*1.25);ctx2.stroke();
        ctx2.fillStyle="#ccfbf1";ctx2.beginPath();ctx2.arc(0,0,cell*.07,0,Math.PI*2);ctx2.fill();
      } else {
        ctx2.fillStyle="rgba(148,163,184,0.42)";ctx2.fillRect(-cell*.08,-cell*.04,cell*.16,cell*.16);
        ctx2.strokeStyle="rgba(148,163,184,0.42)";ctx2.beginPath();ctx2.arc(0,-cell*.07,cell*.11,Math.PI,0);ctx2.stroke();
      }
      ctx2.restore();
      if(run.portOpen){
        ctx2.save();ctx2.fillStyle="rgba(153,246,228,0.88)";ctx2.font=`bold ${Math.max(7,cell*.22)}px ui-monospace, monospace`;ctx2.textAlign="center";ctx2.fillText("EXIT",portalX,portalY-cell*.68);ctx2.restore();
      }

      // Data packets: unmistakable luminous data capsules. They pulse like active
      // information in transit, with a bright core and restrained digital beacon.
      for (const packet of run.packets) {
        if (packet.taken) continue;
        ctx2.save();
        const packetX=offX+(packet.x+.5)*cell;
        const packetY=offY+(packet.y+.5)*cell;
        const phase=time/240+packet.x*.73+packet.y*.41;
        const pulse=.5+.5*Math.sin(phase);
        const bob=Math.sin(time/310+packet.x*.7+packet.y*.35)*cell*.055;
        ctx2.translate(packetX,packetY+bob);

        // Soft beacon makes collectibles visible at a glance without obscuring walls.
        const beaconR=cell*(.58+pulse*.12);
        const beacon=ctx2.createRadialGradient(0,0,0,0,0,beaconR);
        beacon.addColorStop(0,`rgba(125,211,252,${.3+pulse*.12})`);
        beacon.addColorStop(.34,`rgba(56,189,248,${.12+pulse*.06})`);
        beacon.addColorStop(1,"rgba(14,165,233,0)");
        ctx2.fillStyle=beacon;ctx2.beginPath();ctx2.arc(0,0,beaconR,0,Math.PI*2);ctx2.fill();

        // Thin vertical data shimmer suggests a live packet being transmitted.
        ctx2.strokeStyle=`rgba(186,230,253,${.16+pulse*.13})`;
        ctx2.lineWidth=Math.max(.7,cell*.028);
        ctx2.beginPath();ctx2.moveTo(0,-cell*.62);ctx2.lineTo(0,-cell*.31);ctx2.moveTo(0,cell*.31);ctx2.lineTo(0,cell*.62);ctx2.stroke();

        const sniffStacks=upgradesRef.current["packet-sniffer"];
        if(sniffStacks>0){ctx2.strokeStyle=`rgba(125,211,252,${.25+.13*pulse})`;ctx2.lineWidth=Math.max(.8,cell*.035);ctx2.beginPath();ctx2.arc(0,0,cell*(.5+sniffStacks*.12),0,Math.PI*2);ctx2.stroke();}

        ctx2.rotate(Math.PI/4 + Math.sin(time/850+packet.x)*.075);
        const shard=cell*.23;
        ctx2.shadowColor="#38bdf8";ctx2.shadowBlur=cell*(.62+pulse*.22);
        const dataFill=ctx2.createLinearGradient(-shard,-shard,shard,shard);
        dataFill.addColorStop(0,"#f0f9ff");dataFill.addColorStop(.28,"#7dd3fc");dataFill.addColorStop(.62,"#0ea5e9");dataFill.addColorStop(1,"#075985");
        ctx2.fillStyle=dataFill;ctx2.fillRect(-shard,-shard,shard*2,shard*2);
        // Raised glass-like face: top/left catch light while bottom/right recede.
        ctx2.fillStyle="rgba(255,255,255,.18)";ctx2.fillRect(-shard,-shard,shard*2,shard*.18);
        ctx2.fillRect(-shard,-shard,shard*.18,shard*2);
        ctx2.fillStyle="rgba(2,132,199,.28)";ctx2.fillRect(-shard,shard*.78,shard*2,shard*.22);
        ctx2.fillRect(shard*.78,-shard,shard*.22,shard*2);
        ctx2.shadowBlur=0;
        ctx2.strokeStyle="rgba(224,242,254,0.95)";ctx2.lineWidth=Math.max(.8,cell*.04);ctx2.strokeRect(-shard,-shard,shard*2,shard*2);

        // Digital bit marks remain upright inside the rotating capsule.
        ctx2.rotate(-(Math.PI/4 + Math.sin(time/850+packet.x)*.075));
        ctx2.fillStyle="rgba(240,249,255,0.96)";
        ctx2.font=`bold ${Math.max(6,cell*.17)}px ui-monospace, monospace`;
        ctx2.textAlign="center";ctx2.textBaseline="middle";
        ctx2.fillText((packet.x+packet.y)%2===0?"01":"10",0,0);
        ctx2.restore();
      }

      // Power modules use shape and color, not letters, so they read instantly.
      for(const power of run.powerUps){
        if(power.taken)continue;
        const x=offX+(power.x+.5)*cell,y=offY+(power.y+.5)*cell;
        const palette=power.kind==="cloak"?["167,139,250","196,181,253"]:power.kind==="overclock"?["251,146,60","254,215,170"]:power.kind==="emp"?["34,211,238","165,243,252"]:["250,204,21","254,240,138"];
        ctx2.save();ctx2.translate(x,y);
        const breathe=1+.055*Math.sin(time/180+power.x);ctx2.scale(breathe,breathe);
        ctx2.shadowColor=`rgba(${palette[0]},0.72)`;ctx2.shadowBlur=cell*.65;
        ctx2.strokeStyle=`rgba(${palette[1]},0.9)`;ctx2.fillStyle=`rgba(${palette[0]},0.2)`;ctx2.lineWidth=Math.max(1,cell*.055);
        ctx2.beginPath();ctx2.arc(0,0,cell*.3,0,Math.PI*2);ctx2.fill();ctx2.stroke();ctx2.shadowBlur=0;
        ctx2.strokeStyle=`rgba(${palette[1]},0.96)`;ctx2.lineWidth=Math.max(1,cell*.07);
        if(power.kind==="cloak"){
          ctx2.beginPath();ctx2.arc(0,0,cell*.14,.2,Math.PI*1.8);ctx2.stroke();ctx2.beginPath();ctx2.arc(cell*.055,0,cell*.035,0,Math.PI*2);ctx2.fillStyle=`rgba(${palette[1]},0.95)`;ctx2.fill();
        }else if(power.kind==="overclock"){
          ctx2.beginPath();ctx2.moveTo(cell*.04,-cell*.18);ctx2.lineTo(-cell*.11,cell*.02);ctx2.lineTo(cell*.01,cell*.02);ctx2.lineTo(-cell*.05,cell*.19);ctx2.lineTo(cell*.14,-cell*.05);ctx2.lineTo(cell*.02,-cell*.05);ctx2.closePath();ctx2.stroke();
        }else if(power.kind==="emp"){
          for(let ring=0;ring<2;ring++){ctx2.beginPath();ctx2.arc(0,0,cell*(.08+ring*.1),-Math.PI*.7,Math.PI*.7);ctx2.stroke();}
          ctx2.fillStyle=`rgba(${palette[1]},0.95)`;ctx2.beginPath();ctx2.arc(0,0,cell*.035,0,Math.PI*2);ctx2.fill();
        }else{
          ctx2.beginPath();ctx2.arc(-cell*.07,0,cell*.1,Math.PI*.5,Math.PI*1.5);ctx2.arc(cell*.07,0,cell*.1,-Math.PI*.5,Math.PI*.5);ctx2.stroke();
        }
        ctx2.restore();
      }

      // Boss security core. It stays subdued while packets remain, then
      // activates clearly so the player knows the next objective.
      if (run.boss) {
        const bx = offX + cell * COLS / 2;
        const by = offY + cell * ROWS / 2;
        const coreReady = run.collected >= run.required && run.bossBreaches < run.bossBreachesRequired;
        ctx2.save();
        const breachProgress = run.bossBreachesRequired > 0 ? run.bossBreaches / run.bossBreachesRequired : 0;
        ctx2.globalAlpha = coreReady ? 0.72 + 0.2 * Math.sin(time / 140) : Math.max(0.07, 0.18 - breachProgress * 0.1);
        ctx2.strokeStyle = coreReady ? "#fda4af" : "#fb7185";
        ctx2.fillStyle = coreReady ? "rgba(244,63,94,0.28)" : "rgba(244,63,94,0.08)";
        ctx2.shadowColor = "#ef4444";
        ctx2.shadowBlur = coreReady ? cell * 2 : cell * 0.7;
        ctx2.lineWidth = Math.max(2, cell * 0.12);
        ctx2.beginPath();
        ctx2.arc(bx, by, cell * Math.max(0.42, 0.72 - breachProgress * 0.22), 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        for (let ring = 0; ring < 3; ring++) {
          ctx2.beginPath();
          ctx2.arc(bx, by, cell * (1.3 + ring * 0.5), time / (350 + ring * 90), time / (350 + ring * 90) + Math.PI * 1.4);
          ctx2.stroke();
        }
        if (coreReady) {
          ctx2.fillStyle = "#fecdd3";
          ctx2.font = `bold ${Math.max(7, cell * 0.24)}px ui-monospace, monospace`;
          ctx2.textAlign = "center";
          ctx2.textBaseline = "middle";
          ctx2.fillText(`BREACH ${run.bossBreaches + 1}/${run.bossBreachesRequired}`, bx, by - cell * 1.05);
        }
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
        const targetAim = Math.atan2(run.player.y - g.y, run.player.x - g.x);
        const moveDx=g.tx-g.x, moveDy=g.ty-g.y;
        const moveAim=Math.abs(moveDx)+Math.abs(moveDy)>.02?Math.atan2(moveDy,moveDx):targetAim;
        const distanceToRunner = renderField[Math.round(g.y)]?.[Math.round(g.x)] ?? -1;
        const alerted = g.stunned<=0 && g.state==="chase";
        ctx2.translate(cx, cy);

        // Detection light communicates AI state without covering the corridor.
        if(g.stunned<=0){
          const sensorAim=g.state==="chase"?targetAim:moveAim;
          ctx2.save();ctx2.rotate(sensorAim);
          const coneLength=cell*(g.state==="chase"?3.25:g.state==="search"?2.15:1.7);
          const coneWidth=cell*(g.state==="chase"?1.05:g.state==="search"?.72:.52);
          const cone=ctx2.createLinearGradient(cell*.12,0,coneLength,0);
          const coneRgb=g.state==="search"?"251,146,60":"248,113,113";
          cone.addColorStop(0,`rgba(${coneRgb},${g.state==="chase"?.24:g.state==="search"?.13:.075})`);
          cone.addColorStop(1,`rgba(${coneRgb},0)`);
          ctx2.fillStyle=cone;ctx2.beginPath();ctx2.moveTo(cell*.12,0);ctx2.lineTo(coneLength,-coneWidth);ctx2.lineTo(coneLength,coneWidth);ctx2.closePath();ctx2.fill();ctx2.restore();
        }

        // Body orientation follows travel, making movement feel physical rather than turret-like.
        ctx2.rotate(moveAim + Math.PI / 2);
        const turnVector=(g.tx-g.x)*(g.y-g.fromY)-(g.ty-g.y)*(g.x-g.fromX);
        const roleBank=g.kind==="interceptor"?.13:g.kind==="hunter"?.075:g.kind==="scanner"?.045:.025;
        ctx2.rotate(Math.max(-1,Math.min(1,turnVector))*roleBank);
        if(g.kind==="hunter" && g.state==="chase")ctx2.translate(0,-cell*(.025+.025*Math.sin(time/85)));
        if(g.stunned>0)ctx2.globalAlpha=.52+.12*Math.sin(time/75);
        const s = cell * 0.82;
        // Personality motion: same mechanics, different attitude.
        const personalityPhase=time/1000+g.x*.31+g.y*.17;
        if(g.kind==="scanner"){
          ctx2.translate(Math.sin(personalityPhase*2.2)*cell*.018,Math.cos(personalityPhase*1.7)*cell*.012);
          ctx2.rotate(Math.sin(personalityPhase*1.35)*.035);
        }else if(g.kind==="hunter"){
          const prowl=g.state==="chase"?Math.sin(time/72)*.045:Math.sin(personalityPhase*2)*.018;
          ctx2.scale(1-prowl,1+prowl);
        }else if(g.kind==="interceptor"){
          ctx2.rotate(Math.sin(personalityPhase*4.1)*.028);
          ctx2.translate(Math.sin(personalityPhase*5.3)*cell*.018,0);
        }else{
          const heavy=.012*Math.sin(personalityPhase*1.25);
          ctx2.translate(0,Math.abs(Math.sin(personalityPhase*1.25))*cell*.018);
          ctx2.scale(1+heavy,1-heavy*.45);
        }
        ctx2.shadowColor = alerted ? "rgba(248,113,113,0.95)" : "rgba(248,113,113,0.68)";
        ctx2.shadowBlur = cell * (alerted ? 0.9 : 0.62);
        const guardGradient = ctx2.createLinearGradient(-s*.35, -s*.5, s*.3, s*.5);
        guardGradient.addColorStop(0, g.stunned>0 ? "#bae6fd" : "#fecaca");
        guardGradient.addColorStop(0.18, g.stunned>0 ? "#38bdf8" : "#dc2626");
        guardGradient.addColorStop(0.58, g.stunned>0 ? "#075985" : "#991b1b");
        guardGradient.addColorStop(1, "#260909");
        ctx2.fillStyle = guardGradient;
        ctx2.strokeStyle = "rgba(254,202,202,0.82)";
        ctx2.lineWidth = Math.max(0.8, cell * 0.045);

        if (g.kind === "scanner") {
          // Wide sensor drone: broad body, twin antennae and a sweeping lens.
          ctx2.beginPath();
          ctx2.ellipse(0, 0, s * 0.48, s * 0.31, 0, 0, Math.PI * 2);
          ctx2.fill(); ctx2.stroke();
          ctx2.beginPath();
          ctx2.moveTo(-s*.28,-s*.24); ctx2.lineTo(-s*.46,-s*.48);
          ctx2.moveTo(s*.28,-s*.24); ctx2.lineTo(s*.46,-s*.48);
          ctx2.stroke();
          ctx2.strokeStyle = "rgba(254,202,202,0.7)";
          ctx2.beginPath(); ctx2.arc(0,0,s*.62,time/360,time/360+Math.PI*1.35); ctx2.stroke();
        } else if (g.kind === "hunter") {
          // Forward-pointing predator silhouette.
          ctx2.beginPath();
          ctx2.moveTo(0,-s*.58); ctx2.lineTo(s*.42,s*.34); ctx2.lineTo(s*.13,s*.22);
          ctx2.lineTo(0,s*.48); ctx2.lineTo(-s*.13,s*.22); ctx2.lineTo(-s*.42,s*.34);
          ctx2.closePath(); ctx2.fill(); ctx2.stroke();
          if (alerted) {
            ctx2.fillStyle="rgba(254,202,202,0.8)";
            ctx2.beginPath();ctx2.moveTo(-s*.18,s*.38);ctx2.lineTo(0,s*(.62+.08*Math.sin(time/70)));ctx2.lineTo(s*.18,s*.38);ctx2.closePath();ctx2.fill();
          }
        } else if (g.kind === "interceptor") {
          // Narrow high-speed dart with lateral stabilizers.
          ctx2.beginPath();
          ctx2.moveTo(0,-s*.64); ctx2.lineTo(s*.17,-s*.05); ctx2.lineTo(s*.48,s*.16);
          ctx2.lineTo(s*.14,s*.22); ctx2.lineTo(0,s*.52); ctx2.lineTo(-s*.14,s*.22);
          ctx2.lineTo(-s*.48,s*.16); ctx2.lineTo(-s*.17,-s*.05);
          ctx2.closePath(); ctx2.fill(); ctx2.stroke();
        } else {
          // Warden: heavy armored hexagon with an outer containment ring.
          ctx2.beginPath();
          for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;const x=Math.cos(a)*s*.48,y=Math.sin(a)*s*.48;i?ctx2.lineTo(x,y):ctx2.moveTo(x,y);}
          ctx2.closePath();ctx2.fill();ctx2.stroke();
          ctx2.strokeStyle="rgba(254,202,202,0.62)";
          ctx2.lineWidth=Math.max(1,cell*.065);
          ctx2.beginPath();ctx2.arc(0,0,s*.64,time/-650,time/-650+Math.PI*1.55);ctx2.stroke();
        }

        ctx2.shadowBlur = 0;
        // Brushed armor highlight adds material depth without another glow layer.
        ctx2.strokeStyle=g.stunned>0?"rgba(186,230,253,0.5)":"rgba(255,255,255,0.16)";
        ctx2.lineWidth=Math.max(.6,cell*.025);
        ctx2.beginPath();ctx2.moveTo(-s*.2,-s*.28);ctx2.lineTo(s*.16,-s*.34);ctx2.stroke();
        ctx2.globalAlpha*=.9;
        ctx2.strokeStyle="rgba(255,255,255,.08)";ctx2.lineWidth=Math.max(.5,cell*.018);
        for(let tex=-1;tex<=1;tex++){ctx2.beginPath();ctx2.moveTo(-s*.28,tex*s*.13);ctx2.lineTo(s*.28,tex*s*.13-s*.08);ctx2.stroke();}

        // Shared optical core keeps the enemy faction visually unified.
        ctx2.fillStyle = "#2a0b0b"; ctx2.beginPath(); ctx2.arc(0, -s * 0.04, s * 0.15, 0, Math.PI * 2); ctx2.fill();
        const guardBlink=((time+g.x*173+g.y*257)% (g.kind==="scanner"?2600:g.kind==="hunter"?3700:g.kind==="interceptor"?2100:4800))<110;
        const eyeWide=g.kind==="scanner"?1.18:g.kind==="hunter"&&alerted?.72:g.kind==="interceptor"?1.05:.88;
        const eyeTall=guardBlink?.16:g.kind==="warden"?.7:1;
        ctx2.fillStyle = g.stunned>0 ? "#e0f2fe" : alerted ? "#fff1f2" : g.state==="search" ? "#fed7aa" : "#fecaca";
        ctx2.beginPath(); ctx2.ellipse(0,-s*.055,s*.06*eyeWide,s*.06*eyeTall,0,0,Math.PI*2); ctx2.fill();
        // Scanner looks curious, Hunter squints, Interceptor twitches, Warden looks unimpressed.
        if(g.kind==="scanner"){ctx2.strokeStyle="rgba(254,202,202,.7)";ctx2.beginPath();ctx2.arc(0,-s*.055,s*.105,-2.7,-.45);ctx2.stroke();}
        else if(g.kind==="hunter"&&alerted){ctx2.strokeStyle="rgba(254,202,202,.8)";ctx2.beginPath();ctx2.moveTo(-s*.09,-s*.13);ctx2.lineTo(s*.09,-s*.1);ctx2.stroke();}
        else if(g.kind==="interceptor"){ctx2.fillStyle="rgba(255,255,255,.5)";ctx2.beginPath();ctx2.arc(Math.sin(time/95)*s*.025,-s*.07,s*.018,0,Math.PI*2);ctx2.fill();}
        else if(g.kind==="warden"){ctx2.strokeStyle="rgba(254,202,202,.65)";ctx2.beginPath();ctx2.moveTo(-s*.1,-s*.12);ctx2.lineTo(s*.1,-s*.12);ctx2.stroke();}
        if(g.stunned>0){
          // Electrical interruption makes EMP status immediately legible.
          ctx2.strokeStyle="rgba(125,211,252,0.9)";ctx2.lineWidth=Math.max(1,cell*.045);
          for(let z=0;z<2;z++){const ox=(z?1:-1)*s*.34;ctx2.beginPath();ctx2.moveTo(ox,-s*.32);ctx2.lineTo(ox+s*.09,-s*.12);ctx2.lineTo(ox-s*.03,s*.02);ctx2.lineTo(ox+s*.08,s*.22);ctx2.stroke();}
        }
        if (g.state === "search" && g.stunned<=0) {
          ctx2.strokeStyle="rgba(253,186,116,0.72)";
          ctx2.lineWidth=Math.max(.8,cell*.04);
          ctx2.beginPath();ctx2.arc(0,0,s*.73,time/420,time/420+Math.PI*.85);ctx2.stroke();
        }
        ctx2.restore();
      }

      // True motion-history trail follows the route and bends naturally through turns.
      ctx2.save();
      for(let i=0;i<trailRef.current.length;i++){
        const point=trailRef.current[i]!;
        const age=Math.max(0,time-point.born), fade=Math.max(0,1-age/360);
        const size=cell*(.07+.08*fade);
        ctx2.globalAlpha=.28*fade;
        ctx2.fillStyle=run.activePower?.kind==="overclock"?"#fbbf24":"#5eead4";
        ctx2.beginPath();ctx2.arc(offX+(point.x+.5)*cell,offY+(point.y+.5)*cell,size,0,Math.PI*2);ctx2.fill();
      }
      ctx2.restore();

      // Player hero: a directional bio-digital virus with a stable silhouette.
      const pcx = offX + (run.player.x + 0.5) * cell;
      const pcy = offY + (run.player.y + 0.5) * cell;
      const momentum = run.streak > 1 && run.streakTimer > 0 ? run.streak : 0;
      const dx = run.player.tx - run.player.x;
      const dy = run.player.ty - run.player.y;
      const targetHeading = Math.abs(dx) + Math.abs(dy) > 0.02 ? Math.atan2(dy, dx) : playerVisualRef.current.heading;
      const visual=playerVisualRef.current;
      // Shortest-path angular interpolation prevents 90-degree turns from snapping.
      let angleDelta=((targetHeading-visual.heading+Math.PI*3)%(Math.PI*2))-Math.PI;
      visual.heading+=angleDelta*.16;
      const heading=visual.heading;
      const movingPulse = run.player.moving ? Math.sin(time / 125) : Math.sin(time / 320);
      const bodyR = cell * (0.36 + movingPulse * 0.013);
      const wallSquish=wallSquishRef.current.amount;
      const wallAngle=wallSquishRef.current.angle;
      const motionPhys=motionPhysicsRef.current;
      const targetStretch=run.player.moving ? Math.min(.085,.028+momentum*.01) : 0;
      visual.stretch+=(targetStretch-visual.stretch)*.13;
      visual.squish+=(wallSquish-visual.squish)*.2;
      const movingStretch=visual.stretch;

      // A soft offset contact shadow creates separation from the board before the glow.
      ctx2.save();ctx2.fillStyle="rgba(0,0,0,.34)";ctx2.beginPath();ctx2.ellipse(pcx+cell*.08,pcy+cell*.17,cell*.39,cell*.2,0,0,Math.PI*2);ctx2.fill();ctx2.restore();

      // Restrained ground light anchors the character to the playfield.
      ctx2.save();
      const haloRadius = cell * (0.92 + momentum * 0.055);
      const halo = ctx2.createRadialGradient(pcx, pcy, 0, pcx, pcy, haloRadius);
      halo.addColorStop(0, `rgba(94,234,212,${0.2 + momentum * 0.018})`);
      halo.addColorStop(0.46, "rgba(45,212,191,0.065)");
      halo.addColorStop(1, "rgba(45,212,191,0)");
      ctx2.fillStyle = halo; ctx2.beginPath(); ctx2.arc(pcx,pcy,haloRadius,0,Math.PI*2);ctx2.fill();
      ctx2.restore();

      ctx2.save();
      if (run.player.invuln > 0) ctx2.globalAlpha = 0.5 + 0.35 * Math.sin(time / 55);
      if(run.activePower?.kind==="cloak")ctx2.globalAlpha*=.48+.16*Math.sin(time/90);
      ctx2.translate(pcx,pcy);
      if(run.activePower?.kind==="overclock")ctx2.scale(1.12,.9);
      // Wall compression is oriented toward the attempted collision direction.
      // Stretch is aligned with travel, giving acceleration a soft-body feel.
      // Blend all soft-body influences so the organism continuously deforms.
      const reverseBounce=motionPhys.reverse;
      const turnBank=motionPhys.turn*motionPhys.turnSign;
      const impact=Math.max(0,motionPhys.hit);
      const squash=Math.max(-.18,Math.min(.82,wallSquish));
      const deformationAngle=impact>.08?motionPhys.hitAngle:squash>.02?wallAngle:heading;
      ctx2.rotate(deformationAngle);
      ctx2.translate(cell*(impact*.1-squash*.045-reverseBounce*.055),cell*turnBank*.03);
      const compression=impact*.18+squash*.23+reverseBounce*.1;
      ctx2.scale(1+movingStretch-compression,1-movingStretch*.5+compression*.68);
      ctx2.rotate(heading-deformationAngle+turnBank*.14);

      if(run.activePower?.kind==="emp"){
        ctx2.strokeStyle=`rgba(103,232,249,${.28+.12*Math.sin(time/110)})`;ctx2.lineWidth=Math.max(1,cell*.045);
        ctx2.beginPath();ctx2.arc(0,0,bodyR*(1.65+.12*Math.sin(time/140)),0,Math.PI*2);ctx2.stroke();
      }
      if(run.activePower?.kind==="magnet"){
        ctx2.strokeStyle="rgba(250,204,21,0.42)";ctx2.lineWidth=Math.max(1,cell*.04);
        for(let m=0;m<2;m++){ctx2.beginPath();ctx2.arc(0,0,bodyR*(1.4+m*.35),-.8+time/900,.8+time/900);ctx2.stroke();}
      }

      // Momentum creates a rear energy wake, visually pointing in the travel direction.
      if (momentum > 0 && run.player.moving) {
        for(let i=0;i<3;i++){
          const wake=cell*(.34+i*.2);
          ctx2.strokeStyle=`rgba(45,212,191,${.26-i*.065})`;
          ctx2.lineWidth=Math.max(1,cell*(.075-i*.012));
          ctx2.beginPath();ctx2.moveTo(-bodyR*.65,-bodyR*.38+i*bodyR*.38);ctx2.lineTo(-bodyR-wake,-bodyR*.28+i*bodyR*.28);ctx2.stroke();
        }
      }

      // Six asymmetrical viral spikes create a recognizable character silhouette.
      ctx2.strokeStyle="rgba(153,246,228,0.88)";
      ctx2.lineWidth=Math.max(1,cell*.065);
      ctx2.lineCap="round";
      for(let i=0;i<6;i++){
        const phase=visual.spikePhase[i]!;
        const baseAngle=i*Math.PI/3 + (i%2 ? .065 : -.05);
        // Slow organic drift plus a smaller secondary wave avoids mechanical pulsing.
        const angle=baseAngle + .045*Math.sin(time/520+phase) + .018*Math.sin(time/930+phase*1.7);
        const root=bodyR*.82;
        const length=bodyR*(1.32 + .055*Math.sin(time/430+phase) + .022*Math.sin(time/760+phase*1.4));
        const tipX=Math.cos(angle)*length,tipY=Math.sin(angle)*length;
        const rootX=Math.cos(angle)*root,rootY=Math.sin(angle)*root;
        // A quadratic stem gives each spike a soft flex instead of a rigid line.
        const bend=.08*Math.sin(time/610+phase);
        const midAngle=angle+bend;
        const midR=(root+length)*.52;
        ctx2.beginPath();
        ctx2.moveTo(rootX,rootY);
        ctx2.quadraticCurveTo(Math.cos(midAngle)*midR,Math.sin(midAngle)*midR,tipX,tipY);
        ctx2.stroke();
        ctx2.save();ctx2.globalAlpha=.42;ctx2.strokeStyle="#ecfeff";ctx2.lineWidth=Math.max(.5,cell*.018);
        ctx2.beginPath();ctx2.moveTo(rootX-cell*.012,rootY-cell*.012);ctx2.quadraticCurveTo(Math.cos(midAngle)*midR-cell*.012,Math.sin(midAngle)*midR-cell*.012,tipX-cell*.012,tipY-cell*.012);ctx2.stroke();ctx2.restore();
        ctx2.fillStyle=i===0?"#99f6e4":"#5eead4";
        ctx2.beginPath();ctx2.arc(tipX,tipY,cell*(i===0?.07:.052),0,Math.PI*2);ctx2.fill();
      }

      // Membrane has a subtle forward lean rather than a generic perfect circle.
      ctx2.shadowColor="rgba(45,212,191,0.72)";
      ctx2.shadowBlur=cell*(.52+momentum*.055);
      const organism=ctx2.createRadialGradient(-bodyR*.18,-bodyR*.22,bodyR*.06,0,0,bodyR);
      organism.addColorStop(0,"#ecfeff");organism.addColorStop(.22,"#5eead4");organism.addColorStop(.7,"#0d9488");organism.addColorStop(1,"#134e4a");
      ctx2.fillStyle=organism;
      ctx2.beginPath();
      ctx2.ellipse(bodyR*.055,0,bodyR*1.08,bodyR*.92,0,0,Math.PI*2);
      ctx2.fill();
      ctx2.shadowBlur=0;

      // Inner membrane and animated nucleus provide detail without muddying the outline.
      ctx2.strokeStyle="rgba(204,251,241,0.5)";
      ctx2.lineWidth=Math.max(.8,cell*.035);
      ctx2.beginPath();ctx2.ellipse(bodyR*.03,0,bodyR*.76,bodyR*.62,time/1500,0,Math.PI*2);ctx2.stroke();
      const nucleusX=bodyR*(.1+.07*Math.sin(time/310));
      const nucleusY=bodyR*.08*Math.cos(time/270);
      ctx2.fillStyle="rgba(4,47,46,0.94)";ctx2.beginPath();ctx2.arc(nucleusX,nucleusY,bodyR*.32,0,Math.PI*2);ctx2.fill();
      ctx2.fillStyle="#ccfbf1";ctx2.beginPath();ctx2.arc(nucleusX-bodyR*.09,nucleusY-bodyR*.1,bodyR*.085,0,Math.PI*2);ctx2.fill();

      // Semi-transparent membrane texture follows the body, suggesting organic depth.
      ctx2.save();ctx2.globalAlpha=.14;ctx2.fillStyle="#ecfeff";
      for(let pore=0;pore<7;pore++){const pa=pore*2.399+time/9000;const pr=bodyR*(.25+(pore%3)*.18);ctx2.beginPath();ctx2.arc(Math.cos(pa)*pr,Math.sin(pa)*pr*.72,bodyR*(.025+(pore%2)*.012),0,Math.PI*2);ctx2.fill();}ctx2.restore();

      // Organic blink: two forward-facing optical slits close briefly on an irregular cycle.
      const blinkCycle=(time+1370)%4300;
      const blink=blinkCycle<150 ? Math.max(.08,Math.abs(blinkCycle-75)/75) : 1;
      const eyeX=bodyR*.42,eyeY=bodyR*.18;
      ctx2.fillStyle="rgba(236,254,255,.94)";ctx2.shadowColor="rgba(153,246,228,.7)";ctx2.shadowBlur=bodyR*.18;
      for(const ey of [-eyeY,eyeY]){ctx2.beginPath();ctx2.ellipse(eyeX,ey,bodyR*.095,bodyR*.052*blink,0,0,Math.PI*2);ctx2.fill();}
      ctx2.shadowBlur=0;

      // At high momentum the membrane gains a clean energy ring rather than more particles.
      if(momentum>=4){
        ctx2.strokeStyle=`rgba(103,232,249,${.42+.12*Math.sin(time/90)})`;
        ctx2.lineWidth=Math.max(1,cell*.045);
        ctx2.beginPath();ctx2.ellipse(0,0,bodyR*1.48,bodyR*1.12,time/520,0,Math.PI*2);ctx2.stroke();
      }
      ctx2.restore();

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
        const fade = 1 - q;
        ctx2.globalAlpha = fade;
        ctx2.strokeStyle = `rgba(${rgb},${0.95 * fade})`;
        ctx2.shadowColor = `rgba(${rgb},0.8)`;
        ctx2.shadowBlur = cell * (fx.kind === "hit" ? 1.25 : fx.kind === "power" ? 1.05 : 0.7) * fade;
        ctx2.lineWidth = Math.max(1, cell * (0.13 - q * 0.075));
        const ringCount = fx.kind === "exit" ? 4 : fx.kind === "power" || fx.kind === "hit" ? 3 : 2;
        for (let ring = 0; ring < ringCount; ring++) {
          ctx2.beginPath();
          const radius = cell * (0.2 + q * (1.25 + ring * 0.42));
          if (fx.kind === "near") {
            // Near misses read as fast broken arcs instead of a pickup explosion.
            ctx2.arc(fxX, fxY, radius, -0.7 + ring * 0.4, 0.9 + ring * 0.4);
          } else {
            ctx2.arc(fxX, fxY, radius, 0, Math.PI * 2);
          }
          ctx2.stroke();
        }
        const particles = fx.kind === "exit" ? 24 : fx.kind === "hit" ? 20 : fx.kind === "power" ? 18 : fx.kind === "near" ? 8 : 14;
        for (let i = 0; i < particles; i++) {
          const a = (i / particles) * Math.PI * 2 + (fx.born % 97) * 0.03;
          const burst = fx.kind === "hit" ? 1.55 : fx.kind === "power" ? 1.35 : fx.kind === "near" ? 0.8 : 1;
          const d = cell * q * burst * (0.7 + (i % 5) * 0.22);
          const size = Math.max(1, cell * (0.12 - q * 0.06));
          ctx2.fillStyle = `rgba(${rgb},${0.98 * fade})`;
          if (fx.kind === "packet") {
            ctx2.save();
            ctx2.translate(fxX + Math.cos(a) * d, fxY + Math.sin(a) * d);
            ctx2.rotate(a + Math.PI / 4);
            ctx2.fillRect(-size / 2, -size / 2, size, size);
            ctx2.restore();
          } else {
            ctx2.fillRect(fxX + Math.cos(a) * d - size / 2, fxY + Math.sin(a) * d - size / 2, size, fx.kind === "hit" ? size * 0.45 : size);
          }
        }
        if(fx.kind==="packet" && q<.7 && run.streak>1){
          const labelFade=1-q/.7;
          ctx2.save();ctx2.globalAlpha=labelFade*.85;ctx2.fillStyle="#bae6fd";
          ctx2.font=`bold ${Math.max(7,cell*.22)}px ui-monospace, monospace`;ctx2.textAlign="center";
          ctx2.fillText(`x${run.streak}`,fxX,fxY-cell*(.5+q*.45));ctx2.restore();
        }

        // Collected data streams from its grid cell into the virus instead of
        // simply vanishing. Ease-in acceleration makes it feel magnetically absorbed.
        if(fx.kind==="packet" && fx.targetX!==undefined && fx.targetY!==undefined){
          const transferLife=.62;
          const tq=Math.min(1,q/transferLife);
          const eased=tq*tq*(3-2*tq);
          const targetX=offX+(fx.targetX+.5)*cell;
          const targetY=offY+(fx.targetY+.5)*cell;
          const tx=fxX+(targetX-fxX)*eased;
          const ty=fxY+(targetY-fxY)*eased;
          ctx2.save();
          ctx2.globalAlpha=Math.max(0,1-tq);
          ctx2.strokeStyle=`rgba(125,211,252,${.72*(1-tq)})`;
          ctx2.lineWidth=Math.max(1,cell*.055*(1-tq*.45));
          ctx2.shadowColor="#38bdf8";ctx2.shadowBlur=cell*.55;
          ctx2.beginPath();ctx2.moveTo(fxX,fxY);ctx2.quadraticCurveTo((fxX+targetX)/2,Math.min(fxY,targetY)-cell*.55,tx,ty);ctx2.stroke();
          ctx2.translate(tx,ty);ctx2.rotate(time/180);
          const dataSize=cell*(.16-.07*tq);
          ctx2.fillStyle="#e0f2fe";ctx2.fillRect(-dataSize,-dataSize,dataSize*2,dataSize*2);
          ctx2.restore();

          // Final absorption briefly energizes the virus membrane/nucleus.
          if(tq>.72){
            const absorb=(tq-.72)/.28;
            ctx2.save();ctx2.globalAlpha=(1-absorb)*.7;
            ctx2.strokeStyle="rgba(94,234,212,0.9)";ctx2.lineWidth=Math.max(1,cell*.06);
            ctx2.beginPath();ctx2.arc(targetX,targetY,cell*(.22+absorb*.48),0,Math.PI*2);ctx2.stroke();
            ctx2.restore();
          }
        }

        // A brief central flash gives pickups and impacts a crisp first frame.
        if (q < 0.22 && fx.kind !== "near") {
          const flash = ctx2.createRadialGradient(fxX, fxY, 0, fxX, fxY, cell * (0.9 + q * 2));
          flash.addColorStop(0, `rgba(${rgb},${0.5 * (1 - q / 0.22)})`);
          flash.addColorStop(1, `rgba(${rgb},0)`);
          ctx2.fillStyle = flash;
          ctx2.beginPath(); ctx2.arc(fxX, fxY, cell * (0.9 + q * 2), 0, Math.PI * 2); ctx2.fill();
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

      if(phaseRef.current==="levelclear"){
        const remaining=Math.max(0,levelClearTimerRef.current);
        const progress=1-Math.min(1,remaining/1.4);
        ctx2.save();ctx2.fillStyle=`rgba(2,6,23,${Math.min(.82,progress*.9)})`;ctx2.fillRect(0,0,rect.width,rect.height);
        ctx2.globalAlpha=Math.min(1,progress*2.5);ctx2.fillStyle="#ccfbf1";ctx2.textAlign="center";ctx2.textBaseline="middle";
        ctx2.font=`700 ${Math.max(14,cell*.72)}px ui-sans-serif, system-ui`;ctx2.fillText(run.boss?"SECURITY BREACHED":"SYSTEM CLEARED",rect.width/2,rect.height/2-cell*.2);
        ctx2.fillStyle="rgba(153,246,228,.75)";ctx2.font=`600 ${Math.max(9,cell*.3)}px ui-monospace, monospace`;ctx2.fillText(`ENTERING ${STAGES[run.level%STAGES.length]?.system?.toUpperCase()??"NEXT SYSTEM"}`,rect.width/2,rect.height/2+cell*.65);ctx2.restore();
      }

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
    keysRef.current = [dir];
    queuedDirRef.current = dir;
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
    const axisBias = 1.18;
    const horizontal = Math.abs(dx) > Math.abs(dy) * axisBias;
    const vertical = Math.abs(dy) > Math.abs(dx) * axisBias;
    if (!horizontal && !vertical) return;
    const dir = horizontal ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    keysRef.current = [dir];
    queuedDirRef.current = dir;
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
          then reach the open port to slip deeper. There is no last level: each system is harder than the one
          before it.
        </p>
        <div className="flex flex-col items-center gap-1 font-mono text-xs text-muted-foreground">
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
        <p className="text-sm text-muted-foreground">{hud.boss ? `${hud.bossTitle} defeated · routing deeper…` : "Entering the next system…"}</p>
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
        <div className={cn("grid grid-cols-5 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur-xl", mobileLandscape && "pointer-events-auto absolute left-[max(8px,env(safe-area-inset-left))] top-[max(8px,env(safe-area-inset-top))] w-fit grid-cols-4 overflow-hidden rounded-xl border border-primary/20 bg-background/85 shadow-lg backdrop-blur-md")}>
          <GameStat label="Level" value={hud.level} />
          <div className={cn(mobileLandscape && "hidden")}><GameStat label="System" value={hud.boss ? hud.bossTitle : hud.system || "—"} accent /></div>
          <GameStat
            label={hud.boss ? "Security" : "Packets"}
            value={hud.boss ? `${hud.bossBreaches}/${hud.bossBreachesRequired}` : `${hud.collected}/${hud.required}`}
            accent={hud.boss}
          />
          <GameStat label={hud.power ? "Power" : "Streak"} value={hud.power || (hud.streak>1 ? `x${hud.streak} · +${hud.streak * 3}%` : "—")} accent={Boolean(hud.power || hud.streak>1)} />
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

      <div className={cn("relative overflow-hidden rounded-lg border border-border/80 bg-card/75 p-1.5 shadow-2xl backdrop-blur-xl", mobileLandscape && "absolute inset-0 m-0 h-[100dvh] w-[100dvw] rounded-none border-0 bg-black p-0 shadow-none")}>
        <canvas
          ref={canvasRef}
           className={cn("block w-full touch-none select-none rounded-md aspect-[31/21] [-webkit-user-select:none] [-webkit-touch-callout:none]", mobileLandscape && "h-[100dvh] w-[100dvw] max-w-none rounded-none aspect-auto")}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerEnd}
          onPointerCancel={onCanvasPointerEnd}
        />
        {overlay}
      </div>

      {/* Phone controls: one large thumb stick. The playfield itself also supports drag-to-steer. */}
      <div className={cn("mt-3 flex items-center justify-between gap-4 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] md:hidden", mobileLandscape && "absolute bottom-[max(12px,env(safe-area-inset-bottom))] right-[max(12px,env(safe-area-inset-right))] z-40 m-0 w-auto bg-transparent p-0")} aria-label="Mobile game controls">
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
    if (mag < 8) return;
    // Require a little axis commitment so diagonal thumb drift does not
    // constantly flip between horizontal and vertical movement.
    const axisBias = 1.16;
    if (Math.abs(dx) > Math.abs(dy) * axisBias) onDir(dx > 0 ? "right" : "left");
    else if (Math.abs(dy) > Math.abs(dx) * axisBias) onDir(dy > 0 ? "down" : "up");
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="Movement stick"
      className={cn("relative flex touch-none select-none items-center justify-center rounded-full border border-border bg-card/90 shadow-lg backdrop-blur-xl [-webkit-user-select:none] [-webkit-touch-callout:none]", mobile ? "size-32" : "size-16")}
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
      <span
        className={cn("pointer-events-none absolute rounded-full border border-primary/40 bg-primary/20 shadow-md transition-transform duration-75", mobile ? "size-12" : "size-7")}
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
