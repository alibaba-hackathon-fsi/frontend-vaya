/**
 * Input guard for the chat endpoint.
 *
 * Validates and sanitizes user messages and detects high-confidence
 * prompt-injection attempts *before* they reach the LLM. All functions are
 * pure (no I/O) and independently testable.
 *
 * Detection is intentionally conservative: the patterns target well-known
 * override/hijack/exfiltration phrasings that never appear in a genuine loan
 * question, keeping false positives near zero. This is one layer of defence —
 * it works together with the hardened extraction system prompt and the strict
 * tool-call schema (the LLM can only emit structured fields, never execute
 * instructions).
 */

/** Hard cap on a single user message (characters). Longer input is truncated. */
export const MAX_MESSAGE_LENGTH = 2000;

/**
 * High-confidence prompt-injection patterns.
 * Grouped by attack family for readability.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  // --- Directives to override / ignore the system prompt ---
  /ignore\s+(all\s+|the\s+|these\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)/i,
  /disregard\s+(all\s+|the\s+|these\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)/i,
  /forget\s+(all\s+|the\s+|these\s+|your\s+)?(previous\s+|prior\s+)?(instructions|rules|prompts)/i,
  /\boverride\s+(your\s+)?(system\s+prompt|instructions|rules)\b/i,
  /\bnew\s+system\s+prompt\b/i,

  // --- Role / mode hijacking ---
  /\byou\s+are\s+now\s+(DAN|in\s+developer\s+mode|unrestricted|uncensored)\b/i,
  /\bDAN\s+mode\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bjailbreak/i,
  /\bbypass\s+(your\s+)?(safety|content\s+filters?|restrictions|rules)\b/i,

  // --- Attempts to exfiltrate the system prompt ---
  /\b(reveal|show|tell|repeat|output)\s+(me\s+)?(your\s+)?(system\s+prompt|initial\s+prompt|instructions)\b/i,

  // --- Fake role / message-boundary markers at the start of a line ---
  /(^|\n)\s*(system|developer|assistant)\s*:/i,
  /<\/?\s*(system|prompt|instruction)\s*>/i,
];

/**
 * Detect a high-confidence prompt-injection attempt in a user message.
 * Returns true only for well-known override/hijack/exfiltration phrasings.
 */
export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Sanitize a raw user message:
 *  - strip control characters (keep newlines and tabs),
 *  - trim surrounding whitespace,
 *  - cap the length at MAX_MESSAGE_LENGTH.
 *
 * Returns null when nothing meaningful remains (empty / whitespace-only).
 */
export function sanitizeMessage(raw: string): string | null {
  const cleaned = raw
    // Remove C0 control chars except \t (\u0009) and \n (\u000A), plus DEL.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  if (!cleaned) return null;
  return cleaned.slice(0, MAX_MESSAGE_LENGTH);
}
