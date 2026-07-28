import type { MonthlyPaymentResult } from "./types";

/**
 * Declining-balance monthly payment calculator.
 * Pure function, no LLM, no I/O.
 */
export function calcMonthlyPayment(
  soTien: number,
  laiSuatNamPercent: number,
  thoiHanThang: number,
): MonthlyPaymentResult {
  if (thoiHanThang <= 0) throw new Error("thoiHanThang must be positive");
  if (soTien <= 0) throw new Error("soTien must be positive");

  const laiThang = laiSuatNamPercent / 12 / 100;
  const goc = soTien / thoiHanThang;
  const laiThangDau = soTien * laiThang;

  return {
    goc: Math.round(goc),
    laiThangDau: Math.round(laiThangDau),
    tongThangDau: Math.round(goc + laiThangDau),
  };
}
