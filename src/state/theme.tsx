import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "itpath.theme";

export const themeBootScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var e=document.documentElement;if(t==="light"){e.classList.remove("dark");e.classList.add("light")}else{e.classList.add("dark");e.classList.remove("light")}}catch(_){}})();`;

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.classList.toggle("light", theme === "light");
  el.classList.toggle("dark", theme !== "light");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    const next: Theme = stored === "light" ? "light" : "dark";
    setThemeState(next);
    applyTheme(next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return { theme, setTheme };
}
