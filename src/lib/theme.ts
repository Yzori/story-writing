export type Theme = "dark" | "light";

const STORAGE_KEY = "quiloria-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return "light";
  return "dark";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("theme-dark", "theme-light");

  // Add new theme class
  root.classList.add(`theme-${theme}`);

  // Persist
  localStorage.setItem(STORAGE_KEY, theme);
}
