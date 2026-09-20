import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Plug, RefreshCw, Eraser, Lightbulb, AlertTriangle } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { obdScenarios, scenarioById, type LivePid } from "@/data/auto/obd";
import { cn } from "@/lib/utils";

const TITLE = "Virtual OBD-II Scanner";
const DESCRIPTION =
  "Plug a virtual scan tool into faulty vehicles, pull trouble codes, read freeze frame data and watch live sensor values behave the way the fault makes them behave.";

export const Route = createFileRoute("/obd-scanner")({
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
  validateSearch: (search: Record<string, unknown>) => {
    const scenario = typeof search["scenario"] === "string" ? search["scenario"] : undefined;
    return scenario && obdScenarios.some((item) => item.id === scenario) ? { scenario } : {};
  },
  component: ObdScannerPage,
});

type Tab = "codes" | "freeze" | "live" | "readiness";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "codes", label: "Trouble codes" },
  { id: "freeze", label: "Freeze frame" },
  { id: "live", label: "Live data" },
  { id: "readiness", label: "Readiness" },
];

const MONITORS = [
  "Misfire",
  "Fuel system",
  "Comprehensive components",
  "Catalyst",
  "Oxygen sensor",
  "Evaporative system",
  "Exhaust gas recirculation",
];

/** Deterministic wobble so the stream looks live without random jumps. */
function reading(pid: LivePid, revving: boolean, tick: number): number {
  const base = revving ? pid.cruise : pid.idle;
  if (pid.jitter === 0) return base;
  const wave = Math.sin(tick * 0.9 + pid.id.length) * pid.jitter;
  const value = base + wave;
  return pid.unit === "V" ? Math.max(0, Number(value.toFixed(2))) : Math.round(value);
}

