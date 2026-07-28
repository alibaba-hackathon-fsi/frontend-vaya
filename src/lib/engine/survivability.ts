import type {
  AmortizationMethod,
  GraceConfig,
  GridCell,
  HouseholdInput,
  LoanProduct,
  PromoTier,
  ShockId,
  SurvivabilityReport,
} from "./types";
import { BASE_RATE_SCENARIOS } from "./scenarios";
import { buildRateSchedule } from "./rate-schedule";
import { buildScheduleWithGrace } from "./grace-period";
import { detectCliffs, getPrimaryCliff } from "./cliff-detector";
import { simulateHousehold } from "./household";
import { SHOCK_DEFINITIONS } from "./shocks";
import { suggestImprovements } from "./improvements";

const PEAK_DTI_SURVIVAL_THRESHOLD_BPS = 7500;
const SAFE_DTI_THRESHOLD_BPS = 5500;
const TIGHT_BUFFER_MULTIPLIER = 3;

const SHOCK_IDS: ShockId[] = ["NONE", "JOB_LOSS_3M", "INCOME_DROP_30", "NEW_CHILD"];

export function formatVndVi(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    const b = (amount / 1_000_000_000).toFixed(2).replace(".", ",");
    return `${b} tỷđ`;
  }
  return amount.toLocaleString("vi-VN") + "đ";
}

/**
 * 4x4 survivability grid: 4 rate scenarios x 4 shocks = 16 cells.
 * Score /16, tier classification, warnings, and improvement suggestions.
 */
export function computeSurvivability(input: {
  product: LoanProduct;
  promoTier: PromoTier;
  loanAmount: number;
  termMonths: number;
  grace: GraceConfig;
  household: HouseholdInput;
  method: AmortizationMethod;
}): SurvivabilityReport {
  const { product, promoTier, loanAmount, termMonths, grace, household, method } = input;

  const maxGraceAllowed = Math.max(0, termMonths - 1);
  const effectiveGrace: GraceConfig = {
    developerSubsidyMonths: Math.min(Math.max(0, grace.developerSubsidyMonths ?? 0), maxGraceAllowed),
    principalGraceMonths: Math.min(Math.max(0, grace.principalGraceMonths ?? 0), maxGraceAllowed),
    borrowerPaysPrincipalDuringSubsidy: grace.borrowerPaysPrincipalDuringSubsidy ?? false,
  };

  // Base scenario schedule to find primary cliff
  const baseRateSched = buildRateSchedule({
    product,
    promoTier,
    termMonths,
    scenario: BASE_RATE_SCENARIOS.find((s) => s.id === "BASE")!,
  });
  const baseSchedule = buildScheduleWithGrace({
    loanAmount,
    termMonths,
    rateSchedule: baseRateSched,
    grace: effectiveGrace,
    method,
  });
  const cliffs = detectCliffs(baseSchedule, effectiveGrace, baseRateSched);
  const primaryCliff = getPrimaryCliff(cliffs);

  const onsetMonth = primaryCliff ? primaryCliff.month : Math.max(1, effectiveGrace.principalGraceMonths + 1);

  const grid: GridCell[] = [];
  let score = 0;

  for (const scenario of BASE_RATE_SCENARIOS) {
    const rateSchedule = buildRateSchedule({ product, promoTier, termMonths, scenario });
    const schedule = buildScheduleWithGrace({
      loanAmount,
      termMonths,
      rateSchedule,
      grace: effectiveGrace,
      method,
    });

    for (const shockId of SHOCK_IDS) {
      const shockDef = SHOCK_DEFINITIONS[shockId];

      const sim = simulateHousehold({
        schedule,
        household,
        incomeOverride: shockDef.incomeOverride
          ? (m, base) => shockDef.incomeOverride!(m, base, onsetMonth)
          : undefined,
        costOverride: shockDef.costOverride
          ? (m, base) => shockDef.costOverride!(m, base, onsetMonth)
          : undefined,
      });

      const survives = sim.survives && sim.peakDtiBps <= PEAK_DTI_SURVIVAL_THRESHOLD_BPS;
      if (survives) score += 1;

      let status: "SAFE" | "TIGHT" | "FAIL" = "FAIL";
      if (survives) {
        const tightThreshold = (household.baseMonthlyLivingCostVnd ?? 0) * TIGHT_BUFFER_MULTIPLIER;
        status = sim.minBufferVnd >= tightThreshold && sim.peakDtiBps <= SAFE_DTI_THRESHOLD_BPS
          ? "SAFE"
          : "TIGHT";
      }

      grid.push({
        rateScenarioId: scenario.id,
        shockId,
        runwayMonth: sim.runwayMonth,
        minBufferVnd: sim.minBufferVnd,
        peakDtiBps: sim.peakDtiBps,
        survives,
        status,
      });
    }
  }

  let tier: "ROBUST" | "ACCEPTABLE" | "FRAGILE" | "CRITICAL" = "CRITICAL";
  if (score >= 14) tier = "ROBUST";
  else if (score >= 10) tier = "ACCEPTABLE";
  else if (score >= 6) tier = "FRAGILE";

  let weakestCell = grid[0];
  for (const cell of grid) {
    if (cell.minBufferVnd < weakestCell.minBufferVnd) {
      weakestCell = cell;
    }
  }

  const warningsVi: string[] = [];
  if (primaryCliff) {
    const beforeStr = formatVndVi(primaryCliff.paymentBefore);
    const afterStr = formatVndVi(primaryCliff.paymentAfter);
    if (weakestCell.runwayMonth !== null) {
      warningsVi.push(
        `Từ tháng ${primaryCliff.month}, khoản trả tăng từ ${beforeStr} lên ${afterStr}. Quỹ dự phòng ${formatVndVi(
          household.initialSavingsVnd,
        )} của bạn sẽ cạn ở tháng ${weakestCell.runwayMonth} trong kịch bản căng thẳng.`,
      );
    } else {
      warningsVi.push(
        `Từ tháng ${primaryCliff.month}, khoản trả tăng vọt từ ${beforeStr} lên ${afterStr} (${primaryCliff.causesVi.join(", ")}).`,
      );
    }
  }

  if (score < 10) {
    warningsVi.push(
      `Điểm sống sót đạt ${score}/16 (${tier}). Hộ gia đình có nguy cơ mất khả năng thanh toán khi gặp cú sốc thu nhập hoặc lãi suất tăng cao.`,
    );
  }

  const reportPartial: SurvivabilityReport = {
    grid,
    score,
    scoreLabel: `${score}/16`,
    tier,
    weakestCell,
    primaryCliff,
    warningsVi,
    improvementsVi: [],
  };

  reportPartial.improvementsVi = suggestImprovements(input, reportPartial);

  return reportPartial;
}
