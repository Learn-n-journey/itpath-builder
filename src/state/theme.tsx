import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "itpath.theme";

/**
 * IT PATH is dark first. A phone or laptop set to light mode used to flip the
 * whole app to the pale palette, which reads as a washed out white page, so
 * light only applies when it is chosen here in settings.
 */
function resolveTheme(preference: ThemePreference | null): ResolvedTheme {
  return preference === "light" ? "light" : "dark";
}

/**
 * Runs before first paint: sets the light/dark class, and writes the subject
 * the app is opening with onto <html> so the subject palette is already in
 * place. The subject key is stored as `id@version`; only the id is needed.
 */
export const themeBootScript = `(function(){try{var e=document.documentElement;var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"){e.classList.remove("dark");e.classList.add("light")}else{e.classList.add("dark");e.classList.remove("light")}var s=localStorage.getItem("itpath.active-domain.v1");e.setAttribute("data-subject",s?String(s).split("@")[0]:"it-cybersecurity")}catch(_){}})();`;


function applyTheme(theme: ResolvedTheme) {
  const el = document.documentElement;
  el.classList.toggle("light", theme === "light");
  el.classList.toggle("dark", theme === "dark");
  // Hydration replaces the root element's attributes, so the subject the boot
  // script stamped on is re-applied here to keep the subject palette.
  try {
    const stored = localStorage.getItem("itpath.active-domain.v1");
    el.setAttribute("data-subject", stored ? stored.split("@")[0]! : "it-cybersecurity");
  } catch {
    /* storage unavailable */
  }
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
