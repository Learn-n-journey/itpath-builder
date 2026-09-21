import { createFileRoute } from "@tanstack/react-router";

import { VirusRun } from "@/components/game/virus-run";

export const Route = createFileRoute("/virus")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Virus Run | IT PATH" },
      {
        name: "description",
        content:
          "A small arcade game inside your study app: play as the virus, harvest data packets, dodge antivirus daemons and breach endlessly harder systems.",
      },
      { property: "og:title", content: "Virus Run | IT PATH" },
      {
        property: "og:description",
        content:
          "Play as the virus: harvest data packets, dodge antivirus daemons and breach endlessly harder systems.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VirusPage,
});

function VirusPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Arcade</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Virus Run</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A short break between study blocks: play as the virus inside a block-based computer. Every system
            you breach makes the next one faster and better defended, and the run never has to end.
          </p>
        </header>
        <VirusRun />
      </div>
    </div>
  );
}
