// Loan-market data — ported from the source app.
// PURP (purpose labels), BANKS (issuers), PKG (loan packages).
//
// NOTE ON `trend`: the source computed each package's 12-point trend with
// Math.random() at module load. Under Next SSR that would produce different
// values on the server vs. the client and trigger hydration mismatches on the
// sparkline SVGs. We reproduce the exact same shape (a gently declining line
// that lands on the package's headline rate) using a tiny seeded PRNG, so the
// output is deterministic and identical on both server and client.

import type { Lang } from "@/i18n/dict";

export type Purpose = "home" | "car" | "business" | "personal" | "secured";

export type LocalizedString = Record<Lang, string>;

export const PURP: Record<Purpose, LocalizedString> = {
  home: { en: "Home / property", vi: "Mua nhà / đất", zh: "购房 / 房产" },
  car: { en: "Car", vi: "Ô tô", zh: "购车" },
  business: { en: "Business", vi: "Kinh doanh", zh: "经营" },
  personal: { en: "Personal (unsecured)", vi: "Tiêu dùng (tín chấp)", zh: "个人（信用）" },
  secured: { en: "Secured", vi: "Có tài sản đảm bảo", zh: "抵押" },
};

export function purpName(p: Purpose, lang: Lang): string {
  return PURP[p][lang] || PURP[p].en;
}

export function prodName(p: { product: LocalizedString }, lang: Lang): string {
  return p.product[lang] || p.product.en;
}

export type Bank = { code: string; name: string; color: string };

export const BANKS: Bank[] = [
  { code: "VCB", name: "Vietcombank", color: "#0A7A3B" },
  { code: "BIDV", name: "BIDV", color: "#1A7A4C" },
  { code: "VPB", name: "VPBank", color: "#00A868" },
  { code: "TCB", name: "Techcombank", color: "#E5533B" },
  { code: "MB", name: "MB Bank", color: "#1E3A8A" },
  { code: "ACB", name: "ACB", color: "#0F62A8" },
  { code: "VIB", name: "VIB", color: "#0A8F4E" },
  { code: "TPB", name: "TPBank", color: "#5B33B0" },
  { code: "STB", name: "Sacombank", color: "#0E7BC0" },
  { code: "HDB", name: "HDBank", color: "#C0392B" },
];

export function bankOf(code: string): Bank {
  // Every PKG code exists in BANKS, so this is always defined; the fallback is
  // only to satisfy the type checker.
  return (
    BANKS.find((b) => b.code === code) ?? { code, name: code, color: "#013D3B" }
  );
}

// Deterministic PRNG (mulberry32-style) seeded from the package's base rate so
// the generated trend is stable across renders. Mirrors the source's downward
// drift (base + 1.8 at the start, easing down to `base` at the final point).
function seededTrend(base: number): number[] {
  let seed = (Math.floor(base * 1000) + 12345) >>> 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const a: number[] = [];
  let v = base + 1.8;
  for (let i = 0; i < 12; i++) {
    v -= rand() * 0.32;
    a.push(+Math.max(base - 0.2, v).toFixed(2));
  }
  a[11] = base;
  return a;
}

export type LoanPackage = {
  code: string;
  product: LocalizedString;
  purpose: Purpose;
  rate: number;
  std: number;
  promoM: number;
  max: number;
  term: number; // months
  ltv: number;
  speed: LocalizedString;
  trend: number[];
  change: number;
};

type PackageSeed = Omit<LoanPackage, "trend" | "change">;

