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
  reject_invalid_purpose: {
    en: "This loan purpose isn't one we can match yet.",
    vi: "Mục đích vay này hiện chưa được hỗ trợ.",
    zh: "暂不支持此贷款用途。",
  },
  reject_invalid_amount: {
    en: "Please provide the loan amount as a specific figure.",
    vi: "Vui lòng cho biết số tiền vay cụ thể.",
    zh: "请提供具体的贷款金额。",
  },
  reject_amount_too_large: {
    en: "The loan amount is larger than we can support.",
    vi: "Số tiền vay lớn hơn mức chúng tôi có thể hỗ trợ.",
    zh: "贷款金额超出我们可支持的范围。",
  },
  reject_income_too_large: {
    en: "The income figure looks implausibly high.",
    vi: "Mức thu nhập có vẻ cao bất thường.",
    zh: "收入数字似乎高得不切实际。",
  },
  reject_invalid_term: {
    en: "The loan term needs to be between 1 and 360 months.",
    vi: "Thời hạn vay cần từ 1 đến 360 tháng.",
    zh: "贷款期限需在 1 到 360 个月之间。",
  },
  reject_invalid_collateral: {
    en: "The collateral details don't look right — please restate the asset and its value.",
    vi: "Thông tin tài sản đảm bảo chưa hợp lệ — vui lòng nêu lại tài sản và giá trị.",
    zh: "抵押物信息有误 — 请重新说明资产及其价值。",
  },
  reject_invalid_input: {
    en: "I couldn't quite understand the loan details — please rephrase.",
    vi: "Tôi chưa hiểu rõ thông tin khoản vay — vui lòng diễn đạt lại.",
    zh: "我无法完全理解贷款信息 — 请重新表述。",
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
