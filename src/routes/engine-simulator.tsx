import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Play, Pause, RotateCcw, Wrench } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { VirusRun } from "@/components/game/virus-run";
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

function EngineSimulatorPage() {
  const [running, setRunning] = useState(false);
  const [stroke, setStroke] = useState(0);
  const [throttle, setThrottle] = useState(15);
  const [timing, setTiming] = useState(10);
  const [mixture, setMixture] = useState(14.7);
  const [faultId, setFaultId] = useState("none");

  const fault = FAULTS.find((item) => item.id === faultId)!;

  const targetRpm = Math.round(700 + throttle * 52);
  const interval = Math.max(90, Math.round(30000 / targetRpm));

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setStroke((s) => (s + 1) % 4), interval);
    return () => window.clearInterval(id);
  }, [running, interval]);

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

  const current = STROKES[stroke]!;
  const firing = stroke === 2 && health.rough < 0.6;

  const reset = () => {
    setRunning(false);
    setStroke(0);
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
            <div className="mt-2 flex items-end justify-center gap-6">
              <div className="relative h-56 w-28 overflow-hidden rounded-t-md border-2 border-border bg-muted/40">
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 transition-[height,background-color] duration-300 ease-out",
                    firing ? "bg-primary/40" : "bg-transparent",
                  )}
                  style={{ height: `${stroke === 0 ? 18 : stroke === 1 ? 62 : stroke === 2 ? 20 : 58}%` }}
                  aria-hidden
                />
                <div
                  className="absolute inset-x-1 h-12 rounded-sm border border-border bg-secondary transition-[top] duration-300 ease-out"
                  style={{ top: `${stroke === 0 ? 62 : stroke === 1 ? 14 : stroke === 2 ? 64 : 12}%` }}
                  aria-hidden
                />
                <div className="absolute inset-x-0 top-1 flex justify-between px-3" aria-hidden>
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full border transition-colors",
                      stroke === 0 ? "border-success bg-success" : "border-border bg-muted",
                    )}
                  />
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full border transition-colors",
                      stroke === 3 ? "border-warning bg-warning" : "border-border bg-muted",
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-display text-lg font-semibold">{current.name}</p>
                <p className="text-muted-foreground">{current.valves}</p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Flame
                    className={cn("h-4 w-4", firing ? "text-primary" : "text-muted-foreground/40")}
                    aria-hidden
                  />
                  {firing ? "Charge burning" : "No combustion this stroke"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{current.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                {running ? "Pause" : "Run engine"}
              </Button>
              <Button variant="secondary" onClick={() => setStroke((s) => (s + 1) % 4)} disabled={running}>
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
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Engine speed</dt>
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

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold">Take a break: Virus Run</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A short arcade game between practice runs. Play as the virus, harvest data packets and
          dodge antivirus daemons.
        </p>
        <div className="mt-4">
          <VirusRun />
        </div>
      </div>
    </div>
  );
}
