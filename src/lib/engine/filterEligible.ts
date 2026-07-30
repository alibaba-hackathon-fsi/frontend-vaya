import type { EligibilityResult, EligibilityRule, LoanPackageRecord, LoanProfile } from "./types";

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

  for (const pkg of packages) {
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
