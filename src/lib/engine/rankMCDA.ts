import type { RankInput, RankedResult } from "./types";

const BASE_WEIGHTS = { w1: 0.5, w2: 0.3, w3: 0.2 };

const DISCRETE_FLAG_ADJUSTMENTS: Record<string, { key: "w1" | "w2" | "w3"; delta: number }> = {
  lai_suat_thap: { key: "w1", delta: 0.2 },
  giai_ngan_nhanh: { key: "w3", delta: 0.2 },
  han_muc_cao: { key: "w3", delta: 0.2 },
  thoi_han_dai: { key: "w3", delta: 0.15 },
  phi_pat_it: { key: "w1", delta: 0.15 },
};

const MIN_RATE = 0.1;
const MIN_RISK = 0.05;
const DEFAULT_HAN_MUC = 5_000_000_000;
const HAN_MUC_NORMALIZER = 10_000_000_000;
const DEFAULT_THOI_HAN_MAX = 240;
const THOI_HAN_NORMALIZER = 360;
const DEFAULT_PHI_PAT = 1.5;

/**
 * MCDA weighted-sum ranking.
 * Supports discrete priority flags and continuous slider weight parameters.
 */
export function rankMCDA(candidates: RankInput[], priorities: string[] = []): RankedResult[] {
  const weights = { ...BASE_WEIGHTS };

  let customRate = -1;
  let customLtv = 0;
  let customTerm = 0;
  let customPenalty = 0;

  for (const p of priorities) {
    if (p.startsWith("weight_interest:")) customRate = parseFloat(p.split(":")[1]);
    else if (p.startsWith("weight_ltv:")) customLtv = parseFloat(p.split(":")[1]);
    else if (p.startsWith("weight_term:")) customTerm = parseFloat(p.split(":")[1]);
    else if (p.startsWith("weight_penalty:")) customPenalty = parseFloat(p.split(":")[1]);
  }

  if (customRate >= 0) {
    const totalCustom = customRate + customLtv + customTerm + customPenalty || 1;
    weights.w1 = (customRate / totalCustom) * 0.7 + 0.1;
    weights.w3 = ((customLtv + customTerm + customPenalty) / totalCustom) * 0.6;
    weights.w2 = 1.0 - weights.w1 - weights.w3;
  } else {
    for (const p of priorities) {
      const adj = DISCRETE_FLAG_ADJUSTMENTS[p];
      if (adj) weights[adj.key] += adj.delta;
    }
    const total = weights.w1 + weights.w2 + weights.w3;
    weights.w1 /= total;
    weights.w2 /= total;
    weights.w3 /= total;
  }

  return candidates
    .map((c) => {
      const rateComponent = 1 / Math.max(c.laiSuat, MIN_RATE);
      const riskComponent = 1 / Math.max(c.riskScore, MIN_RISK);

      let attributeBonus = c.giaiNganNhanh ?? 0.5;
      if (customRate >= 0) {
        const ltvBoost = (c.hanMuc ?? DEFAULT_HAN_MUC) / HAN_MUC_NORMALIZER;
        const termBoost = (c.thoiHanMax ?? DEFAULT_THOI_HAN_MAX) / THOI_HAN_NORMALIZER;
        const penaltyBoost = DEFAULT_PHI_PAT / Math.max(c.phiPat ?? DEFAULT_PHI_PAT, MIN_RATE);

        const attributeWeightSum = customLtv + customTerm + customPenalty || 1;
        attributeBonus =
          (customLtv * ltvBoost + customTerm * termBoost + customPenalty * penaltyBoost) /
          attributeWeightSum;
      }

      const score = weights.w1 * rateComponent + weights.w2 * riskComponent + weights.w3 * attributeBonus;
      return {
        ...c,
        score: Math.round(score * 1000) / 1000,
        breakdown: {
          lai_suat_thap: Math.round(weights.w1 * rateComponent * 1000) / 1000,
          giai_ngan_nhanh: Math.round(weights.w3 * attributeBonus * 1000) / 1000,
          do_an_toan: Math.round(weights.w2 * riskComponent * 1000) / 1000,
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}
