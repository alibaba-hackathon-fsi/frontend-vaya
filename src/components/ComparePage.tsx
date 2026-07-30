"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, bankOf, purpName, prodName, logoSrc, type LoanPackage } from "@/data/banks";
import { fmtVND, fmtMonthly, termLabel, monthly } from "@/lib/loanEngine";
import { useCompare } from "@/lib/CompareContext";
import Sparkline from "@/components/charts/Sparkline";

const DIGITS = (s: string) => (s || "").replace(/\D/g, "");
const GROUPED = (s: string) => {
  const d = DIGITS(s);
  return d ? Number(d).toLocaleString("en-US") : "";
};
const NUM = (s: string) => {
  const x = parseFloat((s || "").replace(/[^\d.]/g, ""));
  return isNaN(x) ? 0 : x;
};

/** Total interest = monthly * n - principal. */
function totalInterest(P: number, annual: number, n: number): number {
  return monthly(P, annual, n) * n - P;
}

/** Parse speed string to a rough hour count for comparison. Lower = faster. */
function speedHours(speed: string): number {
  const lower = speed.toLowerCase();
  if (lower.includes("8h")) return 8;
  if (lower.includes("4h")) return 4;
  if (lower.includes("1 day") || lower.includes("1 ngày") || lower.includes("1 天")) return 24;
  if (lower.includes("1–3") || lower.includes("1-3")) return 48;
  if (lower.includes("3–5") || lower.includes("3-5")) return 96;
  if (lower.includes("5–7") || lower.includes("5-7")) return 144;
  if (lower.includes("within")) return 8;
  return 72;
}

type ComputedItem = {
  idx: number;
  pkg: LoanPackage;
  effAmt: number;
  effTerm: number;
  overAmt: boolean;
  overTerm: boolean;
  mo: number;
  totalInt: number;
  totalPaid: number;
};

type RowDef = {
  key: string;
  labelKey: string;
  section: "cost" | "limits";
  render: (p: LoanPackage, effAmt: number, effTerm: number, ci?: ComputedItem) => React.ReactNode;
  /** Higher = better, lower = better, or null for no winner. */
  dir: "lower" | "higher" | "faster" | null;
  value: (p: LoanPackage, effAmt: number, effTerm: number, ci?: ComputedItem) => number | null;
};

