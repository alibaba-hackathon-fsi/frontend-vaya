import type {
  CashflowResult,
  CashflowRow,
  HouseholdInput,
  InstallmentRow,
} from "./types";

const DEFAULT_INFLATION_BPS = 400; // 4%/year
const INCOME_GROWTH_PREMIUM_BPS = 150; // real growth above inflation
const MAX_INCOME_GROWTH_FACTOR = 1.8;

/**
 * Monthly household cashflow simulation with income growth and inflation.
 * Pure function, no LLM, no I/O.
 */
export function simulateHousehold(input: {
  schedule: InstallmentRow[];
  household: HouseholdInput;
  incomeOverride?: (month: number, baseIncome: number) => number;
  costOverride?: (month: number, baseCost: number) => number;
}): CashflowResult {
  const { schedule, household, incomeOverride, costOverride } = input;

  const initialSavings = Math.max(0, household.initialSavingsVnd ?? 0);
  const baseIncome = Math.max(0, household.baseMonthlyIncomeVnd ?? 0);
  const baseCost = Math.max(0, household.baseMonthlyLivingCostVnd ?? 0);
  const otherDebt = Math.max(0, household.otherMonthlyDebtVnd ?? 0);
  const inflationBps = household.inflationBps ?? DEFAULT_INFLATION_BPS;
  const growthBps =
    household.incomeGrowthBps !== undefined
      ? household.incomeGrowthBps
      : inflationBps + INCOME_GROWTH_PREMIUM_BPS;

  const rows: CashflowRow[] = [];
  let currentBuffer = initialSavings;
  let runwayMonth: number | null = null;

  let minBufferVnd = initialSavings;
  let minBufferMonth = 0;
  let peakDtiBps = 0;
  let peakDtiMonth = 1;

  for (const row of schedule) {
    const month = row.month;
    const yearIndex = Math.floor((month - 1) / 12);

    const incomeGrowthFactor = Math.min(
      MAX_INCOME_GROWTH_FACTOR,
      Math.pow(1 + growthBps / 10_000, yearIndex),
    );
    const inflationFactor = Math.pow(1 + inflationBps / 10_000, yearIndex);

    const rawIncome = Math.round(baseIncome * incomeGrowthFactor);
    const rawCost = Math.round(baseCost * inflationFactor);

    const income = incomeOverride
      ? incomeOverride(month, rawIncome)
      : rawIncome;
    const livingCost = costOverride ? costOverride(month, rawCost) : rawCost;

    const loanPayment = row.totalPayment;
    const surplus = income - loanPayment - livingCost - otherDebt;

    currentBuffer += surplus;

    let dtiBps = 10_000;
    if (income > 0) {
      dtiBps = Math.round(((loanPayment + otherDebt) / income) * 10_000);
    }

    if (currentBuffer < 0 && runwayMonth === null) {
      runwayMonth = month;
    }

    if (rows.length === 0 || currentBuffer < minBufferVnd) {
      minBufferVnd = currentBuffer;
      minBufferMonth = month;
    }

    if (dtiBps > peakDtiBps) {
      peakDtiBps = dtiBps;
      peakDtiMonth = month;
    }

    rows.push({
      month,
      income,
      loanPayment,
      livingCost,
      otherDebt,
      surplus,
      bufferBalance: currentBuffer,
      dtiBps,
    });
  }

  return {
    rows,
    runwayMonth,
    minBufferVnd,
    minBufferMonth,
    survives: runwayMonth === null,
    peakDtiBps,
    peakDtiMonth,
  };
}
