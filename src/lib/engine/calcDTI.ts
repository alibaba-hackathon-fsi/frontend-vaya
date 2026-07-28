import type { DTIResult } from "./types";

/** Affordability cap: monthly payment / income must not exceed this. */
export const DTI_CAP = 0.6;

/**
 * Debt-to-income ratio: (monthly loan payment + existing monthly debt) / monthly income.
 * Pure function, no LLM, no I/O.
 */
export function calcDTI(
  monthlyPayment: number,
  monthlyIncome: number,
  existingMonthlyDebt = 0,
): DTIResult {
  if (monthlyIncome <= 0) return { dti: Infinity, withinLimit: false };
  const dti = (monthlyPayment + existingMonthlyDebt) / monthlyIncome;
  return { dti: Math.round(dti * 1000) / 1000, withinLimit: dti <= DTI_CAP };
}
