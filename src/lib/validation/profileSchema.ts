import { z } from "zod";

export const MAX_LOAN_AMOUNT_VND = 50_000_000_000;
export const MAX_MONTHLY_INCOME_VND = 1_000_000_000;

export const LoanProfileSchema = z.object({
  muc_dich: z.enum(["mua_xe", "mua_nha", "kinh_doanh", "tin_chap"], {
    message:
      "Loan purpose must be one of: mua_xe, mua_nha, kinh_doanh, tin_chap",
  }),
  so_tien: z
    .number({ message: "Loan amount must be a number" })
    .positive("Loan amount must be greater than 0 VND")
    .max(MAX_LOAN_AMOUNT_VND, "Loan amount must not exceed 50,000,000,000 VND"),
  thoi_han_thang: z.number().int().min(1).max(360).nullable().optional(),
  thu_nhap_hang_thang: z
    .number()
    .nonnegative()
    .max(MAX_MONTHLY_INCOME_VND, "Income implausibly large")
    .nullable()
    .optional(),
  no_hien_tai_hang_thang: z.number().nonnegative().nullable().optional(),
  uu_tien: z.array(z.string()).optional().default([]),
});

export type LoanProfileInput = z.infer<typeof LoanProfileSchema>;

/**
 * Stable, machine-readable reason a profile was rejected at the trust boundary.
 * The validation layer reports WHY as a code; turning it into localized,
 * human-readable text is the API layer's job — so raw schema messages and enum
 * values never reach the borrower.
 */
export type RejectionCode =
  | "invalid_purpose"
  | "invalid_amount"
  | "amount_too_large"
  | "income_too_large"
  | "invalid_term"
  | "invalid_input";

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
  rejectedCode?: RejectionCode;
}

const REQUIRED_FOR_CALCULATION = [
  "thoi_han_thang",
  "thu_nhap_hang_thang",
] as const;

/** Collapse the schema's issues into the single primary rejection code. */
function rejectionCodeFromIssues(
  issues: readonly { path: readonly PropertyKey[]; code: string }[],
): RejectionCode {
  for (const issue of issues) {
    switch (issue.path[0]) {
      case "muc_dich":
        return "invalid_purpose";
      case "so_tien":
        return issue.code === "too_big" ? "amount_too_large" : "invalid_amount";
      case "thu_nhap_hang_thang":
        return "income_too_large";
      case "thoi_han_thang":
        return "invalid_term";
    }
  }
  return "invalid_input";
}

/**
 * Trust boundary between LLM/user output and the Decision Engine.
 * All external input must pass through here before reaching pure functions.
 */
export function validateProfile(raw: unknown): {
  profile: LoanProfileInput | null;
  result: ValidationResult;
} {
  const parsed = LoanProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      profile: null,
      result: {
        valid: false,
        missingFields: [],
        rejectedCode: rejectionCodeFromIssues(parsed.error.issues),
      },
    };
  }

  const missingFields = REQUIRED_FOR_CALCULATION.filter(
    (field) => parsed.data[field] === null || parsed.data[field] === undefined,
  );

  return {
    profile: parsed.data,
    result: { valid: missingFields.length === 0, missingFields },
  };
}
