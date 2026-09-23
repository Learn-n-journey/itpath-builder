import { useCallback, useEffect, useState } from "react";

const PREFIX = "itpath.ui.";

function readPreference<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${key}`);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    if (validate) return validate(value) ? value : fallback;
    return value as T;
  } catch {
    return fallback;
  }
}

export function useUiPreference<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): [T, (value: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(readPreference(key, fallback, validate));
  }, [key]);

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      try {
        window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(resolved));
      } catch {
        // Presentation preferences are optional; learning data is stored elsewhere.
      }
      return resolved;
    });
  }, [key]);

  return [value, update];
}

export const isStringPreference = (value: unknown): value is string => typeof value === "string";
export const isBooleanPreference = (value: unknown): value is boolean => typeof value === "boolean";