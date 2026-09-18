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
} from "lucide-react";

import { cn } from "@/lib/utils";

const COLS = 25;
const ROWS = 17;
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
];

interface Best {
  bestLevel: number;
  packets: number;
}

function readBest(): Best {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Best>;
      return { bestLevel: parsed.bestLevel ?? 0, packets: parsed.packets ?? 0 };
    }
  } catch {
    /* ignore */
  }
  return { bestLevel: 0, packets: 0 };
}

function writeBest(best: Best): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
  } catch {
    /* ignore */
  }
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
  const extra = Math.floor(COLS * ROWS * 0.035);
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

interface Guard {
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
  required: number;
  collected: number;
  port: { x: number; y: number };
  portOpen: boolean;
  player: Player;
  guards: Guard[];
  integrity: number;
  packetsTotal: number;
}

function buildLevel(level: number): RunState {
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

  const guardCount = Math.min(2 + Math.floor(level * 0.8), 11);
  const guardSpeed = Math.min(BASE_GUARD_SPEED + (level - 1) * 0.16, MAX_GUARD_SPEED);
  const detection = 6 + Math.min(level, 9);
  const guards: Guard[] = [];
  const openCells = candidates.filter(
    (c) => dist[c.y]![c.x]! > 8 && Math.abs(c.x - spawn.x) + Math.abs(c.y - spawn.y) > 10,
  );
  for (let i = 0; i < guardCount && openCells.length > 0; i++) {
    const cell = openCells.splice(Math.floor(Math.random() * openCells.length), 1)[0]!;
    guards.push({ x: cell.x, y: cell.y, tx: cell.x, ty: cell.y, speed: guardSpeed, detection, fromX: cell.x, fromY: cell.y });
  }

  return {
    level,
    theme,
    grid,
    packets,
    required,
    collected: 0,
    port,
    portOpen: false,
    player: { x: spawn.x, y: spawn.y, tx: spawn.x, ty: spawn.y, moving: false, invuln: 1.5 },
    guards,
    integrity: MAX_INTEGRITY,
    packetsTotal: packets.length,
  };
}

// --- Component -------------------------------------------------------------

type Phase = "menu" | "playing" | "paused" | "gameover" | "levelclear";

