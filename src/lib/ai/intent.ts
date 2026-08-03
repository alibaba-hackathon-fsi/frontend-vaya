import type { LLMProvider } from "./provider";
import { EXTRACT_INTENT_TOOL } from "./prompts/extractIntent";

/* ================================================================
   Extraction sanitization — the LLM trust boundary
   ================================================================ */

// Valid values are derived from the extraction tool schema — the single source
// of truth for what the LLM is allowed to return — so the sanitizer can never
// drift out of sync with the contract the model actually sees.
const toolProps = EXTRACT_INTENT_TOOL.function.parameters.properties;
const VALID_PURPOSES = new Set<string>(toolProps.muc_dich.enum);
const VALID_PRIORITIES = new Set<string>(toolProps.uu_tien.items.enum);
const VALID_ASSET_CLASSES = new Set<string>(
  toolProps.tai_san_dam_bao.properties.loai.enum,
);

/** Coerce a value to a finite number when unambiguous (handles numeric strings). */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const s = value.trim();
    // Reject anything containing letters (e.g. "2 billion") — too ambiguous to
    // coerce safely; it is dropped so an earlier valid value is preserved.
    if (!/^-?[\d.,\s]+$/.test(s)) return null;
    const n = Number(s.replace(/[,.\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Sanitize the raw LLM extraction into a profile fragment containing only
 * valid, correctly-typed fields. LLM output is untrusted: it may return
 * out-of-enum strings, numbers as text, or garbage for fields the customer
 * never stated. Dropping an invalid field (instead of merging it) protects the
 * values the customer already provided in earlier turns from being wiped out.
 */
export function sanitizeExtraction(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  if (typeof raw.muc_dich === "string" && VALID_PURPOSES.has(raw.muc_dich)) {
    clean.muc_dich = raw.muc_dich;
  }

  const amount = toFiniteNumber(raw.so_tien);
  if (amount !== null && amount > 0) clean.so_tien = amount;

  const numericFields = [
    "thoi_han_thang",
    "thu_nhap_hang_thang",
    "no_hien_tai_hang_thang",
  ] as const;
  for (const key of numericFields) {
    const n = toFiniteNumber(raw[key]);
    if (n !== null && n >= 0) clean[key] = n;
  }

  if (Array.isArray(raw.uu_tien)) {
    const valid = raw.uu_tien.filter(
      (p): p is string => typeof p === "string" && VALID_PRIORITIES.has(p),
    );
    if (valid.length > 0) clean.uu_tien = valid;
  }

  // Collateral is only accepted as a well-formed { loai, gia_tri } object; a
  // malformed value is dropped so the request falls back to the unsecured path
  // rather than being rejected outright.
  const collateral = raw.tai_san_dam_bao;
  if (typeof collateral === "object" && collateral !== null) {
    const c = collateral as Record<string, unknown>;
    const giaTri = toFiniteNumber(c.gia_tri);
    if (
      typeof c.loai === "string" &&
      VALID_ASSET_CLASSES.has(c.loai) &&
      giaTri !== null &&
      giaTri > 0
    ) {
      clean.tai_san_dam_bao = { loai: c.loai, gia_tri: giaTri };
    }
  }

  return clean;
}

/* ================================================================
   Intent classification
   ================================================================ */

export type Intent = "NUMERIC" | "POLICY" | "MIXED";

const POLICY_KEYWORDS = [
  "penalty",
  "fee",
  "document",
  "insurance",
  "prepay",
  "policy",
  "condition",
  "phí",
  "bảo hiểm",
  "điều kiện",
  "chính sách",
  "hồ sơ",
  "giấy tờ",
  "thủ tục",
  "lãi phạt",
  "trả trước",
];

/**
 * Classify user intent from the message and extraction results.
 * NUMERIC = loan calculation intent, POLICY = policy question, MIXED = both.
 */
export function classifyIntent(
  message: string,
  extractedKeys: string[],
  sessionTurns: number,
): Intent {
  const isPolicy = POLICY_KEYWORDS.some((kw) =>
    message.toLowerCase().includes(kw),
  );

  if (!isPolicy) return "NUMERIC";
  if (extractedKeys.length > 0 || sessionTurns > 1) return "MIXED";
  return "POLICY";
}

/* ================================================================
   Pricing-question detection (offer-discussion mode)
   ================================================================ */

// Signals the borrower is asking what the loan costs per period. Covers
// diacritic and common no-diacritic Vietnamese spellings plus EN/ZH, so the
// server knows to compute engine pricing and let the LLM narrate it.
const PRICING_KEYWORDS = [
  "mỗi tháng",
  "moi thang",
  "hàng tháng",
  "hang thang",
  "bao nhiêu",
  "bao nhieu",
  "trả bao nhiêu",
  "tra bao nhieu",
  "trả góp",
  "tra gop",
  "góp mỗi tháng",
  "monthly",
  "per month",
  "a month",
  "how much",
  "payment",
  "installment",
  "每月",
  "月供",
  "多少钱",
];

/** True when the message asks what the loan costs per month / per period. */
export function isPricingQuestion(message: string): boolean {
  const text = message.toLowerCase();
  return PRICING_KEYWORDS.some((kw) => text.includes(kw));
}

/* ================================================================
   Profile merge — only overwrite with non-null stated values
   ================================================================ */

/**
 * Merge newly extracted fields into the session profile.
 * Only stated (non-null, non-empty) values are merged so a later turn
 * can't wipe fields the customer already provided.
 */
export function mergeProfile(
  session: Record<string, unknown>,
  extracted: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...session };

  for (const [key, value] of Object.entries(extracted)) {
    if (value === null || value === undefined || value === "") continue;
    // Don't overwrite an existing non-zero value with 0
    if (typeof value === "number" && value === 0 && merged[key]) continue;
    merged[key] = value;
  }

  return merged;
}

/* ================================================================
   High-level extract + classify helper
   ================================================================ */

export interface IntentExtractionResult {
  intent: Intent;
  extracted: Record<string, unknown>;
  extractedKeys: string[];
  /**
   * Asset class the customer offered as collateral, when the raw extraction
   * named the asset but lacked a usable value — so the sanitizer dropped it.
   * The engine profile must stay clean, but the advisor still needs to know
   * a house/vehicle/savings book is on the table and ask for its value.
   */
  collateralLoaiStated?: string;
}

export async function extractAndClassify(
  message: string,
  sessionProfile: Record<string, unknown>,
  sessionTurns: number,
  llm: LLMProvider,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<IntentExtractionResult> {
  // Recent dialogue context lets the extractor resolve short follow-up answers
  // ("24 tháng", "30 triệu") against the question that prompted them.
  const { profile: rawExtracted } = await llm.extractIntent(message, history);
  const extracted = sanitizeExtraction(rawExtracted);

  const extractedKeys = Object.keys(extracted).filter(
    (k) => extracted[k] !== null && extracted[k] !== undefined,
  );

  // Incomplete collateral: the customer named an asset ("I have a house") but
  // not its value, so it didn't survive sanitization. Surface the asset class
  // separately — strong collateral can qualify the loan on asset coverage.
  let collateralLoaiStated: string | undefined;
  const rawCollateral = rawExtracted.tai_san_dam_bao;
  if (
    extracted.tai_san_dam_bao === undefined &&
    typeof rawCollateral === "object" &&
    rawCollateral !== null
  ) {
    const loai = (rawCollateral as Record<string, unknown>).loai;
    if (typeof loai === "string" && VALID_ASSET_CLASSES.has(loai)) {
      collateralLoaiStated = loai;
    }
  }

  const intent = classifyIntent(message, extractedKeys, sessionTurns);

  return { intent, extracted, extractedKeys, collateralLoaiStated };
}
