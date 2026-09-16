import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircuitBoard, MousePointerClick, Cpu } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { hardwareComponents, type HardwarePart } from "@/data/hardware-explorer";
import { hardwarePhotos } from "@/components/hardware/photos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore-hardware")({
  head: () => ({
    meta: [
      { title: "Explore Hardware | IT PATH" },
      {
        name: "description",
        content:
          "Interactive diagrams of a motherboard, RAM, graphics card and NVMe SSD. Tap any part to learn what it is and what it does.",
      },
      { property: "og:title", content: "Explore Hardware | IT PATH" },
      {
        property: "og:description",
        content:
          "Interactive diagrams of a motherboard, RAM, graphics card and NVMe SSD. Tap any part to learn what it is and what it does.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { sitemap: false },
  component: ExploreHardwarePage,
});

function ExploreHardwarePage() {
  const [componentId, setComponentId] = useState(hardwareComponents[0]!.id);
  const [partId, setPartId] = useState<string | null>(null);

  const component = hardwareComponents.find((c) => c.id === componentId)!;
  const photo = hardwarePhotos[component.id]!;
  const selected: HardwarePart | null = component.parts.find((p) => p.id === partId) ?? null;

  const pickComponent = (id: string) => {
    setComponentId(id);
    setPartId(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <PageHeader
        title="Explore Hardware"
        description="Tap the numbered markers on each photo to see what that part is and what it does."
      />

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Hardware components">
        {hardwareComponents.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === componentId}
            onClick={() => pickComponent(c.id)}
            className={cn(
              "motion-press rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              c.id === componentId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={component.name} description={component.tagline}>
          <div className="relative mx-auto mt-2 max-w-xl">
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              className="w-full rounded-lg border border-border"
            />
            {component.parts.map((p, i) => {
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
                    <CircuitBoard className="h-3.5 w-3.5" aria-hidden />
                    Worth remembering
                  </p>
                  <p className="text-muted-foreground">{selected.gaylNote}</p>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel className="text-sm text-muted-foreground">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Cpu className="h-8 w-8 text-primary/60" aria-hidden />
                <p>
                  Pick a numbered marker on the {component.name.toLowerCase()} and the part's
                  story shows up here.
                </p>
              </div>
            </Panel>
          )}

          <Panel title="Part list">
            <ol className="space-y-1.5 text-sm">
              {component.parts.map((p, i) => (
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

          <p className="text-xs text-muted-foreground">
            Learning the theory? Pair this with the{" "}
            <Link to="/topics/$topicId" params={{ topicId: "computer-hardware-basics" }} className="text-primary underline-offset-2 hover:underline">
              Computer Hardware Basics
            </Link>{" "}
            lesson.
          </p>
        </div>
      </div>
    </div>
  );
}
