import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wrench, MousePointerClick, Car } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { autoAssemblies, type AutoPart } from "@/data/engine-explorer";
import { autoPhotos } from "@/components/auto/photos";
import { cn } from "@/lib/utils";

const TITLE = "Explore the Engine";
const DESCRIPTION =
  "Interactive photos of an engine bay, a sectioned engine, the alternator, starter, radiator, battery, brakes and spark plug. Tap any numbered part to see what it is and what it does.";

export const Route = createFileRoute("/explore-engine")({
  head: () => ({
    meta: [
      { title: `${TITLE} | AUTO PATH` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: `${TITLE} | AUTO PATH` },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { sitemap: false },
  component: ExploreEnginePage,
});

function ExploreEnginePage() {
  const [assemblyId, setAssemblyId] = useState(autoAssemblies[0]!.id);
  const [partId, setPartId] = useState<string | null>(null);

  const assembly = autoAssemblies.find((a) => a.id === assemblyId)!;
  const photo = autoPhotos[assembly.id]!;
  const selected: AutoPart | null = assembly.parts.find((p) => p.id === partId) ?? null;

  const pickAssembly = (id: string) => {
    setAssemblyId(id);
    setPartId(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <PageHeader
        title={TITLE}
        description="Tap the numbered markers on each photo to see what that part is and what it does."
      />

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Vehicle assemblies">
        {autoAssemblies.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === assemblyId}
            onClick={() => pickAssembly(a.id)}
            className={cn(
              "motion-press rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              a.id === assemblyId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={assembly.name} description={assembly.tagline}>
          <div className="relative mx-auto mt-2 max-w-xl">
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              className="w-full rounded-lg border border-border"
            />
            {assembly.parts.map((p, i) => {
              const active = p.id === partId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPartId(active ? null : p.id)}
                  aria-label={`Part ${i + 1}: ${p.name}`}
                  aria-pressed={active}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  className={cn(
                    "motion-press absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-sm font-bold shadow-lg ring-2 backdrop-blur-[2px] transition-all",
                    active
                      ? "scale-110 border-primary bg-primary text-primary-foreground ring-primary/60"
                      : "border-primary/70 bg-background/85 text-primary ring-background/40 hover:scale-110 hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
            Tap a number to inspect that part
          </p>
        </Panel>

        <div className="space-y-4">
          {selected ? (
            <Panel className="motion-surface border-primary/40">
              <div className="flex items-center gap-2">
                <span className="h-3 w-0.5 shrink-0 bg-primary" aria-hidden />
                <h2 className="font-display text-base font-semibold">{selected.name}</h2>
              </div>
              <div className="mt-4 space-y-4 text-sm leading-relaxed">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What it is
                  </p>
                  <p>{selected.whatItIs}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What it does
                  </p>
                  <p>{selected.whatItDoes}</p>
                </div>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Wrench className="h-3.5 w-3.5" aria-hidden />
                    In the shop
                  </p>
                  <p className="text-muted-foreground">{selected.shopNote}</p>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel className="text-sm text-muted-foreground">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Car className="h-8 w-8 text-primary/60" aria-hidden />
                <p>
                  Pick a numbered marker on the {assembly.name.toLowerCase()} and the part's story
                  shows up here.
                </p>
              </div>
            </Panel>
          )}

          <Panel title="Part list">
            <ol className="space-y-1.5 text-sm">
              {assembly.parts.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => setPartId(p.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
                      p.id === partId && "bg-primary/10 text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                        p.id === partId
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    {p.name}
                  </button>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
