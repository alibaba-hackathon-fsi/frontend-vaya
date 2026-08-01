import type { ApiLang } from "@/lib/i18n/apiMessages";

/** Shared "answer in <language>" instruction appended to every generation prompt. */
export const LANG_INSTRUCTION: Record<ApiLang, string> = {
  en: "Answer in English.",
  vi: "Answer in Vietnamese (tiếng Việt).",
  zh: "Answer in Chinese (中文).",
};
