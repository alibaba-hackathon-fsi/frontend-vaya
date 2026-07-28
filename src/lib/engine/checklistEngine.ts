import type { IncomeProofType } from "./types";

export interface ChecklistItem {
  itemId: string;
  labelVi: string;
  category: "IDENTITY" | "INCOME" | "COLLATERAL" | "PURPOSE" | "OTHER";
  required: boolean;
  appliesToIncomeProof?: IncomeProofType[];
  noteVi?: string;
}

export interface ChecklistResult {
  required: ChecklistItem[];
  optional: ChecklistItem[];
}

/**
 * Filter document checklist based on income proof type.
 * Pure function: returns applicable documents for a given profile.
 */
export function buildChecklist(
  allItems: ChecklistItem[],
  incomeProof: IncomeProofType | null,
): ChecklistResult {
  const required: ChecklistItem[] = [];
  const optional: ChecklistItem[] = [];

  for (const item of allItems) {
    // If item has income proof restrictions, check applicability
    if (item.appliesToIncomeProof && item.appliesToIncomeProof.length > 0) {
      if (incomeProof === null || !item.appliesToIncomeProof.includes(incomeProof)) {
        continue;
      }
    }

    if (item.required) {
      required.push(item);
    } else {
      optional.push(item);
    }
  }

  return { required, optional };
}
