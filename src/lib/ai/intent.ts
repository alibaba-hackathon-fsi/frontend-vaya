import type { LLMProvider } from "./provider";

/* ================================================================
   Intent classification
   ================================================================ */

export type Intent = "NUMERIC" | "POLICY" | "MIXED";

const POLICY_KEYWORDS = [
  "penalty", "fee", "document", "insurance", "prepay", "policy",
  "condition", "phí", "bảo hiểm", "điều kiện", "chính sách",
  "hồ sơ", "giấy tờ", "thủ tục", "lãi phạt", "trả trước",
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
  const isPolicy = POLICY_KEYWORDS.some((kw) => message.toLowerCase().includes(kw));

  if (!isPolicy) return "NUMERIC";
  if (extractedKeys.length > 0 || sessionTurns > 1) return "MIXED";
  return "POLICY";
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
}

export async function extractAndClassify(
  message: string,
  sessionProfile: Record<string, unknown>,
  sessionTurns: number,
  llm: LLMProvider,
): Promise<IntentExtractionResult> {
  const { profile: extracted } = await llm.extractIntent(message);

  const extractedKeys = Object.keys(extracted).filter(
    (k) => extracted[k] !== null && extracted[k] !== undefined,
  );

  const intent = classifyIntent(message, extractedKeys, sessionTurns);

  return { intent, extracted, extractedKeys };
}
