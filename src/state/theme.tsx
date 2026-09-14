import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "itpath.theme";

function resolveTheme(preference: ThemePreference | null): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export const themeBootScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var e=document.documentElement;var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches;var r=t==="light"||((!t||t==="system")&&m)?"light":"dark";if(r==="light"){e.classList.remove("dark");e.classList.add("light")}else{e.classList.add("dark");e.classList.remove("light")}}catch(_){}})();`;

function applyTheme(theme: ResolvedTheme) {
  const el = document.documentElement;
  el.classList.toggle("light", theme === "light");
  el.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    const next: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setPreferenceState(next);
    const resolvedTheme = resolveTheme(next);
    setResolved(resolvedTheme);
    applyTheme(resolvedTheme);
  }, []);

  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const resolvedTheme = resolveTheme("system");
      setResolved(resolvedTheme);
      applyTheme(resolvedTheme);
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    const resolvedTheme = resolveTheme(next);
    setResolved(resolvedTheme);
    applyTheme(resolvedTheme);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return { theme: preference, resolvedTheme: resolved, setTheme };
}
