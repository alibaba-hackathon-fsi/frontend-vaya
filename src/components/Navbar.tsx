"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { Logo } from "@/components/Logo";
import type { Lang } from "@/i18n/dict";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();

  // Scroll to a section on the home page, or navigate home-with-hash first.
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

  const langs: { code: Lang; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "vi", label: "VI" },
    { code: "zh", label: "中文" },
  ];

  return (
    <header>
      <div className="wrap nav">
        <a className="brand" onClick={goHome} style={{ cursor: "pointer" }}>
          <Logo /> Vaya
        </a>
        <div className="links">
          <a onClick={() => scrollToId("markets")}>{t("nav_markets")}</a>
          <a onClick={() => scrollToId("why")}>{t("nav_why")}</a>
          <a onClick={() => scrollToId("how")}>{t("nav_how")}</a>
          <a onClick={() => scrollToId("faq")}>{t("nav_faq")}</a>
        </div>
        <div className="right">
          <div className="lang" id="lang">
            {langs.map((l) => (
              <button
                key={l.code}
                className={lang === l.code ? "on" : ""}
                onClick={() => setLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-green btn-sm"
            onClick={() => router.push("/chat")}
          >
            {t("cta_chat")}
          </button>
        </div>
      </div>
    </header>
  );
}
