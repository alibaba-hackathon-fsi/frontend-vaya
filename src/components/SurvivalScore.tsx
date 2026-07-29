"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, bankOf, prodName, logoSrc, type Purpose } from "@/data/banks";
import { fmtMonthly } from "@/lib/loanEngine";
import { monteCarlo, fvShort, type SurvInput, type MCResult } from "@/lib/survival";
import SurvivalChart from "@/components/charts/SurvivalChart";
import type { Lang } from "@/i18n/dict";

const LS_KEY = "vaya_surv_form";

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
  const pkgParam = sp.get("pkg");
  const initPkg = pkgParam != null && PKG[parseInt(pkgParam, 10)] ? parseInt(pkgParam, 10) : null;
  const seed = initPkg != null ? PKG[initPkg] : null;

  // Load persisted form from localStorage
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [pkgSel, setPkgSel] = useState<number | null>(saved?.pkgSel ?? initPkg);
  const [f, setF] = useState(() => {
    if (saved?.f) return saved.f;
    return {
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
    };
  });
  const [res, setRes] = useState<{ mc: MCResult; T: number; inp: SurvInput } | null>(null);

  // Persist to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ f, pkgSel })); } catch { /* noop */ }
  }, [f, pkgSel]);

  const set = (k: string, v: string) => setF((o: typeof f) => ({ ...o, [k]: v }));

  // Packages filtered by current purpose
  const pkgsForPurpose = useMemo(
    () => PKG.map((p, i) => ({ ...p, idx: i })).filter((p) => p.purpose === f.purpose),
    [f.purpose],
  );

  // Active package policy
  const activePkg = pkgSel != null ? PKG[pkgSel] : null;

  // Select a package and clamp values to its policy
  const selectPkg = (idx: number | null) => {
    setPkgSel(idx);
    if (idx != null) {
      const p = PKG[idx];
      setF((o: typeof f) => ({
        ...o,
        amount: String(Math.min(NUM(o.amount), p.max)),
        term: String(Math.min(NUM(o.term), p.term)),
      }));
    }
  };

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

  const numField = (label: string, key: string, step: number) => (
    <label className="fq">
      <span>{t(label)}</span>
      <input type="text" inputMode="numeric" value={f[key]} onChange={(e) => set(key, e.target.value.replace(/[^\d]/g, ""))} />
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
                onChange={(e) => { selectPkg(null); set("purpose", e.target.value); }}
              >
                {PURP_KEYS.map((k) => <option key={k} value={k}>{t("f_" + k)}</option>)}
              </select>
            </label>
            <label className="fq"><span>{t("q_package")}</span>
              <select
                value={pkgSel ?? ""}
                onChange={(e) => selectPkg(e.target.value === "" ? null : parseInt(e.target.value, 10))}
              >
                <option value="">{t("q_pkg_any")}</option>
                {pkgsForPurpose.map((p) => (
                  <option key={p.idx} value={p.idx}>{bankOf(p.code).name} · {prodName(p, lang)}</option>
                ))}
              </select>
            </label>
            {activePkg && (
              <div className="pkg-policy">
                {t("pkg_max")}: {(activePkg.max / 1e9).toFixed(1)}B VND · {t("pkg_term")}: {activePkg.term} {t("r_mo")} · LTV: {activePkg.ltv}%
              </div>
            )}
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
      <div className="surv-chart"><SurvivalChart mc={mc} T={T} t={t} /></div>
      <div className="surv-legend"><span className="lg lg-med">{t("r_median")}</span><span className="lg lg-band">{t("r_band")}</span><span className="lg lg-stress">{t("r_stress")}</span></div>
      <div className="rc-clab">{t("r_reco")}</div>
      <div className="reco-list">{recos.map((r, i) => <div className="reco-i" key={i}><span className="reco-k">{r[0]}</span><span className="reco-v">{r[1]}</span></div>)}</div>
      <div className="rc-clab">{t("sc_why")}</div>
      <div className="sc-explain">
        {met.dti > 45 && <p className="sc-reason"><b>{t("m_dti")} = {met.dti.toFixed(0)}%</b> — {t("why_dti")}</p>}
        {met.efr < 3 && <p className="sc-reason"><b>{t("m_efr")} = {met.efr.toFixed(1)} {t("r_mo")}</b> — {t("why_efr")}</p>}
        {met.disposable < 0 && <p className="sc-reason"><b>{t("m_disp")} = {fmtMonthly(met.disposable)}</b> — {t("why_neg")}</p>}
        {met.ltv > 80 && <p className="sc-reason"><b>{t("m_ltv")} = {met.ltv.toFixed(0)}%</b> — {t("why_ltv")}</p>}
        {met.stab < 60 && <p className="sc-reason"><b>{t("m_stab")} = {met.stab}/100</b> — {t("why_stab")}</p>}
        {mc.ruin > 0.3 && <p className="sc-reason"><b>{t("r_ruin")} = {(mc.ruin * 100).toFixed(0)}%</b> — {t("why_ruin")}</p>}
        {met.dti <= 45 && met.efr >= 3 && met.disposable >= 0 && met.ltv <= 80 && met.stab >= 60 && mc.ruin <= 0.3 && (
          <p className="sc-reason sc-ok-msg">{t("why_ok")}</p>
        )}
      </div>
    </>
  );
}
