"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const val = next ? "dark" : "light";
    localStorage.setItem("theme", val);
    document.documentElement.setAttribute("data-theme", val);
  }

  if (!mounted) return <div style={{ width: 32, height: 32 }} />;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      style={{
        background: "transparent",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        padding: "4px",
        cursor: "pointer",
        color: "var(--muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s, border-color 0.15s",
        width: "32px",
        height: "32px"
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
