import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { listKnowledge, type KnowledgeItem } from "@/lib/knowledge.functions";
import { useAuth } from "@/state/auth-state";

/** Shared cache so several panels can read saved material without refetching. */
let cache: KnowledgeItem[] | null = null;
const listeners = new Set<(items: KnowledgeItem[]) => void>();

export function setKnowledgeCache(items: KnowledgeItem[]) {
  cache = items;
  listeners.forEach((fn) => fn(items));
}

/** Adds a newly saved item to any already-mounted Second Brain views. */
export function prependKnowledgeCache(item: KnowledgeItem) {
  setKnowledgeCache([item, ...(cache ?? []).filter((existing) => existing.id !== item.id)]);
}

/** Loads the signed-in learner's saved knowledge items. */
export function useKnowledge() {
  const { userId, ready } = useAuth();
  const load = useServerFn(listKnowledge);
  const [items, setItems] = useState<KnowledgeItem[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setKnowledgeCache([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const reply = await load({});
    setLoading(false);
    if (reply.ok) {
      setError(null);
      setKnowledgeCache(reply.items);
    } else {
      setError(reply.error);
    }
  }, [load, userId]);

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, refresh]);

  return { items, loading, error, refresh };
}

/** Saved material linked to a curriculum topic. */
export function useTopicKnowledge(topicId: string) {
  const { items, loading } = useKnowledge();
  return { items: items.filter((item) => item.topicIds.includes(topicId)), loading };
}
