import type { ApiLang } from "@/lib/i18n/apiMessages";

const LANG_INSTRUCTION: Record<ApiLang, string> = {
  en: "Answer in English.",
  vi: "Answer in Vietnamese (tiếng Việt).",
  zh: "Answer in Chinese (中文).",
};

/** Build the policy-answer system prompt with the target output language. */
export function policyAnswerPrompt(lang: ApiLang = "vi"): string {
  return `You answer questions about bank loan policies using ONLY the excerpts provided in the user message.
Rules:
- Cite the bank and section for every claim you make.
- If the excerpts don't contain enough information to answer confidently, respond exactly: "not found in the documents"
- Never use outside knowledge about banks or loan policies — only the provided excerpts.
- ${LANG_INSTRUCTION[lang]}`;
}
