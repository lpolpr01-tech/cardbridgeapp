import React, { createContext, useContext, useState } from "react";

export type CardStyle = "gradient" | "classic";
export type PatternName = "none" | "dots" | "grid" | "lines";
export type ThemeName = "deep-purple" | "midnight" | "ocean" | "charcoal" | "rose";

export type ThemeOption = {
  name: ThemeName;
  label: string;
  bgStart: string;
  bgEnd: string;
  preview: [string, string];
};

export type PatternOption = {
  name: PatternName;
  label: string;
};

export const THEMES: ThemeOption[] = [
  { name: "deep-purple", label: "Deep Purple", bgStart: "#1A103F", bgEnd: "#2D1B69", preview: ["#4F2D8A", "#7B4FCA"] },
  { name: "midnight", label: "Midnight", bgStart: "#060612", bgEnd: "#12124A", preview: ["#10107A", "#2020AA"] },
  { name: "ocean", label: "Ocean", bgStart: "#062128", bgEnd: "#0D4A5A", preview: ["#0A5565", "#12A0BB"] },
  { name: "charcoal", label: "Charcoal", bgStart: "#111111", bgEnd: "#252540", preview: ["#222244", "#444466"] },
  { name: "rose", label: "Rose", bgStart: "#1F0A1A", bgEnd: "#3D1430", preview: ["#6B1A40", "#A03060"] },
];

export const PATTERNS: PatternOption[] = [
  { name: "none", label: "None" },
  { name: "dots", label: "Dots" },
  { name: "grid", label: "Grid" },
  { name: "lines", label: "Lines" },
];

export const CARD_STYLES = [
  { value: "gradient" as CardStyle, label: "Color Gradient", icon: "layers" as const },
  { value: "classic" as CardStyle, label: "Classic Dark", icon: "credit-card" as const },
];

type ThemeContextType = {
  theme: ThemeOption;
  cardStyle: CardStyle;
  pattern: PatternName;
  setTheme: (t: ThemeName) => void;
  setCardStyle: (s: CardStyle) => void;
  setPattern: (p: PatternName) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("deep-purple");
  const [cardStyle, setCardStyle] = useState<CardStyle>("gradient");
  const [pattern, setPattern] = useState<PatternName>("none");

  const theme = THEMES.find((t) => t.name === themeName) ?? THEMES[0];

  return (
    <ThemeContext.Provider
      value={{ theme, cardStyle, pattern, setTheme: setThemeName, setCardStyle, setPattern }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
