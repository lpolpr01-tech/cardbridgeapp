import React, { createContext, useContext, useMemo, useState } from "react";

export type CardStyle = "gradient" | "classic";

export type PatternName =
  | "none"
  | "dots"
  | "grid"
  | "lines"
  | "diamonds"
  | "hexagon"
  | "baroque"
  | "art-deco"
  | "zigzag"
  | "chevron";

export type ThemeName =
  | "deep-purple"
  | "midnight"
  | "ocean"
  | "charcoal"
  | "rose"
  | "lavender"
  | "mint"
  | "peach"
  | "sky"
  | "blush"
  | "sage"
  | "forest"
  | "custom";

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

export const PASTEL_THEMES: ThemeOption[] = [
  { name: "lavender", label: "Lavender", bgStart: "#1E0A50", bgEnd: "#3D2280", preview: ["#7B5CC0", "#B8A0E8"] },
  { name: "mint", label: "Mint", bgStart: "#082818", bgEnd: "#164532", preview: ["#2A8060", "#5ADAAA"] },
  { name: "peach", label: "Peach", bgStart: "#2A100A", bgEnd: "#502015", preview: ["#B05030", "#E07050"] },
  { name: "sky", label: "Sky Blue", bgStart: "#081828", bgEnd: "#143A6A", preview: ["#2060A0", "#50A0E0"] },
  { name: "blush", label: "Blush", bgStart: "#28080E", bgEnd: "#501530", preview: ["#A03060", "#E060A0"] },
  { name: "sage", label: "Sage", bgStart: "#0C1A0E", bgEnd: "#183525", preview: ["#3A7045", "#70B080"] },
  { name: "forest", label: "Forest", bgStart: "#051210", bgEnd: "#0E2818", preview: ["#1A5030", "#30A060"] },
];

export const ALL_THEMES: ThemeOption[] = [...THEMES, ...PASTEL_THEMES];

export const PATTERNS: PatternOption[] = [
  { name: "none", label: "None" },
  { name: "dots", label: "Dots" },
  { name: "grid", label: "Grid" },
  { name: "lines", label: "Lines" },
  { name: "diamonds", label: "Diamonds" },
  { name: "hexagon", label: "Hexagon" },
  { name: "baroque", label: "Baroque" },
  { name: "art-deco", label: "Art Deco" },
  { name: "zigzag", label: "Zigzag" },
  { name: "chevron", label: "Chevron" },
];

export const CARD_STYLES = [
  { value: "gradient" as CardStyle, label: "Color Gradient", icon: "layers" as const },
  { value: "classic" as CardStyle, label: "Classic Dark", icon: "credit-card" as const },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function customColorToGradient(hex: string): [string, string] {
  const rgb = hexToRgb(hex);
  if (!rgb) return ["#1A103F", "#2D1B69"];
  const start = rgbToHex(rgb.r * 0.35, rgb.g * 0.35, rgb.b * 0.35);
  const end = rgbToHex(rgb.r * 0.6, rgb.g * 0.6, rgb.b * 0.6);
  return [start, end];
}

type ThemeContextType = {
  theme: ThemeOption;
  cardStyle: CardStyle;
  pattern: PatternName;
  customColor: string | null;
  effectiveBgStart: string;
  effectiveBgEnd: string;
  setTheme: (t: ThemeName) => void;
  setCardStyle: (s: CardStyle) => void;
  setPattern: (p: PatternName) => void;
  setCustomColor: (c: string | null) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("deep-purple");
  const [cardStyle, setCardStyle] = useState<CardStyle>("gradient");
  const [pattern, setPattern] = useState<PatternName>("none");
  const [customColor, setCustomColor] = useState<string | null>(null);

  const theme = useMemo(
    () => ALL_THEMES.find((t) => t.name === themeName) ?? THEMES[0],
    [themeName]
  );

  const [effectiveBgStart, effectiveBgEnd] = useMemo(() => {
    if (customColor) return customColorToGradient(customColor);
    return [theme.bgStart, theme.bgEnd];
  }, [customColor, theme]);

  const handleSetTheme = (t: ThemeName) => {
    setThemeName(t);
    setCustomColor(null);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        cardStyle,
        pattern,
        customColor,
        effectiveBgStart,
        effectiveBgEnd,
        setTheme: handleSetTheme,
        setCardStyle,
        setPattern,
        setCustomColor,
      }}
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
