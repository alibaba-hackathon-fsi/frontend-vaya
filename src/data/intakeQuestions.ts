export interface IntakeQuestion {
  questionId: string;
  stage: "CORE" | "DETAIL" | "OPTIONAL";
  field: string;
  promptVi: string;
  promptEn: string;
  promptZh: string;
  inputType: "TEXT" | "NUMBER" | "SELECT";
  options?: { value: string; labelVi: string }[];
  required: boolean;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    questionId: "Q_CORE_01",
    stage: "CORE",
    field: "muc_dich",
    promptVi: "Bạn muốn vay để làm gì?",
    promptEn: "What is the purpose of your loan?",
    promptZh: "您贷款的用途是什么？",
    inputType: "SELECT",
    options: [
      { value: "mua_nha", labelVi: "Mua nhà/đất" },
      { value: "mua_xe", labelVi: "Mua xe" },
      { value: "kinh_doanh", labelVi: "Kinh doanh" },
      { value: "tin_chap", labelVi: "Tiêu dùng (tín chấp)" },
    ],
    required: true,
  },
  {
    questionId: "Q_CORE_02",
    stage: "CORE",
    field: "so_tien",
    promptVi: "Bạn cần vay bao nhiêu tiền?",
    promptEn: "How much do you need to borrow?",
    promptZh: "您需要借多少钱？",
    inputType: "NUMBER",
    required: true,
  },
  {
    questionId: "Q_CORE_03",
    stage: "CORE",
    field: "thu_nhap_hang_thang",
    promptVi: "Thu nhập hàng tháng của bạn (hoặc hộ gia đình) là bao nhiêu?",
    promptEn: "What is your monthly household income?",
    promptZh: "您的家庭月收入是多少？",
    inputType: "NUMBER",
    required: true,
  },
  {
    questionId: "Q_CORE_04",
    stage: "CORE",
    field: "thoi_han_thang",
    promptVi: "Bạn muốn vay trong bao lâu (tháng)?",
    promptEn: "How long do you want to borrow (months)?",
    promptZh: "您想借多长时间（月）？",
    inputType: "NUMBER",
    required: false,
  },
  {
    questionId: "Q_DETAIL_01",
    stage: "DETAIL",
    field: "no_hien_tai_hang_thang",
    promptVi:
      "Bạn có đang trả khoản vay nào khác không? Nếu có, tổng số tiền trả hàng tháng là bao nhiêu?",
    promptEn: "Do you have existing monthly debt payments? If so, how much?",
    promptZh: "您目前有其他贷款要还吗？如果有，每月还款总额是多少？",
    inputType: "NUMBER",
    required: false,
  },
  {
    questionId: "Q_DETAIL_02",
    stage: "DETAIL",
    field: "uu_tien",
    promptVi:
      "Bạn ưu tiên điều gì nhất? (lãi suất thấp, giải ngân nhanh, hạn mức cao, thời hạn dài)",
    promptEn:
      "What matters most to you? (low rate, fast disbursement, high limit, long term)",
    promptZh: "您最看重什么？（低利率、快速放款、高额度、长期限）",
    inputType: "SELECT",
    options: [
      { value: "lai_suat_thap", labelVi: "Lãi suất thấp" },
      { value: "giai_ngan_nhanh", labelVi: "Giải ngân nhanh" },
      { value: "han_muc_cao", labelVi: "Hạn mức cao" },
      { value: "thoi_han_dai", labelVi: "Thời hạn dài" },
    ],
    required: false,
  },
];

/** Get the next unanswered required question given which fields are already filled. */
export function getNextQuestion(
  filledFields: Set<string>,
): IntakeQuestion | null {
  for (const q of INTAKE_QUESTIONS) {
    if (q.required && !filledFields.has(q.field)) {
      return q;
    }
  }
  return null;
}
