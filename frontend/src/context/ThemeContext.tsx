import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  navColor: string;
  sidebarColor: string;
  buttonColor: string;
}

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  colors: ThemeColors;
  setColors: (colors: Partial<ThemeColors>) => void;
  resetColors: () => void;
}

const STORAGE_KEY_MODE = "smartloan.theme.mode";
const STORAGE_KEY_COLORS = "smartloan.theme.colors";

const DEFAULT_COLORS: ThemeColors = {
  navColor: "#1a1d23",
  sidebarColor: "#111318",
  buttonColor: "#6366f1",
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY_MODE);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredColors(): ThemeColors {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COLORS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_COLORS, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_COLORS;
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function generateColorVariants(hex: string) {
  const { h, s } = hexToHSL(hex);
  return {
    base: hex,
    hover: `hsl(${h}, ${s}%, 38%)`,
    soft: `hsl(${h}, ${Math.min(s, 40)}%, 94%)`,
    softDark: `hsl(${h}, ${Math.min(s, 30)}%, 18%)`,
    text: `hsl(${h}, ${s}%, 62%)`,
  };
}

function applyThemeVars(mode: ThemeMode, colors: ThemeColors) {
  const root = document.documentElement;

  root.setAttribute("data-theme", mode);

  // Nav color
  root.style.setProperty("--theme-nav-bg", colors.navColor);
  const navHSL = hexToHSL(colors.navColor);
  const navIsLight = navHSL.l > 55;
  root.style.setProperty("--theme-nav-text", navIsLight ? "#1a1a2e" : "#e8e8ef");
  root.style.setProperty("--theme-nav-text-muted", navIsLight ? "#64647a" : "#9b9baf");
  root.style.setProperty("--theme-nav-border", navIsLight ? `hsl(${navHSL.h}, ${navHSL.s}%, ${navHSL.l - 10}%)` : `hsl(${navHSL.h}, ${navHSL.s}%, ${navHSL.l + 8}%)`);

  // Sidebar color
  root.style.setProperty("--theme-sidebar-bg", colors.sidebarColor);
  const sideHSL = hexToHSL(colors.sidebarColor);
  const sideIsLight = sideHSL.l > 55;
  root.style.setProperty("--theme-sidebar-text", sideIsLight ? "#1a1a2e" : "#d1d1de");
  root.style.setProperty("--theme-sidebar-text-muted", sideIsLight ? "#6b6b80" : "#7e7e96");
  root.style.setProperty("--theme-sidebar-border", sideIsLight ? `hsl(${sideHSL.h}, ${sideHSL.s}%, ${sideHSL.l - 8}%)` : `hsl(${sideHSL.h}, ${sideHSL.s}%, ${sideHSL.l + 6}%)`);
  root.style.setProperty("--theme-sidebar-hover", sideIsLight ? `hsl(${sideHSL.h}, ${sideHSL.s}%, ${sideHSL.l - 5}%)` : `hsl(${sideHSL.h}, ${sideHSL.s}%, ${sideHSL.l + 4}%)`);

  // Button / accent color
  const btnVariants = generateColorVariants(colors.buttonColor);
  root.style.setProperty("--color-accent", btnVariants.base);
  root.style.setProperty("--color-accent-hover", btnVariants.hover);
  root.style.setProperty("--color-accent-soft", mode === "dark" ? btnVariants.softDark : btnVariants.soft);
  root.style.setProperty("--color-accent-text", btnVariants.text);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [colors, setColorsState] = useState<ThemeColors>(getStoredColors);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
    applyThemeVars(mode, colors);
  }, [mode, colors]);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "light" ? "dark" : "light"));
  }, []);

  const setColors = useCallback((partial: Partial<ThemeColors>) => {
    setColorsState((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetColors = useCallback(() => {
    setColorsState(DEFAULT_COLORS);
    localStorage.removeItem(STORAGE_KEY_COLORS);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, colors, setColors, resetColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
