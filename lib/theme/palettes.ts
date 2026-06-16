import type { ThemeName } from "@/lib/domain/types";

export const THEME_NAMES: ThemeName[] = ["paper", "cloud", "blush", "mist", "ink"];
export const THEME_LABELS: Record<ThemeName, string> = {
  paper: "Paper",
  cloud: "Cloud",
  blush: "Blush",
  mist:  "Mist",
  ink:   "Ink",
};

// Accent color per theme — used for the theme switcher button preview dots.
export const THEME_ACCENT: Record<ThemeName, string> = {
  paper: "#17a6b3",
  cloud: "#4f5bd5",
  blush: "#df674c",
  mist:  "#2f8f63",
  ink:   "#2cc6d4",
};

// Secondary dot for the switcher button (cat-work color)
export const THEME_SECONDARY: Record<ThemeName, string> = {
  paper: "#b07a55",
  cloud: "#c07a4e",
  blush: "#b9763f",
  mist:  "#b07a55",
  ink:   "#d99e72",
};
