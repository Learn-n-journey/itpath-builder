import type { Resource } from "@/lib/app-data/types";

interface LessonSourcesProps {
  resources: Resource[];
  topicId: string;
}

/** Quiet citations for the written material used by one lesson. */
export function LessonSources({ resources, topicId }: LessonSourcesProps) {
  const seen = new Set<string>();
  const sources = resources.filter((resource) => {
    if (resource.kind === "video" || !resource.topicIds.includes(topicId) || seen.has(resource.url)) return false;
    seen.add(resource.url);
    return true;
  });

  if (sources.length === 0) return null;

  return (
    <aside aria-label="Lesson sources" className="px-1 text-xs leading-5 text-muted-foreground">
      <span className="font-medium text-foreground/80">Watch and read: </span>
      {sources.map((source, index) => (
        <span key={source.id}>
          {index > 0 ? <span aria-hidden> · </span> : null}
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
          >
            {source.provider}: {source.title}
          </a>
        </span>
      ))}
    </aside>
  );
}