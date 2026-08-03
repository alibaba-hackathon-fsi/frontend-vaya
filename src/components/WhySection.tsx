"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import Underlined from "@/components/Underlined";
import MagicBento from "@/components/reactbits/MagicBento";
import type { BentoCardProps } from "@/components/reactbits/MagicBento";

const BANKS_COMPARE = [
  { code: "MB", name: "MB Bank", rate: "5.99%" },
  { code: "TCB", name: "Techcombank", rate: "6.2%" },
  { code: "VCB", name: "Vietcombank", rate: "6.45%" },
] as const;

function BankCompareMedia() {
  return (
    <ul className="wb-banks">
      {BANKS_COMPARE.map((b) => (
        <li key={b.code} className="wb-banks__row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wb-banks__logo" src={`/banks/${b.code}.png`} alt="" />
          <span className="wb-banks__name">{b.name}</span>
          <span className="wb-banks__rate">{b.rate}</span>
        </li>
      ))}
    </ul>
  );
}

function PlainLanguageMedia({ q, a }: { q: string; a: string }) {
  return (
    <div className="wb-chat" aria-hidden="true">
      <div className="wb-chat__bubble wb-chat__bubble--user">{q}</div>
      <div className="wb-chat__bubble wb-chat__bubble--bot">{a}</div>
    </div>
  );
}

function PrivacyMedia({
  banksGet,
  never,
  amount,
  term,
  income,
  name,
  phone,
  email,
}: Record<string, string>) {
  return (
    <div className="wb-privacy">
      <div className="wb-privacy__col wb-privacy__col--ok">
        <div className="wb-privacy__head">✓ {banksGet}</div>
        <div className="wb-privacy__row">
          <span>{amount}</span>
          <strong>₫ 2,400,000,000</strong>
        </div>
        <div className="wb-privacy__row">
          <span>{term}</span>
          <strong>240</strong>
        </div>
        <div className="wb-privacy__row">
          <span>{income}</span>
          <strong>₫ 50–100M/mo</strong>
        </div>
      </div>
      <div className="wb-privacy__col wb-privacy__col--no">
        <div className="wb-privacy__head">✕ {never}</div>
        <div className="wb-privacy__row">
          <span>{name}</span>
          <strong className="wb-privacy__dots">········</strong>
        </div>
        <div className="wb-privacy__row">
          <span>{phone}</span>
          <strong className="wb-privacy__dots">········</strong>
        </div>
        <div className="wb-privacy__row">
          <span>{email}</span>
          <strong className="wb-privacy__dots">········</strong>
        </div>
      </div>
    </div>
  );
}

function EstimatesMedia({
  monthly,
  interest,
  rate,
}: {
  monthly: string;
  interest: string;
  rate: string;
}) {
  return (
    <div className="wb-est">
      <div className="wb-est__stats">
        <div>
          <span>{monthly}</span>
          <strong>₫ 17.4tr</strong>
        </div>
        <div>
          <span>{interest}</span>
          <strong>₫ 1,780tr</strong>
        </div>
        <div>
          <span>{rate}</span>
          <strong className="wb-est__green">5.99%</strong>
        </div>
      </div>
      <svg className="wb-est__chart" viewBox="0 0 320 88" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="wbEstFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,199,118,0.28)" />
            <stop offset="100%" stopColor="rgba(0,199,118,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0 70 C40 66, 70 62, 100 58 C140 52, 170 40, 210 34 C250 28, 280 18, 320 12 L320 88 L0 88 Z"
          fill="url(#wbEstFill)"
        />
        <path
          d="M0 70 C40 66, 70 62, 100 58 C140 52, 170 40, 210 34 C250 28, 280 18, 320 12"
          fill="none"
          stroke="#00c776"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function LanguagesMedia() {
  return (
    <ul className="wb-langs">
      <li>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wb-langs__flag" src="/flags/gb.svg" alt="" />
        English
      </li>
      <li>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wb-langs__flag" src="/flags/vn.svg" alt="" />
        Tiếng Việt
      </li>
      <li>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wb-langs__flag" src="/flags/cn.svg" alt="" />
        中文
      </li>
    </ul>
  );
}

function FreeMedia({ sub }: { sub: string }) {
  return (
    <div className="wb-free">
      <div className="wb-free__zero">₫0</div>
      <p className="wb-free__sub">{sub}</p>
    </div>
  );
}

export default function WhySection() {
  const { t, lang } = useI18n();

  const cards: BentoCardProps[] = useMemo(
    () => [
      {
        label: "01",
        title: t("w1t"),
        description: t("w1d"),
        color: "#ffffff",
        media: <BankCompareMedia />,
      },
      {
        label: "02",
        title: t("w2t"),
        description: t("w2d"),
        color: "#ffffff",
        media: <PlainLanguageMedia q={t("wb_float_q")} a={t("wb_float_a")} />,
      },
      {
        label: "03",
        title: t("w3t"),
        description: t("w3d"),
        color: "#ffffff",
        media: (
          <PrivacyMedia
            banksGet={t("wb_banks_get")}
            never={t("wb_never")}
            amount={t("wb_amount")}
            term={t("wb_term")}
            income={t("wb_income")}
            name={t("wb_name")}
            phone={t("wb_phone")}
            email={t("wb_email")}
          />
        ),
      },
      {
        label: "04",
        title: t("w4t"),
        description: t("w4d"),
        color: "#ffffff",
        media: (
          <EstimatesMedia
            monthly={t("wb_monthly")}
            interest={t("wb_interest")}
            rate={t("wb_rate")}
          />
        ),
      },
      {
        label: "05",
        title: t("w5t"),
        description: t("w5d"),
        color: "#ffffff",
        media: <LanguagesMedia />,
      },
      {
        label: "06",
        title: t("w6t"),
        description: t("w6d"),
        color: "#ffffff",
        media: <FreeMedia sub={t("wb_free_sub")} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, t]
  );

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
            enableMagnetism={false}
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
