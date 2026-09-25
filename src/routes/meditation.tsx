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

const breathingExercises = [
  { id: "box", label: "Box Breathing", detail: "Calm & focused", inhale: 4, hold: 4, exhale: 4, rest: 4 },
  { id: "relax", label: "Relax & Unwind", detail: "Longer exhale", inhale: 4, hold: 2, exhale: 6, rest: 2 },
  { id: "balanced", label: "Balanced", detail: "Smooth & steady", inhale: 5, hold: 0, exhale: 5, rest: 0 },
  { id: "deep", label: "4-7-8 Breathing", detail: "Slow & deliberate", inhale: 4, hold: 7, exhale: 8, rest: 0 },
  { id: "coherent", label: "Coherent Breathing", detail: "Gentle rhythm", inhale: 5, hold: 0, exhale: 5, rest: 0 },
] as const;

type BreathingExercise = (typeof breathingExercises)[number];

const sessions = [5, 10, 15, 20] as const;
const sounds = [
  { id: "rain", label: "Rain", detail: "Natural rain ambience", icon: CloudRain, src: "/audio/meditation/rain.mp3" },
  { id: "music", label: "Meditation Music", detail: "Calming instrumental", icon: Music2, src: "/audio/meditation/meditation-music.mp3" },
] as const;

function MeditationPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(10);
  const [exerciseId, setExerciseId] = useState<BreathingExercise["id"]>("box");
  const [sound, setSound] = useState<(typeof sounds)[number]["id"] | null>(null);
  const [breathCuesEnabled, setBreathCuesEnabled] = useState(true);
  const [volume, setVolume] = useState(45);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const breathAudioContextRef = useRef<AudioContext | null>(null);
  const breathNodesRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);
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
    void breathAudioContextRef.current?.close();
    breathAudioContextRef.current = null;
  }, []);

  function stopBell() {
    const active = breathNodesRef.current;
    if (active) {
      try { active.gain.gain.cancelScheduledValues(0); active.gain.gain.setValueAtTime(0.0001, active.gain.context.currentTime); active.source.stop(); } catch {}
    }
    breathNodesRef.current = null;
  }

  function playBell(kind: "inhale" | "exhale") {
    stopBell();
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = breathAudioContextRef.current ?? new AudioCtx();
    breathAudioContextRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();

    const exercise = breathingExercises.find((item) => item.id === exerciseId) ?? breathingExercises[0];
    const duration = Math.max(1.5, kind === "inhale" ? exercise.inhale : exercise.exhale);
    const sampleCount = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < sampleCount; i++) {
      const white = Math.random() * 2 - 1;
      smooth = smooth * 0.86 + white * 0.14;
      data[i] = smooth * 0.72 + white * 0.12;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.55;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const level = Math.min(0.22, (volume / 100) * 0.24);
    gain.gain.setValueAtTime(0.0001, now);
    if (kind === "inhale") {
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(1050, now + duration);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, level), now + duration * 0.62);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else {
      filter.frequency.setValueAtTime(980, now);
      filter.frequency.exponentialRampToValueAtTime(430, now + duration);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, level * 0.9), now + duration * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    }
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    breathNodesRef.current = { source, gain };
    source.onended = () => { if (breathNodesRef.current?.source === source) breathNodesRef.current = null; };
    source.start(now);
  }

  useEffect(() => {
    if (!running || !breathCuesEnabled) {
      stopBell();
      lastBreathCueRef.current = null;
      return;
    }
    const exercise = breathingExercises.find((item) => item.id === exerciseId) ?? breathingExercises[0];
    const cycleSeconds = exercise.inhale + exercise.hold + exercise.exhale + exercise.rest;
    const phase = elapsed % cycleSeconds;
    const exhaleStart = exercise.inhale + exercise.hold;
    const cue = phase < exercise.inhale ? "inhale" : phase >= exhaleStart && phase < exhaleStart + exercise.exhale ? "exhale" : null;
    if (cue && cue !== lastBreathCueRef.current) {
      playBell(cue);
      lastBreathCueRef.current = cue;
    }
    if (!cue) lastBreathCueRef.current = null;
  }, [breathCuesEnabled, elapsed, exerciseId, running]);

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
    if (breathCuesEnabled) {
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

  const exercise = breathingExercises.find((item) => item.id === exerciseId) ?? breathingExercises[0];
  const cycleSeconds = exercise.inhale + exercise.hold + exercise.exhale + exercise.rest;
  const phase = elapsed % cycleSeconds;
  const inhaleEnd = exercise.inhale;
  const holdEnd = inhaleEnd + exercise.hold;
  const exhaleEnd = holdEnd + exercise.exhale;
  const instruction = phase < inhaleEnd
    ? "Inhale"
    : exercise.hold > 0 && phase < holdEnd
      ? "Hold"
      : phase < exhaleEnd
        ? "Exhale"
        : "Rest";
  const phaseStart = instruction === "Inhale" ? 0 : instruction === "Hold" ? inhaleEnd : instruction === "Exhale" ? holdEnd : exhaleEnd;
  const phaseDuration = instruction === "Inhale" ? exercise.inhale : instruction === "Hold" ? exercise.hold : instruction === "Exhale" ? exercise.exhale : exercise.rest;
  const phaseSeconds = Math.max(1, phaseDuration - (phase - phaseStart));
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="relative -mx-4 -my-4 h-[calc(100dvh-4rem)] overflow-hidden text-white sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8">
      <div className="fixed inset-0 z-0 bg-[url('/images/meditation-background.png')] bg-cover bg-center" aria-hidden />
      <div className="fixed inset-0 z-0 bg-background/60 backdrop-blur-[1px]" aria-hidden />
      <main className="relative z-10 mx-auto grid h-full max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div><h1 className="font-serif text-2xl font-semibold">Breathe</h1><p className="mt-0.5 text-xs text-white/60">{exercise.label}</p></div>
          <button type="button" onClick={()=>setBreathCuesEnabled(v=>!v)} aria-label="Toggle breath cues" className={cn("rounded-full p-2.5 transition-colors",breathCuesEnabled?"bg-white/10 text-white":"text-white/45 hover:bg-white/10")}><Bell className="size-4"/></button>
        </header>

        <section className="flex min-h-0 items-center justify-center text-center">
          <div className={cn("grid size-64 place-items-center rounded-full border border-white/20 bg-white/[.04] shadow-2xl shadow-black/20 transition-all duration-1000 sm:size-72",running&&(instruction==="Inhale"||instruction==="Hold")?"scale-105 bg-white/[.07]":"scale-95")}>
            <div><p className="text-xs font-semibold uppercase tracking-[.3em] text-white/55">{running?instruction:"Ready"}</p><p className="mt-3 font-serif text-7xl font-light tabular-nums">{running?phaseSeconds:exercise.inhale}</p><p className="mt-3 font-mono text-xs text-white/45">{minutes}:{seconds}</p></div>
          </div>
          <div className="mt-8 flex items-center gap-5">
            <button type="button" onClick={reset} aria-label="Reset" className="rounded-full p-3 text-white/55 hover:bg-white/10 hover:text-white"><RotateCcw className="size-5"/></button>
            <Button type="button" size="icon" onClick={startPause} className="size-16 rounded-full shadow-xl">{running?<Pause className="size-6"/>:<Play className="ml-0.5 size-6 fill-current"/>}</Button>
            <button type="button" onClick={stopSession} aria-label="Stop" className="rounded-full p-3 text-white/55 hover:bg-white/10 hover:text-white"><Square className="size-5"/></button>
          </div>
        </section>

        <section className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {breathingExercises.map(item=><button key={item.id} type="button" onClick={()=>{setExerciseId(item.id);setElapsed(0);stopBell();lastBreathCueRef.current=null}} className={cn("shrink-0 rounded-full px-3 py-2 text-xs transition-colors",exerciseId===item.id?"bg-white text-black":"bg-white/10 text-white/65 hover:bg-white/15")}>{item.label}</button>)}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1">{sessions.map(item=><button key={item} type="button" onClick={()=>setSessionMinutes(item)} className={cn("rounded-full px-3 py-1.5 text-xs",sessionMinutes===item?"bg-white/15 text-white":"text-white/50 hover:text-white")}>{item}m</button>)}<button type="button" onClick={()=>setSessionMinutes(null)} className={cn("rounded-full px-3 py-1.5 text-xs",sessionMinutes===null?"bg-white/15 text-white":"text-white/50 hover:text-white")}>∞</button></div>
            <div className="flex items-center gap-1">
              {sounds.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" aria-label={item.label} onClick={()=>toggleSound(item.id)} className={cn("rounded-full p-2.5",sound===item.id?"bg-white/15 text-white":"text-white/45 hover:bg-white/10 hover:text-white")}><Icon className="size-4"/></button>})}
            </div>
          </div>
          <div className="flex items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]"><Volume2 className="size-4 text-white/40"/><input aria-label="Audio volume" type="range" min="0" max="100" value={volume} onChange={e=>setVolume(Number(e.target.value))} className="w-full accent-white"/><span className="w-8 text-right font-mono text-[10px] text-white/40">{volume}%</span></div>
        </section>
      </main>
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
