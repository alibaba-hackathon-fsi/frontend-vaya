import type {
  BaseRateScenario,
  LoanProduct,
  PromoTier,
  RatePeriod,
} from "./types";

function clamp(value: number, floor: number, cap: number): number {
  return Math.min(Math.max(value, floor), cap);
}

/** Build rate schedule: promo period + floating blocks with floor/cap clamping. */
export function buildRateSchedule(input: {
  product: LoanProduct;
  promoTier: PromoTier;
  termMonths: number;
  scenario: BaseRateScenario;
}): RatePeriod[] {
  const { product, promoTier, termMonths, scenario } = input;
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error("termMonths must be a positive integer");
  }
  if (product.rateResetIntervalMonths <= 0) {
    throw new Error("rateResetIntervalMonths must be positive");
  }

  const periods: RatePeriod[] = [];
  const promoEnd = Math.min(promoTier.promoMonths, termMonths);
  if (promoEnd > 0) {
    periods.push({
      fromMonth: 1,
      toMonth: promoEnd,
      annualRateBps: promoTier.promoRateBps,
      kind: "PROMO",
    });
  }

  if (promoEnd >= termMonths) return periods;

  const unclampedFloatingRate =
    product.currentBaseRateBps +
    scenario.baseRateDeltaBps +
    promoTier.floatingMarginBps;
  const floatingRate = clamp(
    unclampedFloatingRate,
    product.floorRateBps ?? 0,
    product.capRateBps ?? Number.MAX_SAFE_INTEGER,
  );

  let fromMonth = promoEnd + 1;
  while (fromMonth <= termMonths) {
    const toMonth = Math.min(
      fromMonth + product.rateResetIntervalMonths - 1,
      termMonths,
    );
    periods.push({
      fromMonth,
      toMonth,
      annualRateBps: floatingRate,
      kind: "FLOATING",
    });
    fromMonth = toMonth + 1;
  }

  return periods;
}
