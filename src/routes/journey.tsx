import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/page-kit";
import { journeyPhases } from "@/data/journey-phases";
import { STATE_LABEL } from "@/lib/intelligence/states";
import { useIntelligence } from "@/hooks/use-intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journey")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Journey Map | IT PATH" },
      {
        name: "description",
        content:
          "The full two-year IT PATH route, phase by phase, with each topic's real learning state from your recorded answers.",
      },
      { property: "og:title", content: "Your IT PATH Journey Map" },
      {
        property: "og:description",
        content: "See the whole two-year path and how much of it holds up so far.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyPage,
});

/** Dot for a topic's state: filled once it holds up, bordered while it is early work. */
function StateDot({ state }: { state: string }) {
  if (state === "retained" || state === "reliable" || state === "transferable") {
    return <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />;
  }
  if (state === "functional") {
    return <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary/50" aria-hidden />;
  }
  if (state === "emerging" || state === "fragile") {
    return <span className="mt-1.5 size-2.5 shrink-0 rounded-full border border-primary/60" aria-hidden />;
  }
  return <span className="mt-1.5 size-2.5 shrink-0 rounded-full border border-border" aria-hidden />;
}

function JourneyPage() {
  const intel = useIntelligence();
  const holdingUp = intel.concepts.filter(
    (concept) => concept.state === "functional" || concept.state === "transferable" || concept.state === "reliable" || concept.state === "retained",
  ).length;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Journey map"
        description="The whole two-year route, and where you actually stand on it. Every marker comes from your recorded answers; nothing is lit up until there is evidence."
      />

      <div className="mb-6">
        <div className="dashboard-summary rounded-xl p-4">
          <p className="text-sm text-foreground">
            {holdingUp === 0
              ? `${intel.certificationTitle} has ${intel.concepts.length} topics to work through. Nothing holds up yet, which is exactly where everyone starts.`
              : `${holdingUp} of ${intel.concepts.length} topics in ${intel.certificationTitle} now hold up in questions. The rest are waiting for their turn.`}
          </p>
        </div>
      </div>

      <ol className="relative space-y-8">
        {journeyPhases.map((phase, phaseIndex) => {
          const phaseTopics = phase.topics.map((topic) => ({
            topic,
            concept: intel.byTopic[topic.id],
          }));
          const litUp = phaseTopics.filter(
            (entry) =>
              entry.concept &&
              ["functional", "transferable", "reliable", "retained"].includes(entry.concept.state),
          ).length;
          const allLit = phaseTopics.length > 0 && litUp === phaseTopics.length;

          return (
            <li key={phase.title} className="relative pl-8">
              {/* Connector line to the next phase */}
              {phaseIndex < journeyPhases.length - 1 ? (
                <span
                  className={cn(
                    "absolute left-[9px] top-8 h-[calc(100%-1rem)] w-px",
                    allLit ? "bg-primary/50" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "absolute left-0 top-1 flex size-[19px] items-center justify-center rounded-full border-2",
                  allLit ? "border-primary bg-primary" : "border-border bg-background",
                )}
                aria-hidden
              >
                {allLit ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
              </span>

              <div
                className={cn(
                  "rounded-xl border bg-card p-5",
                  allLit ? "border-primary/40" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">{phase.title}</h2>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {phase.months}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{phase.blurb}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {litUp === 0
                    ? `${phase.topics.length} topics, none started yet`
                    : `${litUp} of ${phase.topics.length} topics holding up`}
                </p>

                <ul className="mt-4 space-y-2">
                  {phaseTopics.map(({ topic, concept }) => {
                    const state = concept?.state ?? "unknown";
                    return (
                      <li key={topic.id}>
                        <Link
                          to="/topics/$topicId"
                          params={{ topicId: topic.id }}
                          className="flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
                        >
                          <StateDot state={state} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{topic.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {topic.minutes} min · {state === "unknown" ? "Not started" : STATE_LABEL[state]}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
