"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { Logo } from "@/components/Logo";

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
              <Logo /> Vaya
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
          <span>Vaya · Deep Teal &amp; Green</span>
        </div>
        <p className="disc">{t("disc")}</p>
      </div>
    </footer>
  );
}
