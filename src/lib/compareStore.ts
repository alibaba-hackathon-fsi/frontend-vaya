"use client";

/**
 * Selection store for the "compare packages" feature.
 *
 * Selection has to survive navigation (pick on the markets table, add one more
 * from a package detail page, then open /compare), so it lives outside React in
 * a tiny external store that every component subscribes to. It is mirrored to
 * localStorage so a refresh — or the judge reopening the tab — keeps the basket.
 *
 * Items are indexes into PKG, which is the same identifier the routes already
 * use (/package/[i]).
 */
import { useSyncExternalStore } from "react";

export const COMPARE_MAX = 3;

const KEY = "vaya_compare";
const EMPTY: number[] = [];

let ids: number[] = EMPTY;
let started = false;
const subs = new Set<() => void>();

function emit() {
  for (const cb of subs) cb();
}

function commit(next: number[]) {
  ids = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode — in-memory selection still works */
  }
  emit();
}

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return EMPTY;
    const clean = parsed
      .filter((n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0)
      .slice(0, COMPARE_MAX);
    return clean.length ? clean : EMPTY;
  } catch {
    return EMPTY;
  }
}

function subscribe(cb: () => void) {
  // First subscriber pulls the saved basket in. Doing it here rather than in
  // getSnapshot keeps the server and first client render identical, so React
  // hydrates cleanly and then re-renders with the restored selection.
  if (!started) {
    started = true;
    const saved = read();
    if (saved !== EMPTY) ids = saved;
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        ids = read();
        emit();
      }
    });
  }
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

const getSnapshot = () => ids;
const getServerSnapshot = () => EMPTY;

/** Reactive list of selected package indexes. */
export function useCompare(): number[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type ToggleResult = "added" | "removed" | "full";

/** Add or remove a package. Returns "full" when the cap would be exceeded. */
export function toggleCompare(i: number): ToggleResult {
  if (ids.includes(i)) {
    commit(ids.filter((n) => n !== i));
    return "removed";
  }
  if (ids.length >= COMPARE_MAX) return "full";
  commit([...ids, i]);
  return "added";
}

export function removeCompare(i: number) {
  if (ids.includes(i)) commit(ids.filter((n) => n !== i));
}

export function clearCompare() {
  if (ids.length) commit(EMPTY);
}

export function isCompared(i: number) {
  return ids.includes(i);
}
