"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, bankOf, purpName, prodName, logoSrc } from "@/data/banks";
import { fmtVND, fmtMonthly, termLabel, monthly } from "@/lib/loanEngine";
import { amortSeries } from "@/lib/survival";
import RateTrendChart from "@/components/charts/RateTrendChart";
import { toggleCompare, useCompare } from "@/lib/compareStore";

export default function PackageDetail({ idx }: { idx: number }) {
  const { lang, t } = useI18n();
  const picked = useCompare();
  const router = useRouter();
  const p = PKG[idx];
  if (!p) return <section className="pageview on"><div className="wrap" style={{ padding: "60px 0" }}>Not found.</div></section>;
  const b = bankOf(p.code);
  const est = monthly(p.max, p.std, p.term);
  const facts: [string, string][] = [
    [t("col_max"), fmtVND(p.max, lang)],
    [t("col_term"), termLabel(p.term, t)],
    ["LTV", p.ltv ? p.ltv + "%" : t("no_coll")],
    ["⏱", p.speed[lang] || p.speed.en],
    [t("d_est"), fmtMonthly(est)],
  ];
  const feats = ["feat_fast", "feat_online", "feat_ekyc", "feat_declining"];

  // Rate-trend KPIs + insight
  const arr = p.trend;
  const now = arr[arr.length - 1];
  const chg = arr[arr.length - 1] - arr[0];
  const lo = Math.min(...arr), hi = Math.max(...arr);
  const kpi: [string, string][] = [
    [t("d_now"), now.toFixed(1) + "%"],
    [t("d_chg"), (chg <= 0 ? "▼ " : "▲ ") + Math.abs(chg).toFixed(1) + " pts"],
    [t("d_low"), lo.toFixed(1) + "%"],
    [t("d_high"), hi.toFixed(1) + "%"],
  ];
  // Cost breakdown at max amount over the full term
  const a = amortSeries(p.max, p.std, p.term);
  const total = p.max + a.interest;
  const pp = Math.round((p.max / total) * 100);

  return (
    <section className="pageview on"><div className="wrap">
      <div className="dt-bar">
        <button className="linkback" onClick={() => router.push("/")}>{t("d_back")}</button>
        <button
          className={"cmp-tog wide" + (picked.includes(idx) ? " on" : "")}
          onClick={() => toggleCompare(idx)}
          aria-pressed={picked.includes(idx)}
        >
          {picked.includes(idx) ? "✓ " + t("cx_added") : "⇄ " + t("cx_add")}
        </button>
      </div>
      <div className="dt-head">
        <div className="dt-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={logoSrc(p.code)} alt={b.name} /></div>
        <div className="dt-h">
          <span className="dt-type">{purpName(p.purpose, lang)}</span>
          <h2>{b.name}</h2>
          <div className="dt-prod">{prodName(p, lang)}</div>
        </div>
        <div className="dt-rate">
          <div className="k">{t("rate")}</div>
          <div className="v">{p.rate}%{p.promoM ? <small> → {p.std}%</small> : null}</div>
        </div>
      </div>

      <div className="rc-clab">{t("d_keyfacts")}</div>
      <div className="sm-grid">{facts.map((fct, i) => <div className="sm" key={i}><div className="smk">{fct[0]}</div><div className="smv">{fct[1]}</div></div>)}</div>

      {/* Rate trend: KPIs + annotated chart + insight */}
      <div className="rc-clab">{t("d_trend_title")}</div>
      <div className="sm-grid">{kpi.map((k, i) => <div className="sm" key={i}><div className="smk">{k[0]}</div><div className="smv">{k[1]}</div></div>)}</div>
      <div className="surv-chart dt-chart"><RateTrendChart arr={arr} t={t} /></div>
      <div className="dt-insight">💡 {chg <= 0 ? t("d_ins_down") : t("d_ins_up")}</div>

      {/* Cost breakdown */}
      <div className="rc-clab">{t("d_cost")}</div>
      <div className="cost-wrap">
        <div className="cost-bar">
          <div className="cost-p" style={{ width: pp + "%" }} />
          <div className="cost-i" style={{ width: 100 - pp + "%" }} />
        </div>
        <div className="cost-keys">
          <span className="ck ck-p">{t("d_principal")} <b>{fmtMonthly(p.max)}</b></span>
          <span className="ck ck-i">{t("d_interest")} <b>{fmtMonthly(a.interest)}</b></span>
          <span className="ck ck-t">{t("d_total")} <b>{fmtMonthly(total)}</b></span>
        </div>
      </div>

      <div className="rc-clab">{t("d_features")}</div>
      <div className="dt-feats">{feats.map((k) => <span className="feat" key={k}>✓ {t(k)}</span>)}</div>

      <div className="dt-actions">
        <div className="dt-act">
          <div className="dt-act-h">🤖 {t("d_ai")}</div>
          <p>{t("d_ai_desc")}</p>
          {/* Package-specific advisor: the chat opens a consultation about THIS product. */}
          <button className="btn btn-dark btn-sm" onClick={() => router.push(`/chat?pkg=${idx}`)}>{t("d_ask_btn")}</button>
        </div>
        <div className="dt-act">
          <div className="dt-act-h">📈 {t("d_surv")}</div>
          <p>{t("d_surv_desc")}</p>
          <button className="btn btn-green btn-sm" onClick={() => router.push(`/survival?pkg=${idx}`)}>{t("d_surv_btn")}</button>
        </div>
      </div>
    </div></section>
  );
}
