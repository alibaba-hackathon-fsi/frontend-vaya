"use client";

/**
 * Reverse-auction board — the inverse of the rest of the app.
 *
 * Everywhere else the borrower goes shopping across twenty banks. Here they post
 * one anonymous request and the banks come to them, bidding against each other
 * in the open. Each offer is shown against that bank's own public listed rate,
 * because the spread between the two is the entire argument for the mechanic.
 *
 * No AI in this flow on purpose: it is a forum, and forums work.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { bankOf, logoSrc, purpName, type Purpose } from "@/data/banks";
import { fmtVND, termLabel } from "@/lib/loanEngine";
import { INCOME_BANDS, SEED_POSTS, type MarketOffer, type MarketPost } from "@/data/marketplace";
import { addBid, addPost, removePost, useMyPosts } from "@/lib/marketStore";

const PURPOSES: Purpose[] = ["home", "car", "business", "personal", "secured"];
type SortKey = "new" | "offers" | "cut";

const DIGITS = (s: string) => (s || "").replace(/\D/g, "");
const GROUPED = (s: string) => {
  const d = DIGITS(s);
  return d ? Number(d).toLocaleString("en-US") : "";
};

/** Best (lowest) offered rate on a post, and how far under the listed rate it sits. */
function bestOf(p: MarketPost): { offer: MarketOffer; cut: number } | null {
  if (!p.offers.length) return null;
  const offer = p.offers.reduce((a, b) => (b.rate < a.rate ? b : a));
  return { offer, cut: Number((offer.listed - offer.rate).toFixed(2)) };
}

