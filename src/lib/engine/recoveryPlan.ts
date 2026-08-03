import type { EligibilityRule, LoanPackageRecord, LoanProfile } from "./types";
import { calcMonthlyPayment } from "./calcMonthlyPayment";
import { DTI_CAP } from "./calcDTI";
import { maxSecuredAmount, withinCollateralCap } from "./collateral";

/**
 * Concrete, numeric path to eligibility when no package qualifies.
 * Every figure is derived from package data and engine formulas — the UI and
 * the LLM only present these numbers, they never compute their own.
 */
export interface RecoveryPlan {
  /** Most the borrower could ask for — present when the amount itself is the blocker. */
  maxLoanAmount?: number;
  /** Closest term the packages support — present when the requested term is out of range everywhere. */
  suggestedTermMonths?: number;
  /** Estimated first-month payment at the effective term and cheapest compatible rate. */
  estMonthlyPayment?: number;
  /** Minimum verifiable monthly income to afford that payment within the DTI cap. */
  minMonthlyIncome?: number;
}

/** Closest supported term boundary to the request; ties prefer the longer term (lower payment). */
function closestTerm(
  requested: number,
  candidates: LoanPackageRecord[],
): number {
  const endpoints = candidates.flatMap((p) => [p.thoi_han_min, p.thoi_han_max]);
  return endpoints.reduce((best, e) => {
    const dE = Math.abs(e - requested);
    const dBest = Math.abs(best - requested);
    return dE < dBest || (dE === dBest && e > best) ? e : best;
  });
}

/**
 * Pure, deterministic recovery plan: given a profile nothing ranked for,
 * compute the smallest concrete adjustments (amount, term, income) that would
 * make at least one same-purpose package attainable. No LLM, no I/O.
 */
export function computeRecoveryPlan(
  profile: LoanProfile,
  packages: LoanPackageRecord[],
  rules: EligibilityRule[],
): RecoveryPlan | null {
  const samePurpose = packages.filter((p) => p.muc_dich === profile.muc_dich);
  if (samePurpose.length === 0) return null;

  // Secured request over its LTV cap: borrow less, bounded by both the
  // collateral coverage and the biggest same-purpose package.
  const collateral = profile.tai_san_dam_bao ?? null;
  if (collateral && !withinCollateralCap(profile.so_tien, collateral)) {
    return {
      maxLoanAmount: Math.min(
        maxSecuredAmount(collateral),
        Math.max(...samePurpose.map((p) => p.han_muc)),
      ),
    };
  }

  const amountFits = samePurpose.filter((p) => profile.so_tien <= p.han_muc);
  if (amountFits.length === 0) {
    return { maxLoanAmount: Math.max(...samePurpose.map((p) => p.han_muc)) };
  }

  const fitsTerm = (term: number) =>
    amountFits.filter((p) => term >= p.thoi_han_min && term <= p.thoi_han_max);
  const requestedTerm = profile.thoi_han_thang ?? 0;
  const termOutOfRange = fitsTerm(requestedTerm).length === 0;
  const effectiveTerm = termOutOfRange
    ? closestTerm(requestedTerm, amountFits)
    : requestedTerm;

  // Price the easiest attainable deal (cheapest compatible rate), then derive
  // the income that keeps it within the affordability cap, floored by the
  // lowest income minimum among compatible packages — the easiest entry point.
  const compatible = fitsTerm(effectiveTerm);
  const bestRate = Math.min(...compatible.map((p) => p.lai_suat_tu));
  const payment = calcMonthlyPayment(profile.so_tien, bestRate, effectiveTerm);
  const existingDebt = profile.no_hien_tai_hang_thang ?? 0;
  const incomeFloors = compatible
    .map(
      (p) =>
        rules.find((r) => r.package_id === p.id)?.dieu_kien.thu_nhap_toi_thieu,
    )
    .filter((v): v is number => v != null);
  // Round up to the nearest 100k so the suggestion sits safely inside the
  // DTI cap (an exact ceil lands precisely on it) and reads cleanly.
  const minMonthlyIncome = Math.max(
    Math.ceil((payment.tongThangDau + existingDebt) / DTI_CAP / 100_000) *
      100_000,
    ...(incomeFloors.length > 0 ? [Math.min(...incomeFloors)] : []),
  );

  return {
    suggestedTermMonths: termOutOfRange ? effectiveTerm : undefined,
    estMonthlyPayment: payment.tongThangDau,
    minMonthlyIncome,
  };
}
