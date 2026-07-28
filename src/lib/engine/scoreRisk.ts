import type { RiskLevel, RiskResult } from "./types";

const DTI_WEIGHT = 0.7;
const TERM_WEIGHT = 0.3;
const DTI_NORMALIZER = 0.6;
const DTI_COMPONENT_CAP = 1.5;
const TERM_NORMALIZER = 84;
const TERM_COMPONENT_CAP = 1;
const HIGH_THRESHOLD = 0.85;
const MEDIUM_THRESHOLD = 0.5;

/**
 * Weighted risk score: higher DTI and longer term push risk up.
 * Deterministic weighted scoring, no LLM.
 */
export function scoreRisk(dti: number, termMonths: number): RiskResult {
  const dtiComponent = Math.min(dti / DTI_NORMALIZER, DTI_COMPONENT_CAP);
  const termComponent = Math.min(termMonths / TERM_NORMALIZER, TERM_COMPONENT_CAP);
  const score = Math.round((dtiComponent * DTI_WEIGHT + termComponent * TERM_WEIGHT) * 100) / 100;

  let level: RiskLevel = "low";
  if (score > HIGH_THRESHOLD) level = "high";
  else if (score > MEDIUM_THRESHOLD) level = "medium";

  return { score, level };
}
