// Decision Engine — shared types (single source of truth).
// Pure type definitions only. No logic, no I/O, no dependencies.

/* ================================================================
   Primitive aliases
   ================================================================ */

/** Basis points: 10.5% = 1050 bps. */
export type Bps = number;

/* ================================================================
   Product schema types
   ================================================================ */

export interface Provenance {
  sourceUrl: string;
  sourceType: "BANK_OFFICIAL" | "BANK_PDF" | "PRESS" | "MANUAL_ENTRY";
  asOfDate: string;
  verifiedBy?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  note?: string;
}

export type BaseRateDefinition =
  | { kind: "SAVINGS_12M" }
  | { kind: "SAVINGS_13M" }
  | { kind: "SAVINGS_24M" }
  | { kind: "PUBLISHED_BASE_RATE" }
  | { kind: "AVG_SAVINGS_12M_TOP4" };

export type IncomeProofType =
  | "PAYROLL_TRANSFER"
  | "PAYROLL_CASH"
  | "BUSINESS_REGISTERED"
  | "BUSINESS_UNREGISTERED"
  | "RENTAL_INCOME"
  | "FREELANCE_INVOICE"
  | "INVESTMENT_INCOME";

export interface PromoTier {
  promoMonths: number;
  promoRateBps: Bps;
  floatingMarginBps: Bps;
  conditions: string[];
  minLoanAmount?: number;
  requiresInsurance: boolean;
}

export interface PrepaymentFeeTier {
  fromMonth: number;
  toMonth: number;
  feeRateBps: Bps;
  base: "OUTSTANDING_PRINCIPAL" | "PREPAID_AMOUNT" | "ORIGINAL_DISBURSED";
  minFeeVnd?: number;
}

export interface LoanProduct {
  productId: string;
  bankId: string;
  bankName: string;
  purpose: "HOME" | "CAR" | "CONSUMER" | "BUSINESS";

  promoMonths: number;
  promoRateBps: Bps;
  floatingMarginBps: Bps;

  promoTiers: PromoTier[];
  baseRate: BaseRateDefinition;
  currentBaseRateBps: Bps;
  floorRateBps?: Bps;
  capRateBps?: Bps;
  rateResetIntervalMonths: number;

  maxTermMonths: number;
  maxLtvBps: Bps;
  maxDtiBps: Bps;
  minMonthlyIncomeVnd: number;
  maxAgeAtMaturity: number;
  minAgeAtApplication: number;

  prepaymentFeeTiers: PrepaymentFeeTier[];
  promoClawback: {
    applies: boolean;
    withinMonths?: number;
    description: string;
  };

  upfrontFees: {
    appraisalFeeVnd: number;
    notaryFeeBps?: Bps;
    registrationFeeVnd?: number;
    insuranceRateBps?: Bps;
    insuranceMandatory: boolean;
  };

  acceptedIncomeProofs: IncomeProofType[];
  incomeRecognitionBps: Record<IncomeProofType, Bps>;
  creditCardObligationBps: Bps;
  minEmploymentMonths: number;
  requiresLocalResidency: boolean;

  provenance: Provenance;
}

/* ================================================================
   Amortization types
   ================================================================ */

export interface RatePeriod {
  fromMonth: number;
  toMonth: number;
  annualRateBps: Bps;
  kind: "PROMO" | "FLOATING";
}

export interface InstallmentRow {
  month: number;
  openingBalance: number;
  annualRateBps: Bps;
  interest: number;
  principal: number;
  totalPayment: number;
  closingBalance: number;
  isRateResetMonth: boolean;
}

export type AmortizationMethod = "ANNUITY" | "EQUAL_PRINCIPAL";

/* ================================================================
   Floating rate scenario types
   ================================================================ */

export interface BaseRateScenario {
  id: "LOW" | "BASE" | "HIGH" | "STRESS";
  labelVi: string;
  baseRateDeltaBps: Bps;
  rationaleVi: string;
}

/* ================================================================
   Cashflow / grace period types
   ================================================================ */

export interface GraceConfig {
  developerSubsidyMonths: number;
  principalGraceMonths: number;
  borrowerPaysPrincipalDuringSubsidy?: boolean;
}

export interface CliffEvent {
  month: number;
  paymentBefore: number;
  paymentAfter: number;
  deltaVnd: number;
  multiplier: number | null;
  causesVi: string[];
  severity: "MINOR" | "MAJOR" | "CLIFF";
}

/* ================================================================
   Household simulation types
   ================================================================ */

