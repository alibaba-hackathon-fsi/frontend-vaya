import type {
  AmortizationMethod,
  Bps,
  InstallmentRow,
  RatePeriod,
} from "./types";

function monthlyRate(annualRateBps: Bps): number {
  return annualRateBps / 10_000 / 12;
}

function calcEmi(
  balance: number,
  annualRateBps: Bps,
  nRemaining: number,
): number {
  if (nRemaining <= 0) throw new Error("nRemaining must be positive");
  const i = monthlyRate(annualRateBps);
  if (i === 0) return balance / nRemaining;
  return (balance * i) / (1 - Math.pow(1 + i, -nRemaining));
}

function periodForMonth(rateSchedule: RatePeriod[], month: number): RatePeriod {
  const period = rateSchedule.find(
    (item) => month >= item.fromMonth && month <= item.toMonth,
  );
  if (!period) throw new Error(`No rate period covers month ${month}`);
  return period;
}

function validateInput(
  loanAmount: number,
  termMonths: number,
  rateSchedule: RatePeriod[],
): void {
  if (!Number.isInteger(loanAmount) || loanAmount <= 0) {
    throw new Error("loanAmount must be a positive integer VND amount");
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error("termMonths must be a positive integer");
  }
  if (rateSchedule.length === 0)
    throw new Error("rateSchedule must not be empty");

  const sorted = [...rateSchedule].sort((a, b) => a.fromMonth - b.fromMonth);
  for (let idx = 0; idx < sorted.length; idx++) {
    const period = sorted[idx];
    if (period.annualRateBps < 0) {
      throw new Error("annualRateBps must be a non-negative integer");
    }
    if (period.fromMonth < 1 || period.toMonth < period.fromMonth) {
      throw new Error("Invalid rate period bounds");
    }
    if (idx > 0) {
      const prev = sorted[idx - 1];
      if (period.fromMonth <= prev.toMonth) {
        throw new Error(
          `Rate schedule periods overlap between month ${period.fromMonth} and ${prev.toMonth}`,
        );
      }
    }
  }

  for (let month = 1; month <= termMonths; month += 1) {
    periodForMonth(rateSchedule, month);
  }
}

/**
 * Full amortization schedule with multi-rate-period support.
 * ANNUITY recalculates EMI at each new period on remaining balance/term.
 */
export function amortize(input: {
  loanAmount: number;
  termMonths: number;
  rateSchedule: RatePeriod[];
  method: AmortizationMethod;
}): InstallmentRow[] {
  const { loanAmount, termMonths, rateSchedule, method } = input;
  validateInput(loanAmount, termMonths, rateSchedule);

  const rows: InstallmentRow[] = [];
  let openingBalance = loanAmount;
  let currentPeriodStart = -1;
  let currentEmi = 0;
  const equalPrincipalBase = Math.round(loanAmount / termMonths);

  for (let month = 1; month <= termMonths; month += 1) {
    const period = periodForMonth(rateSchedule, month);
    const isRateResetMonth = month === period.fromMonth;
    const nRemaining = termMonths - month + 1;
    const i = monthlyRate(period.annualRateBps);
    const interest = Math.round(openingBalance * i);

    if (method === "ANNUITY" && currentPeriodStart !== period.fromMonth) {
      currentEmi = calcEmi(openingBalance, period.annualRateBps, nRemaining);
      currentPeriodStart = period.fromMonth;
    }

    let principal: number;
    let totalPayment: number;

    if (method === "ANNUITY") {
      totalPayment = Math.round(currentEmi);
      principal = totalPayment - interest;
    } else {
      principal = equalPrincipalBase;
      totalPayment = principal + interest;
    }

    if (month === termMonths || principal > openingBalance) {
      principal = openingBalance;
      totalPayment = principal + interest;
    }

    const closingBalance = openingBalance - principal;
    rows.push({
      month,
      openingBalance,
      annualRateBps: period.annualRateBps,
      interest,
      principal,
      totalPayment,
      closingBalance,
      isRateResetMonth,
    });
    openingBalance = closingBalance;
  }

  // Rounding reconciliation: ensure principal sum equals loan amount exactly
  const principalSum = rows.reduce((sum, row) => sum + row.principal, 0);
  const diff = loanAmount - principalSum;
  const last = rows[rows.length - 1];
  last.principal += diff;
  last.totalPayment = last.principal + last.interest;
  last.closingBalance = 0;

  const reconciledPrincipal = rows.reduce((sum, row) => sum + row.principal, 0);
  if (reconciledPrincipal !== loanAmount) {
    throw new Error("Rounding reconciliation failed: principal sum mismatch");
  }

  return rows;
}
