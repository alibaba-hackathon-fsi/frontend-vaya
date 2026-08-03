import type { LoanProfile } from "./types";
import { filterEligible } from "./filterEligible";
import { calcMonthlyPayment } from "./calcMonthlyPayment";
import { calcDTI } from "./calcDTI";
import { scoreRisk } from "./scoreRisk";
import { rankMCDA } from "./rankMCDA";
import { hasStrongCollateral, ltvRiskLevel, requestLtv } from "./collateral";
import { computeRecoveryPlan, type RecoveryPlan } from "./recoveryPlan";
import { LOAN_PACKAGES } from "@/data/loanPackages";
import { ELIGIBILITY_RULES } from "@/data/eligibilityRules";

export interface RankedOffer {
  packageId: string;
  bank: string;
  score: number;
  monthlyPayment: number;
  dti: number;
  riskLevel: string;
  breakdown: {
    lai_suat_thap: number;
    giai_ngan_nhanh: number;
    do_an_toan: number;
  };
  /** True for a loan secured by collateral (qualified on asset coverage). */
  assetBacked?: boolean;
  /** Loan-to-value ratio of the request (present only when asset-backed). */
  ltv?: number;
}

export interface RejectedOffer {
  packageId: string;
  reason: string;
}

export interface ScoreLog {
  profile: LoanProfile;
  ranked: RankedOffer[];
  rejected: RejectedOffer[];
  /** Concrete path to eligibility — present only when nothing qualified. */
  recovery?: RecoveryPlan;
}

/**
 * Full deterministic pipeline: filter -> payment -> DTI -> risk -> MCDA rank.
 * No LLM, no network, no I/O. Pure computation on bundled data.
 */
export function runCalculation(profile: LoanProfile): ScoreLog {
  const { eligible, rejected } = filterEligible(
    profile,
    LOAN_PACKAGES,
    ELIGIBILITY_RULES,
  );

  // Secured-loan relief: strong collateral (low LTV) lets a borrower qualify
  // on asset coverage even when income is low or absent, in which case risk is
  // scored from LTV rather than DTI. With no collateral these flags are inert,
  // so the unsecured path is unchanged.
  const collateral = profile.tai_san_dam_bao ?? null;
  const secured = collateral != null;
  const relief = hasStrongCollateral(profile.so_tien, collateral);
  const ltv = requestLtv(profile.so_tien, collateral);

  const candidates = eligible.map((pkg) => {
    const payment = calcMonthlyPayment(
      profile.so_tien,
      pkg.lai_suat_tu,
      profile.thoi_han_thang!,
    );
    const { dti, withinLimit } = calcDTI(
      payment.tongThangDau,
      profile.thu_nhap_hang_thang ?? 0,
      profile.no_hien_tai_hang_thang ?? 0,
    );
    const risk = relief
      ? ltvRiskLevel(ltv)
      : scoreRisk(dti, profile.thoi_han_thang!);
    return { pkg, payment, dti, withinLimit: withinLimit || relief, risk };
  });

  const dtiRejected = candidates.filter((c) => !c.withinLimit);
  const dtiEligible = candidates.filter((c) => c.withinLimit);

  const ranked = rankMCDA(
    dtiEligible.map((c) => ({
      packageId: c.pkg.id,
      laiSuat: c.pkg.lai_suat_tu,
      riskScore: c.risk.score,
      hanMuc: c.pkg.han_muc,
      thoiHanMax: c.pkg.thoi_han_max,
      giaiNganNhanh: c.pkg.fast_approval ? 1 : 0.3,
    })),
    profile.uu_tien,
  ).map((r) => {
    const c = dtiEligible.find((x) => x.pkg.id === r.packageId)!;
    return {
      packageId: r.packageId,
      bank: c.pkg.bank,
      score: r.score,
      monthlyPayment: c.payment.tongThangDau,
      dti: Number.isFinite(c.dti) ? c.dti : 0,
      riskLevel: c.risk.level,
      breakdown: r.breakdown,
      ...(secured
        ? { assetBacked: true, ltv: Math.round(ltv * 1000) / 1000 }
        : {}),
    };
  });

  return {
    profile,
    ranked,
    rejected: [
      // Only surface same-category rejections (a financial fit issue). Packages
      // rejected purely for a purpose mismatch (a different loan category) are
      // noise to the customer and are excluded from the explanation.
      ...rejected
        .filter((r) => {
          const pkg = LOAN_PACKAGES.find((p) => p.id === r.packageId);
          return pkg?.muc_dich === profile.muc_dich;
        })
        .map((r) => ({ packageId: r.packageId, reason: r.reason })),
      ...dtiRejected.map((c) => ({
        packageId: c.pkg.id,
        reason: Number.isFinite(c.dti)
          ? `The monthly payment would be ${Math.round(c.dti * 100)}% of your income, above the safe limit of 60%`
          : `The monthly payment cannot be covered by the stated income`,
      })),
    ],
    // Nothing qualified: compute the concrete adjustments that would make the
    // request attainable, so the borrower leaves with a plan, not just a "no".
    ...(ranked.length === 0
      ? {
          recovery:
            computeRecoveryPlan(profile, LOAN_PACKAGES, ELIGIBILITY_RULES) ??
            undefined,
        }
      : {}),
  };
}
