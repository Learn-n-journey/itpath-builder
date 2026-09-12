import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, CalendarCheck, Flame, Gauge, TrendingDown, TrendingUp } from "lucide-react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { computeInsights } from "@/lib/insights-engine";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Study Insights — IT PATH" },
      {
        name: "description",
        content:
          "Trends from your own study record: time logged, quiz accuracy over time, weakest topics and the kinds of mistakes you repeat.",
      },
      { property: "og:title", content: "Study Insights — IT PATH" },
      {
        property: "og:description",
        content: "See how your study habits and accuracy are actually changing over time.",
      },
    ],
  }),
  component: Insights;
});

function Insights() {
  return null;
}
