import { NextRequest, NextResponse } from "next/server";
import { LoanProfileSchema } from "@/lib/validation/profileSchema";
import { runCalculation } from "@/lib/engine/pipeline";

const AS_OF_DATE = "2025-07-24";

const ASSUMPTIONS = [
  `Tính toán điểm xếp hạng dựa trên lãi suất và điều kiện vay cập nhật ngày ${AS_OF_DATE}.`,
  `Tỷ lệ DTI tối đa được áp dụng là 60% thu nhập hàng tháng.`,
];

/**
 * POST /api/calculate
 * Body: full loan profile (all required fields present).
 * Returns: ranked offers + rejected + assumptions.
 * No LLM involved — pure deterministic calculation.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = LoanProfileSchema.safeParse(body);
  if (!parsed.success) {
    const formattedError = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: formattedError }, { status: 400 });
  }

  const profile = parsed.data;

  // Ensure required calculation fields are present
  if (!profile.thoi_han_thang || !profile.thu_nhap_hang_thang) {
    return NextResponse.json(
      { error: "thoi_han_thang and thu_nhap_hang_thang are required for calculation" },
      { status: 400 },
    );
  }

  const scoreLog = runCalculation({
    ...profile,
    thoi_han_thang: profile.thoi_han_thang,
    thu_nhap_hang_thang: profile.thu_nhap_hang_thang,
  });

  return NextResponse.json({
    valid: true,
    missingFields: [],
    ranked: scoreLog.ranked,
    rejected: scoreLog.rejected,
    assumptions: ASSUMPTIONS,
    asOfDate: AS_OF_DATE,
  });
}
