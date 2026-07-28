import type { BaseRateScenario } from "./types";

/** Four base-rate scenarios for payment shock stress testing. */
export const BASE_RATE_SCENARIOS: BaseRateScenario[] = [
  {
    id: "LOW",
    labelVi: "Lãi suất giảm",
    baseRateDeltaBps: -100,
    rationaleVi:
      "Mặt bằng lãi suất cơ sở giảm 1 điểm phần trăm so với hiện tại.",
  },
  {
    id: "BASE",
    labelVi: "Cơ sở hiện tại",
    baseRateDeltaBps: 0,
    rationaleVi: "Giữ nguyên lãi suất cơ sở hiện tại trong dữ liệu sản phẩm.",
  },
  {
    id: "HIGH",
    labelVi: "Lãi suất tăng cao",
    baseRateDeltaBps: 250,
    rationaleVi: "Mặt bằng lãi suất cơ sở tăng 2,5 điểm phần trăm.",
  },
  {
    id: "STRESS",
    labelVi: "Kịch bản căng thẳng",
    baseRateDeltaBps: 450,
    rationaleVi:
      "Mặt bằng lãi suất cơ sở tăng 4,5 điểm phần trăm, mô phỏng giai đoạn căng thẳng thanh khoản.",
  },
];

export function getScenario(id: BaseRateScenario["id"]): BaseRateScenario {
  const scenario = BASE_RATE_SCENARIOS.find((item) => item.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}
