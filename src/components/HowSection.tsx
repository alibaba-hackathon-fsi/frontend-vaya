"use client";

import React from "react";
import { useI18n } from "@/i18n/I18nProvider";

const STEPS: [string, string][] = [
  ["st1t", "st1d"],
  ["st2t", "st2d"],
  ["st3t", "st3d"],
];

export default function HowSection() {
  const { t } = useI18n();
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-tag">{t("how_tag")}</span>
          <h2>{t("how_title")}</h2>
        </div>
        <div className="steps reveal" id="steps">
          {STEPS.map(([tt, dd], i) => (
            <div className="step" key={tt}>
              <div className="sn">0{i + 1}</div>
              <h3>{t(tt)}</h3>
              <p>{t(dd)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
