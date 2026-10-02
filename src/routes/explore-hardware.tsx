import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, ChevronRight, CircuitBoard, Cpu, Laptop, MousePointerClick, RotateCcw, Smartphone, Trophy } from "lucide-react";

import { hardwareComponents, type HardwareDeviceFamily, type HardwarePart } from "@/data/hardware-explorer";
import { hardwarePhotos } from "@/components/hardware/photos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore-hardware")({
  head: () => ({
    meta: [
      { title: "Explore Hardware | IT PATH" },
      { name: "description", content: "Explore computer hardware, learn its parts step by step, and test yourself with visual identification questions." },
      { property: "og:title", content: "Explore Hardware | IT PATH" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { sitemap: false },
  component: ExploreHardwarePage,
});

type Mode = "explore" | "learn" | "quiz";

function ExploreHardwarePage() {
  const [family, setFamily] = useState<HardwareDeviceFamily>("desktop");
  const familyComponents = hardwareComponents.filter((item) => (item.family ?? "desktop") === family);
  const [componentId, setComponentId] = useState(hardwareComponents[0]!.id);
  const [partId, setPartId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("explore");
  const [learnStep, setLearnStep] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);

  const component = hardwareComponents.find((c) => c.id === componentId) ?? familyComponents[0]!;
  const pickFamily = (next: HardwareDeviceFamily) => {
    const first = hardwareComponents.find((item) => (item.family ?? "desktop") === next);
    if (!first) return;
    setFamily(next); setComponentId(first.id); setPartId(null); setLearnStep(0); setQuizStep(0); setQuizAnswer(null); setQuizScore(0);
  };
  const photo = hardwarePhotos[component.id] ?? hardwarePhotos["motherboard"]!;
  const selected: HardwarePart | null = component.parts.find((p) => p.id === partId) ?? null;
  const lessonPart = component.parts[learnStep % component.parts.length]!;
  const quizPart = component.parts[quizStep % component.parts.length]!;
  const quizChoices = component.parts.slice(0, Math.min(4, component.parts.length));
  const choices = quizChoices.some((p) => p.id === quizPart.id)
    ? quizChoices
    : [quizPart, ...quizChoices.slice(0, 3)];

  const pickComponent = (id: string) => {
    setComponentId(id);
    setPartId(null);
    setLearnStep(0);
    setQuizStep(0);
    setQuizAnswer(null);
    setQuizScore(0);
  };

  const chooseQuiz = (id: string) => {
    if (quizAnswer) return;
    setQuizAnswer(id);
    if (id === quizPart.id) setQuizScore((score) => score + 1);
  };

  const nextQuiz = () => {
    setQuizStep((step) => (step + 1) % component.parts.length);
    setQuizAnswer(null);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-5 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Explore Hardware</h1>
            <CircuitBoard className="size-5 text-primary" aria-hidden />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Click a part to learn what it does, see how it fits into the system, then test yourself.
          </p>
        </div>
        <div className="grid grid-cols-3 rounded-lg border border-border/70 bg-card/40 p-1">
          <ModeButton active={mode === "explore"} onClick={() => setMode("explore")} icon={<Cpu className="size-4" />}>Explore</ModeButton>
          <ModeButton active={mode === "learn"} onClick={() => setMode("learn")} icon={<BookOpen className="size-4" />}>Learn</ModeButton>
          <ModeButton active={mode === "quiz"} onClick={() => setMode("quiz")} icon={<Trophy className="size-4" />}>Quiz</ModeButton>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Device</span><select value={family} onChange={(e)=>pickFamily(e.target.value as HardwareDeviceFamily)} className="rounded-lg border border-border/70 bg-card px-3 py-2 text-sm font-medium"><option value="desktop">Desktop PC</option><option value="laptop">Laptop</option><option value="mobile">Mobile device</option></select><span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">{family==="desktop"?<CircuitBoard className="size-4"/>:family==="laptop"?<Laptop className="size-4"/>:<Smartphone className="size-4"/>}{family==="desktop"?"Desktop components":family==="laptop"?"Laptop hardware":"Phone and tablet hardware"}</span></div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Hardware components">
        {familyComponents.map((item) => (
          <button key={item.id} role="tab" aria-selected={item.id === componentId} onClick={() => pickComponent(item.id)}
            className={cn("motion-press rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              item.id === componentId ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-card/30 text-muted-foreground hover:text-foreground")}>
            {item.name}
          </button>
        ))}
      </div>

      {mode === "explore" ? (
        <div className={cn("grid gap-5", component.family === "laptop" ? "grid-cols-1" : "lg:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)]")}>
          <HardwareImage component={component} photo={photo} activeId={partId} onPick={(id) => setPartId(id === partId ? null : id)} />
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
            {selected ? <PartDetail part={selected} index={component.parts.findIndex((p) => p.id === selected.id) + 1} /> : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 border-b border-border/70 p-6 text-center text-sm text-muted-foreground">
                <Cpu className="size-8 text-primary" aria-hidden />
                <p>Pick a numbered marker or choose a part below.</p>
              </div>
            )}
            <div className="p-3">
              <h2 className="px-2 pb-2 font-display text-base font-semibold">Part list</h2>
              {component.parts.map((part, index) => (
                <button key={part.id} onClick={() => setPartId(part.id)}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-secondary/60", part.id === partId && "bg-secondary")}>
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", part.id === partId ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{index + 1}</span>
                  <span className="min-w-0 flex-1">{part.name}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {mode === "learn" ? (
        <div className={cn("grid gap-5", component.family === "laptop" ? "grid-cols-1" : "lg:grid-cols-[minmax(18rem,2fr)_minmax(0,3fr)]")}>
          <div className="rounded-xl border border-border/70 bg-card/30 p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Step {learnStep + 1}</p><h2 className="mt-1 font-display text-2xl font-semibold">{lessonPart.name}</h2></div>
              <span className="text-sm text-muted-foreground">{learnStep + 1} / {component.parts.length}</span>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${((learnStep + 1) / component.parts.length) * 100}%` }} /></div>
            <div className="mt-6 space-y-5 text-sm leading-6">
              <section><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What it is</p><p className="mt-1">{lessonPart.whatItIs}</p></section>
              <section><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What it does</p><p className="mt-1">{lessonPart.whatItDoes}</p></section>
              <section className="rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Why it matters</p><p className="mt-1 text-muted-foreground">{lessonPart.gaylNote}</p></section>
            </div>
            <div className="mt-6 flex gap-2">
              <button disabled={learnStep === 0} onClick={() => setLearnStep((s) => Math.max(0, s - 1))} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setLearnStep((s) => (s + 1) % component.parts.length)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Next step <ChevronRight className="size-4" /></button>
            </div>
          </div>
          <HardwareImage component={component} photo={photo} activeId={lessonPart.id} onPick={(id) => setLearnStep(Math.max(0, component.parts.findIndex((p) => p.id === id)))} />
        </div>
      ) : null}

      {mode === "quiz" ? (
        <div className={cn("grid gap-5", component.family === "laptop" ? "grid-cols-1" : "lg:grid-cols-[minmax(18rem,3fr)_minmax(18rem,2fr)]")}>
          <div className="rounded-xl border border-border/70 bg-card/30 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${((quizStep + 1) / component.parts.length) * 100}%` }} /></div>
              <span className="text-xs text-muted-foreground">Question {quizStep + 1} of {component.parts.length}</span>
            </div>
            <h2 className="mt-6 font-display text-xl font-semibold">Which part is marker {component.parts.findIndex((p) => p.id === quizPart.id) + 1}?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Identify the highlighted hardware component.</p>
            <div className="mt-5 space-y-2">
              {choices.map((choice, index) => {
                const answered = quizAnswer !== null;
                const correct = choice.id === quizPart.id;
                const picked = choice.id === quizAnswer;
                return <button key={choice.id} onClick={() => chooseQuiz(choice.id)}
                  className={cn("flex w-full items-center gap-3 rounded-lg border border-border/70 px-4 py-3 text-left text-sm transition-colors",
                    answered && correct && "border-primary bg-primary/10 text-primary",
                    answered && picked && !correct && "border-destructive bg-destructive/10")}>
                  <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{String.fromCharCode(65 + index)}</span>{choice.name}
                </button>;
              })}
            </div>
            {quizAnswer ? (
              <div className={cn("mt-5 rounded-lg border p-4", quizAnswer === quizPart.id ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5")}>
                <p className="font-semibold">{quizAnswer === quizPart.id ? "Correct." : `The answer is ${quizPart.name}.`}</p>
                <p className="mt-1 text-sm text-muted-foreground">{quizPart.whatItDoes}</p>
                <button onClick={nextQuiz} className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Next question <ChevronRight className="size-4" /></button>
              </div>
            ) : null}
          </div>
          <div>
            <HardwareImage component={component} photo={photo} activeId={quizPart.id} onPick={() => {}} interactive={false} />
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>Score: {quizScore}</span><button onClick={() => { setQuizStep(0); setQuizScore(0); setQuizAnswer(null); }} className="flex items-center gap-1 hover:text-foreground"><RotateCcw className="size-4" /> Reset quiz</button></div>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">Want the full theory? Continue with the{" "}
        <Link to="/topics/$topicId" params={{ topicId: "topic-computer-hardware-basics" }} className="text-primary hover:underline">Computer Hardware Basics</Link> lesson.
      </p>
    </div>
  );
}

function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>{icon}{children}</button>;
}

function HardwareImage({ component, photo, activeId, onPick, interactive = true }: { component: (typeof hardwareComponents)[number]; photo: (typeof hardwarePhotos)[string]; activeId: string | null; onPick: (id: string) => void; interactive?: boolean }) {
  return <div className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
    <div className="flex items-center justify-between border-b border-border/70 px-4 py-3"><div><h2 className="font-display font-semibold">{component.name}</h2><p className="text-xs text-muted-foreground">{component.tagline}</p></div><span className="text-xs text-muted-foreground">{component.parts.length} parts</span></div>
    <div className="p-3 sm:p-4"><div className="relative mx-auto">
      <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" className={cn(
        "w-full rounded-lg border border-border object-contain",
        component.family === "mobile" && "mx-auto max-h-[42rem] bg-black/20",
        component.family === "laptop" && "mx-auto h-auto bg-black/20 object-contain"
      )} />
      {component.parts.map((part, index) => {
        const active = part.id === activeId;
        return <button key={part.id} type="button" disabled={!interactive} onClick={() => onPick(part.id)} aria-label={`Part ${index + 1}: ${part.name}`} style={{ left: `${part.x}%`, top: `${part.y}%` }}
          className={cn("group absolute -translate-x-1/2 -translate-y-1/2 transition-all", interactive && "hover:scale-110")}>
          <span className={cn("absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow", active ? "bg-primary" : "bg-cyan-400")} />
          <span className={cn("absolute bottom-[3px] left-[3px] h-px w-[26px] origin-left -rotate-45 shadow-sm", active ? "bg-primary" : "bg-cyan-400")} />
          <span className={cn("absolute bottom-[20px] left-[20px] flex size-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold shadow-lg ring-1 ring-background", active ? "border-primary bg-primary text-primary-foreground" : "border-cyan-400 bg-background/95 text-cyan-400")}>{index + 1}</span>
        </button>;
      })}
    </div>{photo.credit ? <p className="mt-2 text-right text-[10px] text-muted-foreground"><a href={photo.creditUrl} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">{photo.credit}</a></p> : null}</div>
    <div className="flex items-center justify-center gap-2 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground"><MousePointerClick className="size-4" aria-hidden />{interactive ? "Tap a numbered marker to inspect that part" : "Identify the highlighted marker"}</div>
  </div>;
}

function PartDetail({ part, index }: { part: HardwarePart; index: number }) {
  return <div className="border-b border-border/70 p-5">
    <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/10 font-semibold text-primary">{index}</span><div><h2 className="font-display text-xl font-semibold">{part.name}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{part.whatItIs}</p></div></div>
    <div className="mt-5 space-y-4 text-sm leading-6"><section><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</p><p className="mt-1">{part.whatItDoes}</p></section><section className="rounded-lg border border-primary/30 bg-primary/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Worth remembering</p><p className="mt-1 text-muted-foreground">{part.gaylNote}</p></section></div>
  </div>;
}


