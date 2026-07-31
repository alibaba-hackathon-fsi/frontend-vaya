"use client";

/**
 * Access to the borrower's saved financial profile (the survival-score form).
 * Shared so the survival page and the chat affordability check read the same
 * storage key with the same parsing rules — one source of truth.
 */

export const SURV_FORM_KEY = "vaya_surv_form";

/** Parse a possibly formatted numeric input ("2,000,000") — 0 on garbage. */
export function parseNum(v: unknown): number {
  const x = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isNaN(x) ? 0 : x;
}

export interface SavedAffordability {
  income: number;
  debt: number;
}

/**
 * Read income + existing debt from the saved survival form.
 * Returns null when nothing is saved or the income is unusable,
 * so callers fall back to asking the borrower.
 */
export function readSavedAffordability(): SavedAffordability | null {
  try {
    const raw = localStorage.getItem(SURV_FORM_KEY);
    if (!raw) return null;
    const f = JSON.parse(raw) as Record<string, unknown>;
    const income = parseNum(f.income);
    if (income <= 0) return null;
    return { income, debt: parseNum(f.debt) };
  } catch {
    return null;
  }
}
