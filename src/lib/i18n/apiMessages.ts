export type ApiLang = "en" | "vi" | "zh";

const MESSAGES = {
  llm_error: {
    en: "I had trouble processing that — could you rephrase or provide more details?",
    vi: "Tôi gặp khó khăn khi xử lý yêu cầu — bạn có thể diễn đạt lại hoặc cung cấp thêm thông tin không?",
    zh: "处理您的请求时遇到问题 — 您能重新表述或提供更多细节吗？",
  },
  policy_intro: {
    en: "Here is what I found in the policies:",
    vi: "Đây là thông tin tôi tìm được từ chính sách:",
    zh: "以下是我从政策中找到的信息：",
  },
  out_of_scope: {
    en: "I'm sorry, but I can only help with realistic Vietnamese loan scenarios. Please adjust your request.",
    vi: "Xin lỗi, tôi chỉ có thể hỗ trợ các kịch bản vay thực tế tại Việt Nam. Vui lòng điều chỉnh yêu cầu của bạn.",
    zh: "抱歉，我只能帮助处理越南实际贷款场景。请调整您的请求。",
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
    en: "Almost there! I just need a couple more details to crunch the numbers:",
    vi: "Gần xong rồi! Tôi chỉ cần thêm vài thông tin để tính toán chính xác:",
    zh: "快好了！我只需要再补充一些信息来计算准确数字：",
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
  rate_limited: {
    en: "You're sending messages too quickly. Please wait a moment and try again.",
    vi: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi một lát rồi thử lại.",
    zh: "您发送消息太快了。请稍等片刻，然后重试。",
  },
  injection_blocked: {
    en: "I can only help with loan-related questions. Please rephrase your request.",
    vi: "Tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến khoản vay. Vui lòng diễn đạt lại yêu cầu của bạn.",
    zh: "我只能帮助回答与贷款相关的问题。请重新表述您的请求。",
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
