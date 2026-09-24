import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, CloudRain, ExternalLink, Headphones, Music2, Pause, Play, RotateCcw, Volume2, Wind } from "lucide-react";

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
const sounds = [
  { id: "rain", label: "Rain", icon: CloudRain },
  { id: "noise", label: "Soft noise", icon: Headphones },
  { id: "music", label: "Calm music", icon: Music2 },
] as const;

function MeditationPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sound, setSound] = useState<(typeof sounds)[number]["id"] | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const [bells, setBells] = useState(true);
  const bellContextRef = useRef<AudioContext | null>(null);
  const lastBellPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => () => { stopSound(); if (bellContextRef.current) void bellContextRef.current.close(); }, []);

  useEffect(() => {
    if (!running || !bells) return;
    const phaseName = elapsed % BREATH_SECONDS < 4 ? "inhale" : elapsed % BREATH_SECONDS < 8 ? "hold" : elapsed % BREATH_SECONDS < 12 ? "exhale" : "rest";
    if ((phaseName === "inhale" || phaseName === "exhale") && lastBellPhaseRef.current !== phaseName) playBell(phaseName);
    lastBellPhaseRef.current = phaseName;
  }, [running, elapsed, bells]);

  function stopSound() {
    try { noiseRef.current?.stop(); } catch {}
    noiseRef.current = null;
    gainRef.current?.disconnect();
    gainRef.current = null;
    if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current);
    musicTimerRef.current = null;
    if (audioRef.current) void audioRef.current.close();
    audioRef.current = null;
  }

  function toggleSound(next: (typeof sounds)[number]["id"]) {
    if (sound === next) {
      stopSound();
      setSound(null);
      return;
    }
    stopSound();
    const AudioContextCtor = window.AudioContext;
    const context = new AudioContextCtor();
    const gain = context.createGain();
    gain.gain.value = next === "music" ? 0.045 : 0.14;
    gain.connect(context.destination);
    audioRef.current = context;
    gainRef.current = gain;

    if (next === "music") {
      const notes = [261.63, 329.63, 392, 493.88, 440, 349.23];
      let noteIndex = 0;
      const playPad = () => {
        const now = context.currentTime;
        const root = notes[noteIndex % notes.length];
        noteIndex += 1;
        [root, root * 1.25, root * 1.5].forEach((frequency, voice) => {
          const oscillator = context.createOscillator();
          const envelope = context.createGain();
          oscillator.type = voice === 0 ? "sine" : "triangle";
          oscillator.frequency.value = frequency / 2;
          envelope.gain.setValueAtTime(0, now);
          envelope.gain.linearRampToValueAtTime(0.12, now + 1.4);
          envelope.gain.exponentialRampToValueAtTime(0.001, now + 7.5);
          oscillator.connect(envelope).connect(gain);
          oscillator.start(now);
          oscillator.stop(now + 8);
        });
      };
      playPad();
      musicTimerRef.current = window.setInterval(playPad, 6000);
    } else {
      const seconds = 2;
      const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = next === "rain" ? (last * 0.88 + white * 0.12) : (last * 0.96 + white * 0.04);
        data[i] = last * (next === "rain" ? 0.32 : 0.24);
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      noiseRef.current = source;
    }
    setSound(next);
  }

  function playBell(kind: "inhale" | "exhale") {
    const context = bellContextRef.current ?? new window.AudioContext();
    bellContextRef.current = context;
    const now = context.currentTime;
    const base = kind === "inhale" ? 659.25 : 523.25;
    const variation = 0.96 + Math.random() * 0.08;
    [1, 2.01].forEach((multiple, index) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = base * variation * multiple;
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(index === 0 ? 0.075 : 0.025, now + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + 1.8 + Math.random() * 0.5);
      oscillator.connect(envelope).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 2.5);
    });
  }

  const phase = elapsed % BREATH_SECONDS;
  const instruction = phase < 4 ? "Breathe in" : phase < 8 ? "Hold" : phase < 12 ? "Breathe out" : "Rest";
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <header className="mb-6 border-b border-border/60 pb-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-primary">Reset your focus</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Meditation</h1>
        <p className="mt-1 text-sm text-muted-foreground">A quiet break before studying, between lessons, or whenever you need to reset.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center">
          <div className="relative grid size-44 place-items-center sm:size-52">
            <div className={cn("absolute inset-0 rounded-full border border-primary/25 bg-primary/5", running && "animate-pulse")} aria-hidden />
            <div className={cn("absolute size-28 rounded-full bg-primary/15 transition-transform duration-[4000ms] ease-in-out sm:size-32", running && (instruction === "Breathe in" || instruction === "Hold") ? "scale-125" : "scale-90")} aria-hidden />
            <Wind className="relative size-7 text-primary" aria-hidden />
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold">{running ? instruction : "Ready when you are"}</h2>
          <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">{minutes}:{seconds}</p>
          <div className="mt-5 flex gap-2">
            <Button onClick={() => setRunning((value) => !value)} className="min-w-32 rounded-xl">
              {running ? <Pause aria-hidden /> : <Play aria-hidden />}
              {running ? "Pause" : "Start breathing"}
            </Button>
            <Button variant="outline" size="icon" aria-label="Reset breathing timer" onClick={() => { setRunning(false); setElapsed(0); }}>
              <RotateCcw aria-hidden />
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">4 seconds in · 4 hold · 4 out · 4 rest</p>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-feature-cyan" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Focus sounds</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Simple generated background sound. Nothing streams or needs an account.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sounds.map((item) => {
            const Icon = item.icon;
            const active = sound === item.id;
            return (
              <button key={item.id} type="button" onClick={() => toggleSound(item.id)} className={cn("flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", active ? "border-primary/50 bg-primary/10" : "border-border/70 bg-secondary/30 hover:bg-secondary/60")}>
                <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
                <span><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{active ? "Playing" : "Tap to play"}</span></span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setBells((value) => !value)} className={cn("mt-3 flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", bells ? "border-primary/35 bg-primary/5" : "border-border/70 bg-secondary/30")}>
          <span className="flex items-center gap-3"><Bell className={cn("size-4", bells ? "text-primary" : "text-muted-foreground")} aria-hidden /><span><span className="block text-sm font-semibold">Breathing bells</span><span className="block text-xs text-muted-foreground">A soft, slightly varied chime at each inhale and exhale.</span></span></span>
          <span className="text-xs font-semibold text-muted-foreground">{bells ? "On" : "Off"}</span>
        </button>
      </section>

      <section className="mt-5 border-t border-border/60 pt-5">
        <h2 className="font-display text-lg font-semibold">Meditation resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">Optional outside resources for guided practice and mindfulness basics.</p>
        <div className="mt-3 divide-y divide-border/60">
          <Resource href="https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety" title="Meditation and mindfulness" detail="NIH / NCCIH overview of evidence and safety" />
          <Resource href="https://www.va.gov/WHOLEHEALTHLIBRARY/tools/mindful-awareness.asp" title="Mindful awareness" detail="U.S. Department of Veterans Affairs practice guide" />
        </div>
      </section>
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
