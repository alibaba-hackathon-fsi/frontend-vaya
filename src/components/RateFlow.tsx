"use client";

/**
 * Full-bleed band about the market moving, with the scroll-driven chevrons
 * behind it.
 *
 * It sits between the value marquee and the testimonials: the marquee finishes
 * the "what Vaya is" argument, this answers "why keep using it", and the social
 * proof then lands on someone already convinced. Full width on purpose — as a
 * card floating inside a section it read as an orphan panel, and against the
 * dark Manifesto above it there was no edge to see.
 */
import React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import ArrowField from "@/components/ArrowField";

export default function RateFlow() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <section className="flow-band">
      <ArrowField />
      <div className="wrap">
        <div className="flow-body">
          <span className="sec-tag">{t("fl_tag")}</span>
          <h2>{t("fl_title")}</h2>
          <p>{t("fl_sub")}</p>
          <button className="btn btn-green" onClick={() => router.push("/chat")}>
            {t("cta_chat")}
          </button>
        </div>
      </div>
    </section>
  );
}
