const STORAGE_KEY = "theme";

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || "dark";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}