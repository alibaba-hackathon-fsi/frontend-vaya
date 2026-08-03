"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import Underlined from "@/components/Underlined";
import MagicBento from "@/components/reactbits/MagicBento";
import type { BentoCardProps } from "@/components/reactbits/MagicBento";

/**
 * Why-Vaya bento.
 *
 * The grid gives cards 3 and 4 a 2x2 span, so a title plus one line of copy
 * left them mostly empty. Each card now carries a visual sized to its slot, and
 * each visual states something true about the product rather than filling
 * space: the real bank marks with their real headline rates, the actual split
 * between what a bank receives and what it never sees, a declining-balance
 * curve. The bento's own behaviour is untouched.
 */

/** Three of the real bank marks, with their headline rates. */
const RATE_ROWS: { code: string; name: string; rate: string }[] = [
  { code: "MB", name: "MB Bank", rate: "5.99%" },
  { code: "TCB", name: "Techcombank", rate: "6.2%" },
  { code: "VCB", name: "Vietcombank", rate: "6.45%" },
];

const LANGS: { flag: string; label: string }[] = [
  { flag: "/flags/gb.svg", label: "English" },
  { flag: "/flags/vn.svg", label: "Tiếng Việt" },
  { flag: "/flags/cn.svg", label: "中文" },
];

/** Shaped like a real declining-balance amortisation, not a random squiggle. */
const CURVE = "0,52 26,49 52,45 78,41 104,36 130,31 156,26 182,21 208,15 234,9 260,4";

export default function WhySection() {
  const { t, lang } = useI18n();

  const cards: BentoCardProps[] = useMemo(() => {
    const media: React.ReactNode[] = [
      // 01 — compare banks: real marks, real headline rates
      <div className="bx-rates" key="m1">
        {RATE_ROWS.map((r) => (
          <div className="bx-rate" key={r.code}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/banks/${r.code}.png`} alt={r.name} />
            <span>{r.name}</span>
            <b>{r.rate}</b>
          </div>
        ))}
      </div>,

      // 02 — plain language: the product's own voice, in miniature
      <div className="bx-chat" key="m2">
        <span className="bx-b user">{t("wm_ask")}</span>
        <span className="bx-b bot">{t("wm_ans")}</span>
      </div>,

      // 03 — privacy: the actual split between what is sent and what never is
      <div className="bx-priv" key="m3">
        <div className="bx-priv-col">
          <div className="bx-priv-h ok">✓ {t("wm_receives")}</div>
          <div className="bx-field">
            <span>{t("mk_l_amount")}</span>
            <b>₫2,400,000,000</b>
          </div>
          <div className="bx-field">
            <span>{t("mk_l_term")}</span>
            <b>240</b>
          </div>
          <div className="bx-field">
            <span>{t("mk_l_income")}</span>
            <b>{t("mk_inc_3")}</b>
          </div>
        </div>
        <div className="bx-priv-col">
          <div className="bx-priv-h no">✕ {t("wm_never")}</div>
          <div className="bx-field masked">
            <span>{t("hm_f_name")}</span>
            <b>••••••••</b>
          </div>
          <div className="bx-field masked">
            <span>{t("hm_f_phone")}</span>
            <b>••••••••</b>
          </div>
          <div className="bx-field masked">
            <span>{t("wm_email")}</span>
            <b>••••••••</b>
          </div>
        </div>
      </div>,

      // 04 — instant estimate: the numbers, over the balance curve
      <div className="bx-est" key="m4">
        <div className="bx-kpis">
          <div className="bx-kpi">
            <span>{t("wm_mo")}</span>
            <b>₫17.4tr</b>
          </div>
          <div className="bx-kpi">
            <span>{t("wm_int")}</span>
            <b>₫1,780tr</b>
          </div>
          <div className="bx-kpi">
            <span>{t("rate")}</span>
            <b className="g">5.99%</b>
          </div>
        </div>
        <svg className="bx-curve" viewBox="0 0 260 56" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={`0,56 ${CURVE} 260,56`} fill="rgba(0,199,118,.14)" />
          <polyline points={CURVE} fill="none" stroke="#00A863" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </div>,

      // 05 — the three languages the app actually ships
      <div className="bx-langs" key="m5">
        {LANGS.map((l) => (
          <span className="bx-lang" key={l.label}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.flag} alt="" />
            {l.label}
          </span>
        ))}
      </div>,

      // 06 — free: the number is the whole message
      <div className="bx-free" key="m6">
        <b>₫0</b>
        <span>{t("wm_free")}</span>
      </div>,
    ];

    return [1, 2, 3, 4, 5, 6].map((n, i) => ({
      title: t(`w${n}t`),
      description: t(`w${n}d`),
      label: `0${n}`,
      color: "#ffffff",
      media: media[i],
    }));
    // lang ensures cards refresh when dictionary language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, t]);

  return (
    <section className="section" id="why" style={{ background: "var(--surface)" }}>
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="sec-tag">{t("why_tag")}</span>
          <h2>
            <span>{t("why_t1")}</span> <Underlined>{t("why_t2")}</Underlined>
          </h2>
        </div>
        <div className="why-bento reveal">
          <MagicBento
            cards={cards}
            textAutoHide={false}
            enableStars
            enableSpotlight
            enableBorderGlow
            enableTilt={false}
            enableMagnetism
            clickEffect
            glowColor="0, 199, 118"
            particleCount={10}
            spotlightRadius={280}
          />
        </div>
      </div>
    </section>
  );
}