export function VirusRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<RunState | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const distFieldRef = useRef<number[][] | null>(null);
  const fieldAgeRef = useRef(0);
  const keysRef = useRef<string[]>([]);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const levelClearTimerRef = useRef(0);
  const bestRef = useRef<Best>({ bestLevel: 0, packets: 0 });

  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState({ level: 1, integrity: MAX_INTEGRITY, collected: 0, required: 3, system: "", hint: "", bestLevel: 0, bestPackets: 0 });

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
    }));
  }, []);

  const startRun = useCallback(() => {
    bestRef.current = readBest();
    runRef.current = buildLevel(1);
    distFieldRef.current = null;
    fieldAgeRef.current = 999;
    keysRef.current = [];
    syncHud(runRef.current);
    setPhaseBoth("playing");
    lastRef.current = 0;
  }, [setPhaseBoth, syncHud]);

  const resume = useCallback(() => setPhaseBoth("playing"), [setPhaseBoth]);
  const pause = useCallback(() => setPhaseBoth("paused"), [setPhaseBoth]);

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

      // Decay invulnerability.
      if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);

      // Refresh the distance field from the player every 0.25s.
      fieldAgeRef.current += dt;
      if (fieldAgeRef.current > 0.25 || !distFieldRef.current) {
        distFieldRef.current = distanceField(run.grid, Math.round(p.x), Math.round(p.y));
        fieldAgeRef.current = 0;
      }
      const field = distFieldRef.current!;

      // Player movement, cell to cell.
      if (!p.moving) {
        const held = keysRef.current[keysRef.current.length - 1];
        if (held) {
          const [dx, dy] = DIR_VECS[held]!;
          const nx = Math.round(p.x) + dx;
          const ny = Math.round(p.y) + dy;
          if (run.grid[ny]?.[nx] === 0) {
            p.tx = nx;
            p.ty = ny;
            p.moving = true;
          }
        }
      }
      if (p.moving) {
        const r = stepEntity(p.x, p.y, p.tx, p.ty, PLAYER_SPEED, dt);
        p.x = r.x;
        p.y = r.y;
        if (r.arrived) p.moving = false;
      }

      // Packets.
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      for (const packet of run.packets) {
        if (!packet.taken && packet.x === px && packet.y === py) {
          packet.taken = true;
          run.collected += 1;
          if (run.collected >= run.required) run.portOpen = true;
          syncHud(run);
        }
      }

      // Guards.
      for (const g of run.guards) {
        const gx = Math.round(g.x);
        const gy = Math.round(g.y);
        const toPlayer = field[gy]?.[gx] ?? -1;
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
          if (toPlayer >= 0 && toPlayer <= g.detection) {
            options.sort((a, b) => (field[a[1]]![a[0]] ?? 999) - (field[b[1]]![b[0]] ?? 999));
            chosen = options[0]!;
          } else {
            chosen = options[Math.floor(Math.random() * options.length)]!;
          }
          g.fromX = gx;
          g.fromY = gy;
          g.tx = chosen[0];
          g.ty = chosen[1];
        }
        const r = stepEntity(g.x, g.y, g.tx, g.ty, g.speed, dt);
        g.x = r.x;
        g.y = r.y;

        // Contact.
        if (p.invuln <= 0 && Math.abs(g.x - p.x) < 0.55 && Math.abs(g.y - p.y) < 0.55) {
          run.integrity -= 1;
          p.x = 1;
          p.y = 1;
          p.tx = 1;
          p.ty = 1;
          p.moving = false;
          p.invuln = 2;
          keysRef.current = [];
          syncHud(run);
          if (run.integrity <= 0) {
            // Game over: record bests honestly from this run.
            const best = readBest();
            const next: Best = {
              bestLevel: Math.max(best.bestLevel, run.level - 1),
              packets: best.packets + run.collected,
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
        // Level cleared: heal one point (capped) and bank packets.
        run.integrity = Math.min(MAX_INTEGRITY, run.integrity + 1);
        const best = readBest();
        writeBest({ bestLevel: Math.max(best.bestLevel, run.level), packets: best.packets + run.collected });
        bestRef.current = { bestLevel: Math.max(best.bestLevel, run.level), packets: best.packets + run.collected };
        syncHud(run);
        levelClearTimerRef.current = 1.4;
        setPhaseBoth("levelclear");
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

      const cell = Math.min(rect.width / COLS, rect.height / ROWS);
      const offX = (rect.width - cell * COLS) / 2;
      const offY = (rect.height - cell * ROWS) / 2;
      const t = run.theme;

      ctx2.fillStyle = t.bg;
      ctx2.fillRect(0, 0, rect.width, rect.height);

      // Walls as inset blocks, like circuitry.
      const pad = cell * 0.08;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (run.grid[y]![x] === 1) {
            ctx2.fillStyle = t.wall;
            roundRect(ctx2, offX + x * cell + pad, offY + y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.18);
            ctx2.fill();
            ctx2.strokeStyle = t.wallEdge;
            ctx2.lineWidth = 1;
            ctx2.stroke();
          }
        }
      }

      // Port.
      const pulse = 0.6 + 0.4 * Math.sin(time / 220);
      ctx2.save();
      ctx2.globalAlpha = run.portOpen ? pulse : 0.28;
      ctx2.fillStyle = "#2dd4bf";
      roundRect(ctx2, offX + run.port.x * cell + pad, offY + run.port.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.3);
      ctx2.fill();
      ctx2.restore();
      ctx2.fillStyle = run.portOpen ? "#04211d" : "rgba(4,33,29,0.55)";
      ctx2.font = `bold ${cell * 0.5}px ui-monospace, monospace`;
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.fillText(">", offX + (run.port.x + 0.5) * cell, offY + (run.port.y + 0.55) * cell);

      // Packets as small data chips.
      for (const packet of run.packets) {
        if (packet.taken) continue;
        ctx2.save();
        ctx2.translate(offX + (packet.x + 0.5) * cell, offY + (packet.y + 0.5) * cell);
        ctx2.rotate(Math.PI / 4);
        ctx2.fillStyle = "#7dd3fc";
        const s = cell * 0.3;
        ctx2.fillRect(-s / 2, -s / 2, s, s);
        ctx2.strokeStyle = "rgba(125,211,252,0.5)";
        ctx2.strokeRect(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
        ctx2.restore();
      }

      // Guards: antivirus, red rotated squares with a core.
      for (const g of run.guards) {
        const cx = offX + (g.x + 0.5) * cell;
        const cy = offY + (g.y + 0.5) * cell;
        ctx2.save();
        ctx2.translate(cx, cy);
        ctx2.rotate(time / 500);
        const s = cell * 0.62;
        ctx2.fillStyle = "#ef4444";
        roundRect(ctx2, -s / 2, -s / 2, s, s, s * 0.22);
        ctx2.fill();
        ctx2.fillStyle = "#7f1d1d";
        ctx2.fillRect(-s * 0.18, -s * 0.18, s * 0.36, s * 0.36);
        ctx2.restore();
      }

      // Player: a pulsing teal organism.
      const pcx = offX + (run.player.x + 0.5) * cell;
      const pcy = offY + (run.player.y + 0.5) * cell;
      const wobble = 1 + 0.08 * Math.sin(time / 120);
      ctx2.save();
      if (run.player.invuln > 0) ctx2.globalAlpha = 0.45 + 0.4 * Math.sin(time / 60);
      const r = cell * 0.36 * wobble;
      ctx2.fillStyle = "#2dd4bf";
      ctx2.beginPath();
      ctx2.arc(pcx, pcy, r, 0, Math.PI * 2);
      ctx2.fill();
      // Spikes.
      ctx2.strokeStyle = "#2dd4bf";
      ctx2.lineWidth = Math.max(1, cell * 0.06);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time / 900;
        ctx2.beginPath();
        ctx2.moveTo(pcx + Math.cos(a) * r, pcy + Math.sin(a) * r);
        ctx2.lineTo(pcx + Math.cos(a) * r * 1.45, pcy + Math.sin(a) * r * 1.45);
        ctx2.stroke();
      }
      ctx2.fillStyle = "#04211d";
      ctx2.beginPath();
      ctx2.arc(pcx - r * 0.28, pcy - r * 0.1, r * 0.16, 0, Math.PI * 2);
      ctx2.arc(pcx + r * 0.28, pcy - r * 0.1, r * 0.16, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();

      // Subtle scanline vignette.
      ctx2.fillStyle = "rgba(0,0,0,0.14)";
      for (let y = 0; y < rect.height; y += 4) ctx2.fillRect(0, y, rect.width, 1);
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

  // Touch d-pad handlers.
  const pressDir = (dir: string) => {
    const list = keysRef.current.filter((k) => k !== dir);
    list.push(dir);
    keysRef.current = list;
  };
  const releaseDir = (dir: string) => {
    keysRef.current = keysRef.current.filter((k) => k !== dir);
  };

  // Drag-to-steer on the play area: touch and drag, and the virus follows
  // the direction of your finger relative to where you first touched down.
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const steerFromDrag = (dx: number, dy: number) => {
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return; // dead zone
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    keysRef.current = [dir];
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== "touch") return;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.id) return;
    steerFromDrag(e.clientX - drag.x, e.clientY - drag.y);
  };
  const onCanvasPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current && e.pointerId === dragRef.current.id) {
      dragRef.current = null;
      keysRef.current = [];
    }
  };

  const run = runRef.current;
  const overlay =
    phase === "menu" ? (
      <Overlay>
        <h3 className="font-mono text-lg font-semibold text-primary">VIRUS RUN</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          You are the virus. Collect every data packet on the system, stay away from the antivirus daemons,
          then reach the open port to slip deeper. There is no last level: each system is harder than the one
          before it.
        </p>
        <div className="flex flex-col items-center gap-1 font-mono text-xs text-muted-foreground">
          <span>Arrow keys or WASD to move, Esc to pause.</span>
          <span>On touch screens, drag on the play area or use the arrow pad below it.</span>
        </div>
        <button
          onClick={startRun}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          <Play className="size-4" aria-hidden /> Start the infection
        </button>
        {hud.bestLevel > 0 && (
          <p className="font-mono text-xs text-muted-foreground">
            Deepest breach: system {hud.bestLevel} · {hud.bestPackets} packets harvested
          </p>
        )}
      </Overlay>
    ) : phase === "paused" ? (
      <Overlay>
        <h3 className="font-mono text-lg font-semibold text-primary">PAUSED</h3>
        <div className="mt-2 flex gap-3">
          <button onClick={resume} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95">
            <Play className="size-4" aria-hidden /> Resume
          </button>
          <button onClick={startRun} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium transition-colors hover:bg-secondary">
            <RotateCcw className="size-4" aria-hidden /> Restart
          </button>
        </div>
      </Overlay>
    ) : phase === "levelclear" ? (
      <Overlay>
        <h3 className="font-mono text-lg font-semibold text-primary">SYSTEM BREACHED</h3>
        <p className="text-sm text-muted-foreground">Slipping deeper into the machine…</p>
      </Overlay>
    ) : phase === "gameover" ? (
      <Overlay>
        <h3 className="font-mono text-lg font-semibold text-red-500">QUARANTINED</h3>
        <p className="text-sm text-muted-foreground">
          The antivirus found you on system {hud.level}. You harvested {hud.collected} packets this breach.
        </p>
        {hud.bestLevel > 0 && (
          <p className="font-mono text-xs text-muted-foreground">
            Deepest breach so far: system {hud.bestLevel}
          </p>
        )}
        <button onClick={startRun} className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95">
          <RotateCcw className="size-4" aria-hidden /> Run again
        </button>
      </Overlay>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {run ? `System ${run.level} · ${hud.system}` : "Virus Run"}
          </p>
          <p className="truncate text-sm font-medium">
            {run ? hud.hint : "Play as the virus and see how deep you get."}
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono text-sm">
          <span className="inline-flex items-center gap-1.5" title="Integrity">
            {Array.from({ length: MAX_INTEGRITY }).map((_, i) => (
              <Heart
                key={i}
                className={cn("size-4", i < hud.integrity ? "fill-red-500 text-red-500" : "text-muted-foreground/40")}
                aria-hidden
              />
            ))}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Data packets">
            <Package className="size-4 text-sky-400" aria-hidden />
            {hud.collected}/{hud.required}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Deepest breach">
            <Shield className="size-4 text-muted-foreground" aria-hidden />
            {hud.bestLevel}
          </span>
          {(phase === "playing" || phase === "paused") && (
            <button
              onClick={phase === "playing" ? pause : resume}
              aria-label={phase === "playing" ? "Pause" : "Resume"}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary/60 hover:text-primary"
            >
              <Pause className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full aspect-[25/17] touch-none"
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerEnd}
          onPointerCancel={onCanvasPointerEnd}
        />
        {overlay}
      </div>

      {/* Touch pad, visible on small screens. */}
      <div className="mt-4 flex justify-center md:hidden select-none" aria-label="Movement pad">
        <div className="grid grid-cols-3 gap-2">
          <span />
          <PadButton label="Up" icon={<ChevronUp className="size-7" aria-hidden />} onPress={() => pressDir("up")} onRelease={() => releaseDir("up")} />
          <span />
          <PadButton label="Left" icon={<ChevronLeft className="size-7" aria-hidden />} onPress={() => pressDir("left")} onRelease={() => releaseDir("left")} />
          <span />
          <PadButton label="Right" icon={<ChevronRight className="size-7" aria-hidden />} onPress={() => pressDir("right")} onRelease={() => releaseDir("right")} />
          <span />
          <PadButton label="Down" icon={<ChevronDown className="size-7" aria-hidden />} onPress={() => pressDir("down")} onRelease={() => releaseDir("down")} />
          <span />
        </div>
      </div>
    </div>
  );
}

function PadButton({
  label,
  icon,
  onPress,
  onRelease,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      onContextMenu={(e) => e.preventDefault()}
      className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm transition-colors active:border-primary active:bg-primary/15 active:text-primary"
    >
      {icon}
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/85 p-6 text-center backdrop-blur-sm">
      {children}
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
