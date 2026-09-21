import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BatteryCharging,
  CircleGauge,
  Cog,
  Fuel,
  Nut,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

interface PartDef {
  icon: LucideIcon;
  name: string;
  tone: string;
}

const PARTS: PartDef[] = [
  { icon: CircleGauge, name: "Tires", tone: "text-emphasis" },
  { icon: BatteryCharging, name: "Batteries", tone: "text-progress" },
  { icon: Zap, name: "Spark Plugs", tone: "text-warning" },
  { icon: Wrench, name: "Wrenches", tone: "text-primary" },
  { icon: Fuel, name: "Oil Cans", tone: "text-success" },
  { icon: Cog, name: "Gears", tone: "text-muted-foreground" },
  { icon: Nut, name: "Bolts", tone: "text-destructive" },
];

const CAR_FLEET = [
  { name: "Rustbucket Sedan", blurb: "A 1994 beater held together by hope and zip ties." },
  { name: "Campus Hatchback", blurb: "Small, honest and always parked slightly crooked." },
  { name: "Fleet Pickup", blurb: "Worked hard its whole life. The bed tells the stories." },
  { name: "Track Coupe", blurb: "Low, loud and allergic to grocery runs." },
  { name: "Classic Muscle", blurb: "Big block, bigger personality." },
  { name: "Showroom Supercar", blurb: "The one that makes people lean on your fence." },
];

const ZONES = ["Engine bay", "Electrical", "Brakes", "Transmission", "Body panels", "Interior"];

const JOB_NAMES = [
  "Brake job",
  "Oil service",
  "Timing belt",
  "Cooling system",
  "Electrical diagnosis",
  "Transmission swap",
  "Suspension rebuild",
  "Full tune-up",
  "Fuel system clean",
  "Pre-purchase inspection",
];

const PAINTS = [
  { name: "Shop Teal", hex: "#38BDF8" },
  { name: "Rescue Red", hex: "#EF4444" },
  { name: "Torch Amber", hex: "#F59E0B" },
  { name: "Torque Green", hex: "#22C55E" },
  { name: "Show Purple", hex: "#A78BFA" },
  { name: "Pearl White", hex: "#E2E8F0" },
];

/** Quick automotive checks. Facts only; every answer is real workshop knowledge. */
const KNOWLEDGE: { q: string; options: string[]; answer: number; why: string }[] = [
  {
    q: "Besides reducing friction, what is another main job of engine oil?",
    options: ["Carrying heat away from moving parts", "Increasing compression", "Cooling the cabin", "Charging the battery"],
    answer: 0,
    why: "Oil also cleans, seals and carries heat away from bearings and pistons.",
  },
  {
    q: "What does the alternator do while the engine runs?",
    options: ["Stores fuel", "Generates electricity and recharges the battery", "Filters the oil", "Times the ignition"],
    answer: 1,
    why: "The alternator converts engine rotation into the electricity the car runs on.",
  },
  {
    q: "What does a spark plug actually do?",
    options: ["Pumps fuel", "Filters air", "Ignites the air-fuel mixture", "Measures tire pressure"],
    answer: 2,
    why: "The plug's arc lights the air-fuel mixture, which drives the piston down.",
  },
  {
    q: "Why does tire tread matter in the rain?",
    options: ["It makes the car quieter", "It channels water away so the tire keeps grip", "It improves fuel smell", "It balances the wheel"],
    answer: 1,
    why: "Tread grooves push water out from under the tire so rubber stays on the road.",
  },
  {
    q: "How do disc brakes slow the car?",
    options: ["Magnets drag the hub", "Pads clamp the rotor, and friction slows the wheel", "Air brakes the axle", "The pads grip the tire tread"],
    answer: 1,
    why: "Hydraulic pressure squeezes pads against the rotor; friction turns motion into heat.",
  },
  {
    q: "What does the thermostat in the cooling system do?",
    options: ["Blows cabin air", "Opens to let coolant flow to the radiator once the engine warms up", "Pressurizes the tires", "Times the fuel injectors"],
    answer: 1,
    why: "It blocks coolant flow until the engine reaches operating temperature, then opens.",
  },
  {
    q: "Why do technicians torque bolts to a specification instead of just tightening hard?",
    options: ["To make removal easier", "Over-tightening can stretch or snap the bolt", "It uses less electricity", "It keeps the paint fresh"],
    answer: 1,
    why: "A torque wrench clamps parts correctly without damaging the fastener.",
  },
  {
    q: "What is the engine air filter for?",
    options: ["Quietening the exhaust", "Stopping dirt from entering the engine", "Cooling the brakes", "Filtering the cabin air"],
    answer: 1,
    why: "Dust is abrasive; the filter keeps it out of the cylinders.",
  },
  {
    q: "What does the transmission do?",
    options: ["Keeps the engine at useful speeds while matching power to the wheels", "Stores electricity", "Cleans the fuel", "Steers the front wheels"],
    answer: 0,
    why: "Gearing trades revs for torque so the engine works in its useful range.",
  },
  {
    q: "What does a timing belt keep in sync?",
    options: ["The two drive wheels", "Crankshaft and camshaft, so valves open at the right moment", "Headlights and battery", "Wiper speed and road speed"],
    answer: 1,
    why: "If crank and cam timing slip, valves can hit pistons and destroy the engine.",
  },
  {
    q: "Roughly what voltage is a healthy car battery with the engine off?",
    options: ["About 3.7 V", "About 12.6 V", "About 42 V", "About 120 V"],
    answer: 1,
    why: "A full 12-volt lead-acid battery rests near 12.6 V.",
  },
  {
    q: "Why should you never open a hot radiator cap?",
    options: ["The cap is expensive", "Pressurized coolant can flash to boiling and spray scalding liquid", "It drains the battery", "It resets the ECU"],
    answer: 1,
    why: "A hot system is pressurized; opening it can vent scalding coolant instantly.",
  },
  {
    q: "What does the oil filter do?",
    options: ["Traps dirt and metal particles circulating in the oil", "Cools the transmission", "Dries the fuel", "Filters the cabin air"],
    answer: 0,
    why: "It catches contaminants so clean oil keeps lubricating the bearings.",
  },
  {
    q: "What is the main sign of a worn-out brake pad you can check by eye?",
    options: ["The pad material is thin, near its wear limit", "The rotor is shiny", "The tire is bald", "The wheel is dirty"],
    answer: 0,
    why: "Pads carry a friction block that wears down; thin pads must be replaced.",
  },
];

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const SAVE_KEY = "itpath.garage-match.v1";

