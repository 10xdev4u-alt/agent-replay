/**
 * useTheme — dark/light theme with localStorage persistence.
 *
 * Applies a `data-theme` attribute on <html> so CSS variables flip. Defaults
 * to dark (the viewer's native look) and remembers the user's choice across
 * sessions.
 */
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "agent-replay-theme";

function readInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

export function useTheme(): {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
} {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, toggle, setTheme };
}
