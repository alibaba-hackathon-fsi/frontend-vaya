import type { Purpose } from "@/data/banks";

/**
 * Seed content for the reverse-auction board.
 *
 * The board inverts the usual flow: instead of one borrower checking twenty
 * banks, one anonymous request is posted and the banks bid against each other
 * on it. Every offer therefore carries the bank's public listed rate next to
 * what it is actually willing to do — the gap between the two IS the product.
 *
 * Free text lives as i18n keys so the board reads correctly in all three
 * languages; only posts the user writes carry raw text.
 */

export type MarketOffer = {
  id: string;
  /** bank code — resolves to a real logo via logoSrc() */
  code: string;
  /** what the bank is offering this borrower, % per year */
  rate: number;
  /** the bank's public listed rate for this product, % per year */
  listed: number;
  termMonths: number;
  maxAmount: number;
  /** i18n keys rendered as condition chips */
  conditions: string[];
  hoursAgo: number;
  /** hours until the quote lapses — competitive pressure, visible to the user */
  expiresInH: number;
};

export type MarketPost = {
  id: string;
  /** anonymous handle; the borrower's identity is never on the board */
  handle: string;
  purpose: Purpose;
  amount: number;
  termMonths: number;
  /** i18n key for the income band */
  incomeBand: string;
  collateral: boolean;
  /** i18n keys for verification badges */
  verified: string[];
  /** i18n key for seeded posts */
  noteKey?: string;
  /** raw text for posts the user writes */
  note?: string;
  hoursAgo: number;
  offers: MarketOffer[];
  mine?: boolean;
};

export const INCOME_BANDS = ["mk_inc_1", "mk_inc_2", "mk_inc_3", "mk_inc_4"];

const o = (
  id: string,
  code: string,
  rate: number,
  listed: number,
  termMonths: number,
  maxAmount: number,
  conditions: string[],
  hoursAgo: number,
  expiresInH: number,
): MarketOffer => ({ id, code, rate, listed, termMonths, maxAmount, conditions, hoursAgo, expiresInH });