interface SaveData {
  /** Completed repair jobs, in order. Everything else derives from this. */
  progress: number;
  /** Index into CAR_FLEET of the car shown while working. */
  activeCar: number;
  /** Chosen paint hex per car index. */
  paint: Record<number, string>;
}

const DEFAULT_SAVE: SaveData = { progress: 0, activeCar: 0, paint: {} };

function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      progress: Math.max(0, Number(parsed.progress) || 0),
      activeCar: Math.max(0, Number(parsed.activeCar) || 0),
      paint: parsed.paint && typeof parsed.paint === "object" ? parsed.paint : {},
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

// ---------------------------------------------------------------------------
// Board model
// ---------------------------------------------------------------------------

const ROWS = 8;
const COLS = 8;
const WAIT_CLEAR = 360;
const WAIT_SWAP = 220;
const WAIT_FALL = 230;

type Special = null | "surge" | "engine";

interface Tile {
  id: number;
  kind: number;
  special: Special;
}

type Cell = Tile | null;
type Board = Cell[][];

/** Safe board access (the project enables noUncheckedIndexedAccess). */
const at = (b: Board, r: number, c: number): Cell => b[r]?.[c] ?? null;
/** Safe board write. */
const put = (b: Board, r: number, c: number, v: Cell): void => {
  const row = b[r];
  if (row) row[c] = v;
};

let nextTileId = 1;
const newTile = (kind: number, special: Special = null): Tile => ({ id: nextTileId++, kind, special });

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (r: number, c: number) => `${r},${c}`;
const cloneBoard = (b: Board): Board => b.map((row) => row.slice());
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function filledBoard(kinds: number, seed: number): Board {
  const rng = mulberry32(seed);
  const board: Board = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      let kind = Math.floor(rng() * kinds);
      // Avoid starting matches: at most two equal to the left, two above.
      let guard = 0;
      while (
        guard++ < 20 &&
        ((c >= 2 && at({ 0: row } as unknown as Board, 0, c - 1)?.kind === kind && at({ 0: row } as unknown as Board, 0, c - 2)?.kind === kind) ||
          (r >= 2 && at(board, r - 1, c)?.kind === kind && at(board, r - 2, c)?.kind === kind))
      ) {
        kind = Math.floor(rng() * kinds);
      }
      row.push(newTile(kind));
    }
    board.push(row);
  }
  return board;
}

interface Run {
  cells: [number, number][];
  kind: number;
  length: number;
}

function findRuns(board: Board): Run[] {
  const runs: Run[] = [];
  for (let r = 0; r < ROWS; r++) {
    let start = 0;
    for (let c = 1; c <= COLS; c++) {
      const prev = at(board, r, c - 1);
      const cur = c < COLS ? at(board, r, c) : null;
      const same = cur && prev && cur.kind === prev.kind;
      if (!same) {
        if (prev && c - start >= 3) {
          const cells: [number, number][] = [];
          for (let i = start; i < c; i++) cells.push([r, i]);
          runs.push({ cells, kind: prev.kind, length: c - start });
        }
        start = c;
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    let start = 0;
    for (let r = 1; r <= ROWS; r++) {
      const prev = at(board, r - 1, c);
      const cur = r < ROWS ? at(board, r, c) : null;
      const same = cur && prev && cur.kind === prev.kind;
      if (!same) {
        if (prev && r - start >= 3) {
          const cells: [number, number][] = [];
          for (let i = start; i < r; i++) cells.push([i, c]);
          runs.push({ cells, kind: prev.kind, length: r - start });
        }
        start = r;
      }
    }
  }
  return runs;
}

function hasAnyMove(board: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = at(board, r, c);
      if (tile?.special) return true;
      if (c + 1 < COLS) {
        const b = cloneBoard(board);
        put(b, r, c, at(board, r, c + 1));
        put(b, r, c + 1, tile);
        if (findRuns(b).length) return true;
      }
      if (r + 1 < ROWS) {
        const b = cloneBoard(board);
        put(b, r, c, at(board, r + 1, c));
        put(b, r + 1, c, tile);
        if (findRuns(b).length) return true;
      }
    }
  }
  return false;
}

function gravity(board: Board, kinds: number, freshIds: Set<number>): void {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const tile = at(board, r, c);
      if (tile) {
        put(board, r, c, null);
        put(board, write, c, tile);
        write--;
      }
    }
    for (let r = write; r >= 0; r--) {
      const tile = newTile(Math.floor(Math.random() * kinds));
      freshIds.add(tile.id);
      put(board, r, c, tile);
    }
  }
}

// ---------------------------------------------------------------------------
// Level generation (deterministic per level number, unlimited levels)
// ---------------------------------------------------------------------------

interface LevelConfig {
  level: number;
  moves: number;
  kinds: number;
  job: string;
  objectives: { kind: number; need: number }[];
  seed: number;
}

