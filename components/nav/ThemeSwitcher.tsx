"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_NAMES, THEME_ACCENT, THEME_SECONDARY } from "@/lib/theme/palettes";
import type { ThemeName } from "@/lib/domain/types";

const STORAGE_KEY = "pcc-theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeName>("paper");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeName) || "paper";
    setTheme(stored);
  }, []);

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const next = THEME_NAMES[(THEME_NAMES.indexOf(prev) + 1) % THEME_NAMES.length];
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme} — click to switch`}
      aria-label="Switch colour theme"
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        border: "1px solid var(--line-2)",
        background: "var(--card)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: THEME_ACCENT[theme],
          display: "block",
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: THEME_SECONDARY[theme],
          display: "block",
        }}
      />
    </button>
  );
}
