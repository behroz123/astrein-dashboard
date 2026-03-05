export type ThemeType = "hell" | "glas" | "mitternacht" | "graphit" | "aurora" | "neon";

export interface ThemeConfig {
  name: string;
  description: string;
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Background
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  
  // Surfaces
  surface: string;
  surfaceHover: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Accents
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  
  // Borders
  border: string;
  borderLight: string;
}

export const themes: Record<ThemeType, ThemeConfig> = {
  hell: {
    name: "Hell",
    description: "Helles, kontrastreiches Design",
    primary: "#3B82F6",
    primaryDark: "#1E40AF",
    primaryLight: "#93C5FD",
    bg: "#FFFFFF",
    bgSecondary: "#F8FAFC",
    bgTertiary: "#F1F5F9",
    surface: "#FFFFFF",
    surfaceHover: "#F8FAFC",
    text: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    accent1: "#8B5CF6",
    accent2: "#EC4899",
    accent3: "#14B8A6",
    accent4: "#F59E0B",
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
  },
  glas: {
    name: "Glas",
    description: "Transparentes Glas-Design",
    primary: "#06B6D4",
    primaryDark: "#0891B2",
    primaryLight: "#67E8F9",
    bg: "#0F172A",
    bgSecondary: "#1E293B",
    bgTertiary: "#334155",
    surface: "rgba(30, 41, 59, 0.4)",
    surfaceHover: "rgba(51, 65, 85, 0.5)",
    text: "#F1F5F9",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    info: "#06B6D4",
    accent1: "#A78BFA",
    accent2: "#F472B6",
    accent3: "#67E8F9",
    accent4: "#FBBF24",
    border: "rgba(203, 213, 225, 0.2)",
    borderLight: "rgba(203, 213, 225, 0.1)",
  },
  mitternacht: {
    name: "Mitternacht",
    description: "Tiefe, dunkle Farben",
    primary: "#3B82F6",
    primaryDark: "#1E3A8A",
    primaryLight: "#60A5FA",
    bg: "#0B0E11",
    bgSecondary: "#111318",
    bgTertiary: "#1A1D23",
    surface: "#161B22",
    surfaceHover: "#21262D",
    text: "#E6EDF3",
    textSecondary: "#C9D1D9",
    textMuted: "#8B949E",
    success: "#3FB950",
    warning: "#D29922",
    error: "#F85149",
    info: "#58A6FF",
    accent1: "#BC8CDB",
    accent2: "#F97583",
    accent3: "#79C0FF",
    accent4: "#D29922",
    border: "#30363D",
    borderLight: "#21262D",
  },
  graphit: {
    name: "Graphit",
    description: "Neutraler Graphit-Look",
    primary: "#6B7280",
    primaryDark: "#374151",
    primaryLight: "#9CA3AF",
    bg: "#F9FAFB",
    bgSecondary: "#F3F4F6",
    bgTertiary: "#E5E7EB",
    surface: "#FFFFFF",
    surfaceHover: "#F9FAFB",
    text: "#111827",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
    success: "#5B9E5F",
    warning: "#B97923",
    error: "#C5192D",
    info: "#6B7280",
    accent1: "#7C3AED",
    accent2: "#D946EF",
    accent3: "#0891B2",
    accent4: "#B97923",
    border: "#D1D5DB",
    borderLight: "#E5E7EB",
  },
  aurora: {
    name: "Aurora",
    description: "Farbige Aurora-Akzente",
    primary: "#8B5CF6",
    primaryDark: "#6D28D9",
    primaryLight: "#C4B5FD",
    bg: "#0F0F23",
    bgSecondary: "#1A1A3E",
    bgTertiary: "#262652",
    surface: "#1F1F3F",
    surfaceHover: "#2A2A4F",
    text: "#F0F0FF",
    textSecondary: "#E0E0FF",
    textMuted: "#A0A0D0",
    success: "#00D99F",
    warning: "#FFB84D",
    error: "#FF5566",
    info: "#8B5CF6",
    accent1: "#FF006E",
    accent2: "#00D9FF",
    accent3: "#FFB84D",
    accent4: "#00D99F",
    border: "rgba(139, 92, 246, 0.2)",
    borderLight: "rgba(139, 92, 246, 0.1)",
  },
  neon: {
    name: "Neon",
    description: "Kräftige Neonfarben",
    primary: "#00FF00",
    primaryDark: "#00CC00",
    primaryLight: "#00FF66",
    bg: "#0A0A0A",
    bgSecondary: "#1A1A1A",
    bgTertiary: "#2A2A2A",
    surface: "#151515",
    surfaceHover: "#222222",
    text: "#00FF00",
    textSecondary: "#00DD00",
    textMuted: "#008800",
    success: "#00FF00",
    warning: "#FFFF00",
    error: "#FF0066",
    info: "#00FFFF",
    accent1: "#FF00FF",
    accent2: "#FF0066",
    accent3: "#00FFFF",
    accent4: "#FFFF00",
    border: "#00FF00",
    borderLight: "#00AA00",
  },
};

export const getTheme = (themeType: ThemeType): ThemeConfig => {
  return themes[themeType] || themes.hell;
};
