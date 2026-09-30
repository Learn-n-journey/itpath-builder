import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BarChart3, BookOpen, Briefcase, CloudCog, Code2, Compass, Database, FlaskConical, LayoutDashboard, Lock, LogIn, Monitor, Settings, Shield, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import itImage from "@/assets/path-it.jpg";
import { setDomainOverride } from "@/lib/active-domain";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { useAuth } from "@/state/auth-state";
import { learningPaths, loadLearningPaths, rememberLearningPaths } from "@/lib/learning-path-store";
import { ROADMAP_PATHS, ROADMAP_SLUGS, pathAppName, pathKey, type LearningPath } from "@/lib/learning-paths-shared";
import { ensureRoadmapLearningPaths, roadmapReleaseState } from "@/lib/learning-paths.functions";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Learn IT Skills Online | IT PATH" },
      {
        name: "description",
        content: "Learn IT, cybersecurity, networking, computer hardware, cloud and systems skills with structured lessons, hands-on practice and skill checks.",
      },
      { property: "og:title", content: "Learn Practical IT Skills | IT PATH" },
      {
        property: "og:description",
        content: "Structured beginner-friendly learning for IT, networking, systems, cloud and cybersecurity with lessons, practice, troubleshooting and progress tracking.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://it-path.net/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://it-path.net/" }],
  }),
  component: CourseChooser,
});

const paths = [
  {
    id: "it-cybersecurity@1.0.0",
    name: "IT PATH",
    description: "Computers, networking, cloud, and cybersecurity.",
    action: "Choose IT PATH",
    tone: "it" as const,
    image: itImage,
  },
];

