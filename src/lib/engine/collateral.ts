import type { AssetClass, Collateral, RiskResult } from "./types";

/* ================================================================
   Secured-loan (vay thế chấp) policy constants
   ================================================================
   LTV caps are sourced from published Vietnamese bank policies (as of
   2026-07). Each value is anchored to a specific published figure, chosen
   conservative-to-typical within the observed market range so the engine
   never over-promises borrowing capacity:
   - bat_dong_san 0.70 — SeABank "70-80% of appraised value", VIB "70-90%"
       (https://www.seabank.com.vn, https://www.vib.com.vn). Some banks
       advertise up to 100% after appraisal (BIDV); 70% is the prudent floor.
   - o_to 0.80 — Techcombank "up to 80% of vehicle value"
       (https://techcombank.com/khach-hang-ca-nhan/vay/vay-mua-o-to); market
       range 70-85% (VPBank up to 85%).
   - so_tiet_kiem 0.90 — BIDV "90% of savings-book value"
       (https://bidv.com.vn, cầm cố sổ tiết kiệm); range 90-100%.
   ================================================================ */
export const LTV_CAP_BY_ASSET: Record<AssetClass, number> = {
  bat_dong_san: 0.7,
  o_to: 0.8,
  so_tiet_kiem: 0.9,
};

/**
 * Income-relief threshold: at or below this request-LTV the collateral is
 * "strong" enough that the loan can qualify on asset coverage and the income
 * floor is waived. Confirmed product decision (50%).
 */
export const INCOME_RELIEF_LTV_THRESHOLD = 0.5;

/* Internal LTV risk bands — used to score risk for asset-backed loans where
   DTI is not the limiting factor. Comparable in magnitude to scoreRisk output
   so ranking stays consistent across secured and unsecured candidates. */
const LTV_LOW = 0.5;
const LTV_MEDIUM = 0.7;

/** Maximum secured loan amount for an asset: LTV cap × appraised value. */
export function maxSecuredAmount(collateral: Collateral): number {
  return LTV_CAP_BY_ASSET[collateral.loai] * collateral.gia_tri;
}

/** Requested loan as a fraction of collateral value (0 when no collateral). */
export function requestLtv(
  soTien: number,
  collateral: Collateral | null | undefined,
): number {
  if (!collateral || collateral.gia_tri <= 0) return 0;
  return soTien / collateral.gia_tri;
}

/** Loan stays within the asset's lending cap (amount ≤ LTV cap × value). */
export function withinCollateralCap(
  soTien: number,
  collateral: Collateral,
): boolean {
  return soTien <= maxSecuredAmount(collateral);
}

/**
 * Strong collateral: the request sits within the income-relief LTV band, so
 * the borrower may qualify on asset coverage even with low or no income.
 */
export function hasStrongCollateral(
  soTien: number,
  collateral: Collateral | null | undefined,
): boolean {
  if (!collateral || collateral.gia_tri <= 0) return false;
  return requestLtv(soTien, collateral) <= INCOME_RELIEF_LTV_THRESHOLD;
}

/** Risk scored from LTV for asset-backed loans (lower LTV = safer). */
export function ltvRiskLevel(ltv: number): RiskResult {
  if (ltv <= LTV_LOW) return { score: 0.3, level: "low" };
  if (ltv <= LTV_MEDIUM) return { score: 0.6, level: "medium" };
  return { score: 0.9, level: "high" };
}
