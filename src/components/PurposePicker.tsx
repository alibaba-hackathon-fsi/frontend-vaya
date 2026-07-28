"use client";

// Wallet-pocket loan-purpose tiles (main-page quick entry). Each tile opens the
// chat advisor seeded with that purpose. Colored, square-cornered "pocket" cards.
import React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, purpName, type Purpose } from "@/data/banks";
import type { Lang } from "@/i18n/dict";

const WALLET: [Purpose, string, string][] = [
  ["home", "#00A863", "🏠"],
  ["car", "#2F6BFF", "🚗"],
  ["business", "#8180C8", "💼"],
  ["personal", "#FF6341", "⚡"],
  ["secured", "#0FB6B6", "🔒"],
];

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
          {WALLET.map(([p, c, ic]) => (
            <button
              key={p}
              className="wallet"
              style={{ ["--wc" as string]: c } as React.CSSProperties}
              onClick={() => open(p)}
            >
              <span className="w-ic">{ic}</span>
              <span className="w-name">{purpName(p, lang)}</span>
              <span className="w-sub">
                {t("from")} {minRate(p)}%/{t("yr")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