export const SEED_POSTS: MarketPost[] = [
  // ---- home ----
  {
    id: "p1", handle: "7F3A", purpose: "home",
    amount: 2_400_000_000, termMonths: 240, incomeBand: "mk_inc_3", collateral: true,
    verified: ["mk_v_income", "mk_v_id"], noteKey: "mk_seed_1", hoursAgo: 3,
    offers: [
      o("p1o1", "TCB", 6.2, 7.1, 240, 2_500_000_000, ["mk_c_payroll", "mk_c_insurance"], 2, 46),
      o("p1o2", "VCB", 6.45, 6.9, 240, 2_400_000_000, ["mk_c_salary_acct"], 2, 70),
      o("p1o3", "MB", 5.99, 7.3, 180, 2_000_000_000, ["mk_c_promo12", "mk_c_payroll"], 1, 22),
    ],
  },
  {
    id: "p6", handle: "B204", purpose: "home",
    amount: 3_200_000_000, termMonths: 300, incomeBand: "mk_inc_4", collateral: true,
    verified: ["mk_v_income", "mk_v_id", "mk_v_collateral"], noteKey: "mk_seed_6", hoursAgo: 5,
    offers: [
      o("p6o1", "VCB", 6.35, 6.9, 300, 3_200_000_000, ["mk_c_salary_acct", "mk_c_insurance"], 4, 62),
      o("p6o2", "BIDV", 6.1, 7.0, 240, 3_000_000_000, ["mk_c_payroll"], 3, 30),
    ],
  },
  {
    id: "p7", handle: "5E6C", purpose: "home",
    amount: 1_100_000_000, termMonths: 180, incomeBand: "mk_inc_2", collateral: true,
    verified: ["mk_v_income"], hoursAgo: 14,
    offers: [o("p7o1", "ACB", 6.9, 7.4, 180, 1_200_000_000, ["mk_c_statements"], 12, 54)],
  },
  {
    id: "p8", handle: "D9F1", purpose: "home",
    amount: 4_500_000_000, termMonths: 240, incomeBand: "mk_inc_4", collateral: true,
    verified: ["mk_v_income", "mk_v_id", "mk_v_collateral"], noteKey: "mk_seed_7", hoursAgo: 28,
    offers: [
      o("p8o1", "TCB", 5.85, 7.1, 240, 5_000_000_000, ["mk_c_payroll", "mk_c_promo12"], 25, 16),
      o("p8o2", "MB", 6.05, 7.3, 240, 4_500_000_000, ["mk_c_insurance"], 22, 40),
      o("p8o3", "VPB", 6.4, 7.6, 216, 4_000_000_000, ["mk_c_fast"], 19, 66),
    ],
  },
  // ---- car ----
  {
    id: "p3", handle: "44B0", purpose: "car",
    amount: 720_000_000, termMonths: 84, incomeBand: "mk_inc_2", collateral: true,
    verified: ["mk_v_income"], noteKey: "mk_seed_3", hoursAgo: 20,
    offers: [
      o("p3o1", "VIB", 7.3, 8.4, 84, 750_000_000, ["mk_c_ltv80", "mk_c_fast"], 18, 12),
      o("p3o2", "TPB", 7.6, 8.1, 72, 700_000_000, ["mk_c_insurance"], 14, 40),
      o("p3o3", "BIDV", 7.9, 8.6, 84, 760_000_000, ["mk_c_salary_acct"], 11, 64),
      o("p3o4", "STB", 7.45, 8.9, 60, 650_000_000, ["mk_c_promo12"], 6, 30),
    ],
  },
  {
    id: "p9", handle: "0C77", purpose: "car",
    amount: 450_000_000, termMonths: 60, incomeBand: "mk_inc_2", collateral: true,
    verified: ["mk_v_income"], hoursAgo: 6,
    offers: [
      o("p9o1", "TPB", 7.85, 8.1, 60, 500_000_000, ["mk_c_fast"], 5, 44),
      o("p9o2", "VIB", 7.55, 8.4, 60, 480_000_000, ["mk_c_ltv80"], 4, 26),
    ],
  },
  {
    id: "p10", handle: "A318", purpose: "car",
    amount: 1_200_000_000, termMonths: 96, incomeBand: "mk_inc_3", collateral: true,
    verified: ["mk_v_income", "mk_v_id"], noteKey: "mk_seed_8", hoursAgo: 38,
    offers: [o("p10o1", "STB", 7.2, 8.9, 84, 1_200_000_000, ["mk_c_promo12", "mk_c_insurance"], 33, 20)],
  },
  // ---- business ----
  {
    id: "p2", handle: "C81D", purpose: "business",
    amount: 900_000_000, termMonths: 60, incomeBand: "mk_inc_4", collateral: false,
    verified: ["mk_v_biz", "mk_v_tax"], noteKey: "mk_seed_2", hoursAgo: 9,
    offers: [
      o("p2o1", "VPB", 9.4, 10.8, 60, 1_000_000_000, ["mk_c_nocol", "mk_c_fast"], 7, 34),
      o("p2o2", "ACB", 8.9, 10.2, 48, 800_000_000, ["mk_c_statements"], 5, 58),
    ],
  },
  {
    id: "p11", handle: "6B45", purpose: "business",
    amount: 2_500_000_000, termMonths: 84, incomeBand: "mk_inc_4", collateral: true,
    verified: ["mk_v_biz", "mk_v_tax", "mk_v_collateral"], hoursAgo: 12,
    offers: [
      o("p11o1", "TCB", 8.4, 10.6, 84, 2_500_000_000, ["mk_c_payroll", "mk_c_statements"], 10, 28),
      o("p11o2", "ACB", 8.75, 10.2, 72, 2_200_000_000, ["mk_c_statements"], 8, 52),
      o("p11o3", "MB", 8.95, 10.4, 60, 2_000_000_000, ["mk_c_fast"], 6, 68),
    ],
  },
  {
    id: "p12", handle: "F7E2", purpose: "business",
    amount: 400_000_000, termMonths: 36, incomeBand: "mk_inc_2", collateral: false,
    verified: ["mk_v_biz"], hoursAgo: 26,
    offers: [o("p12o1", "VPB", 10.1, 10.8, 36, 400_000_000, ["mk_c_nocol"], 21, 36)],
  },
  // ---- personal ----
  {
    id: "p4", handle: "1E92", purpose: "personal",
    amount: 260_000_000, termMonths: 36, incomeBand: "mk_inc_2", collateral: false,
    verified: ["mk_v_income", "mk_v_id"], noteKey: "mk_seed_4", hoursAgo: 31,
    offers: [o("p4o1", "HDB", 13.8, 15.5, 36, 300_000_000, ["mk_c_nocol"], 26, 18)],
  },
  {
    id: "p13", handle: "3D08", purpose: "personal",
    amount: 120_000_000, termMonths: 24, incomeBand: "mk_inc_1", collateral: false,
    verified: ["mk_v_income", "mk_v_id"], noteKey: "mk_seed_9", hoursAgo: 8,
    offers: [
      o("p13o1", "TPB", 13.2, 14.9, 24, 150_000_000, ["mk_c_salary_acct"], 6, 42),
      o("p13o2", "HDB", 12.6, 15.5, 24, 120_000_000, ["mk_c_nocol", "mk_c_fast"], 3, 24),
    ],
  },
  // ---- secured ----
  {
    id: "p5", handle: "9AD7", purpose: "secured",
    amount: 1_500_000_000, termMonths: 120, incomeBand: "mk_inc_3", collateral: true,
    verified: ["mk_v_income", "mk_v_collateral"], noteKey: "mk_seed_5", hoursAgo: 47,
    offers: [],
  },
  {
    id: "p14", handle: "8C1B", purpose: "secured",
    amount: 800_000_000, termMonths: 120, incomeBand: "mk_inc_3", collateral: true,
    verified: ["mk_v_income", "mk_v_collateral"], hoursAgo: 16,
    offers: [
      o("p14o1", "BIDV", 7.85, 8.6, 120, 900_000_000, ["mk_c_ltv80"], 13, 50),
      o("p14o2", "VCB", 7.6, 8.2, 108, 800_000_000, ["mk_c_salary_acct"], 9, 32),
    ],
  },
];

