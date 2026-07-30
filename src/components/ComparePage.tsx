"use client";

/**
 * Side-by-side comparison of up to COMPARE_MAX packages.
 *
 * Headline rates are not comparable on their own: each package caps a different
 * amount and term, and half of them hide a promo that expires. So the page puts
 * every package on ONE set of assumptions the user controls (amount + term),
 * clamps each to what that package actually allows, and says so when it had to.
 */
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, bankOf, logoSrc, prodName, purpName } from "@/data/banks";
import { fmtVND, fmtMonthly, termLabel, monthly } from "@/lib/loanEngine";
import { amortSeries } from "@/lib/survival";
import { COMPARE_MAX, clearCompare, removeCompare, useCompare } from "@/lib/compareStore";
import CompareChart, { type Series } from "@/components/charts/CompareChart";

const LINE_COLORS = ["#00A863", "#013D3B", "#E08A1E"];

const DIGITS = (s: string) => (s || "").replace(/\D/g, "");
const GROUPED = (s: string) => {
  const d = DIGITS(s);
  return d ? Number(d).toLocaleString("en-US") : "";
};

type Row = {
  key: string;
  /** how to pick a winner: lower is better, higher is better, or neither */
  best: "min" | "max" | null;
  vals: number[];
  render: (i: number) => React.ReactNode;
  hint?: string;
};

