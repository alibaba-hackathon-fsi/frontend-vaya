export type ApiLang = "en" | "vi" | "zh";

const MESSAGES = {
  llm_error: {
    en: "I had trouble processing that — please use the form below instead.",
    vi: "Tôi gặp khó khăn khi xử lý yêu cầu — vui lòng sử dụng biểu mẫu bên dưới.",
    zh: "处理您的请求时遇到问题 — 请使用下方表单。",
  },
  policy_intro: {
    en: "Here is what I found in the policies:",
    vi: "Đây là thông tin tôi tìm được từ chính sách:",
    zh: "以下是我从政策中找到的信息：",
  },
  out_of_scope: {
    en: "I'm sorry, but I can only help with realistic Vietnamese loan scenarios. Please adjust the request in the form below.",
    vi: "Xin lỗi, tôi chỉ có thể hỗ trợ các kịch bản vay thực tế tại Việt Nam. Vui lòng điều chỉnh thông tin trong biểu mẫu bên dưới.",
    zh: "抱歉，我只能帮助处理越南实际贷款场景。请在下方表单中调整您的请求。",
  },
  reason_prefix: {
    en: "Reason",
    vi: "Lý do",
    zh: "原因",
  },
  also_prefix: {
    en: "Also, ",
    vi: "Ngoài ra, ",
    zh: "另外，",
  },
  fallback_to_form: {
    en: "Please fill in the remaining details in the form so I can calculate accurate numbers.",
    vi: "Vui lòng điền thêm thông tin trong biểu mẫu để tôi có thể tính toán chính xác.",
    zh: "请在表单中填写剩余信息，以便我进行准确计算。",
  },
  results_ready: {
    en: "Got everything I need — here are your best options.",
    vi: "Đã đủ thông tin — đây là các phương án phù hợp nhất.",
    zh: "信息已齐全 — 以下是最适合您的方案。",
  },
  explanation_error: {
    en: "Explanation unavailable — see the ranked results above.",
    vi: "Không thể tạo giải thích — vui lòng xem kết quả xếp hạng ở trên.",
    zh: "无法生成解释 — 请查看上方的排名结果。",
  },
  followup_fallback: {
    en: "Could you tell me more about {field}?",
    vi: "Bạn có thể cho biết thêm về {field} không?",
    zh: "您能告诉我更多关于{field}的信息吗？",
  },
} as const;

export type ApiMessageKey = keyof typeof MESSAGES;

/**
 * Resolve a localized message by key and language.
 * Falls back to Vietnamese if the lang is unrecognized.
 */
export function apiT(key: ApiMessageKey, lang: ApiLang = "vi"): string {
  return MESSAGES[key][lang] ?? MESSAGES[key].vi;
}

/**
 * Parse the `lang` field from the request body into a valid ApiLang.
 * Defaults to "vi" for unrecognized or missing values.
 */
export function parseLang(raw: unknown): ApiLang {
  if (raw === "en" || raw === "vi" || raw === "zh") return raw;
  return "vi";
}
