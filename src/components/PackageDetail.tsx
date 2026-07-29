"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, bankOf, purpName, prodName, logoSrc, type Purpose } from "@/data/banks";
import { fmtVND, fmtMonthly, termLabel, monthly } from "@/lib/loanEngine";
import Sparkline from "@/components/charts/Sparkline";
import type { Lang } from "@/i18n/dict";

const ASK: Record<Purpose, Record<Lang, string>> = {
  home: { en: "I want a home loan", vi: "Tôi muốn vay mua nhà", zh: "我想申请购房贷款" },
  car: { en: "I want a car loan", vi: "Tôi muốn vay mua ô tô", zh: "我想申请购车贷款" },
  business: { en: "I need business capital", vi: "Tôi cần vốn kinh doanh", zh: "我需要经营资金" },
  personal: { en: "I want a personal loan", vi: "Tôi muốn vay tiêu dùng", zh: "我想申请个人贷款" },
  secured: { en: "I want a secured loan", vi: "Tôi muốn vay có tài sản đảm bảo", zh: "我想申请抵押贷款" },
};

export default function PackageDetail({ idx }: { idx: number }) {
  const { lang, t } = useI18n();
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
  return (
    <section className="pageview on"><div className="wrap">
      <button className="linkback" onClick={() => router.push("/")}>{t("d_back")}</button>
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
      <div className="dt-spark"><Sparkline arr={p.trend} /></div>
      <div className="rc-clab">{t("d_features")}</div>
      <div className="dt-feats">{feats.map((k) => <span className="feat" key={k}>✓ {t(k)}</span>)}</div>
      <div className="dt-actions">
        <div className="dt-act">
          <div className="dt-act-h">🤖 {t("d_ai")}</div>
          <p>{t("d_ai_desc")}</p>
          <button className="btn btn-dark btn-sm" onClick={() => router.push("/chat?q=" + encodeURIComponent(ASK[p.purpose][lang] || ASK[p.purpose].en))}>{t("d_ask_btn")}</button>
        </div>
        <div className="dt-act">
          <div className="dt-act-h">📈 {t("d_surv")}</div>
          <p>{t("d_surv_desc")}</p>
          <button className="btn btn-green btn-sm" onClick={() => router.push(`/survival?p=${p.purpose}&a=${Math.min(p.max, 2000000000)}&t=${Math.min(p.term, 240)}`)}>{t("d_surv_btn")}</button>
        </div>
      </div>
    </div></section>
  );
}