function ObdScannerPage() {
  const { scenario: requestedScenario } = Route.useSearch();
  const [scenarioId, setScenarioId] = useState(requestedScenario ?? obdScenarios[0]!.id);
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [codesRead, setCodesRead] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [tab, setTab] = useState<Tab>("codes");
  const [revving, setRevving] = useState(false);
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = scenarioById(scenarioId);

  useEffect(() => {
    if (!connected) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 700);
    return () => window.clearInterval(id);
  }, [connected]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const reset = (id: string) => {
    if (timer.current) clearTimeout(timer.current);
    setScenarioId(id);
    setConnected(false);
    setScanning(false);
    setCodesRead(false);
    setCleared(false);
    setRevealed(false);
    setRevving(false);
    setTab("codes");
  };

  const connect = () => {
    setScanning(true);
    timer.current = setTimeout(() => {
      setScanning(false);
      setConnected(true);
    }, 900);
  };

  const visibleCodes = cleared ? [] : scenario.codes;
  const milLit = scenario.milOn && !cleared;

  const incomplete = useMemo(() => {
    if (cleared) return MONITORS.filter((m) => m !== "Misfire" && m !== "Comprehensive components");
    return scenario.readinessIncomplete;
  }, [cleared, scenario.readinessIncomplete]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <PageHeader
        title={TITLE}
        description="Pick a vehicle, plug in, and work the fault the way you would in the bay: codes first, then freeze frame, then live data."
      />

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Vehicles">
        {obdScenarios.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={item.id === scenarioId}
            onClick={() => reset(item.id)}
            className={cn(
              "pressable-soft rounded-full border px-4 py-2 text-sm font-medium",
              item.id === scenarioId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {item.vehicle}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <Panel title="Customer complaint">
            <p className="text-sm leading-relaxed text-muted-foreground">{scenario.complaint}</p>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span
                aria-hidden
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  milLit ? "bg-warning" : "bg-muted-foreground/40",
                )}
              />
              <span className={milLit ? "text-warning" : "text-muted-foreground"}>
                {milLit ? "Malfunction indicator lamp on" : "Malfunction indicator lamp off"}
              </span>
            </div>
          </Panel>

          <Panel title="Scan tool">
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-background/70 px-3 py-2 font-mono text-xs text-muted-foreground">
                {scanning
                  ? "Establishing link with control module..."
                  : connected
                    ? "Linked. Protocol ISO 15765-4 CAN, 500 kbit/s"
                    : "No link. Connect the tool to the diagnostic socket."}
              </div>
              {!connected ? (
                <Button onClick={connect} disabled={scanning} className="w-full">
                  <Plug className="h-4 w-4" aria-hidden />
                  {scanning ? "Connecting" : "Connect tool"}
                </Button>
              ) : (
                <div className="grid gap-2">
                  <Button onClick={() => setCodesRead(true)} variant="secondary">
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Read trouble codes
                  </Button>
                  <Button
                    onClick={() => {
                      setCleared(true);
                      setCodesRead(true);
                    }}
                    variant="outline"
                    disabled={cleared}
                  >
                    <Eraser className="h-4 w-4" aria-hidden />
                    Clear codes
                  </Button>
                </div>
              )}
              {cleared ? (
                <p className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Codes cleared. You also erased the freeze frame and reset the monitors, so the
                  evidence is gone and the vehicle has to be driven again before it will pass a
                  readiness check.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Check yourself">
            {revealed ? (
              <div className="space-y-3 text-sm leading-relaxed">
                <p>{scenario.rootCause}</p>
                <p className="flex gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-muted-foreground">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  {scenario.teaching}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Work the data first and decide what you would test next. Reveal the fault only
                  once you have committed to an answer.
                </p>
                <Button variant="outline" onClick={() => setRevealed(true)} className="w-full">
                  Reveal the fault
                </Button>
              </div>
            )}
          </Panel>
        </div>

        <Panel className="min-h-[24rem]">
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Scan tool screens">
            {TABS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={item.id === tab}
                onClick={() => setTab(item.id)}
                className={cn(
                  "pressable-soft rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  item.id === tab
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {!connected ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
              <Gauge className="h-8 w-8 text-primary/60" aria-hidden />
              <p>Connect the tool to see what this vehicle is reporting.</p>
            </div>
          ) : tab === "codes" ? (
            <div className="space-y-4">
              {!codesRead ? (
                <p className="text-sm text-muted-foreground">
                  Tool linked. Request the codes to pull what the module has stored.
                </p>
              ) : visibleCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No diagnostic trouble codes reported.
                </p>
              ) : (
                visibleCodes.map((code) => (
                  <article key={code.code} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-semibold text-primary">
                        {code.code}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {code.status}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-sm font-semibold">{code.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {code.meaning}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Common causes
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {code.commonCauses.map((cause) => (
                            <li key={cause}>{cause}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          What to check next
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {code.nextChecks.map((check) => (
                            <li key={check}>{check}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))
              )}
              <p className="text-xs text-muted-foreground">
                A code names the circuit or condition the module noticed. It never names the part
                to replace.
              </p>
            </div>
          ) : tab === "freeze" ? (
            <div className="space-y-3">
              {cleared || scenario.freezeFrame.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No freeze frame stored for this vehicle.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Conditions captured at the moment the code set.
                  </p>
                  <dl className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
                    {scenario.freezeFrame.map(([label, value]) => (
                      <div key={label} className="bg-card px-3 py-2">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="font-mono text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>
          ) : tab === "live" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={revving ? "secondary" : "default"}
                  onClick={() => setRevving(false)}
                >
                  Idle
                </Button>
                <Button
                  size="sm"
                  variant={revving ? "default" : "secondary"}
                  onClick={() => setRevving(true)}
                >
                  Hold 2500 rpm
                </Button>
              </div>
              <ul className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
                {scenario.pids.map((pid) => {
                  const value = reading(pid, revving, tick);
                  return (
                    <li key={pid.id} className="bg-card px-3 py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {pid.label}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-sm tabular-nums",
                            pid.healthy ? "text-foreground" : "text-warning",
                          )}
                        >
                          {value} {pid.unit}
                        </span>
                      </div>
                      {pid.note ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {pid.note}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Readings outside the normal band are highlighted. Compare idle against 2500 rpm
                before you decide what the data is telling you.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Monitors have to run and pass before an emissions test will accept the vehicle.
              </p>
              <ul className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
                {MONITORS.map((monitor) => {
                  const ready = !incomplete.includes(monitor);
                  return (
                    <li
                      key={monitor}
                      className="flex items-center justify-between gap-3 bg-card px-3 py-2 text-sm"
                    >
                      <span>{monitor}</span>
                      <span className={ready ? "text-success" : "text-warning"}>
                        {ready ? "Complete" : "Not ready"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
