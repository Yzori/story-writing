export type Theme = "dark" | "light" | "sepia";

const STORAGE_KEY = "quiloria-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "light";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("theme-dark", "theme-light", "theme-sepia");

  // Add new theme class
  root.classList.add(`theme-${theme}`);

  // Persist
  localStorage.setItem(STORAGE_KEY, theme);
}
