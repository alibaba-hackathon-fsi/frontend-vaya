import type {
  AmortizationMethod,
  GraceConfig,
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
import { formatVndVi } from "./survivability";

const TERM_EXTENSION_MONTHS = 60;
const AMOUNT_REDUCTION_FACTOR = 0.9;
const BUFFER_TARGET_MONTHS = 6;

const SHOCK_IDS: ShockId[] = ["NONE", "JOB_LOSS_3M", "INCOME_DROP_30", "NEW_CHILD"];

interface TrialInput {
  product: LoanProduct;
  promoTier: PromoTier;
  loanAmount: number;
  termMonths: number;
  grace: GraceConfig;
  household: HouseholdInput;
  method: AmortizationMethod;
}

function computeTrialScore(input: TrialInput): number {
  const { product, promoTier, loanAmount, termMonths, grace, household, method } = input;

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
    grace,
    method,
  });
  const cliffs = detectCliffs(baseSchedule, grace, baseRateSched);
  const primaryCliff = getPrimaryCliff(cliffs);
  const onsetMonth = primaryCliff ? primaryCliff.month : Math.max(1, grace.principalGraceMonths + 1);

  let score = 0;

  for (const scenario of BASE_RATE_SCENARIOS) {
    const rateSchedule = buildRateSchedule({ product, promoTier, termMonths, scenario });
    const schedule = buildScheduleWithGrace({ loanAmount, termMonths, rateSchedule, grace, method });

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
      if (sim.survives) score += 1;
    }
  }

  return score;
}

/**
 * Quantified improvement suggestions with trade-off analysis.
 * Each suggestion shows score improvement and the cost/trade-off.
 */
export function suggestImprovements(
  baseInput: TrialInput,
  baseReport: Omit<SurvivabilityReport, "improvementsVi">,
): string[] {
  const suggestions: string[] = [];
  const baseScore = baseReport.score;
  const { product, loanAmount, termMonths, household } = baseInput;

  // 1. Extend term by 5 years (+60 months)
  const newTerm = termMonths + TERM_EXTENSION_MONTHS;
  if (newTerm <= product.maxTermMonths) {
    const trialScore = computeTrialScore({ ...baseInput, termMonths: newTerm });
    if (trialScore > baseScore) {
      const termYearsOld = Math.round(termMonths / 12);
      const termYearsNew = Math.round(newTerm / 12);
      suggestions.push(
        `Kéo dài kỳ hạn từ ${termYearsOld} lên ${termYearsNew} năm: điểm sống sót ${baseScore}/16 -> ${trialScore}/16. Khoản trả hàng tháng giảm, nhưng tổng chi phí lãi vay trong suốt kỳ hạn sẽ tăng thêm.`,
      );
    }
  }

  // 2. Reduce loan amount by 10%
  const newAmount = Math.round(loanAmount * AMOUNT_REDUCTION_FACTOR);
  if (newAmount > 0) {
    const trialScore = computeTrialScore({ ...baseInput, loanAmount: newAmount });
    if (trialScore > baseScore) {
      const diffAmount = loanAmount - newAmount;
      suggestions.push(
        `Giảm 10% số tiền vay (${formatVndVi(diffAmount)}): điểm sống sót ${baseScore}/16 -> ${trialScore}/16. Giảm áp lực trả nợ tháng, nhưng bạn cần chuẩn bị thêm vốn tự có ban đầu.`,
      );
    }
  }

  // 3. Increase buffer to 6 months of living costs
  const targetBuffer = (household.baseMonthlyLivingCostVnd ?? 0) * BUFFER_TARGET_MONTHS;
  if (household.initialSavingsVnd < targetBuffer) {
    const trialScore = computeTrialScore({
      ...baseInput,
      household: { ...household, initialSavingsVnd: targetBuffer },
    });
    if (trialScore > baseScore) {
      suggestions.push(
        `Tăng quỹ dự phòng lên 6 tháng chi phí sinh hoạt (${formatVndVi(targetBuffer)}): điểm sống sót ${baseScore}/16 -> ${trialScore}/16. Giúp gia tăng khả năng chịu đựng cú sốc, nhưng đòi hỏi thời gian tích luỹ thêm tiết kiệm.`,
      );
    }
  }

  return suggestions;
}
