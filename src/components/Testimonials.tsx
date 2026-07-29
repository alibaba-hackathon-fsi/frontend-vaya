"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nProvider";

const ITEMS: [string, string, string][] = [
  ["t1", "t1n", "t1r"],
  ["t2", "t2n", "t2r"],
  ["t3", "t3n", "t3r"],
];

// Memoji-style avatars (on a green circle) per testimonial.
const AVA: Record<string, string> = {
  t1: "/testimonials/minh.png",
  t2: "/testimonials/an.png",
  t3: "/testimonials/linh.png",
};

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="a" src={AVA[q]} alt={name} />
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
