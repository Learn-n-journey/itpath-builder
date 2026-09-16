/**
 * Small helper for notes the learner can clear.
 *
 * A cleared note stays hidden while the situation behind it is unchanged. The
 * signature carries that situation (a message, a topic id). As soon as it
 * changes, the note comes back on its own.
 */
import { useCallback, useEffect, useState } from "react";

export function useDismissable(storageKey: string, signature: string | null) {
  const [cleared, setCleared] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCleared(window.localStorage.getItem(storageKey));
    } catch {
      setCleared(null);
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    if (!signature) return;
    setCleared(signature);
    try {
      window.localStorage.setItem(storageKey, signature);
    } catch {
      /* storage is optional here */
    }
  }, [storageKey, signature]);

  const restore = useCallback(() => {
    setCleared(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* storage is optional here */
    }
  }, [storageKey]);

  return {
    hidden: Boolean(signature) && cleared === signature,
    dismiss,
    restore,
  };
}
