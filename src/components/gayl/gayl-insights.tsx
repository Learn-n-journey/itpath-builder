/**
 * Page-level GAYL surfaces.
 *
 * Each one reads the existing learning intelligence and renders a single quiet
 * note, or nothing at all when there isn't enough evidence to say something
 * useful. No engine logic lives here.
 */
import { GaylNote } from "@/components/gayl/gayl-note";
import { useIntelligence } from "@/hooks/use-intelligence";
import {
  dashboardInsight,
  lessonInsight,
  pathInsight,
  progressInsight,
  reviewInsight,
} from "@/lib/gayl/insights";

function Note({
  insight,
  className,
  compact,
}: {
  insight: { message: string; why?: string[] } | null;
  className?: string;
  compact?: boolean;
}) {
  if (!insight) return null;
  return (
    <GaylNote
      message={insight.message}
      {...(insight.why ? { why: insight.why } : {})}
      {...(className ? { className } : {})}
      {...(compact ? { compact } : {})}
    />
  );
}

export function GaylDashboardNote({ className }: { className?: string }) {
  const intel = useIntelligence();
  return <Note insight={dashboardInsight(intel)} {...(className ? { className } : {})} />;
}

export function GaylLessonNote({ topicId, className }: { topicId: string; className?: string }) {
  const intel = useIntelligence();
  return <Note insight={lessonInsight(intel, topicId)} {...(className ? { className } : {})} />;
}

export function GaylReviewNote({ className }: { className?: string }) {
  const intel = useIntelligence();
  return <Note insight={reviewInsight(intel)} {...(className ? { className } : {})} />;
}

export function GaylProgressNote({ className }: { className?: string }) {
  const intel = useIntelligence();
  return <Note insight={progressInsight(intel)} {...(className ? { className } : {})} />;
}

export function GaylPathNote({ className }: { className?: string }) {
  const intel = useIntelligence();
  return <Note insight={pathInsight(intel)} {...(className ? { className } : {})} />;
}
