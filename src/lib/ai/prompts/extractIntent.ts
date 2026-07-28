export const EXTRACT_INTENT_SYSTEM_PROMPT = `You extract structured loan intent from a customer's message.
Only fill in fields the customer actually stated. Never guess or invent a plausible-looking number
for an unstated field — leave it null. Call the extract_loan_intent function with your result.`;

export const EXTRACT_INTENT_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_loan_intent",
    description: "Extract structured loan intent from the customer message. Leave unstated fields null — never guess.",
    parameters: {
      type: "object",
      properties: {
        muc_dich: { type: "string", enum: ["mua_xe", "mua_nha", "kinh_doanh", "tin_chap"] },
        so_tien: { type: "number" },
        thoi_han_thang: { type: ["number", "null"] },
        thu_nhap_hang_thang: { type: ["number", "null"] },
        no_hien_tai_hang_thang: { type: ["number", "null"] },
        uu_tien: {
          type: "array",
          items: { type: "string", enum: ["lai_suat_thap", "giai_ngan_nhanh", "han_muc_cao", "thoi_han_dai"] },
        },
      },
      required: ["muc_dich", "so_tien"],
    },
  },
};