function levelConfig(level: number): LevelConfig {
  const rng = mulberry32(level * 7919 + 13);
  const kinds = level < 4 ? 6 : 7;
  const job = JOB_NAMES[Math.floor(rng() * JOB_NAMES.length)] ?? "General service";
  const objectiveCount = level < 3 ? 2 : 3;
  const needBase = objectiveCount === 2 ? 12 + Math.min(18, level) : 9 + Math.min(12, Math.floor(level * 0.8));
  const pool = PARTS.map((_, i) => i);
  const objectives: { kind: number; need: number }[] = [];
  for (let i = 0; i < objectiveCount; i++) {
    const idx = Math.floor(rng() * pool.length);
    const kind = pool.splice(idx, 1)[0] ?? 0;
    objectives.push({ kind, need: needBase });
  }
  const moves = Math.max(16, 24 - Math.floor(level / 6));
  return { level, moves, kinds, job, objectives, seed: level * 104729 + 7 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GameState {
  board: Board;
  clearing: Set<string>;
  fresh: Set<number>;
  shake: string[];
  swapping: Record<string, string>;
  selected: [number, number] | null;
  moves: number;
  collected: Record<number, number>;
}

export function GarageMatch() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [showGarage, setShowGarage] = useState(false);
  const [levelDone, setLevelDone] = useState<null | { objectives: LevelConfig["objectives"]; movesLeft: number }>(null);
  const [levelFailed, setLevelFailed] = useState(false);
  const [quiz, setQuiz] = useState<null | { question: (typeof KNOWLEDGE)[number]; answered: null | boolean }>(null);

  const config = useMemo(() => levelConfig((save?.progress ?? 0) + 1), [save?.progress]);

  // Authoritative mutable game state, mirrored into React state for rendering.
  const boardRef = useRef<Board>([]);
  const stateRef = useRef<GameState>({
    board: [], clearing: new Set(), fresh: new Set(), shake: [], swapping: {}, selected: null, moves: 0, collected: {},
  });
  const [view, setView] = useState<GameState | null>(null);
  const busyRef = useRef(false);
  const quizDoneRef = useRef(false);
  const finishedRef = useRef(false);
  const objectivesRef = useRef(config.objectives);
  const movesRef = useRef(config.moves);
  const kindsRef = useRef(config.kinds);
  const quizArmedRef = useRef(false);

  const sync = () => setView({ ...stateRef.current });

  // Load saved progress once on the client.
  useEffect(() => {
    const loaded = loadSave();
    setSave(loaded);
  }, []);

  // Start (or restart) the level whenever the level config changes.
  useEffect(() => {
    if (!save) return;
    boardRef.current = filledBoard(config.kinds, config.seed);
    let guard = 0;
    while (!hasAnyMove(boardRef.current) && guard++ < 10) {
      boardRef.current = filledBoard(config.kinds, config.seed + guard * 31);
    }
    stateRef.current = {
      board: boardRef.current, clearing: new Set(), fresh: new Set(), shake: [], swapping: {}, selected: null,
      moves: config.moves, collected: {},
    };
    objectivesRef.current = config.objectives;
    movesRef.current = config.moves;
    kindsRef.current = config.kinds;
    quizDoneRef.current = false;
    quizArmedRef.current = config.level >= 2;
    finishedRef.current = false;
    setLevelDone(null);
    setLevelFailed(false);
    setQuiz(null);
    sync();
  }, [save, config]);

  // -------------------------------------------------------------------------

  const collect = useCallback((tiles: (Tile | null)[]) => {
    for (const t of tiles) {
      if (!t) continue;
      stateRef.current.collected[t.kind] = (stateRef.current.collected[t.kind] ?? 0) + 1;
    }
  }, []);

  /** Expand a clear set through chained special effects. Returns added specials to process. */
  const expandSpecials = useCallback((board: Board, clear: Set<string>) => {
    const queue: [number, number][] = [];
    for (const k of clear) {
      const [r, c] = k.split(",").map(Number) as [number, number];
      if (at(board, r, c)?.special) queue.push([r, c]);
    }
    while (queue.length) {
      const [r, c] = queue.shift()!;
      const tile = at(board, r, c);
      if (!tile?.special) continue;
      const affected: [number, number][] = [];
      if (tile.special === "surge") {
        for (let i = 0; i < COLS; i++) affected.push([r, i]);
        for (let i = 0; i < ROWS; i++) affected.push([i, c]);
      } else {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) affected.push([nr, nc]);
          }
        }
      }
      for (const [nr, nc] of affected) {
        const k = key(nr, nc);
        if (!clear.has(k)) {
          clear.add(k);
          if (at(board, nr, nc)?.special) queue.push([nr, nc]);
        }
      }
    }
  }, []);

  /** One full resolve cycle: clear, chain specials, gravity, refill. */
  const resolveCycle = useCallback(
    async (opts: { forceTrigger?: [number, number][] }) => {
      const work = boardRef.current;
      const clear = new Set<string>();
      const creations = new Map<string, { kind: number; special: Exclude<Special, null> }>();

      const runs = findRuns(work);
      for (const run of runs) {
        if (run.length >= 4) {
          let pos = run.cells[Math.floor(run.cells.length / 2)]!;
          if (opts.forceTrigger) {
            const swap = opts.forceTrigger.find(([r, c]) => run.cells.some(([r2, c2]) => r2 === r && c2 === c));
            if (swap) pos = swap;
          }
          creations.set(key(pos[0], pos[1]), { kind: run.kind, special: run.length >= 5 ? "engine" : "surge" });
          for (const [r, c] of run.cells) if (key(r, c) !== key(pos[0], pos[1])) clear.add(key(r, c));
        } else {
          for (const [r, c] of run.cells) clear.add(key(r, c));
        }
      }
      if (opts.forceTrigger) {
        for (const [r, c] of opts.forceTrigger) clear.add(key(r, c));
      }
      for (const k of creations.keys()) clear.delete(k);
      if (!clear.size) return false;

      expandSpecials(boardRef.current, clear);

      // Animate the pop.
      stateRef.current.clearing = new Set(clear);
      stateRef.current.fresh = new Set();
      sync();
      await wait(WAIT_CLEAR);

      const nb = cloneBoard(boardRef.current);
      const removed: Tile[] = [];
      for (const k of clear) {
        const [r, c] = k.split(",").map(Number) as [number, number];
        const tile = at(nb, r, c);
        if (tile) removed.push(tile);
        put(nb, r, c, null);
      }
      collect(removed);
      for (const [k, spec] of creations) {
        const [r, c] = k.split(",").map(Number) as [number, number];
        put(nb, r, c, newTile(spec.kind, spec.special));
      }
      boardRef.current = nb;
      stateRef.current.board = nb;
      stateRef.current.clearing = new Set();
      sync();
      await wait(60);

      const fresh = new Set<number>();
      gravity(nb, kindsRef.current, fresh);
      boardRef.current = nb;
      stateRef.current.board = nb;
      stateRef.current.fresh = fresh;
      sync();
      await wait(WAIT_FALL);
      return true;
    },
    [collect, expandSpecials, sync],
  );

  const finishIfOver = useCallback(() => {
    if (finishedRef.current) return;
    const objectives = objectivesRef.current;
    const done = objectives.every((o) => (stateRef.current.collected[o.kind] ?? 0) >= o.need);
    if (done) {
      finishedRef.current = true;
      setLevelDone({ objectives, movesLeft: movesRef.current });
      return;
    }
    if (movesRef.current <= 0) {
      finishedRef.current = true;
      setLevelFailed(true);
      return;
    }
    if (
      quizArmedRef.current &&
      !quizDoneRef.current &&
      config.moves - movesRef.current >= Math.floor(config.moves / 2)
    ) {
      quizDoneRef.current = true;
      const rng = mulberry32(config.level * 977 + 5);
      const question = KNOWLEDGE[Math.floor(rng() * KNOWLEDGE.length)] ?? KNOWLEDGE[0]!;
      setQuiz({ question, answered: null });
    }
  }, [config]);

  const handleSwap = useCallback(
    async (r1: number, c1: number, r2: number, c2: number) => {
      if (busyRef.current || finishedRef.current) return;
      busyRef.current = true;
      stateRef.current.selected = null;

      const a = at(boardRef.current, r1, c1);
      const b = at(boardRef.current, r2, c2);
      if (!a || !b) {
        busyRef.current = false;
        return;
      }

      const nb = cloneBoard(boardRef.current);
      put(nb, r1, c1, b);
      put(nb, r2, c2, a);
      const dr = r2 - r1;
      const dc = c2 - c1;
      const towardSecond = `translate(calc(${dc * 100}% + ${dc * 0.375}rem), calc(${dr * 100}% + ${dr * 0.375}rem))`;
      const towardFirst = `translate(calc(${-dc * 100}% + ${-dc * 0.375}rem), calc(${-dr * 100}% + ${-dr * 0.375}rem))`;
      stateRef.current.swapping = {
        [key(r1, c1)]: towardSecond,
        [key(r2, c2)]: towardFirst,
      };
      sync();
      await wait(WAIT_SWAP);
      boardRef.current = nb;
      stateRef.current.board = nb;
      stateRef.current.swapping = {};
      sync();

      const bothSpecial = a.special && b.special;
      const anySpecial = a.special || b.special;
      const runs = findRuns(nb);

      if (bothSpecial) {
        movesRef.current -= 1;
        stateRef.current.moves = movesRef.current;
        await resolveCycle({ forceTrigger: [[r1, c1], [r2, c2]] });
        // Cascades keep going while matches exist.
        while (findRuns(boardRef.current).length) await resolveCycle({});
        sync();
        finishIfOver();
      } else if (anySpecial) {
        movesRef.current -= 1;
        stateRef.current.moves = movesRef.current;
        await resolveCycle({ forceTrigger: a.special ? [[r2, c2]] : [[r1, c1]] });
        while (findRuns(boardRef.current).length) await resolveCycle({});
        sync();
        finishIfOver();
      } else if (runs.length) {
        movesRef.current -= 1;
        stateRef.current.moves = movesRef.current;
        await resolveCycle({});
        while (findRuns(boardRef.current).length) {
          const changed = await resolveCycle({});
          if (!changed) break;
        }
        sync();
        finishIfOver();
      } else {
        // No match: glide both pieces back to their original cells, then shake.
        stateRef.current.swapping = {
          [key(r1, c1)]: towardSecond,
          [key(r2, c2)]: towardFirst,
        };
        sync();
        await wait(WAIT_SWAP);
        const rb = cloneBoard(nb);
        put(rb, r1, c1, a);
        put(rb, r2, c2, b);
        boardRef.current = rb;
        stateRef.current.board = rb;
        stateRef.current.swapping = {};
        stateRef.current.shake = [key(r1, c1), key(r2, c2)];
        sync();
        await wait(260);
        stateRef.current.shake = [];
        sync();
      }
      busyRef.current = false;
    },
    [resolveCycle, finishIfOver, sync],
  );

  const onCellClick = useCallback(
    (r: number, c: number) => {
      if (busyRef.current || finishedRef.current) return;
      const sel = stateRef.current.selected;
      if (!sel) {
        stateRef.current.selected = [r, c];
        sync();
        return;
      }
      const [sr, sc] = sel;
      const adjacent = Math.abs(sr - r) + Math.abs(sc - c) === 1;
      if (adjacent) {
        void handleSwap(sr, sc, r, c);
      } else {
        stateRef.current.selected = [r, c];
        sync();
      }
    },
    [handleSwap, sync],
  );

  // Drag / swipe: press a tile and push toward a neighbour to swap. Works with
  // mouse and touch; tap-tap selection above still works alongside it.
  const dragRef = useRef<{ r: number; c: number; x: number; y: number; fired: boolean } | null>(null);

  const onTilePointerDown = useCallback((r: number, c: number, e: React.PointerEvent) => {
    if (busyRef.current || finishedRef.current) return;
    dragRef.current = { r, c, x: e.clientX, y: e.clientY, fired: false };
  }, []);

  const onTilePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.fired || busyRef.current || finishedRef.current) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      drag.fired = true;
      const [dr, dc] = Math.abs(dx) > Math.abs(dy) ? [0, Math.sign(dx)] : [Math.sign(dy), 0];
      const tr = drag.r + dr;
      const tc = drag.c + dc;
      if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
        stateRef.current.selected = null;
        void handleSwap(drag.r, drag.c, tr, tc);
      }
    },
    [handleSwap],
  );

  const onTilePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const answerQuiz = useCallback(
    (index: number) => {
      if (!quiz) return;
      const correct = index === quiz.question.answer;
      setQuiz({ question: quiz.question, answered: correct });
      if (correct) {
        movesRef.current += 4;
        stateRef.current.moves = movesRef.current;
      }
    },
    [quiz],
  );

  const closeQuiz = useCallback(() => {
    setQuiz(null);
    finishIfOver();
  }, [finishIfOver]);

  const nextLevel = useCallback(() => {
    if (!save) return;
    const updated = { ...save, progress: save.progress + 1 };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
    setSave(updated);
  }, [save]);

  const retryLevel = useCallback(() => {
    if (!save) return;
    // Restarting the same job: re-seed by re-running the effect via config identity.
    const freshSave = { ...save };
    setSave({ ...freshSave });
  }, [save]);

  const setPaint = useCallback(
    (carIndex: number, hex: string) => {
      if (!save) return;
      const updated = { ...save, paint: { ...save.paint, [carIndex]: hex } };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      setSave(updated);
    },
    [save],
  );

  const setActiveCar = useCallback(
    (carIndex: number) => {
      if (!save) return;
      const updated = { ...save, activeCar: carIndex };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      setSave(updated);
    },
    [save],
  );

  if (!save || !view) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        Opening the garage…
      </div>
    );
  }

  // Derived progression.
  const carsRestored = Math.floor(save.progress / ZONES.length);
  const currentCarIndex = Math.min(save.activeCar, Math.max(0, carsRestored));
  const car = CAR_FLEET[currentCarIndex] ?? CAR_FLEET[0]!;
  const zonesFixed = save.progress % ZONES.length;
  const carComplete = carsRestored >= CAR_FLEET.length;
  const paint = save.paint[currentCarIndex] ?? PAINTS[0]!.hex;

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes gm-pop { 0% { transform: scale(1); opacity: 1; } 42% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(.58); opacity: 0; } }
        @keyframes gm-drop { 0% { transform: translateY(-12px) scale(.96); opacity: .35; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes gm-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @keyframes gm-pulse { 0%, 100% { opacity: .62; } 50% { opacity: 1; } }
        @keyframes gm-sheen { 0% { transform: translateX(-140%) skewX(-18deg); } 55%, 100% { transform: translateX(260%) skewX(-18deg); } }
        @keyframes gm-burst-ring { 0% { transform: scale(.2); opacity: 0; } 22% { opacity: 1; } 100% { transform: scale(1.45); opacity: 0; } }
        @keyframes gm-burst-core { 0% { transform: scale(.15) rotate(0); opacity: 0; } 25% { transform: scale(1.05) rotate(18deg); opacity: 1; } 100% { transform: scale(.35) rotate(48deg); opacity: 0; } }
        @keyframes gm-spark-a { 0% { transform: translate(0,0) scale(.2); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(155%,-150%) scale(.05); opacity: 0; } }
        @keyframes gm-spark-b { 0% { transform: translate(0,0) scale(.2); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(-170%,-65%) scale(.05); opacity: 0; } }
        @keyframes gm-spark-c { 0% { transform: translate(0,0) scale(.2); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(120%,155%) scale(.05); opacity: 0; } }
        @keyframes gm-spark-d { 0% { transform: translate(0,0) scale(.2); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(-135%,145%) scale(.05); opacity: 0; } }
        .gm-pop { animation: gm-pop .36s cubic-bezier(.2,.75,.25,1) forwards; z-index: 4; }
        .gm-drop { animation: gm-drop .24s cubic-bezier(.2,.8,.2,1); }
        .gm-shake { animation: gm-shake .25s ease-in-out; }
        .gm-pulse { animation: gm-pulse 1.6s ease-in-out infinite; }
        .gm-swapping { z-index: 5; transition: transform .22s cubic-bezier(.22,.9,.28,1.08); }
        .gm-match-burst { position: absolute; inset: -18%; z-index: 8; pointer-events: none; }
        .gm-burst-ring { position: absolute; inset: 13%; border: 2px solid color-mix(in oklab, currentColor 72%, var(--foreground)); border-radius: 50%; box-shadow: 0 0 12px currentColor, inset 0 0 8px currentColor; animation: gm-burst-ring .36s ease-out forwards; }
        .gm-burst-core { position: absolute; inset: 27%; background: currentColor; clip-path: polygon(50% 0,61% 30%,88% 12%,72% 42%,100% 50%,72% 60%,88% 88%,59% 72%,50% 100%,40% 72%,12% 88%,28% 59%,0 50%,29% 40%,12% 12%,40% 29%); box-shadow: 0 0 16px currentColor; animation: gm-burst-core .34s ease-out forwards; }
        .gm-spark { position: absolute; left: 46%; top: 46%; width: 9%; height: 16%; border-radius: 1px; background: color-mix(in oklab, currentColor 74%, var(--foreground)); box-shadow: 0 0 7px currentColor; transform-origin: center; }
        .gm-spark-a { animation: gm-spark-a .34s ease-out forwards; }
        .gm-spark-b { animation: gm-spark-b .36s .02s ease-out forwards; }
        .gm-spark-c { animation: gm-spark-c .35s .03s ease-out forwards; }
        .gm-spark-d { animation: gm-spark-d .37s .01s ease-out forwards; }
        .gm-fleet-icon { filter: grayscale(0); }
        .gm-fleet-locked { filter: grayscale(1); }
        .gm-shell {
          background: color-mix(in oklab, var(--card) 78%, transparent);
          backdrop-filter: blur(22px) saturate(130%);
          box-shadow: 0 22px 60px color-mix(in oklab, var(--background) 64%, transparent), inset 0 1px color-mix(in oklab, var(--foreground) 7%, transparent);
        }
        .gm-board {
          background-color: color-mix(in oklab, var(--background) 78%, var(--secondary));
          background-image: radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 48%), linear-gradient(color-mix(in oklab, var(--border) 18%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--border) 18%, transparent) 1px, transparent 1px);
          background-size: 100% 100%, 18px 18px, 18px 18px;
          box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 5%, transparent), inset 0 24px 50px color-mix(in oklab, var(--background) 52%, transparent), 0 18px 42px color-mix(in oklab, var(--background) 45%, transparent);
        }
        .gm-tile {
          overflow: hidden;
          background: linear-gradient(145deg, color-mix(in oklab, var(--card) 96%, var(--foreground) 4%), color-mix(in oklab, var(--card) 82%, var(--background)));
          box-shadow: inset 0 1px color-mix(in oklab, var(--foreground) 15%, transparent), inset 0 -2px color-mix(in oklab, var(--background) 45%, transparent), 0 5px 10px color-mix(in oklab, var(--background) 46%, transparent);
        }
        .gm-tile::after { content: ""; position: absolute; inset: 0 auto 0 -35%; width: 28%; background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--foreground) 13%, transparent), transparent); pointer-events: none; }
        .gm-tile:hover::after { animation: gm-sheen .8s ease-out; }
        .gm-part { width: 72%; height: 72%; overflow: visible; filter: drop-shadow(0 5px 4px color-mix(in oklab, var(--background) 55%, transparent)); }
        .gm-part .metal-hi { stroke: color-mix(in oklab, currentColor 35%, var(--foreground)); }
        .gm-part .metal-lo { fill: color-mix(in oklab, currentColor 32%, var(--background)); }
        .gm-part .metal-mid { fill: color-mix(in oklab, currentColor 64%, var(--card)); }
        .gm-part .metal-face { fill: color-mix(in oklab, currentColor 78%, var(--foreground)); }
        .gm-part .cutout { fill: color-mix(in oklab, var(--background) 88%, transparent); }
        .gm-tile:hover { transform: translateY(-1px); border-color: color-mix(in oklab, var(--primary) 45%, var(--border)); }
        @media (prefers-reduced-motion: reduce) {
          .gm-pop { animation: gm-pop .01s linear forwards; }
          .gm-drop, .gm-shake, .gm-pulse, .gm-burst-ring, .gm-burst-core, .gm-spark { animation: none; }
          .gm-swapping { transition-duration: .01s; }
          .gm-tile:hover { transform: none; }
        }
      `}</style>

      <PageHeader
        title="Garage Match"
        description={`Job #${config.level}: ${config.job} — repairing the ${car.name}'s ${ZONES[zonesFixed] ?? ZONES[0]}.`}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Board column */}
        <Panel
          className="gm-shell order-2 overflow-hidden lg:order-1"
          title="Work order"
          description={`Job ${String(config.level).padStart(2, "0")} · ${config.job} · ${car.name}`}
        >
          <div className="mx-auto mb-4 flex max-w-[520px] items-end justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current repair</p>
              <p className="mt-1 font-display text-lg font-semibold">{ZONES[zonesFixed] ?? ZONES[0]}</p>
            </div>
            <div className="min-w-20 rounded-md border border-primary/25 bg-primary/8 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Moves</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-primary">{view.moves}</p>
            </div>
          </div>
          <div className="gm-board mx-auto grid w-full max-w-[520px] grid-cols-8 gap-1.5 rounded-lg border border-border/80 p-2 select-none">
            {view.board.map((row, r) =>
              row.map((tile, c) => {
                const k = key(r, c);
                const clearing = view.clearing.has(k);
                const shaking = view.shake.includes(k);
                const selected = !clearing && view.selected?.[0] === r && view.selected?.[1] === c;
                const swapTransform = view.swapping[k];
                const part = tile ? PARTS[tile.kind] : undefined;
                const PartIcon = part?.icon;
                return (
                  <button
                    key={tile?.id ?? `${r}-${c}`}
                    type="button"
                    aria-label={tile ? `${PARTS[tile.kind]?.name ?? "Part"}${tile.special ? ` ${tile.special === "surge" ? "battery surge" : "engine"}` : ""}` : "empty"}
                    onClick={() => onCellClick(r, c)}
                    onPointerDown={(e) => onTilePointerDown(r, c, e)}
                    onPointerMove={onTilePointerMove}
                    onPointerUp={onTilePointerUp}
                    onPointerCancel={onTilePointerUp}
                    className={[
                      "gm-tile relative flex aspect-square cursor-grab touch-none items-center justify-center rounded-md border transition-[transform,border-color,background-color] duration-150 active:cursor-grabbing active:scale-95",
                      clearing ? "gm-pop border-transparent" : "border-border/65",
                      swapTransform ? "gm-swapping" : "",
                      tile?.id != null && view.fresh.has(tile.id) ? "gm-drop" : "",
                      shaking ? "gm-shake" : "",
                      selected ? "border-primary bg-primary/10 ring-2 ring-primary/50" : "",
                    ].join(" ")}
                    style={swapTransform ? { transform: swapTransform } : undefined}
                  >
                    {PartIcon ? <PartGraphic kind={tile?.kind ?? 0} className={part?.tone ?? "text-foreground"} /> : null}
                    {clearing ? (
                      <span aria-hidden className={`gm-match-burst ${part?.tone ?? "text-primary"}`}>
                        <span className="gm-burst-ring" />
                        <span className="gm-burst-core" />
                        <span className="gm-spark gm-spark-a" />
                        <span className="gm-spark gm-spark-b" />
                        <span className="gm-spark gm-spark-c" />
                        <span className="gm-spark gm-spark-d" />
                      </span>
                    ) : null}
                    {tile?.special ? (
                      <span
                        aria-hidden
                        className={[
                          "absolute right-1 top-1 rounded-sm border px-1 text-[8px] font-bold uppercase",
                          tile.special === "surge" ? "border-warning/50 bg-warning/15 text-warning" : "border-destructive/50 bg-destructive/15 text-destructive",
                        ].join(" ")}
                      >
                        {tile.special === "surge" ? "S" : "V8"}
                      </span>
                    ) : null}
                    {tile?.special === "surge" ? (
                      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-warning/70" />
                    ) : null}
                    {tile?.special === "engine" ? (
                      <span aria-hidden className="gm-pulse pointer-events-none absolute inset-0 rounded-md ring-2 ring-destructive/70" />
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>
          <div className="mx-auto mt-3 max-w-[520px] space-y-1.5">
            {config.objectives.map((o) => {
              const got = Math.min(view.collected[o.kind] ?? 0, o.need);
              return (
                <div key={o.kind} className="flex items-center gap-3 text-sm">
                  {(() => {
                    const ObjectiveIcon = PARTS[o.kind]?.icon;
                    return ObjectiveIcon ? <ObjectiveIcon aria-hidden className={`size-4 ${PARTS[o.kind]?.tone ?? "text-foreground"}`} /> : null;
                  })()}
                  <span className="w-24 shrink-0 text-muted-foreground">{PARTS[o.kind]?.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-progress transition-[width] duration-300"
                      style={{ width: `${(got / o.need) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-xs tabular-nums">{got}/{o.need}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Car + garage column */}
        <div className="order-1 space-y-5 lg:order-2">
          <Panel className="gm-shell" title={`${car.name}`} description={`${zonesFixed} of ${ZONES.length} areas fixed on this car`}>
            <CarSvg paint={paint} zonesFixed={zonesFixed} />
            <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
              {ZONES.map((zone, i) => (
                <li key={zone} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={[
                      "inline-block size-2 rounded-full",
                       i < zonesFixed ? "bg-primary" : i === zonesFixed ? "bg-warning gm-pulse" : "bg-destructive/70",
                    ].join(" ")}
                  />
                  <span className={i < zonesFixed ? "text-foreground" : "text-muted-foreground"}>{zone}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="gm-shell" title="Garage" description={`${carsRestored} of ${CAR_FLEET.length} cars restored`}>
            <ul className="space-y-2">
              {CAR_FLEET.map((c, i) => {
                const unlocked = i <= carsRestored;
                const fixed = i < carsRestored ? ZONES.length : i === carsRestored ? zonesFixed : 0;
                return (
                  <li key={c.name}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => setActiveCar(i)}
                      className={[
                         "flex w-full items-center gap-3 rounded-md border bg-background/25 p-2.5 text-left transition-[border-color,background-color,transform] active:scale-[0.99]",
                         unlocked ? "border-border/70 hover:border-primary/60 hover:bg-secondary/35" : "cursor-not-allowed border-border/40 opacity-45",
                         save.activeCar === i ? "border-primary bg-primary/8 ring-1 ring-primary/40" : "",
                      ].join(" ")}
                    >
                      <span aria-hidden className={`text-2xl ${unlocked ? "gm-fleet-icon" : "gm-fleet-locked"}`}>{unlocked ? "🚗" : "🔒"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{unlocked ? c.name : "Locked car"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {unlocked ? `${fixed}/${ZONES.length} areas fixed` : "Finish more jobs to unlock"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Paint</p>
              <div className="flex gap-2">
                {PAINTS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    aria-label={`Paint: ${p.name}`}
                    title={p.name}
                    onClick={() => setPaint(currentCarIndex, p.hex)}
                    className={[
                      "size-6 rounded-full border-2 transition-transform hover:scale-110",
                      paint === p.hex ? "border-primary ring-2 ring-primary/40" : "border-border",
                    ].join(" ")}
                    style={{ backgroundColor: p.hex }}
                  />
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="gm-shell" title="How to play" description="Swap two neighbouring parts to line up three or more.">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>🔋⚡ Line up four to charge a <span className="font-medium text-foreground">battery surge</span> — it clears its whole row and column.</li>
              <li>🔥 Line up five to drop in an <span className="font-medium text-foreground">engine block</span> — it blasts everything around it.</li>
              <li>Swap two powered parts together, or swap one with any part, to set them off early.</li>
              <li>Halfway through a job, a quick car-knowledge check can earn you extra moves.</li>
            </ul>
          </Panel>
        </div>
      </div>

      {/* Level complete */}
      {levelDone ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <p className="text-4xl" aria-hidden>🔧</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">Job done</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The {car.name}'s {ZONES[save.progress % ZONES.length]} is fixed
              {levelDone.movesLeft > 0 ? ` with ${levelDone.movesLeft} moves to spare` : ""}.
            </p>
            {(save.progress + 1) % ZONES.length === 0 && carsRestored < CAR_FLEET.length ? (
              <p className="mt-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
                🎉 The {car.name} is fully restored! A new car waits in the garage.
              </p>
            ) : null}
            <Button className="mt-4 w-full" onClick={nextLevel}>
              Next job: {JOB_NAMES[(config.level) % JOB_NAMES.length]}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Level failed */}
      {levelFailed ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <p className="text-4xl" aria-hidden>🧰</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">Out of moves</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The parts didn't line up this time. The {ZONES[save.progress % ZONES.length]} still needs work — try the job again.
            </p>
            <Button className="mt-4 w-full" variant="secondary" onClick={retryLevel}>
              Retry the job
            </Button>
          </div>
        </div>
      ) : null}

      {/* Knowledge challenge */}
      {quiz ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Quick check · +4 moves if correct</p>
            <h3 className="mt-2 font-display text-lg font-semibold">{quiz.question.q}</h3>
            <div className="mt-4 space-y-2">
              {quiz.question.options.map((option, i) => {
                const isAnswer = i === quiz.question.answer;
                const answered = quiz.answered !== null;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={answered}
                    onClick={() => answerQuiz(i)}
                    className={[
                      "w-full rounded-lg border p-2.5 text-left text-sm transition-colors",
                      answered
                        ? isAnswer
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/50 opacity-60"
                        : "border-border hover:border-primary/60 hover:bg-secondary/50",
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {quiz.answered !== null ? (
              <div className="mt-4">
                <p className={quiz.answered ? "text-sm text-primary" : "text-sm text-muted-foreground"}>
                  {quiz.answered ? "Correct — +4 moves." : "Not quite. No bonus moves."} {quiz.question.why}
                </p>
                <Button className="mt-3 w-full" onClick={closeQuiz}>Back to the job</Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Car visual
// ---------------------------------------------------------------------------

function CarSvg({ paint, zonesFixed }: { paint: string; zonesFixed: number }) {
  // Zone markers: [cx, cy] on the 200x80 viewBox, in repair order.
  const markers: [number, number][] = [
    [168, 36], // Engine bay
    [104, 18], // Electrical
    [150, 62], // Brakes
    [100, 58], // Transmission
    [112, 38], // Body panels
    [86, 30], // Interior
  ];
  return (
    <svg viewBox="0 0 200 92" className="w-full overflow-visible" role="img" aria-label={`Side view of the car with ${zonesFixed} of ${ZONES.length} areas fixed`}>
      <defs>
        <linearGradient id="car-paint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={paint} stopOpacity="1" />
          <stop offset="0.48" stopColor={paint} stopOpacity="0.9" />
          <stop offset="1" stopColor={paint} stopOpacity="0.48" />
        </linearGradient>
        <linearGradient id="car-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-foreground)" stopOpacity="0.34" />
          <stop offset="1" stopColor="var(--color-background)" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="wheel-metal">
          <stop offset="0" stopColor="var(--color-foreground)" stopOpacity="0.8" />
          <stop offset="0.25" stopColor="var(--color-muted-foreground)" />
          <stop offset="0.3" stopColor="var(--color-background)" />
          <stop offset="1" stopColor="var(--color-card)" />
        </radialGradient>
        <filter id="car-shadow" x="-20%" y="-20%" width="140%" height="170%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="var(--color-background)" floodOpacity="0.72" />
        </filter>
      </defs>
      <ellipse cx="103" cy="74" rx="88" ry="9" fill="var(--color-background)" opacity="0.56" />
      <g filter="url(#car-shadow)">
      {/* body */}
      <path
        d="M8 56 L8 44 Q8 34 28 31 L56 17 Q62 12 78 12 L118 12 Q138 12 149 25 L172 31 Q192 35 192 46 L192 56 Z"
        fill="url(#car-paint)"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path d="M14 39 Q48 34 69 32 L153 31 Q177 33 187 41" fill="none" stroke="var(--color-foreground)" strokeOpacity="0.28" strokeWidth="1.5" />
      <path d="M15 51 L190 51" fill="none" stroke="var(--color-background)" strokeOpacity="0.38" strokeWidth="2" />
      {/* windows */}
      <path d="M64 18 L78 15 L78 28 L60 28 Z" fill="url(#car-glass)" stroke="var(--color-foreground)" strokeOpacity="0.18" />
      <path d="M84 15 L112 15 L118 28 L84 28 Z" fill="url(#car-glass)" stroke="var(--color-foreground)" strokeOpacity="0.18" />
      <path d="M123 16 Q135 18 145 27 L124 27 Z" fill="url(#car-glass)" stroke="var(--color-foreground)" strokeOpacity="0.18" />
      <path d="M174 37 L190 41 L190 47 L176 45 Z" fill="var(--color-warning)" opacity="0.92" />
      <path d="M9 40 L25 37 L24 44 L9 46 Z" fill="var(--color-destructive)" opacity="0.8" />
      {/* wheels */}
      <circle cx="56" cy="60" r="13" fill="var(--color-background)" stroke="var(--color-muted-foreground)" strokeOpacity="0.55" strokeWidth="2" />
      <circle cx="56" cy="60" r="8" fill="url(#wheel-metal)" />
      <circle cx="150" cy="60" r="13" fill="var(--color-background)" stroke="var(--color-muted-foreground)" strokeOpacity="0.55" strokeWidth="2" />
      <circle cx="150" cy="60" r="8" fill="url(#wheel-metal)" />
      </g>
      {/* zone markers */}
      {markers.map(([cx, cy], i) => {
        const fixed = i < zonesFixed;
        const current = i === zonesFixed;
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r="5.5"
              fill={fixed ? "var(--color-primary)" : current ? "#F59E0B" : "#EF4444"}
              opacity={fixed ? 0.95 : current ? 0.95 : 0.75}
              stroke="var(--color-card)"
              strokeWidth="1.5"
            />
            {fixed ? (
              <path d={`M${cx - 2.6} ${cy} L${cx - 0.7} ${cy + 2} L${cx + 2.7} ${cy - 2}`} stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            ) : (
              <path d={`M${cx} ${cy - 3} L${cx} ${cy + 0.6} M${cx} ${cy + 2} L${cx} ${cy + 2.6}`} stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PartGraphic({ kind, className }: { kind: number; className: string }) {
  const common = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" className={`gm-part ${className}`} aria-hidden>
      {kind === 0 ? <>
        <ellipse cx="32" cy="32" rx="21" ry="25" className="metal-lo" {...common} />
        <ellipse cx="32" cy="32" rx="14" ry="18" className="cutout" {...common} />
        <path d="M18 16l7 5M39 43l7 5M46 16l-7 5M25 43l-7 5" className="metal-hi" fill="none" {...common} />
        <circle cx="32" cy="32" r="6" className="metal-face" {...common} />
      </> : null}
      {kind === 1 ? <>
        <rect x="12" y="17" width="40" height="33" rx="7" className="metal-mid" {...common} />
        <path d="M22 17v-5h7v5M39 17v-5h7v5" className="metal-hi" fill="none" {...common} />
        <path d="M22 33h20M32 24v18" className="cutout" {...common} />
        <rect x="16" y="21" width="32" height="5" rx="2" fill="currentColor" opacity=".28" />
      </> : null}
      {kind === 2 ? <>
        <path d="M25 8h14l-2 13 6 7-7 25h-8l-7-25 6-7z" className="metal-mid" {...common} />
        <path d="M25 17h14M24 28h16M27 35h10" className="metal-hi" fill="none" {...common} />
        <path d="M29 43h6l-3 11z" className="metal-face" {...common} />
      </> : null}
      {kind === 3 ? <>
        <path d="M42 10a13 13 0 0 0-14 16L11 43a7 7 0 0 0 10 10l17-17a13 13 0 0 0 16-14l-9 8-10-10z" className="metal-mid" {...common} />
        <circle cx="17" cy="47" r="3" className="cutout" />
        <path d="M28 28l8 8" className="metal-hi" fill="none" {...common} />
      </> : null}
      {kind === 4 ? <>
        <path d="M23 10h18l2 10 8 12v19H13V32l8-12z" className="metal-mid" {...common} />
        <path d="M21 20h22M17 34h30" className="metal-hi" fill="none" {...common} />
        <path d="M24 39h16v8H24z" className="cutout" {...common} />
        <path d="M27 8h10" className="metal-face" {...common} />
      </> : null}
      {kind === 5 ? <>
        <path d="M32 7l5 6 8-1 2 8 7 4-3 8 3 8-7 4-2 8-8-1-5 6-5-6-8 1-2-8-7-4 3-8-3-8 7-4 2-8 8 1z" className="metal-mid" {...common} />
        <circle cx="32" cy="32" r="11" className="metal-face" {...common} />
        <circle cx="32" cy="32" r="5" className="cutout" {...common} />
      </> : null}
      {kind === 6 ? <>
        <path d="M24 8h16l4 8-4 7 8 25-8 8H24l-8-8 8-25-4-7z" className="metal-mid" {...common} />
        <path d="M24 23h16M21 40h22" className="metal-hi" fill="none" {...common} />
        <circle cx="32" cy="16" r="4" className="cutout" {...common} />
      </> : null}
    </svg>
  );
}
