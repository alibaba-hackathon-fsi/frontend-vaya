"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, AVG, bankOf, purpName, prodName, logoSrc, type Purpose, type LoanPackage } from "@/data/banks";
import { fmtVND, termLabel } from "@/lib/loanEngine";
import Sparkline from "@/components/charts/Sparkline";
import LineChart from "@/components/charts/LineChart";
import type { Lang } from "@/i18n/dict";

type FilterKey = "all" | Purpose;
type SortKey = "rate" | "max" | "term";
type ViewKey = "cards" | "table";

const FILTER_KEYS: FilterKey[] = ["all", "home", "car", "business", "personal", "secured"];
const MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

function askText(p: Purpose, lang: Lang): string {
  const map: Record<Purpose, Record<Lang, string>> = {
    home: { en: "I want a home loan", vi: "Tôi muốn vay mua nhà", zh: "我想申请购房贷款" },
    car: { en: "I want a car loan", vi: "Tôi muốn vay mua ô tô", zh: "我想申请购车贷款" },
    business: { en: "I need business capital", vi: "Tôi cần vốn kinh doanh", zh: "我需要经营资金" },
    personal: { en: "I want a personal loan", vi: "Tôi muốn vay tiêu dùng", zh: "我想申请个人贷款" },
    secured: { en: "I want a secured loan", vi: "Tôi muốn vay có tài sản đảm bảo", zh: "我想申请抵押贷款" },
  };
  return map[p][lang] || map[p].en;
}