export default function Marketplace() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const mine = useMyPosts();

  const [filter, setFilter] = useState<"all" | Purpose>("all");
  const [sort, setSort] = useState<SortKey>("new");
  const [open, setOpen] = useState<string | null>("p1");
  const [composing, setComposing] = useState(false);
  const [justPosted, setJustPosted] = useState<string | null>(null);

  // form
  const [purpose, setPurpose] = useState<Purpose>("home");
  const [amount, setAmount] = useState("1500000000");
  const [term, setTerm] = useState("180");
  const [band, setBand] = useState(INCOME_BANDS[1]);
  const [collateral, setCollateral] = useState("yes");
  const [note, setNote] = useState("");

  // Banks answer a fresh request on a timer, so the board demonstrates the race
  // rather than sitting empty after posting.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const posts = useMemo(() => [...mine, ...SEED_POSTS], [mine]);

  const shown = useMemo(() => {
    const list = posts.filter((p) => filter === "all" || p.purpose === filter);
    const score = (p: MarketPost) => {
      if (sort === "offers") return p.offers.length;
      if (sort === "cut") return bestOf(p)?.cut ?? -1;
      return -p.hoursAgo;
    };
    // Own posts stay pinned on top: you came back to check on yours.
    return [...list].sort((a, b) => Number(!!b.mine) - Number(!!a.mine) || score(b) - score(a));
  }, [posts, filter, sort]);

  const stats = useMemo(() => {
    const offers = posts.flatMap((p) => p.offers);
    const cuts = posts.map((p) => bestOf(p)?.cut).filter((x): x is number => x != null);
    return {
      requests: posts.length,
      offers: offers.length,
      avgCut: cuts.length ? (cuts.reduce((a, b) => a + b, 0) / cuts.length).toFixed(2) : "0",
    };
  }, [posts]);

  const ago = (h: number) =>
    h < 1 ? t("mk_now") : h < 24 ? `${h}${t("mk_h")}` : `${Math.round(h / 24)}${t("mk_d")}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(DIGITS(amount)) || 0;
    const mo = Number(DIGITS(term)) || 0;
    if (amt <= 0 || mo <= 0) return;
    const id = addPost({
      purpose,
      amount: amt,
      termMonths: mo,
      incomeBand: band,
      collateral: collateral === "yes",
      note,
    });
    setComposing(false);
    setNote("");
    setJustPosted(id);
    setOpen(id);
    timers.current.push(
      setTimeout(() => addBid(id, 0), 2600),
      setTimeout(() => addBid(id, 1), 6200),
      setTimeout(() => addBid(id, 2), 11000),
    );
  };

  return (
    <section className="pageview on">
      <div className="wrap">
        <div className="surv-hero has-aside">
          <div>
            <span className="sec-tag">{t("mk_tag")}</span>
            <h2>{t("mk_title")}</h2>
            <p>{t("mk_sub")}</p>
          </div>
          <div className="mk-stats">
            <div className="glab">{t("mk_board")}</div>
            <div className="mk-stat">
              <b>{stats.requests}</b>
              <span>{t("mk_st_req")}</span>
            </div>
            <div className="mk-stat">
              <b>{stats.offers}</b>
              <span>{t("mk_st_off")}</span>
            </div>
            <div className="mk-stat">
              <b className="g">−{stats.avgCut}%</b>
              <span>{t("mk_st_cut")}</span>
            </div>
          </div>
        </div>

        {/* Composer */}
        {composing ? (
          <form className="mk-composer" onSubmit={submit}>
            <div className="mk-comp-head">
              <b>{t("mk_new")}</b>
              <button type="button" className="mail-x" onClick={() => setComposing(false)} aria-label={t("mail_close")}>
                ×
              </button>
            </div>
            <div className="mk-comp-grid">
              <label className="fq">
                <span>{t("q_purpose")}</span>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
                  {PURPOSES.map((k) => (
                    <option value={k} key={k}>
                      {t("f_" + k)}
                    </option>
                  ))}
                </select>
              </label>
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
              <label className="fq">
                <span>{t("mk_f_income")}</span>
                <select value={band} onChange={(e) => setBand(e.target.value)}>
                  {INCOME_BANDS.map((k) => (
                    <option value={k} key={k}>
                      {t(k)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fq">
                <span>{t("mk_f_collateral")}</span>
                <select value={collateral} onChange={(e) => setCollateral(e.target.value)}>
                  <option value="yes">{t("mk_yes")}</option>
                  <option value="no">{t("mk_no")}</option>
                </select>
              </label>
            </div>
            <label className="fq">
              <span>{t("mk_f_note")}</span>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("mk_f_note_ph")} />
            </label>
            <div className="mk-comp-foot">
              <span className="mk-priv">🔒 {t("mk_privacy")}</span>
              <button className="btn btn-green">{t("mk_post")}</button>
            </div>
          </form>
        ) : (
          <button className="mk-open" onClick={() => setComposing(true)}>
            <span className="mk-open-ic">✎</span>
            <span>
              <b>{t("mk_cta")}</b>
              <small>{t("mk_cta_sub")}</small>
            </span>
            <span className="mail-arrow">→</span>
          </button>
        )}

        {/* Filters */}
        <div className="mk-tools">
          <div className="filters">
            <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
              {t("f_all")}
            </button>
            {PURPOSES.map((k) => (
              <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                {t("f_" + k)}
              </button>
            ))}
          </div>
          {/* Visible count: filtering a board this size otherwise looks broken
              rather than filtered. */}
          <span className="cnt">
            {shown.length} {t("mk_st_req")}
          </span>
          <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={t("mk_sort")}>
            <option value="new">{t("mk_sort_new")}</option>
            <option value="offers">{t("mk_sort_offers")}</option>
            <option value="cut">{t("mk_sort_cut")}</option>
          </select>
        </div>

        {/* Feed */}
        <div className="mk-feed">
          {shown.length === 0 && (
            <div className="empty">
              <div className="empty-ic">📭</div>
              <div className="empty-t">{t("mk_empty_t")}</div>
              <div className="empty-d">{t("mk_empty_d")}</div>
            </div>
          )}

          {shown.map((p) => {
            const best = bestOf(p);
            const isOpen = open === p.id;
            return (
              <article className={"mk-post" + (p.mine ? " mine" : "")} key={p.id}>
                <div className="mk-top">
                  <span className="mk-av">{p.handle.slice(0, 2)}</span>
                  <div className="mk-who">
                    <b>
                      {t("mk_borrower")} #{p.handle}
                      {p.mine && <span className="mk-mine">{t("mk_yours")}</span>}
                    </b>
                    <div className="mk-badges">
                      {p.verified.map((v) => (
                        <span className="mk-vb" key={v}>
                          ✓ {t(v)}
                        </span>
                      ))}
                      <span className="mk-time">{ago(p.hoursAgo)}</span>
                    </div>
                  </div>
                  {p.mine && (
                    <button className="cmp-rm" onClick={() => removePost(p.id)}>
                      {t("mk_withdraw")}
                    </button>
                  )}
                </div>

                <div className="mk-ask">
                  <span className="mk-amt">{fmtVND(p.amount, lang)}</span>
                  <span className="pill">{purpName(p.purpose, lang)}</span>
                  <span className="mk-meta">{termLabel(p.termMonths, t)}</span>
                  <span className="mk-meta">{t(p.incomeBand)}</span>
                  <span className="mk-meta">{p.collateral ? t("mk_has_col") : t("mk_no_col")}</span>
                </div>

                {(p.note || p.noteKey) && <p className="mk-note">{p.note || t(p.noteKey as string)}</p>}

                <div className="mk-bar">
                  {best ? (
                    <span className="mk-best">
                      {t("mk_best_now")} <b>{best.offer.rate}%</b>
                      <i>
                        −{best.cut}% {t("mk_vs_listed")}
                      </i>
                    </span>
                  ) : (
                    <span className="mk-waiting">
                      {p.mine && justPosted === p.id ? (
                        <>
                          <span className="mk-pulse" /> {t("mk_waiting")}
                        </>
                      ) : (
                        t("mk_no_offers")
                      )}
                    </span>
                  )}
                  <button className="mk-toggle" onClick={() => setOpen(isOpen ? null : p.id)}>
                    {p.offers.length} {t("mk_offers")} {isOpen ? "▴" : "▾"}
                  </button>
                </div>

                {isOpen && p.offers.length > 0 && (
                  <div className="mk-offers">
                    {[...p.offers]
                      .sort((a, b) => a.rate - b.rate)
                      .map((of, i) => {
                        const b = bankOf(of.code);
                        return (
                          <div className={"mk-offer" + (i === 0 ? " win" : "")} key={of.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="mk-logo" src={logoSrc(of.code)} alt={b.name} />
                            <div className="mk-obody">
                              <div className="mk-obank">
                                <b>{b.name}</b>
                                {i === 0 && <span className="cmp-badge">{t("mk_leading")}</span>}
                                <span className="mk-otime">{ago(of.hoursAgo)}</span>
                              </div>
                              <div className="mk-oconds">
                                {of.conditions.map((c) => (
                                  <span className="mk-cond" key={c}>
                                    {t(c)}
                                  </span>
                                ))}
                                <span className="mk-cond">
                                  {t("mk_up_to")} {fmtVND(of.maxAmount, lang)} · {termLabel(of.termMonths, t)}
                                </span>
                              </div>
                            </div>
                            <div className="mk-orate">
                              <b>{of.rate}%</b>
                              <s>{of.listed}%</s>
                              <i>
                                {t("mk_expires")} {of.expiresInH}h
                              </i>
                            </div>
                            <div className="mk-oact">
                              <button
                                className="btn btn-green btn-sm"
                                onClick={() => router.push(`/chat?seed=${encodeURIComponent(b.name)}`)}
                              >
                                {t("mk_take")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <p className="mk-foot">{t("mk_foot")}</p>
      </div>
    </section>
  );
}
