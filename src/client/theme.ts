export type Theme = "dark" | "light";

const STORAGE_KEY = "quiloria-theme";

/** Fired on window whenever setTheme runs, so every mounted toggle stays in sync. */
export const THEME_CHANGE_EVENT = "quiloria:theme-change";

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

  // Let every mounted toggle (dock, reader toolbar, editor) follow along
  window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: theme }));
}
