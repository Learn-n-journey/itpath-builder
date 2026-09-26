import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, BookOpen, Briefcase, Car, Compass, FlaskConical, LayoutDashboard, LogIn, Monitor, Settings, ShieldCheck, Users, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import itImage from "@/assets/path-it.jpg";
import autoImage from "@/assets/path-auto.jpg";
import { setDomainOverride } from "@/lib/active-domain";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { useAuth } from "@/state/auth-state";
import { learningPaths, loadLearningPaths } from "@/lib/learning-path-store";
import { pathAppName, pathKey, type LearningPath } from "@/lib/learning-paths-shared";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Choose Your Path | IT PATH & AUTO PATH" },
      {
        name: "description",
        content: "Choose IT PATH for technology and cybersecurity or AUTO PATH for automotive diagnostics and repair.",
      },
      { property: "og:title", content: "Choose Your Path | IT PATH & AUTO PATH" },
      {
        property: "og:description",
        content: "Two practical learning paths. Choose technology and cybersecurity or automotive diagnostics and repair.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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
  {
    id: "auto-repair@3.7.0",
    name: "AUTO PATH",
    description: "Vehicle systems, diagnostics, repair, and shop fundamentals.",
    action: "Choose AUTO PATH",
    tone: "auto" as const,
    image: autoImage,
  },
];

function CourseChooser() {
  const { email, userId, ready } = useAuth();
  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
  const [created, setCreated] = useState<LearningPath[]>([]);

  // Paths created in Settings. Row level security only returns a hidden one to
  // its owner, so a learner sees nothing until it is switched on.
  useEffect(() => {
    setCreated(learningPaths());
    void loadLearningPaths().then(setCreated);
  }, [userId]);

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
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary/75">Welcome to PATH</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            What do you want to <span className="text-primary">learn?</span>
          </h1>
          <p className="mt-3 text-base text-foreground/90 sm:text-lg">Choose a learning path and start building real skills for your future.</p>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Practical knowledge. Hands-on practice. Real progress.</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-7">
          {paths.map((path) => {
            const isIt = path.tone === "it";
            const Icon = isIt ? Monitor : Car;
            const features = isIt
              ? ["Beginner to advanced", "Hands-on labs and simulations", "Real-world troubleshooting", "Certification preparation", "Career-ready skills"]
              : ["From basics to advanced systems", "Step-by-step repair guidance", "Interactive diagrams and simulations", "Real-world diagnostic practice", "Build job-ready skills"];
            return (
              <article key={path.id} className={`group relative min-h-[34rem] overflow-hidden rounded-2xl border bg-card shadow-2xl ${isIt ? "border-path-it/70" : "border-path-auto/70"}`}>
                <img src={path.image} alt="" width={1024} height={640} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/25" aria-hidden />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/10" aria-hidden />
                <div className="relative flex min-h-[34rem] max-w-[82%] flex-col p-6 sm:p-8">
                  <span className={`grid size-16 place-items-center rounded-2xl border backdrop-blur-sm ${isIt ? "border-path-it bg-path-it/20 text-path-it" : "border-path-auto bg-path-auto/20 text-path-auto"}`}>
                    <Icon className="size-8" aria-hidden />
                  </span>
                  <h2 className="mt-5 font-display text-4xl font-bold tracking-tight">{path.name}</h2>
                  <p className={`mt-1 text-xl font-semibold ${isIt ? "text-path-it" : "text-path-auto"}`}>{isIt ? "Technology & IT" : "Automotive Technology"}</p>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/90">
                    {isIt ? "Build practical IT skills from computer fundamentals through networking, security, cloud, and beyond." : "Learn how vehicles work, diagnose problems, and develop practical repair knowledge."}
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm sm:text-base">
                    {features.map((feature) => <li key={feature} className="flex items-center gap-3"><ShieldCheck className={`size-4 shrink-0 ${isIt ? "text-path-it" : "text-path-auto"}`} aria-hidden /><span>{feature}</span></li>)}
                  </ul>
                  <Button type="button" size="lg" onClick={() => choose(path.id)} className={`mt-auto h-14 w-full justify-center text-base font-bold ${isIt ? "bg-path-it text-white hover:bg-path-it/90" : "bg-path-auto text-background hover:bg-path-auto/90"}`}>
                    {isIt ? "Start IT PATH" : "Start AUTO PATH"}<ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Button>
                </div>
              </article>
            );
          })}

          {created.map((path) => (
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

        <p className="py-8 text-center text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground sm:text-xs">
          Same powerful learning system. Different paths. Your future.
        </p>
      </div>
    </main>
  );
}
