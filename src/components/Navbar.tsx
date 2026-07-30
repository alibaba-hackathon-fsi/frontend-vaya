"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { Logo } from "@/components/Logo";
import type { Lang } from "@/i18n/dict";

const LANGS: Record<Lang, { flag: string; name: string }> = {
  en: { flag: "/flags/gb.svg", name: "English" },
  vi: { flag: "/flags/vn.svg", name: "Tiếng Việt" },
  zh: { flag: "/flags/cn.svg", name: "中文" },
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const selRef = useRef<HTMLDivElement>(null);

  // Close the language menu on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (selRef.current && !selRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Collapse the mobile menu when returning to desktop widths.
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 900) setMenu(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const goHome = () => {
    if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
    else router.push("/");
  };

  // The nav lists real destinations only. Sub-pages are children of a
  // destination, so they light up their parent instead of adding an entry:
  //   /            + /package/*                  -> Home
  //   /survival                                  -> Survival Score
  //   /chat, /checklist, /analysis               -> the advisor CTA
  const isHome = pathname === "/" || pathname.startsWith("/package") || pathname.startsWith("/compare");
  const isSurvival = pathname.startsWith("/survival");
  const inAdvisor =
    pathname.startsWith("/chat") ||
    pathname.startsWith("/checklist") ||
    pathname.startsWith("/analysis");

  return (
    <header>
      <div className="wrap nav">
        <a className="brand" onClick={goHome} style={{ cursor: "pointer" }}>
          <Logo /> Vaya
        </a>
        <div className="links">
          <a className={isHome ? "on" : ""} onClick={goHome}>
            {t("nav_home")}
          </a>
          <a className={isSurvival ? "on" : ""} onClick={() => router.push("/survival")}>
            {t("nav_surv")}
          </a>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="flag" src={LANGS[lang].flag} alt="" />
              <span className="langlab">{LANGS[lang].name}</span>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="flag" src={LANGS[code].flag} alt="" /> {LANGS[code].name}
                </button>
              ))}
            </div>
          </div>
          <button
            className={"btn btn-green btn-sm navcta" + (inAdvisor ? " on" : "")}
            onClick={() => router.push("/chat")}
          >
            {t("cta_chat")}
          </button>
          <button
            className={"navtoggle" + (menu ? " on" : "")}
            aria-label="Menu"
            aria-expanded={menu}
            onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
      {/* Mobile navigation panel (hamburger) */}
      <nav className="navpanel" hidden={!menu}>
        <a className={isHome ? "on" : ""} onClick={() => { setMenu(false); goHome(); }}>
          {t("nav_home")}
        </a>
        <a className={isSurvival ? "on" : ""} onClick={() => { setMenu(false); router.push("/survival"); }}>
          {t("nav_surv")}
        </a>
      </nav>
    </header>
  );
}
