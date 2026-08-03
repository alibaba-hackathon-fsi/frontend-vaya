"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import Underlined from "@/components/Underlined";
import MagicBento from "@/components/reactbits/MagicBento";
import type { BentoCardProps } from "@/components/reactbits/MagicBento";

const CARDS: { titleKey: string; descKey: string; label: string }[] = [
  { titleKey: "w1t", descKey: "w1d", label: "01" },
  { titleKey: "w2t", descKey: "w2d", label: "02" },
  { titleKey: "w3t", descKey: "w3d", label: "03" },
  { titleKey: "w4t", descKey: "w4d", label: "04" },
  { titleKey: "w5t", descKey: "w5d", label: "05" },
  { titleKey: "w6t", descKey: "w6d", label: "06" },
];

export default function WhySection() {
  const { t, lang } = useI18n();

  const cards: BentoCardProps[] = useMemo(
    () =>
      CARDS.map((c) => ({
        title: t(c.titleKey),
        description: t(c.descKey),
        label: c.label,
        color: "#ffffff",
      })),
    // lang ensures cards refresh when dictionary language changes
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
