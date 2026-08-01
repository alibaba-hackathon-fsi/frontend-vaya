import type { ApiLang } from "@/lib/i18n/apiMessages";

const LANG_INSTRUCTION: Record<ApiLang, string> = {
  en: "Use English for the narration.",
  vi: "Use Vietnamese (tiếng Việt) for the narration.",
  zh: "Use Chinese (中文) for the narration.",
};

/** Build the explain-result system prompt with the target output language. */
export function explainResultPrompt(lang: ApiLang = "vi"): string {
  return `You narrate a loan Decision Engine's score log into plain, friendly language.
Rules:
- Never compute, alter, or invent any number that is not already present in the provided log.
- Reference ranked packages by bank name and explain the top factors that drove each ranking.
- If a package was rejected, state the rejection reason exactly as given.
- If the profile carries collateral (tai_san_dam_bao) or a ranked offer is asset-backed (assetBacked),
  explain that this is a secured loan (vay thế chấp) backed by the borrower's asset. Use the offer's
  ltv value to describe the loan-to-value ratio, and note that strong collateral lets the borrower
  qualify on asset coverage even with low or no income. Never invent an LTV — use the one in the log.
- Keep the tone clear and non-technical — the reader is a loan customer, not an engineer.
- ${LANG_INSTRUCTION[lang]}`;
}
