import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTopicKnowledge } from "@/hooks/use-knowledge";

/**
 * Shows the learner's own saved material for one topic, clearly separated from
 * IT PATH course content.
 */
export function TopicKnowledgePanel({ topicId }: { topicId: string }) {
  const { items, loading } = useTopicKnowledge(topicId);
  if (loading || items.length === 0) return null;

  return (
    <Panel
      title="Your material on this topic"
      description="Saved by you in Second Brain — kept separate from the IT PATH lesson above."
    >
      <ul className="space-y-3">
        {items.slice(0, 6).map((item) => (
          <li key={item.id} className="rounded-lg border border-border/60 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </p>
            {item.summary ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
            ) : null}
            {item.concepts.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.concepts.slice(0, 6).map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : null}
            {item.contradictions.length ? (
              <p className="mt-2 text-sm text-destructive">
                Check this: {item.contradictions[0]}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <Button asChild variant="ghost" size="sm" className="mt-3 -ml-3">
        <Link to="/knowledge">Open Second Brain</Link>
      </Button>
    </Panel>
  );
}
