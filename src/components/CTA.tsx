"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import Underlined from "@/components/Underlined";
import ArrowField from "@/components/ArrowField";

export default function CTA() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <section className="wrap" style={{ padding: "20px 0 70px" }}>
      <div className="cta-band reveal has-arrows">
        {/* Rates drifting behind the invitation to act on them. */}
        <ArrowField />
        <h2>
          <span>{t("cta_t1")}</span> <Underlined light>{t("cta_t2")}</Underlined>
        </h2>
        <p>{t("cta_sub")}</p>
        <button className="btn btn-green" onClick={() => router.push("/chat")}>
          {t("cta_btn")}
        </button>
      </div>
    </section>
  );
}