const PKG_SEED: PackageSeed[] = [
  { code: "VCB", product: { en: "New Home Achiever", vi: "Nhà Mới Thành Đạt", zh: "新居成就" }, purpose: "home", rate: 6.8, std: 10.2, promoM: 12, max: 50e9, term: 480, ltv: 70, speed: { en: "5–7 days", vi: "5–7 ngày", zh: "5–7 天" } },
  { code: "BIDV", product: { en: "BIDV New Home", vi: "Nhà mới BIDV", zh: "BIDV 新居" }, purpose: "home", rate: 6.5, std: 10.0, promoM: 6, max: 20e9, term: 300, ltv: 80, speed: { en: "5–7 days", vi: "5–7 ngày", zh: "5–7 天" } },
  { code: "TCB", product: { en: "Prosperous Family", vi: "Gia đình sung túc", zh: "富足家庭" }, purpose: "home", rate: 7.5, std: 10.8, promoM: 24, max: 30e9, term: 420, ltv: 70, speed: { en: "3–7 days", vi: "3–7 ngày", zh: "3–7 天" } },
  { code: "VIB", product: { en: "VIB Fast Auto", vi: "Ô tô VIB Fast", zh: "VIB 快捷购车" }, purpose: "car", rate: 7.8, std: 11.5, promoM: 12, max: 2e9, term: 96, ltv: 80, speed: { en: "within 8h", vi: "trong 8 giờ", zh: "8 小时内" } },
  { code: "HDB", product: { en: "Open Road Auto", vi: "Ô tô rộng đường", zh: "畅行购车" }, purpose: "car", rate: 7.5, std: 11.2, promoM: 12, max: 1.8e9, term: 84, ltv: 80, speed: { en: "1–3 days", vi: "1–3 ngày", zh: "1–3 天" } },
  { code: "VPB", product: { en: "SME Booster", vi: "SME Booster", zh: "中小企业助推" }, purpose: "business", rate: 9.2, std: 12.5, promoM: 6, max: 5e9, term: 60, ltv: 0, speed: { en: "3–5 days", vi: "3–5 ngày", zh: "3–5 天" } },
  { code: "MB", product: { en: "Thriving Business", vi: "Kinh doanh phát đạt", zh: "生意兴隆" }, purpose: "business", rate: 9.5, std: 12.9, promoM: 6, max: 8e9, term: 84, ltv: 70, speed: { en: "5–7 days", vi: "5–7 ngày", zh: "5–7 天" } },
  { code: "VCB", product: { en: "Confident Business", vi: "An tâm kinh doanh", zh: "安心经营" }, purpose: "business", rate: 9.0, std: 12.2, promoM: 12, max: 10e9, term: 84, ltv: 70, speed: { en: "5–7 days", vi: "5–7 ngày", zh: "5–7 天" } },
  { code: "TPB", product: { en: "FastMoney Unsecured", vi: "FastMoney tín chấp", zh: "FastMoney 信用贷" }, purpose: "personal", rate: 15.9, std: 15.9, promoM: 0, max: 5e8, term: 60, ltv: 0, speed: { en: "within 4h", vi: "trong 4 giờ", zh: "4 小时内" } },
  { code: "TCB", product: { en: "Salary Credit Line", vi: "Tín chấp theo lương", zh: "薪资信用贷" }, purpose: "personal", rate: 16.5, std: 16.5, promoM: 0, max: 8e8, term: 48, ltv: 0, speed: { en: "within 1 day", vi: "trong 1 ngày", zh: "1 天内" } },
  { code: "ACB", product: { en: "Secured Consumer", vi: "Tiêu dùng có TSĐB", zh: "抵押消费贷" }, purpose: "secured", rate: 10.5, std: 12.8, promoM: 12, max: 3e9, term: 120, ltv: 70, speed: { en: "3–5 days", vi: "3–5 ngày", zh: "3–5 天" } },
  { code: "STB", product: { en: "Flexi Mortgage", vi: "Vay thế chấp đa năng", zh: "多功能抵押贷" }, purpose: "secured", rate: 10.9, std: 13.0, promoM: 6, max: 5e9, term: 180, ltv: 75, speed: { en: "3–5 days", vi: "3–5 ngày", zh: "3–5 天" } },
];

export const PKG: LoanPackage[] = PKG_SEED.map((p) => {
  const t = seededTrend(p.rate);
  return { ...p, trend: t, change: +(t[11] - t[0]).toFixed(1) };
});

// 12-month average starting-rate series for the trend chart.
export const AVG: number[] = [9.2, 9.0, 8.8, 8.6, 8.4, 8.1, 7.9, 7.8, 7.7, 7.6, 7.5, 7.4];
