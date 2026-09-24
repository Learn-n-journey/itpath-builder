import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CloudRain,
  ExternalLink,
  Headphones,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meditation")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Meditation | IT PATH" },
      { name: "description", content: "A quiet space for breathing, focus, and study breaks." },
    ],
  }),
  component: MeditationPage,
});

const BREATH_SECONDS = 16;
const sessions = [5, 10, 15, 20] as const;
const sounds = [
  { id: "rain", label: "Rain", detail: "Natural rain ambience", icon: CloudRain, src: "/audio/meditation/rain.mp3" },
  { id: "music", label: "Meditation Music", detail: "Calming instrumental", icon: Music2, src: "/audio/meditation/meditation-music.mp3" },
] as const;

function MeditationPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(10);
  const [sound, setSound] = useState<(typeof sounds)[number]["id"] | null>(null);
  const [bellsEnabled, setBellsEnabled] = useState(true);
  const [volume, setVolume] = useState(45);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastBreathCueRef = useRef<"inhale" | "exhale" | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (sessionMinutes && elapsed >= sessionMinutes * 60) {
      setRunning(false);
      stopBell();
    }
  }, [elapsed, sessionMinutes]);

  useEffect(() => {
    if (backgroundAudioRef.current) backgroundAudioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => () => {
    backgroundAudioRef.current?.pause();
    backgroundAudioRef.current = null;
    stopBell();
  }, []);

  function stopBell() {
    bellAudioRef.current?.pause();
    if (bellAudioRef.current) bellAudioRef.current.currentTime = 0;
    bellAudioRef.current = null;
  }

  function playBell(kind: "inhale" | "exhale") {
    stopBell();
    const bell = new Audio(kind === "inhale" ? "/audio/meditation/inhale-bell.mp3" : "/audio/meditation/exhale-bell.mp3");
    bell.volume = Math.min(0.65, volume / 100);
    bellAudioRef.current = bell;
    void bell.play().catch(() => {
      if (bellAudioRef.current === bell) bellAudioRef.current = null;
    });
  }

  useEffect(() => {
    if (!running || !bellsEnabled) {
      stopBell();
      lastBreathCueRef.current = null;
      return;
    }
    const phase = elapsed % BREATH_SECONDS;
    const cue = phase < 4 ? "inhale" : phase >= 8 && phase < 12 ? "exhale" : null;
    if (cue && cue !== lastBreathCueRef.current) {
      playBell(cue);
      lastBreathCueRef.current = cue;
    }
    if (!cue) lastBreathCueRef.current = null;
  }, [bellsEnabled, elapsed, running]);

  function stopSound() {
    backgroundAudioRef.current?.pause();
    if (backgroundAudioRef.current) backgroundAudioRef.current.currentTime = 0;
    backgroundAudioRef.current = null;
  }

  function toggleSound(next: (typeof sounds)[number]["id"]) {
    if (sound === next) {
      stopSound();
      setSound(null);
      return;
    }
    stopSound();
    const selected = sounds.find((item) => item.id === next);
    if (!selected) return;
    const audio = new Audio(selected.src);
    audio.loop = true;
    audio.volume = volume / 100;
    backgroundAudioRef.current = audio;
    void audio.play().then(() => setSound(next)).catch(() => {
      backgroundAudioRef.current = null;
      setSound(null);
    });
  }

  function startPause() {
    if (running) {
      stopBell();
      setRunning(false);
      return;
    }
    if (bellsEnabled) {
      lastBreathCueRef.current = "inhale";
      playBell("inhale");
    }
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    setElapsed(0);
    stopBell();
    lastBreathCueRef.current = null;
  }

  function stopSession() {
    reset();
    stopSound();
    setSound(null);
  }

  const phase = elapsed % BREATH_SECONDS;
  const instruction = phase < 4 ? "Inhale" : phase < 8 ? "Hold" : phase < 12 ? "Exhale" : "Rest";
  const phaseSeconds = 4 - (phase % 4);
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <header className="mb-6 text-center">
        <div className="mx-auto flex items-center justify-center gap-2">
          <Wind className="size-6 text-primary" aria-hidden />
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Meditation</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Breathe · Be present · Reset your focus</p>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-feature-blue/5" aria-hidden />
        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-serif text-3xl leading-tight sm:text-5xl">A calmer mind is a brighter you</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Guided breathing, soothing sounds, and peaceful music to help you relax, reset, and return to learning.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <Wind className="size-4 text-feature-cyan" aria-hidden />
                <h2 className="font-semibold">Breathing Exercise</h2>
              </div>
              <div className="rounded-xl border border-primary/50 bg-primary/10 p-4">
                <p className="font-mono text-lg font-semibold">4 · 4 · 4 · 4</p>
                <p className="text-xs text-muted-foreground">Calm & focused</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Inhale for 4 seconds, hold for 4, exhale for 4, then rest for 4.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className={cn(
                "grid size-56 place-items-center rounded-full border-8 border-primary/50 bg-background/80 shadow-lg transition-transform duration-1000 sm:size-64",
                running && (instruction === "Inhale" || instruction === "Hold") ? "scale-105" : "scale-95",
              )}>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{running ? instruction : "Ready"}</p>
                  <p className="mt-2 font-mono text-6xl font-light tabular-nums">{running ? phaseSeconds : 4}</p>
                  <p className="mt-1 text-xs text-muted-foreground">seconds</p>
                  <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">{minutes}:{seconds}</p>
                </div>
              </div>
              <div className="mt-5 flex items-start justify-center gap-4">
                <CircleControl label="Reset" onClick={reset}><RotateCcw aria-hidden /></CircleControl>
                <CircleControl label={running ? "Pause" : "Start"} primary onClick={startPause}>
                  {running ? <Pause aria-hidden /> : <Play aria-hidden />}
                </CircleControl>
                <CircleControl label="Stop" onClick={stopSession}><Square aria-hidden /></CircleControl>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <Headphones className="size-4 text-feature-cyan" aria-hidden />
                <h2 className="font-semibold">Session</h2>
              </div>
              <div className="space-y-2">
                {sessions.map((item) => (
                  <button key={item} type="button" onClick={() => setSessionMinutes(item)} className={cn(
                    "flex min-h-11 w-full items-center justify-between rounded-xl border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    sessionMinutes === item ? "border-primary/60 bg-primary/10 font-semibold" : "border-border/60 bg-secondary/20 hover:bg-secondary/50",
                  )}>
                    {item} minutes
                    {sessionMinutes === item && <span className="size-2 rounded-full bg-primary" aria-hidden />}
                  </button>
                ))}
                <button type="button" onClick={() => setSessionMinutes(null)} className={cn(
                  "flex min-h-11 w-full items-center rounded-xl border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  sessionMinutes === null ? "border-primary/60 bg-primary/10 font-semibold" : "border-border/60 bg-secondary/20 hover:bg-secondary/50",
                )}>No timer</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-feature-cyan" aria-hidden />
          <h2 className="font-serif text-xl font-semibold">Ambient Sounds</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {sounds.map((item) => {
            const Icon = item.icon;
            const active = sound === item.id;
            return (
              <button key={item.id} type="button" aria-pressed={active} onClick={() => toggleSound(item.id)} className={cn(
                "min-h-32 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active ? "border-primary/60 bg-primary/10" : "border-border/60 bg-secondary/20 hover:bg-secondary/50",
              )}>
                <div className="flex items-center justify-between">
                  <Icon className={cn("size-6", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{active ? "On" : "Off"}</span>
                </div>
                <p className="mt-5 font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </button>
            );
          })}
          <button type="button" aria-pressed={bellsEnabled} onClick={() => {
            if (bellsEnabled) stopBell();
            setBellsEnabled((value) => !value);
          }} className={cn(
            "min-h-32 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            bellsEnabled ? "border-feature-amber/60 bg-feature-amber/10" : "border-border/60 bg-secondary/20 hover:bg-secondary/50",
          )}>
            <div className="flex items-center justify-between">
              <Bell className={cn("size-6", bellsEnabled ? "text-feature-amber" : "text-muted-foreground")} aria-hidden />
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", bellsEnabled ? "bg-feature-amber/20 text-feature-amber" : "bg-secondary text-muted-foreground")}>{bellsEnabled ? "On" : "Off"}</span>
            </div>
            <p className="mt-5 font-semibold">Breathing Bells</p>
            <p className="mt-1 text-xs text-muted-foreground">Higher inhale · lower exhale</p>
          </button>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm">
          <Volume2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">Audio volume</span>
          <input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-full accent-current" />
          <span className="w-10 text-right font-mono text-xs text-muted-foreground">{volume}%</span>
        </label>
      </section>

      <section className="mt-5 border-t border-border/60 pt-5">
        <h2 className="font-serif text-lg font-semibold">Meditation resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">Optional outside resources for guided practice and mindfulness basics.</p>
        <div className="mt-3 divide-y divide-border/60">
          <Resource href="https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety" title="Meditation and mindfulness" detail="NIH / NCCIH overview of evidence and safety" />
          <Resource href="https://www.va.gov/WHOLEHEALTHLIBRARY/tools/mindful-awareness.asp" title="Mindful awareness" detail="U.S. Department of Veterans Affairs practice guide" />
        </div>
      </section>
    </div>
  );
}

function CircleControl({ label, onClick, primary = false, children }: { label: string; onClick: () => void; primary?: boolean; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <Button type="button" variant={primary ? "default" : "outline"} size="icon" onClick={onClick} className="size-14 rounded-full">
        {children}
      </Button>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Resource({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group flex min-h-14 items-center justify-between gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span><span className="block text-sm font-semibold group-hover:text-primary">{title}</span><span className="block text-xs text-muted-foreground">{detail}</span></span>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}
