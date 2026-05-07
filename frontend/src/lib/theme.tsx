import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "teacher-hub.theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return "auto";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "auto") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveMode(readStoredMode())
  );

  useEffect(() => {
    const next = resolveMode(mode);
    setResolved(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = systemPrefersDark() ? "dark" : "light";
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);

  const toggle = useCallback(() => {
    setModeState((current) => {
      const currentResolved = resolveMode(current);
      return currentResolved === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
