import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, LayoutDashboard, LogIn, Settings } from "lucide-react";
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
    <main className="path-chooser flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-foreground sm:px-8 sm:py-14">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex min-h-9 items-center justify-end gap-2">
          {ready && isOwner ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">
                <Settings className="size-4" aria-hidden />
                Exclusive settings
              </Link>
            </Button>
          ) : null}
          {ready && !userId ? (
            <Button asChild size="sm">
              <Link to="/auth">
                <LogIn className="size-4" aria-hidden />
                Sign in
              </Link>
            </Button>
          ) : null}
          {ready && userId ? (
            <Button asChild size="sm" variant="secondary">
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" aria-hidden />
                Dashboard
              </Link>
            </Button>
          ) : null}
        </div>
        <header className="mb-7 max-w-2xl sm:mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-path-steel">
            Your journey. Your legacy.
          </p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Choose your path</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Choose what you want to learn. You can switch paths anytime without losing progress.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {paths.map((path) => {
            const isIt = path.tone === "it";
            return (
              <button
                key={path.id}
                type="button"
                onClick={() => choose(path.id)}
                aria-label={path.action}
                className="group relative flex min-h-44 overflow-hidden rounded-xl border border-border/60 bg-card text-left transition-colors hover:border-foreground/30 sm:min-h-52"
              >
                <img
                  src={path.image}
                  alt=""
                  width={1024}
                  height={640}
                  className="absolute inset-y-0 right-0 h-full w-[70%] object-cover object-right transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-transparent" aria-hidden />
                <div className="relative flex max-w-[65%] flex-col justify-center p-5 sm:p-7">
                  <h2 className="font-display text-2xl font-bold sm:text-3xl">{path.name}</h2>
                  <p className="mt-2 text-sm leading-snug text-muted-foreground sm:text-base">{path.description}</p>
                  <span
                    className={`mt-4 inline-flex w-fit items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-background ${isIt ? "bg-path-it" : "bg-path-auto"}`}
                  >
                    Choose
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </button>
            );
          })}

          {created.map((path) => (
            <article
              key={path.slug}
              className="path-choice group relative flex min-h-[22rem] flex-col overflow-hidden rounded-lg border border-border bg-card p-6 shadow-xl transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-2xl sm:min-h-[25rem] sm:p-8"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-path-steel opacity-40 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-20 items-center justify-center rounded-lg border border-border bg-muted/30 shadow-lg sm:size-24">
                  <Compass className="size-10 text-primary" aria-hidden />
                </span>
                {!path.visible ? (
                  <span className="mt-1 rounded-full border border-border px-2 py-0.5 text-[0.65rem] uppercase text-muted-foreground">
                    Only you
                  </span>
                ) : null}
              </div>

              <div className="mt-8 flex flex-1 flex-col">
                <p className="text-xs font-semibold uppercase text-path-steel">Learning path</p>
                <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                  {pathAppName(path.name)}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {path.topics.length} section{path.topics.length === 1 ? "" : "s"}, taught from the
                  “{path.folder}” course spreadsheets.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="mt-auto w-full justify-between"
                  onClick={() => choose(pathKey(path.slug))}
                >
                  {`Choose ${pathAppName(path.name)}`}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
