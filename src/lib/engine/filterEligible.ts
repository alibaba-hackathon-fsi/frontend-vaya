import type {
  EligibilityResult,
  EligibilityRule,
  LoanPackageRecord,
  LoanProfile,
} from "./types";
import {
  LTV_CAP_BY_ASSET,
  hasStrongCollateral,
  maxSecuredAmount,
  withinCollateralCap,
} from "./collateral";

/** Human-readable label for a loan purpose code. */
const PURPOSE_LABELS: Record<string, string> = {
  mua_xe: "car loans",
  mua_nha: "home loans",
  kinh_doanh: "business loans",
  tin_chap: "unsecured personal loans",
};
function purposeLabel(code: string): string {
  return PURPOSE_LABELS[code] ?? code;
}

/** Human-readable label for a collateral asset class. */
const ASSET_LABELS: Record<string, string> = {
  bat_dong_san: "property",
  o_to: "vehicle",
  so_tiet_kiem: "savings book",
};
function assetLabel(code: string): string {
  return ASSET_LABELS[code] ?? code;
}

/**
 * Pure, deterministic eligibility filter. No LLM, no I/O.
 * Filters packages by purpose, amount, term range, and income minimum.
 */
export function filterEligible(
  profile: LoanProfile,
  packages: LoanPackageRecord[],
  rules: EligibilityRule[],
): EligibilityResult {
  const eligible: LoanPackageRecord[] = [];
  const rejected: { packageId: string; reason: string }[] = [];

  // Secured-loan gates (profile-level): a request backed by collateral must
  // stay within the asset's LTV cap. Strong collateral (low LTV) also waives
  // the per-package income floor so the borrower can qualify on asset coverage.
  const collateral = profile.tai_san_dam_bao ?? null;
  const overCap =
    collateral != null && !withinCollateralCap(profile.so_tien, collateral);
  const incomeRelief = hasStrongCollateral(profile.so_tien, collateral);

  for (const pkg of packages) {
    if (overCap && collateral) {
      const cap = maxSecuredAmount(collateral);
      const pct = Math.round(LTV_CAP_BY_ASSET[collateral.loai] * 100);
      rejected.push({
        packageId: pkg.id,
        reason: `With your ${assetLabel(collateral.loai)} collateral worth ${collateral.gia_tri.toLocaleString()} VND, the maximum secured loan is ${cap.toLocaleString()} VND (${pct}% of collateral value), but you asked for ${profile.so_tien.toLocaleString()} VND`,
      });
      continue;
    }
    if (pkg.muc_dich !== profile.muc_dich) {
      rejected.push({
        packageId: pkg.id,
        reason: `This package is for ${purposeLabel(pkg.muc_dich)}, but you are applying for ${purposeLabel(profile.muc_dich)}`,
      });
      continue;
    }
    if (profile.so_tien > pkg.han_muc) {
      rejected.push({
        packageId: pkg.id,
        reason: `You asked for ${profile.so_tien.toLocaleString()} VND, but this package only lends up to ${pkg.han_muc.toLocaleString()} VND`,
      });
      continue;
    }
    if (profile.thoi_han_thang != null) {
      if (
        profile.thoi_han_thang < pkg.thoi_han_min ||
        profile.thoi_han_thang > pkg.thoi_han_max
      ) {
        rejected.push({
          packageId: pkg.id,
          reason: `You want a ${profile.thoi_han_thang}-month term, but this package only offers ${pkg.thoi_han_min} to ${pkg.thoi_han_max} months`,
        });
        continue;
      }
    }
    const rule = rules.find((r) => r.package_id === pkg.id);
    if (
      !incomeRelief &&
      rule?.dieu_kien.thu_nhap_toi_thieu != null &&
      profile.thu_nhap_hang_thang != null
    ) {
      if (profile.thu_nhap_hang_thang < rule.dieu_kien.thu_nhap_toi_thieu) {
        rejected.push({
          packageId: pkg.id,
          reason: `Your monthly income (${profile.thu_nhap_hang_thang.toLocaleString()} VND) is below this package's minimum of ${rule.dieu_kien.thu_nhap_toi_thieu.toLocaleString()} VND`,
        });
        continue;
      }
    }
    eligible.push(pkg);
  }

  return { eligible, rejected };
}
