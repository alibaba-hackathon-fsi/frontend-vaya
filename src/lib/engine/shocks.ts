import type { ShockDefinition, ShockId } from "./types";

const NEW_CHILD_EXTRA_COST_VND = 8_000_000;
const INCOME_DROP_FACTOR = 0.7;
const JOB_LOSS_DURATION_MONTHS = 3;

export const SHOCK_DEFINITIONS: Record<ShockId, ShockDefinition> = {
  NONE: {
    id: "NONE",
    labelVi: "Kịch bản chuẩn (Không cú sốc)",
    descriptionVi:
      "Dòng tiền sinh hoạt bình thường theo thu nhập và lạm phát giả định.",
  },
  JOB_LOSS_3M: {
    id: "JOB_LOSS_3M",
    labelVi: "Mất việc làm 3 tháng",
    descriptionVi:
      "Thu nhập tạm thời sụt giảm về 0đ trong 3 tháng liên tiếp kể từ thời điểm vách đá, sau đó hồi phục.",
    incomeOverride: (m, base, onsetMonth) => {
      if (m >= onsetMonth && m <= onsetMonth + JOB_LOSS_DURATION_MONTHS - 1) {
        return 0;
      }
      return base;
    },
  },
  INCOME_DROP_30: {
    id: "INCOME_DROP_30",
    labelVi: "Giảm 30% thu nhập vĩnh viễn",
    descriptionVi:
      "Thu nhập bị cắt giảm 30% kể từ thời điểm vách đá do suy thoái ngành hoặc biến động công việc.",
    incomeOverride: (m, base, onsetMonth) => {
      if (m >= onsetMonth) {
        return Math.round(base * INCOME_DROP_FACTOR);
      }
      return base;
    },
  },
  NEW_CHILD: {
    id: "NEW_CHILD",
    labelVi: "Sinh thêm con / Chi phí tăng",
    descriptionVi: `Chi phí sinh hoạt tăng thêm ${NEW_CHILD_EXTRA_COST_VND.toLocaleString("vi-VN")}đ/tháng cố định kể từ mốc vách đá.`,
    costOverride: (
      m,
      base,
      onsetMonth,
      extraCostVnd = NEW_CHILD_EXTRA_COST_VND,
    ) => {
      if (m >= onsetMonth) {
        return base + extraCostVnd;
      }
      return base;
    },
  },
};
