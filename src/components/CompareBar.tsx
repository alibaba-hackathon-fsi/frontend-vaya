"use client";

/**
 * Sticky basket for the compare feature. Mounted once in the root layout so a
 * selection made on the markets table is still visible after navigating to a
 * package detail page. Hides itself when empty and on /compare, where the
 * selection is already the whole screen.
 */
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PKG, bankOf, logoSrc, prodName } from "@/data/banks";
import {
  COMPARE_MAX,
  clearCompare,
  removeCompare,
  useCompare,
} from "@/lib/compareStore";

export default function CompareBar() {
  const ids = useCompare();
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useI18n();

  if (!ids.length || pathname.startsWith("/compare")) return null;

  return (
    <div className="cmpbar" role="region" aria-label={t("cx_bar_title")}>
      <div className="cmpbar-in">
        <div className="cmpbar-lab">
          <b>{t("cx_bar_title")}</b>
          <span>
            {ids.length}/{COMPARE_MAX}
          </span>
        </div>

        <div className="cmpbar-chips">
          {ids.map((i) => {
            const p = PKG[i];
            if (!p) return null;
            return (
              <span className="cmpchip" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc(p.code)} alt="" />
                <span className="cmpchip-t">
                  <b>{bankOf(p.code).name}</b>
                  <small>{prodName(p, lang)}</small>
                </span>
                <button
                  className="cmpchip-x"
                  onClick={() => removeCompare(i)}
                  aria-label={t("cx_remove")}
                  title={t("cx_remove")}
                >
                  ×
                </button>
              </span>
            );
          })}
          {/* Empty slots make the cap legible without a sentence explaining it. */}
          {Array.from({ length: COMPARE_MAX - ids.length }).map((_, k) => (
            <span className="cmpchip cmpchip-ghost" key={"g" + k}>
              {t("cx_slot")}
            </span>
          ))}
        </div>

        <div className="cmpbar-act">
          <button className="btn btn-ghost btn-sm" onClick={clearCompare}>
            {t("cx_clear")}
          </button>
          <button
            className="btn btn-green btn-sm"
            disabled={ids.length < 2}
            onClick={() => router.push("/compare")}
          >
            {ids.length < 2 ? t("cx_need_two") : t("cx_open")}
          </button>
        </div>
      </div>
    </div>
  );
}
