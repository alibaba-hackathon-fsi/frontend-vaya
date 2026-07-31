import type { Lang } from "@/i18n/dict";

// ---------------------------------------------------------------------------
// DOC_TEXT — checklist document labels/notes, keyed by itemId
// ---------------------------------------------------------------------------

/** Checklist document labels/notes, keyed by itemId. */
export const DOC_TEXT: Record<
  string,
  { label: { en: string; zh: string }; note?: { en: string; zh: string } }
> = {
  DOC_ID_01: {
    label: {
      en: "Valid national ID / citizen ID (notarised copy)",
      zh: "有效身份证/公民身份证（公证复印件）",
    },
  },
  DOC_ID_02: {
    label: {
      en: "Household registration / residence certificate",
      zh: "户口本/居住证明",
    },
  },
  DOC_ID_03: {
    label: {
      en: "Marriage certificate / certificate of single status",
      zh: "结婚证/单身证明",
    },
  },
  DOC_INC_01: {
    label: {
      en: "Last 3–6 months of salary statements",
      zh: "近3–6个月工资流水",
    },
  },
  DOC_INC_02: {
    label: {
      en: "Employment contract / letter of appointment",
      zh: "劳动合同/任命书",
    },
  },
  DOC_INC_03: {
    label: {
      en: "Company-certified payslip",
      zh: "公司盖章工资单",
    },
  },
  DOC_INC_04: {
    label: {
      en: "Business registration certificate",
      zh: "营业执照",
    },
  },
  DOC_INC_05: {
    label: {
      en: "Financial statements / tax returns (last 6 months)",
      zh: "财务报表/纳税申报表（近6个月）",
    },
  },
  DOC_INC_06: {
    label: {
      en: "Revenue logbook (sole trader / household business)",
      zh: "收入账簿（个体户/家庭经营）",
    },
  },
  DOC_INC_07: {
    label: {
      en: "Lease agreement + land-use right certificate for rental property",
      zh: "租赁合同＋出租房产产权证",
    },
  },
  DOC_INC_08: {
    label: {
      en: "Service agreement / freelance invoice",
      zh: "服务合同/自由职业发票",
    },
  },
  DOC_COL_01: {
    label: {
      en: "Land-use right certificate for the collateral (pink/red book)",
      zh: "抵押物产权证（粉证/红证）",
    },
    note: {
      en: "Applicable for home and vehicle loans",
      zh: "适用于住房贷款及汽车贷款",
    },
  },
  DOC_COL_02: {
    label: {
      en: "Sale and purchase agreement / deposit contract",
      zh: "买卖合同/定金合同",
    },
    note: {
      en: "Applicable for home and vehicle loans",
      zh: "适用于住房贷款及汽车贷款",
    },
  },
  DOC_PUR_01: {
    label: {
      en: "Business plan (for business loans)",
      zh: "商业计划书（适用于经营贷款）",
    },
    note: {
      en: "Applicable for business loans",
      zh: "适用于经营贷款",
    },
  },
};

// ---------------------------------------------------------------------------
// SHOCK_TEXT — stress-test shock definitions, keyed by shock id
// ---------------------------------------------------------------------------

/** Stress-test shock definitions, keyed by shock id. */
export const SHOCK_TEXT: Record<
  string,
  { label: { en: string; zh: string }; desc: { en: string; zh: string } }
> = {
  NONE: {
    label: {
      en: "Base scenario (no stress event)",
      zh: "基准情景（无冲击）",
    },
    desc: {
      en: "Normal cash flow based on assumed income and inflation.",
      zh: "按假定收入及通胀正常运行的现金流。",
    },
  },
  JOB_LOSS_3M: {
    label: {
      en: "Job loss — 3 months",
      zh: "失业3个月",
    },
    desc: {
      en: "Income temporarily drops to zero for 3 consecutive months from the cliff month, then recovers.",
      zh: "从压力节点起连续3个月收入降至零，之后恢复。",
    },
  },
  INCOME_DROP_30: {
    label: {
      en: "Permanent 30% income reduction",
      zh: "收入永久性下降30%",
    },
    desc: {
      en: "Income is cut by 30% from the cliff month onward due to sector downturn or job change.",
      zh: "因行业下行或工作变动，从压力节点起收入永久削减30%。",
    },
  },
  NEW_CHILD: {
    label: {
      en: "New child / increased living costs",
      zh: "新增子女/生活费用增加",
    },
    // {cost} is filled from the Vietnamese original at runtime, so the figure
    // stays correct if NEW_CHILD_EXTRA_COST_VND is ever changed in shocks.ts.
    desc: {
      en: "Living costs increase by a fixed {cost}/month from the cliff month onward.",
      zh: "从压力节点起，每月生活支出固定增加 {cost}。",
    },
  },
};

