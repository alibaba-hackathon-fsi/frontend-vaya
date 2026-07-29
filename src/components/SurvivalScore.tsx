"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, bankOf, prodName, logoSrc, type Purpose } from "@/data/banks";
import { fmtMonthly } from "@/lib/loanEngine";
import { monteCarlo, survChartSvg, fvShort, type SurvInput, type MCResult } from "@/lib/survival";
import type { Lang } from "@/i18n/dict";

const NUM = (s: string) => {
  const x = parseFloat((s || "").replace(/[^\d.]/g, ""));
  return isNaN(x) ? 0 : x;
};

const PURP_KEYS: Purpose[] = ["home", "car", "business", "personal", "secured"];
const EMP = [["salaried", "emp_salaried"], ["gov", "emp_gov"], ["business", "emp_business"], ["self", "emp_self"], ["freelance", "emp_freelance"]];
const COL = [["re", "colt_re"], ["vehicle", "colt_vehicle"], ["savings", "colt_savings"], ["none", "colt_none"]];

export default function SurvivalScore() {
  const { lang, t } = useI18n();
  const sp = useSearchParams();
  // Arriving from a package detail page: ?pkg=<index> keeps the projection tied
  // to that exact product (its rate, limits and name).
  const pkgParam = sp.get("pkg");
  const initPkg = pkgParam != null && PKG[parseInt(pkgParam, 10)] ? parseInt(pkgParam, 10) : null;
  const seed = initPkg != null ? PKG[initPkg] : null;

  const [pkgSel, setPkgSel] = useState<number | null>(initPkg);
  const [f, setF] = useState({
    purpose: seed ? seed.purpose : sp.get("p") || "home",
    amount: String(seed ? Math.min(seed.max, 2000000000) : sp.get("a") || "2000000000"),
    term: String(seed ? Math.min(seed.term, 240) : sp.get("t") || "240"),
    income: "45000000",
    expenses: "18000000",
    debt: "4000000",
    savings: "150000000",
    down: "600000000",
    dependents: "1",
    employment: "salaried",
    collateral: "re",
  });
  const [res, setRes] = useState<{ mc: MCResult; T: number; inp: SurvInput } | null>(null);
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));

  const run = (pkgOverride?: number | null) => {
    const pk = pkgOverride === undefined ? pkgSel : pkgOverride;
    const inp: SurvInput = {
      pkgIdx: pk,
      purpose: f.purpose, amount: NUM(f.amount), term: NUM(f.term), income: NUM(f.income),
      expenses: NUM(f.expenses), debt: NUM(f.debt), savings: NUM(f.savings), down: NUM(f.down),
      dependents: NUM(f.dependents), employment: f.employment, collateral: f.collateral,
    };
    const T = Math.max(6, Math.min(Math.round(inp.term || 60), 60));
    setRes({ mc: monteCarlo(inp, T, 220), T, inp });
  };
  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const numField = (label: string, key: keyof typeof f, step: number) => (
    <label className="fq">
      <span>{t(label)}</span>
      <input type="number" min={0} step={step} value={f[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  return (
    <section className="pageview on"><div className="wrap">
      <div className="surv-hero">
        <span className="sec-tag">{t("nav_surv")}</span>
        <h2>{t("surv_title")}</h2>
        <p>{t("surv_sub")}</p>
      </div>
      <div className="surv-grid">
        <form className="surv-form" onSubmit={(e) => e.preventDefault()}>
          <div className="fgroup">
            <div className="glab">{t("g_loan")}</div>
            <label className="fq"><span>{t("q_purpose")}</span>
              <select
                value={f.purpose}
                onChange={(e) => { setPkgSel(null); set("purpose", e.target.value); }}
              >
                {PURP_KEYS.map((k) => <option key={k} value={k}>{t("f_" + k)}</option>)}
              </select>
            </label>
            {numField("q_amount", "amount", 10000000)}
            {numField("q_term", "term", 6)}
          </div>
          <div className="fgroup">
            <div className="glab">{t("g_income")}</div>
            {numField("q_income", "income", 1000000)}
            {numField("q_expenses", "expenses", 1000000)}
            {numField("q_debt", "debt", 1000000)}
          </div>
          <div className="fgroup">
            <div className="glab">{t("g_buffer")}</div>
            {numField("q_savings", "savings", 10000000)}
            {numField("q_down", "down", 10000000)}
          </div>
          <div className="fgroup">
            <div className="glab">{t("g_profile")}</div>
            {numField("q_dependents", "dependents", 1)}
            <label className="fq"><span>{t("q_employment")}</span>
              <select value={f.employment} onChange={(e) => set("employment", e.target.value)}>
                {EMP.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </label>
            <label className="fq"><span>{t("q_collateral")}</span>
              <select value={f.collateral} onChange={(e) => set("collateral", e.target.value)}>
                {COL.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </label>
          </div>
          <button type="button" className="btn btn-green surv-gen" onClick={() => run()}>{t("surv_gen")}</button>
        </form>

        <div className="surv-result">
          {res ? <Result res={res} lang={lang} t={t} /> : <div className="surv-empty">{t("surv_empty")}</div>}
        </div>
      </div>
    </div></section>
  );
}

function Result({ res, lang, t }: { res: { mc: MCResult; T: number; inp: SurvInput }; lang: Lang; t: (k: string) => string }) {
  const { mc, T, inp } = res;
  const met = mc.met;
  const sc = met.score;
  const vclass = sc >= 70 ? "good" : sc >= 45 ? "ok" : "risk";
  const vlab = sc >= 70 ? t("r_good") : sc >= 45 ? t("r_ok") : t("r_risk");
  const metrics: [string, string][] = [
    ["m_emi", fmtMonthly(met.emi)], ["m_dti", met.dti.toFixed(0) + "%"], ["m_pti", met.pti.toFixed(0) + "%"],
    ["m_ltv", met.ltv.toFixed(0) + "%"], ["m_disp", fmtMonthly(met.disposable)],
    ["m_efr", met.efr.toFixed(1) + " " + t("r_mo")], ["m_stab", met.stab + "/100"],
  ];
  const selP = inp.pkgIdx != null ? PKG[inp.pkgIdx] : null;
  const cheapest = PKG.filter((p) => p.purpose === inp.purpose).sort((a, b) => a.rate - b.rate)[0];
  const bestP = selP || cheapest;
  const verdict = sc >= 70 ? t("v_yes") : sc >= 45 ? t("v_care") : t("v_no");
  const risks: string[] = [];
  if (met.dti > 45) risks.push(t("risk_dti"));
  if (met.efr < 3) risks.push(t("risk_efr"));
  if (met.disposable < 0) risks.push(t("risk_neg"));
  if (met.ltv > 80) risks.push(t("risk_ltv"));
  if (met.stab < 60) risks.push(t("risk_stab"));
  if (!risks.length) risks.push(t("risk_none"));
  const adjust = met.dti > 40 || met.disposable < 0 ? t("adj_amount") : met.ltv > 80 ? t("adj_down") : t("adj_ok");
  const recos: [string, string][] = [
    [t("reco_borrow"), verdict],
    [t("reco_pkg"), bestP ? bankOf(bestP.code).name + " · " + prodName(bestP, lang) : "—"],
  ];
  if (selP && cheapest && cheapest.code !== selP.code && cheapest.rate < selP.rate) {
    recos.push([t("reco_alt"), bankOf(cheapest.code).name + " · " + prodName(cheapest, lang) + " (" + cheapest.rate + "%)"]);
  }
  recos.push([t("reco_prob"), (mc.ruin * 100).toFixed(0) + "%"], [t("reco_risk"), risks.join(" · ")], [t("reco_adjust"), adjust]);

  return (
    <>
      {selP && (
        <div className="surv-for">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc(selP.code)} alt="" />
          <div><span>{t("surv_for")}</span><b>{bankOf(selP.code).name} · {prodName(selP, lang)}</b></div>
          <span className="sf-rate">{selP.rate}% → {selP.std}%</span>
        </div>
      )}
      <div className={"score-head sc-" + vclass}>
        <div className="score-num">{sc}</div>
        <div className="score-meta"><div className="score-lab">{t("r_score")}</div><div className="score-verdict">{vlab}</div></div>
        <div className="score-ruin"><span>{t("r_ruin")}</span><b>{(mc.ruin * 100).toFixed(0)}%</b></div>
      </div>
      <div className="rc-clab">{t("r_metrics")}</div>
      <div className="sm-grid">{metrics.map((m) => <div className="sm" key={m[0]}><div className="smk">{t(m[0])}</div><div className="smv">{m[1]}</div></div>)}</div>
      <div className="rc-clab">{t("r_chart")}</div>
      <div className="surv-chart" dangerouslySetInnerHTML={{ __html: survChartSvg(mc, T, fvShort) }} />
      <div className="surv-legend"><span className="lg lg-med">{t("r_median")}</span><span className="lg lg-band">{t("r_band")}</span><span className="lg lg-stress">{t("r_stress")}</span></div>
      <div className="rc-clab">{t("r_reco")}</div>
      <div className="reco-list">{recos.map((r, i) => <div className="reco-i" key={i}><span className="reco-k">{r[0]}</span><span className="reco-v">{r[1]}</span></div>)}</div>
    </>
  );
}
