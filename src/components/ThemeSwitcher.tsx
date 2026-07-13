"use client";

import { useEffect, useState } from "react";

type ThemePreset = "Minimalist Slate" | "Warm Earth/Cream" | "Sleek Midnight";

const THEME_MAP: Record<ThemePreset, string> = {
  "Minimalist Slate": "minimalist-slate",
  "Warm Earth/Cream": "warm-earth",
  "Sleek Midnight": "sleek-midnight",
};

export default function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState<string>("minimalist-slate");

  useEffect(() => {
    setTimeout(() => {
      const savedTheme = localStorage.getItem("theme") || "minimalist-slate";
      setActiveTheme(savedTheme);
    }, 0);
  }, []);

  const selectTheme = (preset: ThemePreset) => {
    const themeValue = THEME_MAP[preset];
    document.documentElement.setAttribute("data-theme", themeValue);
    localStorage.setItem("theme", themeValue);
    setActiveTheme(themeValue);
  };

  return (
    <div className="theme-preset-selector mt-8 p-6 border border-[var(--border)] rounded-md bg-[var(--white)] max-w-md mx-auto sm:mx-0">
      <h3 className="text-sm font-semibold mb-3 text-[var(--text)]">Choose your theme:</h3>
      <div className="theme-buttons flex flex-wrap gap-2">
        {(Object.keys(THEME_MAP) as ThemePreset[]).map((preset) => {
          const themeValue = THEME_MAP[preset];
          const isSelected = activeTheme === themeValue;
          return (
            <button
              key={preset}
              data-theme-preset={preset}
              onClick={() => selectTheme(preset)}
              className={`px-4 py-2 text-xs font-semibold rounded border cursor-pointer transition-all ${
                isSelected
                  ? "bg-[var(--black)] text-[var(--white)] border-[var(--black)]"
                  : "bg-[var(--white)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--bg)]"
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>
    </div>
  );
}