export default function MarketsSection() {
  const router = useRouter();
  const { lang, t } = useI18n();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("rate");
  const [asc, setAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewKey>("cards");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = PKG.filter((p) => {
      if (filter !== "all" && p.purpose !== filter) return false;
      if (q) {
        const hay = (bankOf(p.code).name + " " + prodName(p, lang) + " " + purpName(p.purpose, lang)).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      return (av < bv ? -1 : av > bv ? 1 : 0) * (asc ? 1 : -1);
    });
  }, [filter, sort, asc, search, lang]);

  const setSortKey = (k: SortKey) => {
    if (sort === k) setAsc((v) => !v);
    else {
      setSort(k);
      setAsc(true);
    }
  };
  const onSortSel = (v: string) => {
    const [k, a] = v.split(":");
    setSort(k as SortKey);
    setAsc(a === "1");
  };
  const clearFilters = () => {
    setFilter("all");
    setSearch("");
  };
  const openChat = (seed: string) => router.push(seed ? `/chat?q=${encodeURIComponent(seed)}` : "/chat");

  const trendNow = AVG[AVG.length - 1] + "%";
  const trendDelta = "▼ " + (AVG[0] - AVG[AVG.length - 1]).toFixed(1);

  const cols: { k: string; lab: string; num: boolean }[] = [
    { k: "bank", lab: "col_bank", num: false },
    { k: "type", lab: "col_type", num: false },
    { k: "rate", lab: "col_rate", num: true },
    { k: "trend", lab: "col_trend", num: false },
    { k: "max", lab: "col_max", num: true },
    { k: "term", lab: "col_term", num: true },
  ];
  const sortable = ["rate", "max", "term"];

  const Empty = () => (
    <div className="empty">
      <div className="empty-ic">🔍</div>
      <div className="empty-t">{t("empty_t")}</div>
      <div className="empty-d">{t("empty_d")}</div>
      <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
        {t("empty_btn")}
      </button>
    </div>
  );

  return (
    <section className="section" id="markets">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-tag">{t("mkt_tag")}</span>
          <h2>{t("mkt_title")}</h2>
          <p>{t("mkt_sub")}</p>
        </div>

        <div className="mkt-stack">
          {/* Chart row */}
          <div className="chart-card reveal chart-lg">
            <div className="chart-head">
              <div>
                <h4>{t("trend_title")}</h4>
                <div className="csub">{t("trend_sub")}</div>
              </div>
              <div className="chart-kpi">
                <span className="big-num">{trendNow}</span> <span className="delta">{trendDelta}</span>
              </div>
            </div>
            <LineChart data={AVG} labels={MONTHS} tipVs={t("tip_vs")} tipLow={t("tip_low")} />
            <div className="csub" style={{ marginTop: 8 }}>
              {t("trend_note")}
            </div>
          </div>

          {/* Packages: filters + tools + (cards | table) */}
          <div className="table-card reveal">
            <div className="filters">
              {FILTER_KEYS.map((k) => (
                <button key={k} className={k === filter ? "on" : ""} onClick={() => setFilter(k)}>
                  {t("f_" + k)}
                </button>
              ))}
            </div>

            <div className="mkt-tools">
              <label className="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4-4" />
                </svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search_ph")} />
              </label>
              <div className="mkt-actions">
                <select
                  className="sortsel"
                  style={{ display: view === "cards" ? "" : "none" }}
                  value={`${sort}:${asc ? 1 : 0}`}
                  onChange={(e) => onSortSel(e.target.value)}
                >
                  <option value="rate:1">{t("sort_rate")}</option>
                  <option value="max:0">{t("sort_max")}</option>
                  <option value="term:0">{t("sort_term")}</option>
                </select>
                <div className="viewtog">
                  <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")} title={t("v_cards")}>
                    ▦
                  </button>
                  <button className={view === "table" ? "on" : ""} onClick={() => setView("table")} title={t("v_table")}>
                    ≣
                  </button>
                </div>
                <span className="cnt">
                  {rows.length} {t("results")}
                </span>
              </div>
            </div>

            {view === "cards" ? (
              <div className="pkg-grid">
                {rows.length === 0 ? (
                  <Empty />
                ) : (
                  rows.map((p: LoanPackage, i) => {
                    const b = bankOf(p.code);
                    return (
                      <div className="pkg" key={p.code + i}>
                        <div className="pkg-top">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="pkg-logo" src={logoSrc(p.code)} alt={b.name} />
                          <span className="pkg-type">{purpName(p.purpose, lang)}</span>
                        </div>
                        <div className="pkg-name">{b.name}</div>
                        <div className="pkg-rate-box">
                          <div>
                            <div className="k">{t("rate")}</div>
                            <div className="v g">
                              {p.rate}%<small>{p.promoM ? ` → ${p.std}%` : ""}</small>
                            </div>
                          </div>
                          <div>
                            <div className="k">{t("col_max")}</div>
                            <div className="v">{fmtVND(p.max, lang)}</div>
                          </div>
                        </div>
                        <div className="pkg-meta">
                          <span>
                            {t("col_term")}: <b>{termLabel(p.term, t)}</b>
                          </span>
                          <span>{p.ltv ? "LTV " + p.ltv + "%" : t("no_coll")}</span>
                          <span>⏱ {p.speed[lang] || p.speed.en}</span>
                        </div>
                        <div className="pkg-spark">
                          <Sparkline arr={p.trend} />
                        </div>
                        <button className="pkg-cta" onClick={() => openChat(askText(p.purpose, lang))}>
                          {t("ask")} →
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="tscroll">
                <table id="mktTable">
                  <thead>
                    <tr>
                      {cols.map(({ k, lab, num }) => {
                        const isSortable = sortable.includes(k);
                        const cls = (num ? "num " : "") + (k === "trend" ? "hide-sm " : "") + (sort === k ? "sorted" : "");
                        const ar = sort === k ? (asc ? "▲" : "▼") : "▲";
                        return (
                          <th key={k} className={cls.trim()} onClick={isSortable ? () => setSortKey(k as SortKey) : undefined}>
                            {t(lab)}
                            {isSortable && <span className="ar">{ar}</span>}
                          </th>
                        );
                      })}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan={7}>
                          <Empty />
                        </td>
                      </tr>
                    ) : (
                      rows.map((p: LoanPackage, i) => {
                        const b = bankOf(p.code);
                        const chg = p.change;
                        return (
                          <tr key={p.code + prodName(p, lang) + i}>
                            <td>
                              <div className="bk">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img className="blogo" src={logoSrc(p.code)} alt={b.name} />
                                <div className="pd" title={prodName(p, lang)}>
                                  {prodName(p, lang)}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="pill" title={purpName(p.purpose, lang)}>
                                {purpName(p.purpose, lang)}
                              </span>
                            </td>
                            <td className="num">
                              <span className="rate">{p.rate}%</span>{" "}
                              <span className={"chg " + (chg <= 0 ? "up" : "down")}>
                                {chg <= 0 ? "▼" : "▲"}
                                {Math.abs(chg)}
                              </span>
                            </td>
                            <td className="hide-sm">
                              <Sparkline arr={p.trend} />
                            </td>
                            <td className="num">{fmtVND(p.max, lang)}</td>
                            <td className="num">{termLabel(p.term, t)}</td>
                            <td className="num">
                              <button className="ask" onClick={() => openChat(askText(p.purpose, lang))}>
                                {t("ask")} →
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
