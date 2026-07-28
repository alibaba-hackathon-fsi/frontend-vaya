import type {
  AmortizationMethod,
  GraceConfig,
  InstallmentRow,
  RatePeriod,
} from "./types";

function monthlyRate(annualRateBps: number): number {
  return annualRateBps / 10_000 / 12;
}

function calcEmi(
  balance: number,
  annualRateBps: number,
  nRemaining: number,
): number {
  if (nRemaining <= 0) return balance;
  const i = monthlyRate(annualRateBps);
  if (i === 0) return Math.round(balance / nRemaining);
  const emi = (balance * i) / (1 - Math.pow(1 + i, -nRemaining));
  return Math.round(emi);
}

function periodForMonth(rateSchedule: RatePeriod[], month: number): RatePeriod {
  const period = rateSchedule.find(
    (item) => month >= item.fromMonth && month <= item.toMonth,
  );
  if (!period) throw new Error(`No rate period covers month ${month}`);
  return period;
}

/**
 * Amortization schedule with developer interest subsidy + principal grace period.
 * Vietnamese market standard: CĐT hỗ trợ lãi suất + ân hạn nợ gốc.
 */
export function buildScheduleWithGrace(input: {
  loanAmount: number;
  termMonths: number;
  rateSchedule: RatePeriod[];
  grace: GraceConfig;
  method: AmortizationMethod;
}): InstallmentRow[] {
  const { loanAmount, termMonths, rateSchedule, grace, method } = input;

  if (!Number.isInteger(loanAmount) || loanAmount <= 0) {
    throw new Error("loanAmount must be a positive integer VND amount");
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error("termMonths must be a positive integer");
  }
  if (grace.principalGraceMonths >= termMonths) {
    throw new Error("principalGraceMonths must be less than termMonths");
  }
  if (grace.developerSubsidyMonths >= termMonths) {
    throw new Error("developerSubsidyMonths must be less than termMonths");
  }

  const rows: InstallmentRow[] = [];
  let openingBalance = loanAmount;
  const remainingPrincipalMonths = termMonths - grace.principalGraceMonths;

  let currentPeriodStart = -1;
  let currentEmi = 0;

  for (let month = 1; month <= termMonths; month += 1) {
    const period = periodForMonth(rateSchedule, month);
    const isRateResetMonth = month === period.fromMonth;
    const i = monthlyRate(period.annualRateBps);

    const fullInterest = Math.round(openingBalance * i);

    // Developer subsidy: borrower pays 0 interest during subsidy period
    const isSubsidized = month <= grace.developerSubsidyMonths;
    const borrowerInterest = isSubsidized ? 0 : fullInterest;

    // Principal grace: borrower pays 0 principal during grace period
    const isPrincipalGrace = month <= grace.principalGraceMonths;

    let principal = 0;
    let totalPayment = 0;

    if (!isPrincipalGrace) {
      const monthsElapsedPostGrace = month - grace.principalGraceMonths;
      const nRemainingForPrincipal =
        remainingPrincipalMonths - monthsElapsedPostGrace + 1;

      if (method === "ANNUITY") {
        if (currentPeriodStart !== period.fromMonth || isPrincipalGrace) {
          currentEmi = calcEmi(
            openingBalance,
            period.annualRateBps,
            nRemainingForPrincipal,
          );
          currentPeriodStart = period.fromMonth;
        }
        totalPayment = currentEmi;
        principal = totalPayment - borrowerInterest;
        if (principal < 0) principal = 0;
      } else {
        principal = Math.round(openingBalance / nRemainingForPrincipal);
        totalPayment = principal + borrowerInterest;
      }
    } else {
      principal = 0;
      totalPayment = borrowerInterest;
    }

    if (month === termMonths || principal > openingBalance) {
      if (!isPrincipalGrace) {
        principal = openingBalance;
        totalPayment = principal + borrowerInterest;
      }
    }

    const closingBalance = openingBalance - principal;

    rows.push({
      month,
      openingBalance,
      annualRateBps: period.annualRateBps,
      interest: borrowerInterest,
      principal,
      totalPayment,
      closingBalance,
      isRateResetMonth,
    });

    openingBalance = closingBalance;
  }

  // Reconcile: ensure total principal equals loan amount and final balance is 0
  if (rows.length > 0) {
    const sumPrincipal = rows.reduce((sum, r) => sum + r.principal, 0);
    const diff = loanAmount - sumPrincipal;
    if (diff !== 0) {
      const lastRow = rows[rows.length - 1];
      lastRow.principal += diff;
      lastRow.totalPayment += diff;
      lastRow.closingBalance = 0;
    }
  }

  const finalSumPrincipal = rows.reduce((sum, r) => sum + r.principal, 0);
  if (finalSumPrincipal !== loanAmount) {
    throw new Error(
      `Reconcile error: principal sum (${finalSumPrincipal}) !== loanAmount (${loanAmount})`,
    );
  }
  if (rows[rows.length - 1].closingBalance !== 0) {
    throw new Error("Reconcile error: final closing balance !== 0");
  }

  return rows;
}
