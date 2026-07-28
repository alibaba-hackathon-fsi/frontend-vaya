// Vaya loan engine — ported from the source app.
// Deterministic, rule-based scorer + formatting helpers.
//
// The formatting helpers depend on the active language (for the ₫ magnitude
// suffix "B / M" vs "亿 / 百万") and on a `t` accessor (for the "yr / mo"
// labels). Rather than reading a global LANG like the source, we pass `lang`
// (and, for termLabel, a `t` function) explicitly so output stays identical.

import type { Lang } from "@/i18n/dict";
import { PKG, type LoanPackage, type Purpose } from "@/data/banks";

/** Advisor conversation state. */
export type ChatState = {
  step: string;
  purpose: Purpose | null;
  amount: number | null;
  term: number | null; // months
  age: number | null;
};

/** A scored recommendation (a LoanPackage plus computed fields). */
export type Recommendation = LoanPackage & {
  score: number;
  mo: number;
  usedTerm: number;
};

/** ₫ formatting with locale-aware magnitude suffix. */
export function fmtVND(n: number, lang: Lang): string {
  if (n >= 1e9)
    return (
      "₫" +
      (n % 1e9 === 0 ? n / 1e9 : (n / 1e9).toFixed(1)) +
      (lang === "zh" ? " 亿" : "B")
    );
  if (n >= 1e6)
    return "₫" + Math.round(n / 1e6) + (lang === "zh" ? " 百万" : "M");
  return "₫" + n.toLocaleString("en-US");
}

/** Monthly payment display (full ₫ figure). */
export function fmtMonthly(n: number): string {
  return "₫" + Math.round(n).toLocaleString("en-US");
}

/**
 * Term label ("20 yrs", "1 yr", "18 mo"). `t` supplies the localized
 * yr / yrs / mo suffixes.
 */
export function termLabel(m: number, t: (k: string) => string): string {
  return m % 12 === 0
    ? m / 12 + " " + (m / 12 > 1 ? t("yrs") : t("yr"))
    : m + " " + t("mo");
}

/** Reducing-balance monthly payment. */
export function monthly(P: number, annual: number, n: number): number {
  const r = annual / 100 / 12;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/** Score & rank the top 3 packages for the given state. */
export function recommend(s: ChatState): Recommendation[] {
  const c: Recommendation[] = PKG.filter((p) => p.purpose === s.purpose).map(
    (p) => {
      const term = Math.min(s.term ?? p.term, p.term);
      let score = 100 + (20 - p.std) * 3.2;
      if ((s.amount ?? 0) <= p.max) score += 14;
      else {
        score -= 40;
      }
      if ((s.term ?? 0) <= p.term) score += 10;
      else score -= 6;
      if (p.speed.en.includes("h")) score += 6;
      const mo = monthly(Math.min(s.amount ?? p.max, p.max), p.std, term);
      return {
        ...p,
        score: Math.max(30, Math.round(score)),
        mo,
        usedTerm: term,
      };
    }
  );
  c.sort((a, b) => b.score - a.score);
  return c.slice(0, 3);
}
