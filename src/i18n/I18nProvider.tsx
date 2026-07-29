"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { T, type Lang } from "./dict";

const STORAGE_KEY = "vaya_lang";

// Apply the persisted language before the browser paints, so a non-default
// language never flashes English first on refresh. Falls back to useEffect on
// the server (where layout effects would warn).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key to a string, falling back to English. */
  t: (key: string) => string;
  /** Raw accessor (used for array values such as `ages`), falling back to English. */
  tRaw: (key: string) => string | string[] | undefined;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolve(lang: Lang, key: string): string | string[] | undefined {
  const cur = T[lang];
  if (cur && cur[key] != null) return cur[key];
  return T.en[key];
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate persisted language before first paint (avoids default-language flash).
  useIsoLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "vi" || saved === "zh") {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore storage errors */
    }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string): string => {
      const v = resolve(lang, key);
      return typeof v === "string" ? v : "";
    },
    [lang]
  );

  const tRaw = useCallback((key: string) => resolve(lang, key), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tRaw }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}
