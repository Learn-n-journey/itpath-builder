import { createFileRoute } from "@tanstack/react-router";

import { GarageMatch } from "@/components/game/garage-match";

export const Route = createFileRoute("/garage-match")({
  staticData: { sitemap: false },
  component: GarageMatchPage,
});

function GarageMatchPage() {
  return <GarageMatch />;
}
