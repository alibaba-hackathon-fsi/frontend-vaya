import type { LoanProfile } from "./types";

export interface AdvisoryScenario {
  scenarioId: string;
  labelVi: string;
  descriptionVi: string;
  mucDich: LoanProfile["muc_dich"];
  amountRangeVnd: { min: number; max: number };
  incomeRangeVnd: { min: number; max: number } | null;
  recommendedTermMonths: { min: number; max: number };
  riskNoteVi: string;
}

export interface ScenarioMatch {
  scenario: AdvisoryScenario;
  relevanceScore: number;
}

/**
 * Match user profile to advisory scenarios.
 * Pure function: scores each scenario by how well it fits the profile.
 */
export function matchScenarios(
  profile: LoanProfile,
  scenarios: AdvisoryScenario[],
): ScenarioMatch[] {
  const matches: ScenarioMatch[] = [];

  for (const scenario of scenarios) {
    if (scenario.mucDich !== profile.muc_dich) continue;

    let relevanceScore = 0;

    // Amount fit
    const { min, max } = scenario.amountRangeVnd;
    if (profile.so_tien >= min && profile.so_tien <= max) {
      relevanceScore += 0.5;
    } else if (profile.so_tien < min) {
      relevanceScore += 0.2;
    }

    // Income fit
    if (scenario.incomeRangeVnd && profile.thu_nhap_hang_thang != null) {
      const { min: incMin, max: incMax } = scenario.incomeRangeVnd;
      if (profile.thu_nhap_hang_thang >= incMin && profile.thu_nhap_hang_thang <= incMax) {
        relevanceScore += 0.3;
      }
    } else {
      relevanceScore += 0.15;
    }

    // Term fit
    if (profile.thoi_han_thang != null) {
      const { min: tMin, max: tMax } = scenario.recommendedTermMonths;
      if (profile.thoi_han_thang >= tMin && profile.thoi_han_thang <= tMax) {
        relevanceScore += 0.2;
      }
    } else {
      relevanceScore += 0.1;
    }

    if (relevanceScore > 0) {
      matches.push({ scenario, relevanceScore: Math.round(relevanceScore * 100) / 100 });
    }
  }

  return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
