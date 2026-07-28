"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nProvider";
import Underlined from "@/components/Underlined";

// Icon path sets, ported verbatim from the source `wicons` map.
const ICONS: Record<string, React.ReactNode> = {
  M: (
    <>
      <path d="M4 5h6v14H4zM14 5h6v14h-6z" />
    </>
  ),
  C: (
    <>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </>
  ),
  L: (
    <>
      <rect x="3" y="11" width="18" height="11" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </>
  ),
  E: (
    <>
      <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
    </>
  ),
  G: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
    </>
  ),
  S: (
    <>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </>
  ),
};

const CARDS: [string, string, string][] = [
  ["w1t", "w1d", "M"],
  ["w2t", "w2d", "C"],
  ["w3t", "w3d", "L"],
  ["w4t", "w4d", "E"],
  ["w5t", "w5d", "G"],
  ["w6t", "w6d", "S"],
];

export default function WhySection() {
  const { t } = useI18n();
  return (
    <section className="section" id="why" style={{ background: "var(--surface)" }}>
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="sec-tag">{t("why_tag")}</span>
          <h2>
            <span>{t("why_t1")}</span> <Underlined>{t("why_t2")}</Underlined>
          </h2>
        </div>
        <div className="cards" id="whyCards">
          {CARDS.map(([tt, dd, ic]) => (
            <div className="card reveal" key={tt}>
              <div className="ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  {ICONS[ic]}
                </svg>
              </div>
              <h3>{t(tt)}</h3>
              <p>{t(dd)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
