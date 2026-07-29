"use client";

// Wallet-pocket loan-purpose tiles (main-page quick entry): a white "card"
// peeking from a colored pocket, white line icon, label + starting rate. Each
// tile opens the chat advisor seeded with that purpose.
import React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, purpName, type Purpose } from "@/data/banks";
import type { Lang } from "@/i18n/dict";

const WALLET: [Purpose, string][] = [
  ["home", "#00A863"],
  ["car", "#2F6BFF"],
  ["business", "#8180C8"],
  ["personal", "#FF6341"],
  ["secured", "#0FB6B6"],
];

const WICON: Record<Purpose, React.ReactNode> = {
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  car: (
    <>
      <path d="M3 13l2-5h14l2 5v5H3z" />
      <circle cx="7.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </>
  ),
  business: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="1" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
    </>
  ),
  personal: <path d="M13 3L4 14h7l-1 7 9-11h-7z" />,
  secured: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="1" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </>
  ),
};

const ASK: Record<Purpose, Record<Lang, string>> = {
  home: { en: "I want a home loan", vi: "Tôi muốn vay mua nhà", zh: "我想申请购房贷款" },
  car: { en: "I want a car loan", vi: "Tôi muốn vay mua ô tô", zh: "我想申请购车贷款" },
  business: { en: "I need business capital", vi: "Tôi cần vốn kinh doanh", zh: "我需要经营资金" },
  personal: { en: "I want a personal loan", vi: "Tôi muốn vay tiêu dùng", zh: "我想申请个人贷款" },
  secured: { en: "I want a secured loan", vi: "Tôi muốn vay có tài sản đảm bảo", zh: "我想申请抵押贷款" },
};

export default function PurposePicker() {
  const router = useRouter();
  const { lang, t } = useI18n();

  const minRate = (p: Purpose): number => {
    const rs = PKG.filter((x) => x.purpose === p).map((x) => x.rate);
    return rs.length ? Math.min(...rs) : 0;
  };
  const open = (p: Purpose) => router.push(`/chat?q=${encodeURIComponent(ASK[p][lang] || ASK[p].en)}`);

  return (
    <section className="section purpose-sec">
      <div className="wrap">
        <div className="sec-head center reveal">
          <span className="sec-tag">{t("pp_tag")}</span>
          <h2>{t("pp_title")}</h2>
        </div>
        <div className="wallets">
          {WALLET.map(([p, c]) => (
            <button
              key={p}
              className="wallet"
              style={{ ["--wc" as string]: c } as React.CSSProperties}
              onClick={() => open(p)}
            >
              <span className="w-peek" />
              <span className="w-pocket">
                <span className="w-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    {WICON[p]}
                  </svg>
                </span>
                <span className="w-name">{purpName(p, lang)}</span>
                <span className="w-sub">
                  {t("from")} {minRate(p)}%/{t("yr")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
