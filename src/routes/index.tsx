import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import autopathLogo from "@/assets/autopath-logo.png.asset.json";
import { setDomainOverride } from "@/lib/active-domain";

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
    description: "Build practical skills in computers, networking, cloud systems, and cybersecurity.",
    action: "Choose IT PATH",
    tone: "it" as const,
    icon: "/icons/icon-256.png",
    alt: "IT PATH mountain and circuit logo",
  },
  {
    id: "auto-repair@3.7.0",
    name: "AUTO PATH",
    description: "Learn vehicle systems, diagnostics, repair decisions, and safe workshop practice.",
    action: "Choose AUTO PATH",
    tone: "auto" as const,
    icon: autopathLogo.url,
    alt: "AUTO PATH piston and wrench logo",
  },
];

function CourseChooser() {
  function choose(id: string) {
    setDomainOverride(id);
    window.location.assign("/dashboard");
  }

  return (
    <main className="path-chooser flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-foreground sm:px-8 sm:py-14">
      <div className="w-full max-w-5xl">
        <header className="mx-auto mb-9 max-w-2xl text-center sm:mb-12">
          <div className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase text-path-steel">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            Practical learning, built around evidence
          </div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Choose your path</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Select the field you want to study. You can switch paths later without losing your work.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2 md:gap-7">
          {paths.map((path) => {
            const isIt = path.tone === "it";
            return (
              <article
                key={path.id}
                className="path-choice group relative flex min-h-[22rem] flex-col overflow-hidden rounded-lg border border-border bg-card p-6 shadow-xl transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-2xl sm:min-h-[25rem] sm:p-8"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-path-steel opacity-40 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                <div className="flex items-start justify-between gap-4">
                  <img
                    src={path.icon}
                    alt={path.alt}
                    className="size-20 rounded-lg border border-border object-cover shadow-lg sm:size-24"
                  />
                  <span className={`mt-1 size-2 rounded-full ${isIt ? "bg-path-it" : "bg-path-auto"}`} aria-hidden />
                </div>

                <div className="mt-8 flex flex-1 flex-col">
                  <p className="text-xs font-semibold uppercase text-path-steel">Learning path</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{path.name}</h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {path.description}
                  </p>
                  <Button
                    type="button"
                    variant={isIt ? "default" : "secondary"}
                    size="lg"
                    className="mt-auto w-full justify-between"
                    onClick={() => choose(path.id)}
                  >
                    {path.action}
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
