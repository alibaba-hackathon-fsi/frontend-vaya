"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { LogoWhite } from "@/components/Logo";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  const scrollToId = (id: string) => {
    if (pathname === "/") {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#" + id);
    }
  };
  const goHome = () => {
    if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    else router.push("/");
  };
  const openChat = () => router.push("/chat");

  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a className="brand" onClick={goHome} style={{ cursor: "pointer" }}>
              <LogoWhite /> Vaya
            </a>
            <p>{t("foot_about")}</p>
          </div>
          <div>
            <h5>{t("foot_product")}</h5>
            <a onClick={openChat}>{t("cta_chat")}</a>
            <a onClick={() => scrollToId("markets")}>{t("nav_markets")}</a>
            <a onClick={() => scrollToId("how")}>{t("nav_how")}</a>
          </div>
          <div>
            <h5>{t("foot_loans")}</h5>
            <a onClick={() => scrollToId("markets")}>{t("f_home")}</a>
            <a onClick={() => scrollToId("markets")}>{t("f_car")}</a>
            <a onClick={() => scrollToId("markets")}>{t("f_business")}</a>
            <a onClick={() => scrollToId("markets")}>{t("f_personal")}</a>
          </div>
          <div>
            <h5>{t("foot_company")}</h5>
            <a>{t("foot_about_l")}</a>
            <a>{t("foot_privacy")}</a>
            <a>{t("foot_contact")}</a>
          </div>
        </div>
        <div className="foot-bot">
          <span>© 2026 Vaya. Built for the Alibaba Cloud Hackathon.</span>
          <button className="foot-top" onClick={goHome}>
            {t("foot_top")} <span aria-hidden="true">↑</span>
          </button>
        </div>
        <p className="disc">{t("disc")}</p>
      </div>

      {/* Full-bleed sign-off. The letters are deliberately cropped by the band:
          the mark carries on past the edge of the page rather than sitting
          politely inside it. Decorative, so it is hidden from screen readers. */}
      <div className="foot-mark" aria-hidden="true">
        <span className="foot-mark-logo">
          <LogoWhite />
        </span>
        <span className="foot-mark-word">VAYA</span>
      </div>
    </footer>
  );
}