/**
 * Banks that plausibly bid on a given purpose, cheapest-first. Used to stage the
 * replies to a request the user posts, so the board demonstrates the mechanic
 * instead of sitting empty.
 */
export const BIDDERS: Record<Purpose, { code: string; listed: number; cut: number; conditions: string[] }[]> = {
  home: [
    { code: "MB", listed: 7.3, cut: 1.1, conditions: ["mk_c_promo12", "mk_c_payroll"] },
    { code: "TCB", listed: 7.1, cut: 0.85, conditions: ["mk_c_insurance"] },
    { code: "VCB", listed: 6.9, cut: 0.45, conditions: ["mk_c_salary_acct"] },
  ],
  car: [
    { code: "VIB", listed: 8.4, cut: 1.05, conditions: ["mk_c_ltv80", "mk_c_fast"] },
    { code: "TPB", listed: 8.1, cut: 0.55, conditions: ["mk_c_insurance"] },
    { code: "STB", listed: 8.9, cut: 1.4, conditions: ["mk_c_promo12"] },
  ],
  business: [
    { code: "VPB", listed: 10.8, cut: 1.35, conditions: ["mk_c_nocol", "mk_c_fast"] },
    { code: "ACB", listed: 10.2, cut: 1.25, conditions: ["mk_c_statements"] },
    { code: "TCB", listed: 10.6, cut: 0.9, conditions: ["mk_c_payroll"] },
  ],
  personal: [
    { code: "HDB", listed: 15.5, cut: 1.7, conditions: ["mk_c_nocol"] },
    { code: "VPB", listed: 16.2, cut: 2.1, conditions: ["mk_c_fast"] },
    { code: "TPB", listed: 14.9, cut: 1.1, conditions: ["mk_c_salary_acct"] },
  ],
  secured: [
    { code: "BIDV", listed: 8.6, cut: 0.95, conditions: ["mk_c_ltv80"] },
    { code: "ACB", listed: 8.8, cut: 1.2, conditions: ["mk_c_statements"] },
    { code: "VCB", listed: 8.2, cut: 0.6, conditions: ["mk_c_salary_acct"] },
  ],
};
