import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CloudRain,
  ChevronDown,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Settings2,
  Volume2,
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
  const [breathAudioReady, setBreathAudioReady] = useState(true);
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
      try {
        active.gain.gain.cancelScheduledValues(active.gain.context.currentTime);
        active.gain.gain.setValueAtTime(0.0001, active.gain.context.currentTime);
        active.source.stop();
      } catch {}
    }
    breathNodesRef.current = null;
  }

  function playBell(kind: "inhale" | "exhale") {
    stopBell();
    const ctx = breathAudioContextRef.current;
    if (!ctx || ctx.state !== "running") return;
    const exercise = breathingExercises.find((item) => item.id === exerciseId) ?? breathingExercises[0];
    const duration = Math.max(1.5, kind === "inhale" ? exercise.inhale : exercise.exhale);
    const frameCount = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) samples[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.55;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const level = Math.max(0.02, Math.min(0.12, (volume / 100) * 0.18));

    if (kind === "inhale") {
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.linearRampToValueAtTime(1250, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + duration * 0.72);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else {
      filter.frequency.setValueAtTime(1050, now);
      filter.frequency.linearRampToValueAtTime(480, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level * 0.9, now + Math.min(0.3, duration * 0.12));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    }

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    breathNodesRef.current = { source, gain };
    source.onended = () => { if (breathNodesRef.current?.source === source) breathNodesRef.current = null; };
    source.start(now);
    source.stop(now + duration);
  }

  async function unlockBreathAudio() {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      setBreathAudioReady(false);
      return false;
    }
    try {
      // iOS Safari only allows Web Audio to be created/resumed from a direct
      // user gesture. This function is called by the Play button itself.
      const ctx = breathAudioContextRef.current ?? new AudioCtx();
      breathAudioContextRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      // Push a silent buffer through the graph while still inside the gesture.
      // This reliably unlocks the destination on iPhone/iPad Safari.
      const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = silent;
      source.connect(ctx.destination);
      source.start(0);
      const ready = ctx.state === "running";
      setBreathAudioReady(ready);
      return ready;
    } catch {
      setBreathAudioReady(false);
      return false;
    }
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

  async function startPause() {
    if (running) {
      stopBell();
      setRunning(false);
      return;
    }
    const audioReady = await unlockBreathAudio();
    if (breathCuesEnabled && audioReady) {
      lastBreathCueRef.current = "inhale";
      playBell("inhale");
    } else {
      lastBreathCueRef.current = null;
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

        <section className="flex min-h-0 flex-col items-center justify-center text-center">
          <div className={cn("grid size-[min(64vw,16rem)] place-items-center rounded-full border border-white/20 bg-white/[.04] shadow-2xl shadow-black/20 transition-all duration-1000 sm:size-72",running&&(instruction==="Inhale"||instruction==="Hold")?"scale-105 bg-white/[.07]":"scale-95")}>
            <div><p className="text-xs font-semibold uppercase tracking-[.3em] text-white/55">{running?instruction:"Ready"}</p><p className="mt-3 font-serif text-7xl font-light tabular-nums">{running?phaseSeconds:exercise.inhale}</p><p className="mt-3 font-mono text-xs text-white/45">{minutes}:{seconds}</p></div>
          </div>
          {!breathAudioReady && breathCuesEnabled ? <p className="mt-5 max-w-sm text-xs text-white/60">Breath sound is blocked by the browser. Tap Play again with your iPhone or iPad volume on and Silent Mode off.</p> : null}
          <div className="mt-7 flex items-center justify-center gap-4">
            <Button type="button" size="icon" onClick={startPause} aria-label={running ? "Pause" : "Play"} className="size-16 rounded-full shadow-xl">{running?<Pause className="size-6"/>:<Play className="ml-0.5 size-6 fill-current"/>}</Button>
            <button type="button" onClick={stopSession} aria-label="Stop" className="grid size-14 place-items-center rounded-full border border-white/15 bg-white/[.06] text-white/70"><Square className="size-5"/></button>
          </div>
        </section>

        <section className="border-t border-white/10 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <details className="group">
            <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-4 text-xs font-medium text-white/60 hover:bg-white/[.06] hover:text-white [&::-webkit-details-marker]:hidden"><Settings2 className="size-4"/>Session options<ChevronDown className="size-3.5 transition-transform group-open:rotate-180"/></summary>
            <div className="mt-3 max-h-[30dvh] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-xl">
              <div className="flex gap-2 overflow-x-auto pb-1">{breathingExercises.map(item=><button key={item.id} type="button" onClick={()=>{setExerciseId(item.id);setElapsed(0);stopBell();lastBreathCueRef.current=null}} className={cn("shrink-0 rounded-full px-3 py-2 text-xs",exerciseId===item.id?"bg-white text-black":"bg-white/10 text-white/65")}>{item.label}</button>)}</div>
              <div className="flex flex-wrap gap-1">{sessions.map(item=><button key={item} type="button" onClick={()=>setSessionMinutes(item)} className={cn("rounded-full px-3 py-2 text-xs",sessionMinutes===item?"bg-white/15 text-white":"text-white/50")}>{item}m</button>)}<button type="button" onClick={()=>setSessionMinutes(null)} className={cn("rounded-full px-3 py-2 text-xs",sessionMinutes===null?"bg-white/15 text-white":"text-white/50")}>No timer</button></div>
              <div className="flex items-center justify-between"><span className="text-xs text-white/55">Sounds</span><div className="flex gap-1">{sounds.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" aria-label={item.label} onClick={()=>toggleSound(item.id)} className={cn("rounded-full p-2.5",sound===item.id?"bg-white/15 text-white":"text-white/45")}><Icon className="size-4"/></button>})}<button type="button" onClick={()=>setBreathCuesEnabled(v=>!v)} aria-label="Breath cues" className={cn("rounded-full p-2.5",breathCuesEnabled?"bg-white/15 text-white":"text-white/45")}><Bell className="size-4"/></button></div></div>
              <div className="flex items-center gap-3"><Volume2 className="size-4 text-white/40"/><input aria-label="Audio volume" type="range" min="0" max="100" value={volume} onChange={e=>setVolume(Number(e.target.value))} className="w-full accent-white"/><span className="w-8 text-right font-mono text-[10px] text-white/40">{volume}%</span></div>
              <button type="button" onClick={reset} className="mx-auto flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/45"><RotateCcw className="size-3.5"/>Reset</button>
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}

