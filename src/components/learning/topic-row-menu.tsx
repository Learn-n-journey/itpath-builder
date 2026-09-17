import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { buildBookmark } from "@/lib/annotations";
import { useAppState } from "@/state/app-state";

/**
 * Press and hold (touch) or right-click (mouse) on a topic row for fast
 * actions: open it, quiz it, bookmark it, or add it to the review queue.
 * A plain positioned menu, no external menu library.
 */
export function TopicRowMenu({
  topicId,
  title,
  className,
  children,
}: {
  topicId: string;
  title: string;
  className?: string;
  children?: ReactNode;
}) {
  const { actions } = useAppState();
  const navigate = useNavigate();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const openAt = useCallback((x: number, y: number) => {
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - 232)),
      y: Math.max(8, Math.min(y, window.innerHeight - 210)),
    });
  }, []);

  const items = [
    {
      label: "Open section",
      onSelect: () => navigate({ to: "/topics/$topicId", params: { topicId } }),
    },
    {
      label: "Take the quiz",
      onSelect: () => navigate({ to: "/section-quiz/$topicId", params: { topicId } }),
    },
    {
      label: "Bookmark this section",
      onSelect: () => {
        actions.addBookmark(
          buildBookmark({ kind: "topic", id: topicId, label: title, href: `/topics/${topicId}` }),
        );
        toast.success("Bookmarked.");
      },
    },
    {
      label: "Remind me to review",
      onSelect: () => {
        actions.ensureReview({ topicId });
        toast.success("Added to your reviews. It will surface when it is due.");
      },
    },
  ];

  return (
    <>
      <div
        className={className}
        onContextMenu={(event) => {
          event.preventDefault();
          openAt(event.clientX, event.clientY);
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          const x = touch.clientX;
          const y = touch.clientY;
          timer.current = window.setTimeout(() => openAt(x, y), 500);
        }}
        onTouchMove={() => {
          if (timer.current !== null) window.clearTimeout(timer.current);
        }}
        onTouchEnd={(event) => {
          if (timer.current !== null) window.clearTimeout(timer.current);
          // A long press should open the menu, not also follow the row link.
          if (pos) event.preventDefault();
        }}
      >
        {children ?? (
          <button
            type="button"
            aria-label={`More actions for ${title}`}
            aria-haspopup="menu"
            aria-expanded={pos !== null}
            onClick={(event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              openAt(rect.left, rect.bottom + 4);
            }}
            className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <MoreVertical className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      {pos ? (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setPos(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setPos(null);
            }}
            aria-hidden
          />
          <div
            role="menu"
            aria-label={`Actions for ${title}`}
            className="fixed z-50 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
            style={{ left: pos.x, top: pos.y }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                onClick={() => {
                  setPos(null);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
