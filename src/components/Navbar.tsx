"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { Logo } from "@/components/Logo";
import type { Lang } from "@/i18n/dict";

const LANGS: Record<Lang, { flag: string; name: string }> = {
  en: { flag: "🇬🇧", name: "English" },
  vi: { flag: "🇻🇳", name: "Tiếng Việt" },
  zh: { flag: "🇨🇳", name: "中文" },
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const selRef = useRef<HTMLDivElement>(null);

  // Close the language menu on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

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
          <div className="langsel" ref={selRef}>
            <button
              className="langbtn"
              aria-haspopup="true"
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
            >
              <span className="flag">{LANGS[lang].flag}</span>
              <span>{LANGS[lang].name}</span>
              <svg className="lchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <div className="langmenu" hidden={!open}>
              {(Object.keys(LANGS) as Lang[]).map((code) => (
                <button
                  key={code}
                  className={lang === code ? "on" : ""}
                  onClick={() => {
                    setLang(code);
                    setOpen(false);
                  }}
                >
                  <span className="flag">{LANGS[code].flag}</span> {LANGS[code].name}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-green btn-sm" onClick={() => router.push("/chat")}>
            {t("cta_chat")}
          </button>
        </div>
      </div>
    </header>
  );
}
