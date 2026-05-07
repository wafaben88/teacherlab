import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fr } from "./locales/fr";
import { en } from "./locales/en";
import { ar } from "./locales/ar";

export type Locale = "fr" | "en" | "ar";

const STORAGE_KEY = "teacher-hub.locale";

const DICTIONARIES: Record<Locale, Record<string, string>> = { fr, en, ar };

const RTL_LOCALES = new Set<Locale>(["ar"]);

const LOCALE_LABELS: Record<Locale, { native: string; flag: string }> = {
  fr: { native: "Français", flag: "🇫🇷" },
  en: { native: "English", flag: "🇬🇧" },
  ar: { native: "العربية", flag: "🇹🇳" },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  locales: { code: Locale; native: string; flag: string }[];
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readStored(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en" || stored === "ar") return stored;
  const lang = window.navigator.language.slice(0, 2).toLowerCase();
  if (lang === "ar") return "ar";
  if (lang === "en") return "en";
  return "fr";
}

function applyDir(locale: Locale) {
  if (typeof document === "undefined") return;
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", locale);
}

function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = params[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStored());

  useEffect(() => {
    applyDir(locale);
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = DICTIONARIES[locale] ?? DICTIONARIES.fr;
      const fallback = DICTIONARIES.fr[key];
      const value = dict[key] ?? fallback ?? key;
      return format(value, params);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(() => {
    const dir: "ltr" | "rtl" = RTL_LOCALES.has(locale) ? "rtl" : "ltr";
    const locales = (Object.keys(LOCALE_LABELS) as Locale[]).map((code) => ({
      code,
      native: LOCALE_LABELS[code].native,
      flag: LOCALE_LABELS[code].flag,
    }));
    return { locale, setLocale, t, dir, locales };
  }, [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