function CourseChooser() {
  const { email, userId, ready } = useAuth();
  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
  const [created, setCreated] = useState<LearningPath[]>([]);
  const readRoadmapState = useServerFn(roadmapReleaseState);
  const ensureRoadmap = useServerFn(ensureRoadmapLearningPaths);
  const [roadmapState, setRoadmapState] = useState<Record<string, boolean>>({});

  // Paths created in Settings. Row level security only returns a hidden one to
  // its owner, so a learner sees nothing until it is switched on.
  useEffect(() => {
    setCreated(learningPaths());
    void loadLearningPaths().then(setCreated);
    void readRoadmapState({}).then(setRoadmapState);
    if (ready && isOwner) {
      void ensureRoadmap({}).then((result) => {
        if (!result.ok) return;
        rememberLearningPaths(result.paths);
        setCreated(result.paths);
      });
    }
  }, [userId, ready, isOwner, readRoadmapState, ensureRoadmap]);

  function choose(id: string) {
    setDomainOverride(id);
    window.location.assign("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-4 py-6 text-foreground sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex min-h-9 items-center justify-end gap-2">
          {ready && isOwner ? (
            <Button asChild size="sm" variant="outline"><Link to="/settings"><Settings className="size-4" aria-hidden />Exclusive settings</Link></Button>
          ) : null}
          {ready && !userId ? (
            <Button asChild size="sm"><Link to="/auth"><LogIn className="size-4" aria-hidden />Sign in</Link></Button>
          ) : null}
          {ready && userId ? (
            <Button asChild size="sm" variant="secondary"><Link to="/dashboard"><LayoutDashboard className="size-4" aria-hidden />Dashboard</Link></Button>
          ) : null}
        </div>

        <header className="mx-auto mb-8 mt-3 max-w-4xl text-center sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary/75">IT PATH</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Learn practical <span className="text-primary">IT skills</span>
          </h1>
          <p className="mt-3 text-base text-foreground/90 sm:text-lg">Start from the basics and build real skills through structured lessons, hands-on practice, troubleshooting and mastery checks.</p>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Study computer hardware, networking, systems, cloud and cybersecurity at your own pace.</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.5fr)] lg:gap-7">
          {paths.map((path) => (
            <article key={path.id} className="group relative min-h-[34rem] overflow-hidden rounded-2xl border border-path-it/70 bg-card shadow-2xl">
              <img src={path.image} alt="" width={1024} height={640} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/25" aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/10" aria-hidden />
              <div className="relative flex min-h-[34rem] max-w-[82%] flex-col p-6 sm:p-8">
                <span className="grid size-16 place-items-center rounded-2xl border border-path-it bg-path-it/20 text-path-it backdrop-blur-sm">
                  <Monitor className="size-8" aria-hidden />
                </span>
                <h2 className="mt-5 font-display text-4xl font-bold tracking-tight">{path.name}</h2>
                <p className="mt-1 text-xl font-semibold text-path-it">Technology & IT</p>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/90">
                  Build practical IT skills from computer fundamentals through networking, security, cloud, and beyond.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm sm:text-base">
                  {["Beginner to advanced", "Hands-on labs and simulations", "Real-world troubleshooting", "Certification preparation", "Career-ready skills"].map((feature) => <li key={feature} className="flex items-center gap-3"><ShieldCheck className="size-4 shrink-0 text-path-it" aria-hidden /><span>{feature}</span></li>)}
                </ul>
                <Button type="button" size="lg" onClick={() => choose(path.id)} className="mt-auto h-14 w-full justify-center bg-path-it text-base font-bold text-white hover:bg-path-it/90">
                  Start IT PATH<ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                </Button>
              </div>
            </article>
          ))}

          {created.filter((path) => !ROADMAP_SLUGS.includes(path.slug as (typeof ROADMAP_SLUGS)[number])).map((path) => (
            <article key={path.slug} className="group relative flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-20 items-center justify-center rounded-xl border border-border bg-muted/30"><Compass className="size-10 text-primary" aria-hidden /></span>
                {!path.visible ? <span className="rounded-full border border-border px-2 py-0.5 text-[0.65rem] uppercase text-muted-foreground">Only you</span> : null}
              </div>
              <div className="mt-8 flex flex-1 flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Learning path</p>
                <h2 className="mt-2 font-display text-3xl font-semibold">{pathAppName(path.name)}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{path.topics.length} section{path.topics.length === 1 ? "" : "s"}, taught from the “{path.folder}” course spreadsheets.</p>
                <Button type="button" variant="secondary" size="lg" className="mt-auto w-full justify-between" onClick={() => choose(pathKey(path.slug))}>{`Choose ${pathAppName(path.name)}`}<ArrowRight className="size-4" aria-hidden /></Button>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-9 border-t border-border/60 pt-7" aria-labelledby="technology-roadmap-title">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Technology roadmap</p>
            <h2 id="technology-roadmap-title" className="mt-2 font-display text-2xl font-bold">Choose where your IT foundation can take you</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              New IT PATH tracks will build on the same learning system. Locked tracks stay visible here so you can see what is being built next.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ROADMAP_PATHS.map((path, index) => {
              const unlocked = Boolean(roadmapState[path.slug]);
              const canOpen = unlocked || isOwner;
              const Icon = [Code2, Shield, CloudCog, Database][index] ?? Code2;
              return (
                <article key={path.slug} className="flex min-h-[17rem] flex-col border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="size-6 text-primary" aria-hidden />
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      {!unlocked ? <Lock className="size-3.5" aria-hidden /> : null}
                      {unlocked ? "Available" : isOwner ? "Private build" : path.slug === "build" ? "Coming soon" : "Planned"}
                    </span>
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">IT PATH</p>
                  <h3 className="mt-1 font-display text-2xl font-bold">{path.name}</h3>
                  <p className="mt-1 text-sm font-medium text-foreground/80">{path.subtitle}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{path.description}</p>
                  <Button
                    type="button"
                    variant={canOpen ? "secondary" : "outline"}
                    disabled={!canOpen}
                    onClick={() => canOpen && choose(pathKey(path.slug))}
                    className="mt-auto w-full justify-between"
                  >
                    {unlocked ? `Choose IT PATH: ${path.name}` : isOwner ? "Open privately" : "Locked"}
                    {canOpen ? <ArrowRight className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-9 grid gap-5 border-y border-border/50 py-6 sm:grid-cols-2 lg:grid-cols-5" aria-label="What every path includes">
          {[
            [BookOpen, "Structured Learning Paths", "Step-by-step from beginner to advanced"],
            [FlaskConical, "Hands-On Practice", "Labs, simulations, and real scenarios"],
            [BarChart3, "Track Real Progress", "Prove your knowledge as you learn"],
            [Briefcase, "Career Focused", "Build skills that lead to opportunities"],
            [Users, "Supportive Community", "Learn with others on the same journey"],
          ].map(([Icon, title, detail]) => {
            const BenefitIcon = Icon as typeof BookOpen;
            return <div key={title as string} className="flex gap-3 px-2"><BenefitIcon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden /><div><h3 className="text-sm font-semibold">{title as string}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail as string}</p></div></div>;
          })}
        </section>

        <section className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6" aria-labelledby="free-resources-title">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Free learning resources</p>
            <h2 id="free-resources-title" className="mt-2 font-display text-2xl font-bold">Start learning before you create an account</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Read beginner-friendly IT study guides, follow complete CompTIA study tracks, or test yourself with free A+, Network+ and Security+ practice questions.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/guides">Free IT study guides</Link></Button>
            <Button asChild variant="outline"><Link to="/tracks">CompTIA study tracks</Link></Button>
            <Button asChild variant="outline"><Link to="/practice-tests">Free CompTIA practice tests</Link></Button>
          </div>
        </section>

        <p className="py-8 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground sm:text-xs">
          Build real IT knowledge. Prove it through practice.
        </p>
      </div>
    </main>
  );
}
