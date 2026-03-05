"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeType, getTheme, ThemeConfig } from "./themes";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  config: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("hell");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as ThemeType | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    // Update CSS variables
    updateThemeCSSVariables(newTheme);
  };

  useEffect(() => {
    if (mounted) {
      updateThemeCSSVariables(theme);
    }
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, config: getTheme(theme) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

function updateThemeCSSVariables(theme: ThemeType) {
  const config = getTheme(theme);
  const root = document.documentElement;

  // Primary colors
  root.style.setProperty("--color-primary", config.primary);
  root.style.setProperty("--color-primary-dark", config.primaryDark);
  root.style.setProperty("--color-primary-light", config.primaryLight);

  // Background
  root.style.setProperty("--color-bg", config.bg);
  root.style.setProperty("--color-bg-secondary", config.bgSecondary);
  root.style.setProperty("--color-bg-tertiary", config.bgTertiary);

  // Surface
  root.style.setProperty("--color-surface", config.surface);
  root.style.setProperty("--color-surface-hover", config.surfaceHover);

  // Text
  root.style.setProperty("--color-text", config.text);
  root.style.setProperty("--color-text-secondary", config.textSecondary);
  root.style.setProperty("--color-text-muted", config.textMuted);

  // Status
  root.style.setProperty("--color-success", config.success);
  root.style.setProperty("--color-warning", config.warning);
  root.style.setProperty("--color-error", config.error);
  root.style.setProperty("--color-info", config.info);

  // Accents
  root.style.setProperty("--color-accent1", config.accent1);
  root.style.setProperty("--color-accent2", config.accent2);
  root.style.setProperty("--color-accent3", config.accent3);
  root.style.setProperty("--color-accent4", config.accent4);

  // Borders
  root.style.setProperty("--color-border", config.border);
  root.style.setProperty("--color-border-light", config.borderLight);
}