export default function ComparePage() {
  const router = useRouter();
  const { lang, t } = useI18n();
  const { selected, remove, clear } = useCompare();

  // User's scenario inputs (default 2B VND, 24 months).
  const [amount, setAmount] = useState("2000000000");
  const [term, setTerm] = useState("24");

  const packages = useMemo(
    () => selected.map((idx) => ({ idx, pkg: PKG[idx] })).filter((x) => x.pkg),
    [selected]
  );

  // For each package: clamp amount and term to its limits for calculations.
  const computed = useMemo(() => {
    return packages.map(({ idx, pkg }) => {
      const rawAmt = NUM(amount);
      const rawTerm = NUM(term);
      const effAmt = Math.min(rawAmt, pkg.max);
      const effTerm = Math.min(rawTerm, pkg.term);
      const overAmt = rawAmt > pkg.max;
      const overTerm = rawTerm > pkg.term;
      const mo = effAmt > 0 && effTerm > 0 ? monthly(effAmt, pkg.std, effTerm) : 0;
      const totalInt = effAmt > 0 && effTerm > 0 ? totalInterest(effAmt, pkg.std, effTerm) : 0;
      const totalPaid = effAmt + totalInt;
      return { idx, pkg, effAmt, effTerm, overAmt, overTerm, mo, totalInt, totalPaid };
    });
  }, [packages, amount, term]);

  // Row definitions.
  const rows: RowDef[] = [
    {
      key: "promo_rate",
      labelKey: "cmp_row_promo_rate",
      section: "cost",
      dir: "lower",
      value: (p) => p.rate,
      render: (p) => (
        <span>
          {p.rate}%
          {p.promoM ? <small style={{ color: "var(--muted)", fontWeight: 600 }}> → {p.std}%</small> : null}
        </span>
      ),
    },
    {
      key: "std_rate",
      labelKey: "cmp_row_std_rate",
      section: "cost",
      dir: "lower",
      value: (p) => p.std,
      render: (p) => <span>{p.std}%</span>,
    },
    {
      key: "monthly",
      labelKey: "cmp_row_monthly",
      section: "cost",
      dir: "lower",
      value: (_p, _ea, _et, ci) => ci?.mo ?? null,
      render: (_p, _ea, _et, ci) => <span>{ci ? fmtMonthly(ci.mo) : "—"}</span>,
    },
    {
      key: "total_interest",
      labelKey: "cmp_row_total_interest",
      section: "cost",
      dir: "lower",
      value: (_p, _ea, _et, ci) => ci?.totalInt ?? null,
      render: (_p, _ea, _et, ci) => <span>{ci ? fmtMonthly(ci.totalInt) : "—"}</span>,
    },
    {
      key: "total_paid",
      labelKey: "cmp_row_total_paid",
      section: "cost",
      dir: "lower",
      value: (_p, _ea, _et, ci) => ci?.totalPaid ?? null,
      render: (_p, _ea, _et, ci) => <span>{ci ? fmtMonthly(ci.totalPaid) : "—"}</span>,
    },
    {
      key: "max_amount",
      labelKey: "cmp_row_max_amount",
      section: "limits",
      dir: "higher",
      value: (p) => p.max,
      render: (p) => <span>{fmtVND(p.max, lang)}</span>,
    },
    {
      key: "max_term",
      labelKey: "cmp_row_max_term",
      section: "limits",
      dir: "higher",
      value: (p) => p.term,
      render: (p) => <span>{termLabel(p.term, t)}</span>,
    },
    {
      key: "ltv",
      labelKey: "cmp_row_ltv",
      section: "limits",
      dir: "higher",
      value: (p) => p.ltv || null,
      render: (p) => <span>{p.ltv ? p.ltv + "%" : "—"}</span>,
    },
    {
      key: "speed",
      labelKey: "cmp_row_speed",
      section: "limits",
      dir: "faster",
      value: (p) => speedHours(p.speed.en),
      render: (p) => <span>{p.speed[lang] || p.speed.en}</span>,
    },
    {
      key: "purpose",
      labelKey: "cmp_row_purpose",
      section: "limits",
      dir: null,
      value: () => null,
      render: (p) => <span className="pill">{purpName(p.purpose, lang)}</span>,
    },
  ];

  // Find the best-in-row index for each row.
  const bestIdx = useMemo(() => {
    return rows.map((row) => {
      if (!row.dir) return -1;
      const vals = computed.map((ci) => {
        // Pass computed item to value function via the 4th arg hack.
        return (row.value as (p: LoanPackage, ea: number, et: number, ci?: typeof computed[0]) => number | null)(
          ci.pkg, ci.effAmt, ci.effTerm, ci
        );
      });
      const valid = vals.map((v, i) => ({ v, i })).filter((x) => x.v !== null);
      if (valid.length < 2) return -1;
      if (row.dir === "lower") {
        const minV = Math.min(...valid.map((x) => x.v!));
        const winners = valid.filter((x) => x.v === minV);
        return winners.length === 1 ? winners[0].i : -1;
      }
      if (row.dir === "higher") {
        const maxV = Math.max(...valid.map((x) => x.v!));
        const winners = valid.filter((x) => x.v === maxV);
        return winners.length === 1 ? winners[0].i : -1;
      }
      if (row.dir === "faster") {
        const minV = Math.min(...valid.map((x) => x.v!));
        const winners = valid.filter((x) => x.v === minV);
        return winners.length === 1 ? winners[0].i : -1;
      }
      return -1;
    });
  }, [rows, computed]);

  // Empty state.
  if (selected.length === 0) {
    return (
      <section className="pageview on">
        <div className="wrap cmp-empty-state">
          <div className="cmp-empty-icon">⇄</div>
          <h2>{t("cmp_no_selection")}</h2>
          <p>{t("cmp_no_selection_desc")}</p>
          <button className="btn btn-green" onClick={() => router.push("/#markets")}>
            {t("cmp_back_market")}
          </button>
        </div>
      </section>
    );
  }

  const costRows = rows.filter((r) => r.section === "cost");
  const limitRows = rows.filter((r) => r.section === "limits");

  const renderRow = (row: RowDef, rowGlobalIdx: number) => {
    const winnerI = bestIdx[rowGlobalIdx];
    return (
      <tr key={row.key} className="cmp-row">
        <td className="cmp-label">{t(row.labelKey)}</td>
        {computed.map((ci, colI) => {
          const isWinner = winnerI === colI;
          const cls = "cmp-cell" + (isWinner ? " cmp-best" : "");
          return (
            <td key={colI} className={cls}>
              {(row.render as (p: LoanPackage, ea: number, et: number, ci?: typeof computed[0]) => React.ReactNode)(
                ci.pkg, ci.effAmt, ci.effTerm, ci
              )}
              {isWinner && <span className="cmp-best-badge">{t("cmp_badge_best")}</span>}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <section className="pageview on">
      <div className="wrap cmp-page">
        {/* Header */}
        <button className="linkback" onClick={() => router.push("/#markets")}>{t("cmp_back")}</button>
        <div className="cmp-hero">
          <span className="sec-tag">{t("cmp_page_tag")}</span>
          <h2>{t("cmp_page_title")}</h2>
          <p>{t("cmp_page_sub")}</p>
        </div>

        {/* Scenario inputs */}
        <div className="cmp-scenario">
          <div className="rc-clab">{t("cmp_your_scenario")}</div>
          <div className="cmp-inputs">
            <label className="cmp-field">
              <span>{t("cmp_amount_label")}</span>
              <input
                type="text"
                inputMode="numeric"
                value={GROUPED(amount)}
                onChange={(e) => setAmount(DIGITS(e.target.value))}
              />
            </label>
            <label className="cmp-field">
              <span>{t("cmp_term_label")}</span>
              <input
                type="text"
                inputMode="numeric"
                value={term}
                onChange={(e) => setTerm(DIGITS(e.target.value))}
              />
            </label>
          </div>
        </div>

        {/* Column headers: bank logo + product + remove */}
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr className="cmp-head-row">
                <th className="cmp-label" />
                {computed.map((ci) => {
                  const b = bankOf(ci.pkg.code);
                  return (
                    <th key={ci.idx} className="cmp-col-head">
                      <div className="cmp-col-head-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="cmp-col-logo" src={logoSrc(ci.pkg.code)} alt={b.name} />
                        <div className="cmp-col-names">
                          <span className="cmp-col-bank">{b.name}</span>
                          <span className="cmp-col-prod">{prodName(ci.pkg, lang)}</span>
                        </div>
                        <div className="cmp-col-head-actions">
                          <button
                            className="cmp-col-detail"
                            onClick={() => router.push(`/package/${ci.idx}`)}
                          >
                            {t("cmp_detail_link")}
                          </button>
                          <button
                            className="cmp-col-remove"
                            onClick={() => remove(ci.idx)}
                          >
                            {t("cmp_remove")}
                          </button>
                        </div>
                        {/* Over-limit warning */}
                        {ci.overAmt && (
                          <span className="cmp-over-pill">{t("cmp_badge_over")}</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
              {/* Sparkline row */}
              <tr className="cmp-spark-row">
                <td className="cmp-label">{t("col_trend")}</td>
                {computed.map((ci) => (
                  <td key={ci.idx} className="cmp-cell cmp-spark-cell">
                    <Sparkline arr={ci.pkg.trend} />
                    <span className="cmp-chg">
                      {ci.pkg.change <= 0 ? "▼" : "▲"} {Math.abs(ci.pkg.change)}
                    </span>
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Cost section */}
              <tr className="cmp-section-row">
                <td colSpan={computed.length + 1} className="cmp-section-label">
                  {t("cmp_section_cost")}
                </td>
              </tr>
              {costRows.map((row, i) => renderRow(row, i))}

              {/* Limits section */}
              <tr className="cmp-section-row">
                <td colSpan={computed.length + 1} className="cmp-section-label">
                  {t("cmp_section_limits")}
                </td>
              </tr>
              {limitRows.map((row, i) => renderRow(row, costRows.length + i))}
            </tbody>
          </table>
        </div>

        {/* Over-limit notes */}
        {computed.some((ci) => ci.overAmt || ci.overTerm) && (
          <div className="cmp-notes">
            {computed.filter((ci) => ci.overAmt).map((ci) => (
              <p key={`a${ci.idx}`} className="cmp-note">
                ⚠ {bankOf(ci.pkg.code).name}: {t("cmp_max_note").replace("{max}", fmtVND(ci.pkg.max, lang))}
              </p>
            ))}
            {computed.filter((ci) => ci.overTerm).map((ci) => (
              <p key={`t${ci.idx}`} className="cmp-note">
                ⚠ {bankOf(ci.pkg.code).name}: {t("cmp_term_max_note").replace("{max}", String(ci.pkg.term))}
              </p>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="cmp-foot">
          <button className="btn btn-ghost" onClick={() => { clear(); router.push("/#markets"); }}>
            {t("cmp_back_market")}
          </button>
        </div>
      </div>
    </section>
  );
}
