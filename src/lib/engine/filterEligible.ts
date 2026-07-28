import type { EligibilityResult, EligibilityRule, LoanPackageRecord, LoanProfile } from "./types";

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
        reason: `Purpose mismatch: package is for ${pkg.muc_dich}`,
      });
      continue;
    }
    if (profile.so_tien > pkg.han_muc) {
      rejected.push({
        packageId: pkg.id,
        reason: `Requested amount exceeds package limit of ${pkg.han_muc.toLocaleString()}`,
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
          reason: `Requested term ${profile.thoi_han_thang} months outside package range ${pkg.thoi_han_min}-${pkg.thoi_han_max}`,
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
          reason: `Monthly income below minimum required ${rule.dieu_kien.thu_nhap_toi_thieu.toLocaleString()}`,
        });
        continue;
      }
    }
    eligible.push(pkg);
  }

  return { eligible, rejected };
}