export interface HouseholdInput {
  initialSavingsVnd: number;
  baseMonthlyIncomeVnd: number;
  baseMonthlyLivingCostVnd: number;
  otherMonthlyDebtVnd: number;
  incomeGrowthBps?: number;
  inflationBps?: number;
}

export interface CashflowRow {
  month: number;
  income: number;
  loanPayment: number;
  livingCost: number;
  otherDebt: number;
  surplus: number;
  bufferBalance: number;
  dtiBps: number;
}

export interface CashflowResult {
  rows: CashflowRow[];
  runwayMonth: number | null;
  minBufferVnd: number;
  minBufferMonth: number;
  survives: boolean;
  peakDtiBps: number;
  peakDtiMonth: number;
}

/* ================================================================
   Shock types
   ================================================================ */

export type ShockId = "NONE" | "JOB_LOSS_3M" | "INCOME_DROP_30" | "NEW_CHILD";

export interface ShockDefinition {
  id: ShockId;
  labelVi: string;
  descriptionVi: string;
  incomeOverride?: (m: number, base: number, onsetMonth: number) => number;
  costOverride?: (
    m: number,
    base: number,
    onsetMonth: number,
    extraCostVnd?: number,
  ) => number;
}

/* ================================================================
   Survivability types
   ================================================================ */

export interface GridCell {
  rateScenarioId: "LOW" | "BASE" | "HIGH" | "STRESS";
  shockId: ShockId;
  runwayMonth: number | null;
  minBufferVnd: number;
  peakDtiBps: number;
  survives: boolean;
  status: "SAFE" | "TIGHT" | "FAIL";
}

export interface SurvivabilityReport {
  grid: GridCell[];
  score: number;
  scoreLabel: string;
  tier: "ROBUST" | "ACCEPTABLE" | "FRAGILE" | "CRITICAL";
  weakestCell: GridCell;
  primaryCliff: CliffEvent | null;
  warningsVi: string[];
  improvementsVi: string[];
}

/* ================================================================
   DTI / payment / risk types
   ================================================================ */

export interface DTIResult {
  dti: number;
  withinLimit: boolean;
}

export interface MonthlyPaymentResult {
  goc: number;
  laiThangDau: number;
  tongThangDau: number;
}

export type RiskLevel = "low" | "medium" | "high";

export interface RiskResult {
  score: number;
  level: RiskLevel;
}

/* ================================================================
   Eligibility / ranking types
   ================================================================ */

/**
 * Class of collateral a borrower pledges for a secured loan (vay thế chấp).
 * The LTV cap applied to each class lives in engine/collateral.ts and is
 * sourced from published Vietnamese bank policies.
 */
export type AssetClass = "bat_dong_san" | "o_to" | "so_tiet_kiem";

/** Collateral offered to secure a loan: its class and estimated value in VND. */
export interface Collateral {
  loai: AssetClass;
  gia_tri: number;
}

export interface LoanProfile {
  muc_dich: "mua_xe" | "mua_nha" | "kinh_doanh" | "tin_chap";
  so_tien: number;
  thoi_han_thang?: number | null;
  thu_nhap_hang_thang?: number | null;
  no_hien_tai_hang_thang?: number | null;
  uu_tien?: string[];
  /** Present only for a secured loan; absent means an unsecured request. */
  tai_san_dam_bao?: Collateral | null;
}

export interface LoanPackageRecord {
  id: string;
  bank: string;
  muc_dich: string;
  lai_suat_tu: number;
  han_muc: number;
  thoi_han_min: number;
  thoi_han_max: number;
  image_url?: string;
  online_application?: boolean;
  ekyc?: boolean;
  fast_approval?: boolean;
  no_cic_required?: boolean;
  chi_nhanh_gan_nhat?: string;
  latitude?: number;
  longitude?: number;
}

export interface EligibilityRule {
  package_id: string;
  dieu_kien: {
    thu_nhap_toi_thieu?: number;
    dti_toi_da?: number;
    do_tuoi_min?: number;
    do_tuoi_max?: number;
  };
}

export interface EligibilityResult {
  eligible: LoanPackageRecord[];
  rejected: { packageId: string; reason: string }[];
}

export interface RankInput {
  packageId: string;
  laiSuat: number;
  riskScore: number;
  hanMuc?: number;
  thoiHanMax?: number;
  phiPat?: number;
  giaiNganNhanh?: number;
}

export interface RankedResult extends RankInput {
  score: number;
  breakdown: {
    lai_suat_thap: number;
    giai_ngan_nhanh: number;
    do_an_toan: number;
  };
}
