import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, CloudRain, ExternalLink, Music2, Pause, Play, RotateCcw, Volume2, Wind } from "lucide-react";

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
  { id: "rain", label: "Rain", icon: CloudRain, src: "/rain.mp3" },
  { id: "music", label: "Meditation music", icon: Music2, src: "/meditation-music.mp3" },
] as const;

function MeditationPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sound, setSound] = useState<(typeof sounds)[number]["id"] | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastBreathCueRef = useRef<"inhale" | "exhale" | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => () => {
    backgroundAudioRef.current?.pause();
    backgroundAudioRef.current = null;
  }, []);

  function playBell(kind: "inhale" | "exhale") {
    const bell = new Audio(kind === "inhale" ? "/inhale-bell.mp3" : "/exhale-bell.mp3");
    bell.volume = 0.5;
    void bell.play().catch(() => {});
  }

  useEffect(() => {
    if (!running) {
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
  }, [elapsed, running]);

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
    audio.volume = next === "music" ? 0.35 : 0.45;
    backgroundAudioRef.current = audio;
    void audio.play()
      .then(() => setSound(next))
      .catch(() => {
        backgroundAudioRef.current = null;
        setSound(null);
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
            <Button onClick={() => {
              if (!running) {
                lastBreathCueRef.current = "inhale";
                playBell("inhale");
              }
              setRunning((value) => !value);
            }} className="min-w-32 rounded-xl">
              {running ? <Pause aria-hidden /> : <Play aria-hidden />}
              {running ? "Pause" : "Start breathing"}
            </Button>
            <Button variant="outline" size="icon" aria-label="Reset breathing timer" onClick={() => { setRunning(false); setElapsed(0); lastBreathCueRef.current = null; }}>
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
        <p className="mt-1 text-sm text-muted-foreground">Choose a locally bundled background track. Breathing bells play automatically with the exercise.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
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
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Bell className="size-4 text-feature-cyan" aria-hidden />
          <span>Higher bell for inhale · lower bell for exhale</span>
        </div>
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
