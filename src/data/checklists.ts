import type { ChecklistItem } from "@/lib/engine/checklistEngine";

export const DOCUMENT_CHECKLISTS: ChecklistItem[] = [
  // Identity (always required)
  { itemId: "DOC_ID_01", labelVi: "CMND/CCCD còn hiệu lực (bản sao công chứng)", category: "IDENTITY", required: true },
  { itemId: "DOC_ID_02", labelVi: "Sổ hộ khẩu / Giấy xác nhận cư trú", category: "IDENTITY", required: true },
  { itemId: "DOC_ID_03", labelVi: "Giấy đăng ký kết hôn / Xác nhận độc thân", category: "IDENTITY", required: true },

  // Income — payroll
  { itemId: "DOC_INC_01", labelVi: "Sao kê lương 3-6 tháng gần nhất", category: "INCOME", required: true, appliesToIncomeProof: ["PAYROLL_TRANSFER"] },
  { itemId: "DOC_INC_02", labelVi: "Hợp đồng lao động / Quyết định bổ nhiệm", category: "INCOME", required: true, appliesToIncomeProof: ["PAYROLL_TRANSFER", "PAYROLL_CASH"] },
  { itemId: "DOC_INC_03", labelVi: "Bảng lương có xác nhận công ty", category: "INCOME", required: true, appliesToIncomeProof: ["PAYROLL_CASH"] },

  // Income — business
  { itemId: "DOC_INC_04", labelVi: "Giấy phép đăng ký kinh doanh", category: "INCOME", required: true, appliesToIncomeProof: ["BUSINESS_REGISTERED"] },
  { itemId: "DOC_INC_05", labelVi: "Báo cáo tài chính / Tờ khai thuế 6 tháng", category: "INCOME", required: true, appliesToIncomeProof: ["BUSINESS_REGISTERED"] },
  { itemId: "DOC_INC_06", labelVi: "Sổ sách ghi chép doanh thu (hộ kinh doanh)", category: "INCOME", required: false, appliesToIncomeProof: ["BUSINESS_UNREGISTERED"] },

  // Income — rental / freelance
  { itemId: "DOC_INC_07", labelVi: "Hợp đồng cho thuê + sổ hồng tài sản cho thuê", category: "INCOME", required: true, appliesToIncomeProof: ["RENTAL_INCOME"] },
  { itemId: "DOC_INC_08", labelVi: "Hợp đồng dịch vụ / Hóa đơn freelance", category: "INCOME", required: true, appliesToIncomeProof: ["FREELANCE_INVOICE"] },

  // Collateral (home/car loans)
  { itemId: "DOC_COL_01", labelVi: "Sổ hồng / Sổ đỏ tài sản thế chấp", category: "COLLATERAL", required: true, noteVi: "Áp dụng cho vay mua nhà, mua xe" },
  { itemId: "DOC_COL_02", labelVi: "Hợp đồng mua bán / Đặt cọc", category: "COLLATERAL", required: true, noteVi: "Áp dụng cho vay mua nhà, mua xe" },

  // Purpose
  { itemId: "DOC_PUR_01", labelVi: "Phương án kinh doanh (nếu vay kinh doanh)", category: "PURPOSE", required: false, noteVi: "Áp dụng cho vay kinh doanh" },
];