// ---------------------------------------------------------------------------
// SCENARIO_TEXT — base-rate scenarios, keyed by scenario id
// ---------------------------------------------------------------------------

/** Base-rate scenarios, keyed by scenario id. */
export const SCENARIO_TEXT: Record<string, { en: string; zh: string }> = {
  LOW: {
    en: "Rate decrease",
    zh: "利率下降",
  },
  BASE: {
    en: "Current base rate",
    zh: "当前基准利率",
  },
  HIGH: {
    en: "Rate increase",
    zh: "利率上升",
  },
  STRESS: {
    en: "Stress scenario",
    zh: "压力情景",
  },
};

// ---------------------------------------------------------------------------
// CLIFF_CAUSE_TEXT — payment-cliff causes, keyed by exact Vietnamese phrase
// ---------------------------------------------------------------------------

/** Payment-cliff causes, keyed by the exact Vietnamese phrase the engine emits. */
export const CLIFF_CAUSE_TEXT: Record<string, { en: string; zh: string }> = {
  "Hết hỗ trợ lãi suất từ chủ đầu tư": {
    en: "Developer interest-rate subsidy expired",
    zh: "开发商利率补贴到期",
  },
  "Hết ân hạn nợ gốc": {
    en: "Principal grace period ended",
    zh: "本金宽限期结束",
  },
  "Hết lãi suất ưu đãi": {
    en: "Promotional rate expired",
    zh: "优惠利率到期",
  },
  "Các sự kiện xảy ra cùng lúc": {
    en: "Multiple events coinciding",
    zh: "多项事件同时发生",
  },
  "Tăng lãi suất định kỳ hoặc điều chỉnh kỳ hạn": {
    en: "Periodic rate reset or term adjustment",
    zh: "定期利率重置或期限调整",
  },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Return the label for a checklist document in the requested language. */
export function docLabel(itemId: string, vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  return DOC_TEXT[itemId]?.label[lang] ?? vi;
}

/** Return the note for a checklist document in the requested language. */
export function docNote(itemId: string, vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  return DOC_TEXT[itemId]?.note?.[lang] ?? vi;
}

/** Return the label for a stress-test shock in the requested language. */
export function shockLabel(id: string, vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  return SHOCK_TEXT[id]?.label[lang] ?? vi;
}

/** Return the description for a stress-test shock in the requested language. */
export function shockDesc(id: string, vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  const out = SHOCK_TEXT[id]?.desc[lang];
  if (!out) return vi;
  if (!out.includes("{cost}")) return out;
  // Reuse the amount the engine already formatted rather than duplicating the
  // constant here, so the two can never drift apart.
  const amount = vi.match(/[\d.,]+\s*(?:đ|₫|VND)/i)?.[0]?.trim();
  return out.replace("{cost}", amount || "—");
}

/** Return the label for a base-rate scenario in the requested language. */
export function scenarioLabel(id: string, vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  return SCENARIO_TEXT[id]?.[lang] ?? vi;
}

/** Return the translation for a payment-cliff cause string in the requested language. */
export function cliffCause(vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  return CLIFF_CAUSE_TEXT[vi]?.[lang] ?? vi;
}

// ---------------------------------------------------------------------------
// Sentence templates
//
// survivability.ts and improvements.ts compose finished Vietnamese sentences
// with numbers already interpolated, and they do not expose every figure on the
// result object (trial scores in particular live only inside the string). So
// rather than duplicating the engine's maths here, each known template is
// matched once and re-emitted in the target language with the captured values
// reused verbatim.
//
// This is a shim over a backend that only speaks Vietnamese. The clean fix is
// for the engine to return a code plus params instead of prose — worth raising
// with whoever owns lib/engine. Until then: unknown sentences fall through
// untouched, so a new template degrades to Vietnamese rather than breaking.
// ---------------------------------------------------------------------------

type Template = { re: RegExp; en: string; zh: string };

const WARNINGS: Template[] = [
  {
    re: /^Từ tháng (\d+), khoản trả tăng từ (.+?) lên (.+?)\. Quỹ dự phòng (.+?) của bạn sẽ cạn ở tháng (\d+) trong kịch bản căng thẳng\.$/,
    en: "From month $1 the payment rises from $2 to $3. Your $4 buffer runs out in month $5 under the stress scenario.",
    zh: "自第 $1 个月起，月供从 $2 升至 $3。在压力情景下，您 $4 的应急金将在第 $5 个月耗尽。",
  },
  {
    re: /^Từ tháng (\d+), khoản trả tăng vọt từ (.+?) lên (.+?) \((.+?)\)\.$/,
    en: "From month $1 the payment jumps from $2 to $3 ($4).",
    zh: "自第 $1 个月起，月供从 $2 骤升至 $3（$4）。",
  },
  {
    re: /^Điểm sống sót đạt (\d+)\/16 \((.+?)\)\. Hộ gia đình có nguy cơ mất khả năng thanh toán khi gặp cú sốc thu nhập hoặc lãi suất tăng cao\.$/,
    en: "Survivability scores $1/16 ($2). The household risks defaulting if income drops or rates climb.",
    zh: "生存评分为 $1/16（$2）。一旦收入下滑或利率上行，该家庭有断供风险。",
  },
];

const IMPROVEMENTS: Template[] = [
  {
    re: /^Kéo dài kỳ hạn từ (\d+) lên (\d+) năm: điểm sống sót (\d+)\/16 -> (\d+)\/16\..*$/,
    en: "Stretch the term from $1 to $2 years: survivability $3/16 → $4/16. The monthly payment drops, but total interest over the life of the loan goes up.",
    zh: "将期限从 $1 年延长至 $2 年：生存评分 $3/16 → $4/16。月供下降，但整个贷款期的利息总额会上升。",
  },
  {
    re: /^Giảm 10% số tiền vay \((.+?)\): điểm sống sót (\d+)\/16 -> (\d+)\/16\..*$/,
    en: "Borrow 10% less ($1): survivability $2/16 → $3/16. Monthly pressure eases, but you need more cash up front.",
    zh: "少借 10%（$1）：生存评分 $2/16 → $3/16。月供压力减轻，但需要更多自有首付资金。",
  },
  {
    re: /^Tăng quỹ dự phòng lên 6 tháng chi phí sinh hoạt \((.+?)\): điểm sống sót (\d+)\/16 -> (\d+)\/16\..*$/,
    en: "Build the buffer to 6 months of living costs ($1): survivability $2/16 → $3/16. Far more shock-resistant, but it takes time to save.",
    zh: "将应急金提高到 6 个月生活开支（$1）：生存评分 $2/16 → $3/16。抗冲击能力大幅提升，但需要时间积累。",
  },
];

function applyTemplates(list: Template[], vi: string, lang: Lang): string {
  for (const tpl of list) {
    const m = vi.match(tpl.re);
    if (m) {
      return (lang === "zh" ? tpl.zh : tpl.en).replace(/\$(\d)/g, (_, d) => m[Number(d)] ?? "");
    }
  }
  return vi;
}

/** Translate a survivability warning. Cause lists inside it are translated too. */
export function engineWarning(vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  const translated = vi.replace(/\(([^()]+)\)\.$/, (whole, inner: string) => {
    const parts = inner.split(", ");
    const mapped = parts.map((p) => CLIFF_CAUSE_TEXT[p]?.[lang] ?? p);
    return parts.every((p, i) => p === mapped[i]) ? whole : "(" + mapped.join(", ") + ").";
  });
  return applyTemplates(WARNINGS, translated, lang);
}

/** Translate an improvement suggestion. */
export function engineImprovement(vi: string, lang: Lang): string {
  if (lang === "vi") return vi;
  return applyTemplates(IMPROVEMENTS, vi, lang);
}
