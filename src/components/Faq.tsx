"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nProvider";

const QA: [string, string][] = [
  ["q1", "a1"],
  ["q2", "a2"],
  ["q3", "a3"],
  ["q4", "a4"],
];

export default function Faq() {
  const { t } = useI18n();
  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="sec-tag">FAQ</span>
          <h2>{t("faq_title")}</h2>
        </div>
        <div className="faq reveal" id="faqList">
          {QA.map(([q, a]) => (
            <details key={q}>
              <summary>
                <span>{t(q)}</span>
                <i>+</i>
              </summary>
              <div className="fa">{t(a)}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
