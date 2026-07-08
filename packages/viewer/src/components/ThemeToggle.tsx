/**
 * ThemeToggle — fluid dark/light switch with system-preference detection.
 *
 * Persists choice to localStorage. Respects `prefers-color-scheme` on first
 * visit. No flash: the theme is applied before React mounts (see index.html).
 */
import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";
const KEY = "agent-replay-theme";

function getInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      title={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label="toggle theme"
    >
      <span className={styles.icon}>{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