export default function ComparePage() {
  const ids = useCompare();
  const { lang, t } = useI18n();
  const router = useRouter();

  const [amount, setAmount] = useState("1000000000");
  const [term, setTerm] = useState("180");

  const pkgs = useMemo(() => ids.map((i) => ({ i, p: PKG[i] })).filter((x) => x.p), [ids]);

  const calc = useMemo(() => {
    const A = Number(DIGITS(amount)) || 0;
    const N = Number(DIGITS(term)) || 0;
    return pkgs.map(({ p }) => {
      const amt = Math.min(A, p.max);
      const mo = Math.max(1, Math.min(N, p.term));
      const emiPromo = monthly(amt, p.rate, mo);
      const emiStd = monthly(amt, p.std, mo);
      const am = amortSeries(amt, p.std, mo);
      return {
        amt,
        mo,
        emiPromo,
        emiStd,
        interest: am.interest,
        total: amt + am.interest,
        clamped: amt < A || mo < N,
      };
    });
  }, [pkgs, amount, term]);

  if (pkgs.length < 2) {
    return (
      <section className="pageview on">
        <div className="wrap">
          <button className="linkback" onClick={() => router.push("/")}>
            {t("d_back")}
          </button>
          <div className="empty" style={{ marginTop: 30 }}>
            <div className="empty-ic">⚖️</div>
            <div className="empty-t">{t("cx_empty_t")}</div>
            <div className="empty-d">{t("cx_empty_d")}</div>
            <button className="btn btn-green btn-sm" onClick={() => router.push("/#markets")}>
              {t("cx_empty_btn")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const rows: Row[] = [
    {
      key: "cx_r_promo",
      best: "min",
      vals: pkgs.map(({ p }) => p.rate),
      render: (k) => <span className="cmp-big g">{pkgs[k].p.rate}%</span>,
      hint: "cx_r_promo_h",
    },
    {
      key: "cx_r_std",
      best: "min",
      vals: pkgs.map(({ p }) => p.std),
      render: (k) => <span className="cmp-big">{pkgs[k].p.std}%</span>,
      hint: "cx_r_std_h",
    },
    {
      key: "cx_r_emi",
      best: "min",
      vals: calc.map((c) => c.emiStd),
      render: (k) => (
        <>
          <span className="cmp-big">{fmtMonthly(calc[k].emiStd)}</span>
          <small className="cmp-sub">
            {t("cx_promo_first")} {fmtMonthly(calc[k].emiPromo)}
          </small>
        </>
      ),
      hint: "cx_r_emi_h",
    },
    {
      key: "cx_r_interest",
      best: "min",
      vals: calc.map((c) => c.interest),
      render: (k) => fmtMonthly(calc[k].interest),
    },
    {
      key: "cx_r_total",
      best: "min",
      vals: calc.map((c) => c.total),
      render: (k) => fmtMonthly(calc[k].total),
    },
    {
      key: "col_max",
      best: "max",
      vals: pkgs.map(({ p }) => p.max),
      render: (k) => fmtVND(pkgs[k].p.max, lang),
    },
    {
      key: "col_term",
      best: "max",
      vals: pkgs.map(({ p }) => p.term),
      render: (k) => termLabel(pkgs[k].p.term, t),
    },
    {
      key: "cx_r_ltv",
      best: "max",
      vals: pkgs.map(({ p }) => p.ltv),
      render: (k) => (pkgs[k].p.ltv ? pkgs[k].p.ltv + "%" : t("no_coll")),
    },
    {
      key: "cx_r_speed",
      best: null,
      vals: [],
      render: (k) => pkgs[k].p.speed[lang] || pkgs[k].p.speed.en,
    },
    {
      key: "cx_r_type",
      best: null,
      vals: [],
      render: (k) => purpName(pkgs[k].p.purpose, lang),
    },
  ];

  const winners = (r: Row) => {
    if (!r.best || !r.vals.length) return new Set<number>();
    const target = r.best === "min" ? Math.min(...r.vals) : Math.max(...r.vals);
    const s = new Set<number>();
    r.vals.forEach((v, k) => {
      if (v === target) s.add(k);
    });
    // Everything tied means nothing actually won.
    return s.size === r.vals.length ? new Set<number>() : s;
  };

  const wins = pkgs.map((_, k) => rows.filter((r) => winners(r).has(k)).length);
  const topScore = Math.max(...wins);

  const series: Series[] = pkgs.map(({ p }, k) => ({
    name: bankOf(p.code).name,
    color: LINE_COLORS[k % LINE_COLORS.length],
    arr: p.trend,
  }));

  const anyClamped = calc.some((c) => c.clamped);

  return (
    <section className="pageview on">
      <div className="wrap">
        <button className="linkback" onClick={() => router.push("/")}>
          {t("d_back")}
        </button>

        <div className="surv-hero has-aside">
          <div>
            <span className="sec-tag">{t("cx_tag")}</span>
            <h2>{t("cx_title")}</h2>
            <p>{t("cx_sub")}</p>
          </div>
          {/* Assumptions live next to the title: they drive every number below,
              so burying them under the table would be dishonest. */}
          <div className="cmp-assume">
            <div className="glab">{t("cx_assume")}</div>
            <label className="fq">
              <span>{t("q_amount")}</span>
              <input
                type="text"
                inputMode="numeric"
                value={GROUPED(amount)}
                onChange={(e) => setAmount(DIGITS(e.target.value))}
              />
            </label>
            <label className="fq">
              <span>{t("q_term")}</span>
              <input
                type="text"
                inputMode="numeric"
                value={GROUPED(term)}
                onChange={(e) => setTerm(DIGITS(e.target.value))}
              />
            </label>
            {anyClamped && <div className="cmp-clamp">{t("cx_clamped")}</div>}
          </div>
        </div>

        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr>
                <th className="cmp-rowhead">{t("cx_metric")}</th>
                {pkgs.map(({ i, p }, k) => (
                  <th key={i}>
                    <div className="cmp-col">
                      <div className="cmp-colbar" style={{ background: LINE_COLORS[k % LINE_COLORS.length] }} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="cmp-logo" src={logoSrc(p.code)} alt={bankOf(p.code).name} />
                      <b>{bankOf(p.code).name}</b>
                      <small>{prodName(p, lang)}</small>
                      {wins[k] === topScore && topScore > 0 && (
                        <span className="cmp-crown">★ {t("cx_leads").replace("{n}", String(wins[k]))}</span>
                      )}
                      <button className="cmp-rm" onClick={() => removeCompare(i)}>
                        {t("cx_remove")}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const w = winners(r);
                return (
                  <tr key={r.key}>
                    <th className="cmp-rowhead">
                      {t(r.key)}
                      {r.hint && <small>{t(r.hint)}</small>}
                    </th>
                    {pkgs.map((_, k) => (
                      <td key={k} className={w.has(k) ? "cmp-win" : ""}>
                        {r.render(k)}
                        {w.has(k) && <span className="cmp-badge">{t("cx_best")}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th className="cmp-rowhead">{t("cx_r_actions")}</th>
                {pkgs.map(({ i }, k) => (
                  <td key={k}>
                    <div className="cmp-acts">
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/package/${i}`)}>
                        {t("view_details")}
                      </button>
                      <button className="btn btn-green btn-sm" onClick={() => router.push(`/chat?pkg=${i}`)}>
                        {t("d_ask_btn")}
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rc-clab">{t("cx_trend")}</div>
        <div className="surv-chart">
          <CompareChart series={series} />
        </div>
        <div className="surv-legend">
          {series.map((s) => (
            <span className="lg lg-c" key={s.name} style={{ "--lgc": s.color } as React.CSSProperties}>
              {s.name}
            </span>
          ))}
        </div>

        <div className="cmp-foot">
          <span>
            {ids.length}/{COMPARE_MAX} {t("cx_selected")}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={clearCompare}>
            {t("cx_clear")}
          </button>
        </div>
      </div>
    </section>
  );
}
