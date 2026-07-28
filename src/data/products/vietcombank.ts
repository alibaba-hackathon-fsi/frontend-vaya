import type { LoanProduct } from "@/lib/engine/types";

export const vietcombankHome: LoanProduct = {
  productId: "vietcombank-home-standard",
  bankId: "vietcombank",
  bankName: "Vietcombank",
  purpose: "HOME",

  promoMonths: 12,
  promoRateBps: 650,
  floatingMarginBps: 350,

  promoTiers: [
    {
      promoMonths: 12,
      promoRateBps: 650,
      floatingMarginBps: 350,
      conditions: ["Áp dụng cho khoản vay từ 300 triệu đồng"],
      minLoanAmount: 300_000_000,
      requiresInsurance: false,
    },
  ],
  baseRate: { kind: "SAVINGS_12M" },
  currentBaseRateBps: 720,
  floorRateBps: 850,
  rateResetIntervalMonths: 6,

  maxTermMonths: 300,
  maxLtvBps: 7000,
  maxDtiBps: 5000,
  minMonthlyIncomeVnd: 15_000_000,
  maxAgeAtMaturity: 65,
  minAgeAtApplication: 18,

  prepaymentFeeTiers: [
    { fromMonth: 1, toMonth: 36, feeRateBps: 200, base: "PREPAID_AMOUNT" },
    { fromMonth: 37, toMonth: 60, feeRateBps: 100, base: "PREPAID_AMOUNT" },
    { fromMonth: 61, toMonth: 300, feeRateBps: 0, base: "PREPAID_AMOUNT" },
  ],
  promoClawback: {
    applies: false,
    description: "Không áp dụng hoàn lãi ưu đãi.",
  },

  upfrontFees: {
    appraisalFeeVnd: 2_000_000,
    notaryFeeBps: 10,
    registrationFeeVnd: 1_000_000,
    insuranceRateBps: 0,
    insuranceMandatory: false,
  },

  acceptedIncomeProofs: [
    "PAYROLL_TRANSFER",
    "PAYROLL_CASH",
    "BUSINESS_REGISTERED",
    "RENTAL_INCOME",
  ],
  incomeRecognitionBps: {
    PAYROLL_TRANSFER: 10000,
    PAYROLL_CASH: 7000,
    BUSINESS_REGISTERED: 7000,
    BUSINESS_UNREGISTERED: 5000,
    RENTAL_INCOME: 7500,
    FREELANCE_INVOICE: 6000,
    INVESTMENT_INCOME: 6000,
  },
  creditCardObligationBps: 500,
  minEmploymentMonths: 12,
  requiresLocalResidency: true,

  provenance: {
    sourceUrl: "https://www.vietcombank.com.vn/",
    sourceType: "MANUAL_ENTRY",
    asOfDate: "2026-07-24",
    confidence: "LOW",
    note: "Dữ liệu demo, cần xác minh từ nguồn chính thức trước khi sử dụng thực tế.",
  },
};
