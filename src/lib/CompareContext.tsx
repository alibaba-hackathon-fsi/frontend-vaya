"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "vaya_compare_sel";
const MAX_SELECTION = 3;

export interface CompareCtx {
  /** Package indices currently selected for comparison (0-based into PKG). */
  selected: number[];
  /** Toggle a package index in/out of the selection. Returns false if the
   *  selection is already full and the index isn't in it. */
  toggle: (idx: number) => boolean;
  /** Remove a specific index. */
  remove: (idx: number) => void;
  /** Clear all selections. */
  clear: () => void;
  /** True when the selection has reached MAX_SELECTION. */
  full: boolean;
}

const Ctx = createContext<CompareCtx>({
  selected: [],
  toggle: () => false,
  remove: () => {},
  clear: () => {},
  full: false,
});

export const useCompare = () => useContext(Ctx);

function readStorage(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((n: unknown) => typeof n === "number");
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<number[]>([]);

  // Hydrate from sessionStorage on mount (client only).
  useEffect(() => {
    setSelected(readStorage());
  }, []);

  // Persist to sessionStorage whenever selection changes.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    } catch {
      /* quota errors — ignore */
    }
  }, [selected]);

  const toggle = useCallback(
    (idx: number): boolean => {
      let added = false;
      setSelected((prev) => {
        if (prev.includes(idx)) {
          return prev.filter((i) => i !== idx);
        }
        if (prev.length >= MAX_SELECTION) return prev;
        added = true;
        return [...prev, idx];
      });
      return added;
    },
    []
  );

  const remove = useCallback((idx: number) => {
    setSelected((prev) => prev.filter((i) => i !== idx));
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const full = selected.length >= MAX_SELECTION;

  const value = useMemo(
    () => ({ selected, toggle, remove, clear, full }),
    [selected, toggle, remove, clear, full]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { MAX_SELECTION };
