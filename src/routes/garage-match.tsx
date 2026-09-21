import { createFileRoute } from "@tanstack/react-router";

import { GarageMatch } from "@/components/game/garage-match";

export const Route = createFileRoute("/garage-match")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Garage Match | AUTO PATH" },
      { name: "description", content: "Restore vehicles through an automotive match game with practical knowledge checks." },
      { property: "og:title", content: "Garage Match | AUTO PATH" },
      { property: "og:description", content: "Match workshop parts, complete repair jobs and restore a six-car garage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GarageMatchPage,
});

function GarageMatchPage() {
  return <GarageMatch />;
}
