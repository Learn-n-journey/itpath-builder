import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { obdPracticeForTopic } from "@/data/auto/obd-lesson-practice";
import { activeDomainKey } from "@/lib/active-domain";

/**
 * Optional scan-tool practice for a section. Never graded, never part of the
 * section quiz, stage exam or mastery checks, and never required to move on.
 */
export function ObdPracticePanel({ topicId, topicTitle }: { topicId: string; topicTitle: string }) {
  if (activeDomainKey().split("@")[0] !== "auto-repair") return null;
  const practice = obdPracticeForTopic(topicId, topicTitle);
  if (!practice) return null;
  const { scenario, prompts } = practice;

  return (
    <Panel
      title="Optional: take it to the scan tool"
      description="Extra practice, not part of any assessment. Nothing here is marked and skipping it will not hold the section back."
    >
      <div className="rounded-lg border border-border bg-secondary/20 p-4">
        <p className="text-sm font-medium text-foreground">{scenario.vehicle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{scenario.complaint}</p>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {prompts.map((prompt, index) => (
          <li key={prompt} className="flex gap-3">
            <span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>
            <span>{prompt}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-4" variant="secondary" size="sm">
        <Link to="/obd-scanner" search={{ scenario: scenario.id }}>
          <Gauge aria-hidden />
          Open this vehicle on the scanner
        </Link>
      </Button>
    </Panel>
  );
}
