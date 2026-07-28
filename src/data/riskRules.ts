export interface RiskRule {
  ruleId: string;
  category: "DTI" | "DATA" | "TERM" | "AGE" | "INCOME";
  labelVi: string;
  descriptionVi: string;
  threshold: number;
  severity: "WARNING" | "REJECT";
}

export const RISK_RULES: RiskRule[] = [
  {
    ruleId: "RR_DTI_01",
    category: "DTI",
    labelVi: "DTI vượt ngưỡng an toàn",
    descriptionVi: "Tỷ lệ nợ/thu nhập (DTI) vượt 60%. Khách hàng có nguy cơ quá tải tài chính.",
    threshold: 0.6,
    severity: "REJECT",
  },
  {
    ruleId: "RR_DTI_02",
    category: "DTI",
    labelVi: "DTI ở mức cảnh báo",
    descriptionVi: "DTI từ 50-60%. Cần thận trọng và xem xét giảm số tiền vay hoặc kéo dài kỳ hạn.",
    threshold: 0.5,
    severity: "WARNING",
  },
  {
    ruleId: "RR_DTI_03",
    category: "DTI",
    labelVi: "DTI đỉnh trong mô phỏng vượt 75%",
    descriptionVi: "Trong kịch bản lãi suất tăng, DTI đỉnh vượt 75%. Rủi ro mất khả năng thanh toán cao.",
    threshold: 0.75,
    severity: "REJECT",
  },
  {
    ruleId: "RR_DATA_01",
    category: "DATA",
    labelVi: "Thiếu dữ liệu thu nhập",
    descriptionVi: "Không có thông tin thu nhập hàng tháng. Không thể đánh giá khả năng trả nợ.",
    threshold: 0,
    severity: "WARNING",
  },
  {
    ruleId: "RR_TERM_01",
    category: "TERM",
    labelVi: "Kỳ hạn vay quá dài so với tuổi",
    descriptionVi: "Kỳ hạn vay kéo dài quá tuổi nghỉ hưu (65). Rủi ro thu nhập giảm sau nghỉ hưu.",
    threshold: 65,
    severity: "WARNING",
  },
  {
    ruleId: "RR_AGE_01",
    category: "AGE",
    labelVi: "Tuổi dưới mức tối thiểu",
    descriptionVi: "Khách hàng chưa đủ 18 tuổi, không đủ điều kiện pháp lý để vay.",
    threshold: 18,
    severity: "REJECT",
  },
  {
    ruleId: "RR_INCOME_01",
    category: "INCOME",
    labelVi: "Thu nhập dưới mức tối thiểu",
    descriptionVi: "Thu nhập hàng tháng thấp hơn yêu cầu tối thiểu của sản phẩm vay.",
    threshold: 0,
    severity: "REJECT",
  },
];
