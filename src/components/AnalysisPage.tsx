"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { computeSurvivability } from "@/lib/engine/survivability";
import { getAllProducts } from "@/data/products";
import { SHOCK_DEFINITIONS } from "@/lib/engine/shocks";
import { BASE_RATE_SCENARIOS } from "@/lib/engine/scenarios";
import type {
  AmortizationMethod,
  GraceConfig,
  HouseholdInput,
  SurvivabilityReport,
} from "@/lib/engine/types";

const NUM = (s: string) => {
  const x = parseFloat((s || "").replace(/[^\d.]/g, ""));
  return isNaN(x) ? 0 : x;
};

const TIER_CLASS: Record<string, string> = {
  ROBUST: "good",
  ACCEPTABLE: "ok",
  FRAGILE: "risk",
  CRITICAL: "risk",
};

const STATUS_ICON: Record<string, string> = {
  SAFE: "✓",
  TIGHT: "⚠",
  FAIL: "✕",
};

export default function AnalysisPage() {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();

  const products = getAllProducts();
  const product = products[0];

  const [f, setF] = useState({
    amount: sp.get("amount") || "2000000000",
    term: sp.get("term") || "240",
    income: "45000000",
    expenses: "18000000",
    otherDebt: "4000000",
    savings: "150000000",
    devSubsidy: "0",
    principalGrace: "0",
    method: "ANNUITY" as AmortizationMethod,
  });
  const [report, setReport] = useState<SurvivabilityReport | null>(null);
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));

  const run = () => {
    if (!product) return;
    const promoTier = product.promoTiers[0];
    const household: HouseholdInput = {
      initialSavingsVnd: NUM(f.savings),
      baseMonthlyIncomeVnd: NUM(f.income),
      baseMonthlyLivingCostVnd: NUM(f.expenses),
      otherMonthlyDebtVnd: NUM(f.otherDebt),
    };
    const grace: GraceConfig = {
      developerSubsidyMonths: Math.round(NUM(f.devSubsidy)),
      principalGraceMonths: Math.round(NUM(f.principalGrace)),
    };
    try {
      const result = computeSurvivability({
        product,
        promoTier,
        loanAmount: Math.round(NUM(f.amount)),
        termMonths: Math.round(NUM(f.term)),
        grace,
        household,
        method: f.method,
      });
      setReport(result);
    } catch {
      setReport(null);
    }
  };

  const numField = (label: string, key: keyof typeof f, step: number) => (
    <label className="fq">
      <span>{t(label)}</span>
      <input
        type="text"
        inputMode="numeric"
        value={f[key]}
        onChange={(e) => set(key, e.target.value.replace(/[^\d]/g, ""))}
      />
    </label>
  );

  return (
    <section className="pageview on">
      <div className="wrap">
        <div className="surv-hero">
          <span className="sec-tag">{t("ana_tag")}</span>
          <h2>{t("ana_title")}</h2>
          <p>{t("ana_sub")}</p>
        </div>

        <div className="surv-grid">
          <form className="surv-form" onSubmit={(e) => e.preventDefault()}>
            <div className="fgroup">
              <div className="glab">{t("g_loan")}</div>
              {numField("q_amount", "amount", 10000000)}
              {numField("q_term", "term", 6)}
              <label className="fq">
                <span>{t("ana_method")}</span>
                <select
                  value={f.method}
                  onChange={(e) => set("method", e.target.value)}
                >
                  <option value="ANNUITY">{t("ana_annuity")}</option>
                  <option value="EQUAL_PRINCIPAL">
                    {t("ana_equal_principal")}
                  </option>
                </select>
              </label>
            </div>
            <div className="fgroup">
              <div className="glab">{t("g_income")}</div>
              {numField("q_income", "income", 1000000)}
              {numField("q_expenses", "expenses", 1000000)}
              {numField("q_debt", "otherDebt", 1000000)}
            </div>
            <div className="fgroup">
              <div className="glab">{t("g_buffer")}</div>
              {numField("q_savings", "savings", 10000000)}
            </div>
            <div className="fgroup">
              <div className="glab">{t("ana_grace")}</div>
              {numField("ana_dev_subsidy", "devSubsidy", 1)}
              {numField("ana_principal_grace", "principalGrace", 1)}
            </div>
            <button
              type="button"
              className="btn btn-green surv-gen"
              onClick={run}
            >
              {t("ana_run")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push("/chat")}
              style={{ marginTop: 8 }}
            >
              {t("chk_back_chat")}
            </button>
          </form>

          <div className="surv-result">
            {report ? (
              <AnalysisResult report={report} t={t} />
            ) : (
              <div className="surv-empty">{t("ana_empty")}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalysisResult({
  report,
  t,
}: {
  report: SurvivabilityReport;
  t: (k: string) => string;
}) {
  const vclass = TIER_CLASS[report.tier] || "risk";

  const gridRows = useMemo(() => {
    const rows: { scenario: string; cells: typeof report.grid }[] = [];
    for (const sc of BASE_RATE_SCENARIOS) {
      rows.push({
        scenario: sc.labelVi,
        cells: report.grid.filter((c) => c.rateScenarioId === sc.id),
      });
    }
    return rows;
  }, [report]);

  return (
    <>
      <div className={"score-head sc-" + vclass}>
        <div className="score-num">{report.scoreLabel}</div>
        <div className="score-meta">
          <div className="score-lab">{t("ana_score")}</div>
          <div className="score-verdict">{report.tier}</div>
        </div>
      </div>

      {/* 4x4 Grid */}
      <div className="rc-clab">{t("ana_grid")}</div>
      <div className="ana-grid-wrap">
        <table className="ana-grid">
          <thead>
            <tr>
              <th></th>
              {Object.values(SHOCK_DEFINITIONS).map((s) => (
                <th key={s.id} title={s.descriptionVi}>
                  {s.labelVi.split(" ").slice(0, 3).join(" ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridRows.map((row) => (
              <tr key={row.scenario}>
                <td className="ana-row-lab">{row.scenario}</td>
                {row.cells.map((cell) => (
                  <td
                    key={cell.shockId}
                    className={"ana-cell st-" + cell.status.toLowerCase()}
                  >
                    <span className="ana-icon">{STATUS_ICON[cell.status]}</span>
                    {cell.runwayMonth !== null && (
                      <small>↓{cell.runwayMonth}m</small>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cliff event */}
      {report.primaryCliff && (
        <>
          <div className="rc-clab">{t("ana_cliff")}</div>
          <div className="ana-cliff">
            <span className="ana-cliff-month">
              {t("ana_month")} {report.primaryCliff.month}
            </span>
            <span className="ana-cliff-delta">
              +{(report.primaryCliff.deltaVnd / 1_000_000).toFixed(1)}M VND/mo
            </span>
            <div className="ana-cliff-causes">
              {report.primaryCliff.causesVi.map((c, i) => (
                <span key={i} className="pill">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Warnings */}
      {report.warningsVi.length > 0 && (
        <>
          <div className="rc-clab">{t("ana_warnings")}</div>
          <div className="ana-warnings">
            {report.warningsVi.map((w, i) => (
              <p key={i} className="ana-warn">
                ⚠ {w}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Improvements */}
      {report.improvementsVi.length > 0 && (
        <>
          <div className="rc-clab">{t("ana_improvements")}</div>
          <div className="ana-improve">
            {report.improvementsVi.map((s, i) => (
              <p key={i} className="ana-sug">
                💡 {s}
              </p>
            ))}
          </div>
        </>
      )}

      <div className="foot">{t("ana_foot")}</div>
    </>
  );
}
