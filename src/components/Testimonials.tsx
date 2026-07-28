"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nProvider";

const ITEMS: [string, string, string][] = [
  ["t1", "t1n", "t1r"],
  ["t2", "t2n", "t2r"],
  ["t3", "t3n", "t3r"],
];

export default function Testimonials() {
  const { t } = useI18n();
  return (
    <section className="section" style={{ background: "var(--surface)" }}>
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="sec-tag">{t("love_tag")}</span>
          <h2>{t("love_title")}</h2>
        </div>
        <div className="tst-grid" id="tstGrid">
          {ITEMS.map(([q, n, r]) => {
            const name = t(n);
            return (
              <div className="tst reveal" key={q}>
                <div className="stars">★★★★★</div>
                <p>{t(q)}</p>
                <div className="who">
                  <div className="a">{name.charAt(0)}</div>
                  <div>
                    <b>{name}</b>
                    <small>{t(r)}</small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
