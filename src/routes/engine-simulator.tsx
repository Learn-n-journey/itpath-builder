import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Gauge, Play, Pause, RotateCcw, Wrench } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TITLE = "Virtual Engine";
const DESCRIPTION =
  "Run a four stroke engine one stroke at a time, change throttle, ignition timing and mixture, then introduce common faults and watch what each one does to how it runs.";

export const Route = createFileRoute("/engine-simulator")({
  head: () => ({
    meta: [
      { title: `${TITLE} | Practice Bay` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: `${TITLE} | Practice Bay` },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { sitemap: false },
  component: EngineSimulatorPage,
});

const STROKES = [
  {
    name: "Intake",
    piston: "travelling down",
    valves: "Intake open, exhaust closed",
    detail:
      "The piston moving down lowers the pressure above it, so atmospheric pressure pushes the air and fuel charge in through the open intake valve.",
  },
  {
    name: "Compression",
    piston: "travelling up",
    valves: "Both closed",
    detail:
      "Both valves seal and the rising piston squeezes the charge into the combustion chamber, which raises its temperature and makes it burn far more readily.",
  },
  {
    name: "Power",
    piston: "travelling down",
    valves: "Both closed",
    detail:
      "The charge is ignited near the end of compression. The expanding gases force the piston down, and that is the only stroke that puts energy into the crankshaft.",
  },
  {
    name: "Exhaust",
    piston: "travelling up",
    valves: "Intake closed, exhaust open",
    detail:
      "The rising piston pushes the burned gases out through the open exhaust valve so the cylinder is empty enough to take a fresh charge.",
  },
] as const;

interface Fault {
  id: string;
  label: string;
  symptom: string;
  explanation: string;
  /** How much smooth running is lost, 0 to 1. */
  roughness: number;
  powerLoss: number;
}

const FAULTS: Fault[] = [
  {
    id: "none",
    label: "No fault",
    symptom: "Runs evenly at every speed.",
    explanation: "Every cylinder gets air, fuel, compression and a spark at the right moment.",
    roughness: 0,
    powerLoss: 0,
  },
  {
    id: "fouled-plug",
    label: "Fouled spark plug",
    symptom: "Shakes at idle and smooths out slightly as speed rises.",
    explanation:
      "Deposits on the plug bleed the spark energy away, so that cylinder fires late or not at all. The engine is short one power stroke every other revolution.",
    roughness: 0.55,
    powerLoss: 0.22,
  },
  {
    id: "lean",
    label: "Lean mixture",
    symptom: "Hesitates on acceleration and runs hotter than normal.",
    explanation:
      "Too much air for the fuel present makes the charge burn slowly and unevenly. Combustion temperatures climb, which is what makes a long lean condition damaging.",
    roughness: 0.3,
    powerLoss: 0.18,
  },
  {
    id: "rich",
    label: "Rich mixture",
    symptom: "Black smoke, fuel smell and poor economy.",
    explanation:
      "Too much fuel for the air present leaves fuel unburned. It washes oil off the cylinder wall and loads the catalytic converter with what the engine failed to burn.",
    roughness: 0.25,
    powerLoss: 0.15,
  },
  {
    id: "low-compression",
    label: "Low compression, one cylinder",
    symptom: "Steady miss that does not change when you swap ignition parts.",
    explanation:
      "The cylinder cannot seal, so the charge is never squeezed hard enough to burn properly. Ignition and fuel parts will not fix a sealing problem.",
    roughness: 0.65,
    powerLoss: 0.28,
  },
  {
    id: "timing-retard",
    label: "Ignition timing far retarded",
    symptom: "Sluggish, hot running with poor economy.",
    explanation:
      "Firing too late means the charge is still burning as the exhaust valve opens, so heat leaves through the exhaust instead of pushing the piston down.",
    roughness: 0.2,
    powerLoss: 0.35,
  },
];

/** Learning points shown per stroke, under the animation. */
const WATCH_FOR: Record<number, string[]> = {
  0: [
    "The intake valve is open and the exhaust valve is shut.",
    "The falling piston is what pulls the charge in; nothing pushes it.",
    "More throttle means a wider intake path and a fuller cylinder.",
  ],
  1: [
    "Both valves are shut, so the charge has nowhere to escape.",
    "Squeezing the charge heats it, which is why it burns so quickly later.",
    "A cylinder that cannot seal here will never make proper power.",
  ],
  2: [
    "The spark fires just before the piston reaches the top.",
    "Only this stroke puts energy into the crankshaft; the other three cost energy.",
    "Late timing wastes heat out of the exhaust instead of pushing the piston.",
  ],
  3: [
    "The exhaust valve opens and the rising piston sweeps the burned gases out.",
    "Smoke colour here is a clue: black is rich, blue is oil, white can be coolant.",
    "A restricted exhaust shows up as a loss of power at higher speed.",
  ],
};

/** Ungraded self-check; purely a learning aid, never recorded. */
const SELF_CHECK = [
  {
    question: "During which stroke are both valves closed while the piston rises?",
    choices: ["Intake", "Compression", "Power", "Exhaust"],
    answer: 1,
    why: "Compression needs a sealed cylinder, so both valves are shut while the piston squeezes the charge.",
  },
  {
    question: "An engine fires far too late in the cycle. Which symptom fits best?",
    choices: [
      "Sluggish, hot running with poor economy",
      "A steady miss on one cylinder only",
      "Black smoke and a fuel smell",
      "No change at all, timing does not matter",
    ],
    answer: 0,
    why: "Firing late lets the burn finish as the exhaust valve opens, so heat leaves through the exhaust instead of doing work.",
  },
  {
    question: "Which stroke is the only one that adds energy to the crankshaft?",
    choices: ["Intake", "Compression", "Power", "Exhaust"],
    answer: 2,
    why: "Intake, compression and exhaust all cost energy. Only the expanding gases of the power stroke push the piston down.",
  },
  {
    question: "A fouled plug causes a shake that eases as speed rises. Why?",
    choices: [
      "The plug cleans itself permanently at high speed",
      "That cylinder fires late or not at all, so the engine loses one power stroke in the cycle",
      "The mixture always goes lean at idle",
      "The exhaust valve sticks open at idle",
    ],
    answer: 1,
    why: "Deposits bleed spark energy away, so the cylinder contributes little; at speed the miss is a smaller part of each second of running.",
  },
] as const;

function SelfCheck() {
  const [picked, setPicked] = useState<(number | null)[]>(SELF_CHECK.map(() => null));
  return (
    <div className="space-y-5">
      {SELF_CHECK.map((item, qi) => {
        const choice = picked[qi]!;
        return (
          <div key={qi}>
            <p className="text-sm font-medium">
              {qi + 1}. {item.question}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.choices.map((label, ci) => {
                const chosen = choice === ci;
                const reveal = choice !== null;
                return (
                  <button
                    key={ci}
                    onClick={() =>
                      setPicked((p) => p.map((v, i) => (i === qi ? ci : v)))
                    }
                    aria-pressed={chosen}
                    className={cn(
                      "pressable-soft rounded-full border px-3 py-1.5 text-xs font-medium",
                      reveal && ci === item.answer
                        ? "border-success bg-success/10 text-success"
                        : chosen
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {choice !== null && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.why}</p>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        This check is only for you. It is never graded and never counted anywhere.
      </p>
    </div>
  );
}

/**
 * Animated single-cylinder four-stroke cutaway.
 * angle is crank angle in degrees over the full 720° cycle.
 */
function EngineCutaway({
  angle,
  firing,
  mixture,
  faultId,
}: {
  angle: number;
  firing: boolean;
  mixture: number;
  faultId: string;
}) {
  const cycle = ((angle % 720) + 720) % 720;
  const stroke = Math.floor(cycle / 180); // 0 intake, 1 compression, 2 power, 3 exhaust
  const rad = (cycle * Math.PI) / 180;

  // Geometry
  const cx = 110; // cylinder centre x
  const boreTop = 34;
  const boreH = 190;
  const crankY = boreTop + boreH + 46;
  const crankR = 34;
  const rodLen = 92;

  // Piston pin height from crank angle (classic slider-crank)
  const pinY = crankY - (crankR * Math.cos(rad) + Math.sqrt(rodLen * rodLen - (crankR * Math.sin(rad)) ** 2));
  const crankPinX = cx + crankR * Math.sin(rad);
  const crankPinY = crankY - crankR * Math.cos(rad);

  const pistonH = 26;
  const chamberH = Math.max(6, pinY - boreTop);

  // Valve lift: intake opens during stroke 0, exhaust during stroke 3
  const liftFor = (s: number) => {
    if (stroke !== s) return 0;
    const t = (cycle - s * 180) / 180;
    return Math.sin(Math.PI * t) * 10;
  };
  const intakeLift = liftFor(0);
  const exhaustLift = liftFor(3);

  // Charge colour: grey-blue fresh charge, orange burn, dark exhaust
  const rich = mixture < 14.7;
  const freshFill = rich ? "rgba(96, 165, 250, 0.30)" : "rgba(148, 197, 255, 0.22)";
  const burnFill = "rgba(249, 115, 22, 0.55)";
  const spentFill =
    faultId === "rich" ? "rgba(60, 60, 60, 0.55)" : "rgba(115, 115, 115, 0.35)";
  const chamberFill =
    stroke === 2 && firing ? burnFill : stroke === 3 ? spentFill : stroke === 0 || stroke === 1 ? freshFill : "transparent";

  // Spark appears at the very end of compression
  const spark = stroke === 1 && cycle > 540 - 30 && firing;

  return (
    <svg
      viewBox="0 0 220 300"
      className="mx-auto h-72 w-auto max-w-full"
      role="img"
      aria-label="Animated cutaway of a single cylinder four stroke engine"
    >
      {/* Cylinder block */}
      <rect x={cx - 46} y={boreTop - 14} width={92} height={boreH + 14} rx={6} className="fill-muted/40 stroke-border" strokeWidth={2} />
      {/* Bore */}
      <rect x={cx - 28} y={boreTop} width={56} height={boreH} className="fill-background stroke-border" strokeWidth={1.5} />

      {/* Combustion chamber contents */}
      <rect x={cx - 27} y={boreTop + 1} width={54} height={chamberH} fill={chamberFill} />

      {/* Spark plug */}
      <g>
        <rect x={cx - 4} y={boreTop - 20} width={8} height={16} rx={2} className="fill-secondary stroke-border" />
        <line x1={cx} y1={boreTop - 4} x2={cx} y2={boreTop + 4} className="stroke-border" strokeWidth={2} />
        {spark && (
          <g className="stroke-primary" strokeWidth={2} strokeLinecap="round">
            <path d={`M ${cx} ${boreTop + 4} l -5 7 l 10 3 l -6 8`} fill="none" />
            <circle cx={cx} cy={boreTop + 8} r={9} className="fill-primary/20 stroke-none" />
          </g>
        )}
      </g>

      {/* Intake valve (left) and exhaust valve (right) */}
      {([
        { x: cx - 20, lift: intakeLift, active: stroke === 0, side: -1 },
        { x: cx + 20, lift: exhaustLift, active: stroke === 3, side: 1 },
      ] as const).map((v, i) => (
        <g key={i}>
          <line
            x1={v.x}
            y1={boreTop - 16}
            x2={v.x}
            y2={boreTop + 2 + v.lift}
            className={v.active ? "stroke-primary" : "stroke-muted-foreground"}
            strokeWidth={3}
          />
          <path
            d={`M ${v.x - 9} ${boreTop + 2 + v.lift} h 18 l -9 8 z`}
            className={v.active ? "fill-primary/70 stroke-primary" : "fill-secondary stroke-border"}
          />
          {/* Flow arrows while the valve is open */}
          {v.lift > 2 && (
              <path
              d={`M ${v.x + v.side * 22} ${boreTop - 6} L ${v.x} ${boreTop + 6}`}
              className="stroke-primary/60"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              markerEnd="url(#arrowhead)"
            />
          )}
        </g>
      ))}
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className="fill-primary/60" />
        </marker>
      </defs>

      {/* Piston */}
      <g>
        <rect
          x={cx - 26}
          y={pinY - pistonH / 2}
          width={52}
          height={pistonH}
          rx={3}
          className="fill-secondary stroke-border"
          strokeWidth={1.5}
        />
        {/* Rings */}
        <line x1={cx - 26} y1={pinY - pistonH / 2 + 6} x2={cx + 26} y2={pinY - pistonH / 2 + 6} className="stroke-border" />
        <line x1={cx - 26} y1={pinY - pistonH / 2 + 11} x2={cx + 26} y2={pinY - pistonH / 2 + 11} className="stroke-border" />
        <circle cx={cx} cy={pinY} r={4} className="fill-muted stroke-border" />
      </g>

      {/* Connecting rod */}
      <line x1={cx} y1={pinY} x2={crankPinX} y2={crankPinY} className="stroke-muted-foreground" strokeWidth={6} strokeLinecap="round" />

      {/* Crankcase + crankshaft */}
      <rect x={cx - 46} y={crankY - 44} width={92} height={88} rx={8} className="fill-muted/40 stroke-border" strokeWidth={2} />
      <circle cx={cx} cy={crankY} r={crankR} className="fill-secondary/60 stroke-border" strokeWidth={1.5} />
      <line x1={cx} y1={crankY} x2={crankPinX} y2={crankPinY} className="stroke-border" strokeWidth={4} />
      <circle cx={cx} cy={crankY} r={5} className="fill-muted stroke-border" strokeWidth={1.5} />
      <circle cx={crankPinX} cy={crankPinY} r={4} className="fill-muted stroke-border" />

      {/* Exhaust puffs on the exhaust stroke */}
      {stroke === 3 && (
        <g className="fill-muted-foreground/40">
          <circle cx={cx + 34} cy={boreTop - 18} r={4 + (cycle % 180) / 40} />
          <circle cx={cx + 44} cy={boreTop - 26} r={3 + (cycle % 180) / 55} />
        </g>
      )}
    </svg>
  );
}

function EngineSimulatorPage() {
  const [running, setRunning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [throttle, setThrottle] = useState(15);
  const [timing, setTiming] = useState(10);
  const [mixture, setMixture] = useState(14.7);
  const [faultId, setFaultId] = useState("none");
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  const fault = FAULTS.find((item) => item.id === faultId)!;

  const targetRpm = Math.round(700 + throttle * 52);

  const health = useMemo(() => {
    const mixturePenalty = Math.min(1, Math.abs(mixture - 14.7) / 4);
    const timingPenalty = Math.min(1, Math.abs(timing - 10) / 22);
    const rough = Math.min(1, fault.roughness + mixturePenalty * 0.5 + timingPenalty * 0.4);
    const power = Math.max(
      0,
      1 - fault.powerLoss - mixturePenalty * 0.25 - timingPenalty * 0.3,
    );
    return {
      rough,
      power,
      rpm: Math.round(targetRpm * (1 - rough * 0.12)),
      smoothness: Math.round((1 - rough) * 100),
      output: Math.round(power * 100),
    };
  }, [fault, mixture, timing, targetRpm]);

  // Continuous crank rotation: 720° per full cycle, two crank revolutions.
  useEffect(() => {
    if (!running) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - lastRef.current);
      lastRef.current = now;
      // deg per ms = rpm * 360 / 60000 ; add roughness wobble
      const wobble = 1 + Math.sin(now / 90) * health.rough * 0.35;
      const degPerMs = (health.rpm * 360 * wobble) / 60000;
      setAngle((a) => (a + degPerMs * dt) % 720);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, health.rpm, health.rough]);

  const cycle = ((angle % 720) + 720) % 720;
  const strokeIndex = Math.floor(cycle / 180);
  const current = STROKES[strokeIndex]!;
  // Rough engines occasionally fail to fire.
  const firing = health.rough < 0.6 || Math.floor(angle / 720) % 3 !== 1;

  const reset = () => {
    setRunning(false);
    setAngle(0);
    setThrottle(15);
    setTiming(10);
    setMixture(14.7);
    setFaultId("none");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <PageHeader
        title={TITLE}
        description="Watch the four strokes in order, then change one thing at a time and see how the engine answers."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Panel title="Cylinder" description={`${current.name} stroke, piston ${current.piston}`}>
            {/* 720° cycle timeline */}
            <div className="mb-3" aria-hidden>
              <div className="grid grid-cols-4 overflow-hidden rounded-md border border-border text-center text-[11px] font-medium">
                {STROKES.map((s, i) => (
                  <div
                    key={s.name}
                    className={cn(
                      "border-l border-border px-1 py-1.5 first:border-l-0",
                      i === strokeIndex ? "bg-primary/15 text-primary" : "text-muted-foreground",
                    )}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
              <div className="mt-1 h-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-100"
                  style={{ width: `${(cycle / 720) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
                {Math.round(cycle)}&deg; of 720&deg; crank rotation
              </p>
            </div>
            <EngineCutaway angle={angle} firing={firing} mixture={mixture} faultId={faultId} />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
              <p className="font-display text-lg font-semibold">{current.name}</p>
              <p className="text-muted-foreground">{current.valves}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Flame
                  className={cn("h-4 w-4", firing && strokeIndex === 2 ? "text-primary" : "text-muted-foreground/40")}
                  aria-hidden
                />
                {firing && strokeIndex === 2 ? "Charge burning" : "No combustion this stroke"}
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                {running ? "Pause" : "Run engine"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setAngle((a) => (Math.floor(a / 180) * 180 + 180) % 720)}
                disabled={running}
              >
                Step one stroke
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reset
              </Button>
            </div>
          </Panel>

          <Panel title="Controls">
            <div className="space-y-5">
              <label className="block text-sm">
                <span className="flex items-center justify-between">
                  <span>Throttle</span>
                  <span className="font-mono text-muted-foreground">{throttle} %</span>
                </span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={throttle}
                  onChange={(e) => setThrottle(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-primary)]"
                />
              </label>
              <label className="block text-sm">
                <span className="flex items-center justify-between">
                  <span>Ignition timing, degrees before top dead centre</span>
                  <span className="font-mono text-muted-foreground">{timing}&deg;</span>
                </span>
                <input
                  type="range"
                  min={-10}
                  max={35}
                  value={timing}
                  onChange={(e) => setTiming(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-primary)]"
                />
              </label>
              <label className="block text-sm">
                <span className="flex items-center justify-between">
                  <span>Air to fuel ratio</span>
                  <span className="font-mono text-muted-foreground">{mixture.toFixed(1)} : 1</span>
                </span>
                <input
                  type="range"
                  min={10}
                  max={20}
                  step={0.1}
                  value={mixture}
                  onChange={(e) => setMixture(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--color-primary)]"
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  14.7 : 1 is the ratio that burns petrol most completely. Below it is rich, above
                  it is lean.
                </span>
              </label>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="How it is running">
            <dl className="grid gap-px overflow-hidden rounded-md border border-border bg-border">
              <div className="bg-card px-3 py-2">
                <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" aria-hidden /> Engine speed
                </dt>
                <dd className="font-mono text-lg tabular-nums">{health.rpm} rpm</dd>
              </div>
              <div className="bg-card px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Smoothness</dt>
                <dd
                  className={cn(
                    "font-mono text-lg tabular-nums",
                    health.smoothness < 70 ? "text-warning" : "text-foreground",
                  )}
                >
                  {health.smoothness} %
                </dd>
              </div>
              <div className="bg-card px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Power output</dt>
                <dd
                  className={cn(
                    "font-mono text-lg tabular-nums",
                    health.output < 70 ? "text-warning" : "text-foreground",
                  )}
                >
                  {health.output} %
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              These figures describe this simulation only. Use them to feel how each change pulls
              the engine around, not as a specification for a real vehicle.
            </p>
          </Panel>

          <Panel title="Introduce a fault">
            <div className="flex flex-wrap gap-2">
              {FAULTS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFaultId(item.id)}
                  aria-pressed={item.id === faultId}
                  className={cn(
                    "pressable-soft rounded-full border px-3 py-1.5 text-xs font-medium",
                    item.id === faultId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm leading-relaxed">
              <p className="flex gap-2">
                <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span className="text-foreground">{fault.symptom}</span>
              </p>
              <p className="text-muted-foreground">{fault.explanation}</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
