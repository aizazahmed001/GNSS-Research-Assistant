import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { getStoredTheme, applyTheme } from "./theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getStoredTheme());

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button className="theme-toggle-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}