import { Link } from "@tanstack/react-router";
import { BookOpen, CornerUpLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LearningActivityKind } from "@/lib/app-data/types";
import { activityReturnLabel, remediationHref } from "@/lib/lesson-concepts";
import { useAppState } from "@/state/app-state";

export function ReviewConceptLink({ topicId, conceptId, sectionId, anchor, sourceKind, sourceItemId }: {
  topicId: string;
  conceptId: string;
  sectionId: string;
  anchor: string;
  sourceKind: LearningActivityKind;
  sourceItemId: string;
}) {
  const { actions } = useAppState();
  const target = remediationHref(topicId, anchor);
  return <Button asChild variant="outline" size="sm" className="mt-3">
    <a href={target} onClick={() => {
      const href = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      actions.setActivityReturn({ topicId, sourceKind, sourceItemId, href, label: activityReturnLabel(sourceKind), createdAt: new Date().toISOString() });
      actions.addRemediationEvent({ id: crypto.randomUUID(), topicId, conceptId, lessonSectionId: sectionId, sourceKind, sourceItemId, createdAt: new Date().toISOString() });
    }}><BookOpen aria-hidden />Review this concept</a>
  </Button>;
}

export function ReturnToActivity({ topicId }: { topicId: string }) {
  const { user, actions } = useAppState();
  const context = user.activityReturn;
  if (!context || context.topicId !== topicId) return null;
  return <div className="sticky top-16 z-20 mb-4 rounded-lg border border-primary/40 bg-card p-3 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">Reviewing the concept you needed. Your activity is still saved.</p>
      <Button asChild size="sm" onClick={() => actions.setActivityReturn()}><a href={context.href}><CornerUpLeft aria-hidden />{context.label}</a></Button>
    </div>
  </div>;
}