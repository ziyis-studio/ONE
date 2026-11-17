import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ONE_SEGMENTS } from "./brand-mark";

export const THEME_KEY = "one-appearance-v1";
export const DEFAULT_ACCENT = "#7852ee";
export const ACCENT_PRESETS = [
  { name: "Violet", color: DEFAULT_ACCENT },
  { name: "Indigo", color: "#4f46e5" },
  { name: "Blue", color: "#2563eb" },
  { name: "Teal", color: "#0f766e" },
  { name: "Green", color: "#15803d" },
  { name: "Rose", color: "#be185d" },
  { name: "Orange", color: "#c2410c" },
  { name: "Slate", color: "#475569" },
] as const;

export function parseHex(value: string): string | null {
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex))
    return "#" + [...hex.slice(1)].map((c) => c + c).join("");
  return null;
}
function channels(hex: string) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}
export function whiteContrast(hex: string) {
  const luminance = channels(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  return 1.05 / (luminance + 0.05);
}
export function readableAccent(value: string): string | null {
  const hex = parseHex(value);
  return hex && whiteContrast(hex) >= 4.5 ? hex : null;
}
export function readAccent() {
  try {
    const stored = JSON.parse(localStorage.getItem(THEME_KEY) || "null");
    return stored?.version === 1 && typeof stored.color === "string"
      ? readableAccent(stored.color) || DEFAULT_ACCENT
      : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}
function mix(hex: string, amount: number, target: number) {
  return (
    "#" +
    channels(hex)
      .map((c) =>
        Math.round(c + (target - c) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function applyAccent(color: string) {
  const root = document.documentElement;
  const mark = mix(color, 0.28, 255);
  root.style.setProperty("--one-accent", color);
  root.style.setProperty("--one-accent-hover", mix(color, 0.1, 0));
  root.style.setProperty("--one-accent-mark", mark);
  root.dataset.primaryColor = color;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke-width="8" stroke-linecap="round">${ONE_SEGMENTS.map((segment) => `<path d="${segment.d}" stroke="${segment.name === "short" ? mark : "#eee"}"/>`).join("")}</svg>`;
    favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }
}

const ThemeContext = createContext<{
  primaryColor: string;
  setPrimaryColor: (color: string) => boolean;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, setColor] = useState(readAccent);
  useLayoutEffect(() => applyAccent(primaryColor), [primaryColor]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) setColor(readAccent());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const setPrimaryColor = useCallback((value: string) => {
    const color = readableAccent(value);
    if (!color) return false;
    setColor(color);
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify({ version: 1, color }));
      return true;
    } catch {
      return false;
    }
  }, []);
  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required.");
  return context;
}
