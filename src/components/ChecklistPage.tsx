"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import {
  buildChecklist,
  type ChecklistItem,
} from "@/lib/engine/checklistEngine";
import { DOCUMENT_CHECKLISTS } from "@/data/checklists";
import type { IncomeProofType } from "@/lib/engine/types";
import type { Purpose } from "@/data/banks";
import EmailChecklist from "@/components/EmailChecklist";

const INCOME_PROOFS: { value: IncomeProofType; labelKey: string }[] = [
  { value: "PAYROLL_TRANSFER", labelKey: "ip_payroll_transfer" },
  { value: "PAYROLL_CASH", labelKey: "ip_payroll_cash" },
  { value: "BUSINESS_REGISTERED", labelKey: "ip_business_reg" },
  { value: "BUSINESS_UNREGISTERED", labelKey: "ip_business_unreg" },
  { value: "RENTAL_INCOME", labelKey: "ip_rental" },
  { value: "FREELANCE_INVOICE", labelKey: "ip_freelance" },
];

const CATEGORY_ORDER: ChecklistItem["category"][] = [
  "IDENTITY",
  "INCOME",
  "COLLATERAL",
  "PURPOSE",
  "OTHER",
];

const CATEGORY_ICON: Record<string, string> = {
  IDENTITY: "🪪",
  INCOME: "💰",
  COLLATERAL: "🏠",
  PURPOSE: "🎯",
  OTHER: "📎",
};

export default function ChecklistPage() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const purpose = (sp.get("purpose") || "home") as Purpose;

  const [incomeProof, setIncomeProof] =
    useState<IncomeProofType>("PAYROLL_TRANSFER");

  const result = useMemo(
    () => buildChecklist(DOCUMENT_CHECKLISTS, incomeProof),
    [incomeProof],
  );

  const grouped = useMemo(() => {
    const all = [...result.required, ...result.optional];
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: all.filter((i) => i.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [result]);

  const needsCollateral =
    purpose === "home" || purpose === "car" || purpose === "secured";

  return (
    <section className="pageview on">
      <div className="wrap">
        <div className="surv-hero">
          <span className="sec-tag">{t("chk_tag")}</span>
          <h2>{t("chk_title")}</h2>
          <p>{t("chk_sub")}</p>
        </div>

        <div className="chk-layout">
          <form className="surv-form" onSubmit={(e) => e.preventDefault()}>
            <div className="fgroup">
              <div className="glab">{t("chk_your_loan")}</div>
              <label className="fq">
                <span>{t("q_purpose")}</span>
                <select value={purpose} disabled>
                  <option value="home">{t("f_home")}</option>
                  <option value="car">{t("f_car")}</option>
                  <option value="business">{t("f_business")}</option>
                  <option value="personal">{t("f_personal")}</option>
                  <option value="secured">{t("f_secured")}</option>
                </select>
              </label>
            </div>
            <div className="fgroup">
              <div className="glab">{t("chk_income_type")}</div>
              {INCOME_PROOFS.map((ip) => (
                <label className="chk-radio" key={ip.value}>
                  <input
                    type="radio"
                    name="incomeProof"
                    value={ip.value}
                    checked={incomeProof === ip.value}
                    onChange={() => setIncomeProof(ip.value)}
                  />
                  <span>{t(ip.labelKey)}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push("/chat")}
            >
              {t("chk_back_chat")}
            </button>
            {/* Escape hatch for anyone the document list has not convinced. */}
            <button
              type="button"
              className="btn btn-ghost hm-link"
              onClick={() => router.push("/human")}
            >
              {t("hm_cta")}
            </button>
          </form>

          <div className="chk-results">
            <div className="chk-summary">
              <span className="chk-count">{result.required.length}</span>
              <span>{t("chk_required_docs")}</span>
            </div>

            <EmailChecklist docCount={result.required.length} />

            {grouped.map((group) => (
              <div className="chk-group" key={group.category}>
                <div className="rc-clab">
                  {CATEGORY_ICON[group.category]}{" "}
                  {t("cat_" + group.category.toLowerCase())}
                </div>
                <div className="chk-items">
                  {group.items.map((item) => (
                    <div
                      className={"chk-item " + (item.required ? "req" : "opt")}
                      key={item.itemId}
                    >
                      <span className="chk-check">
                        {item.required ? "☐" : "○"}
                      </span>
                      <div className="chk-body">
                        <span className="chk-label">{item.labelVi}</span>
                        {item.noteVi && (
                          <span className="chk-note">{item.noteVi}</span>
                        )}
                      </div>
                      <span
                        className={
                          "chk-badge " + (item.required ? "b-req" : "b-opt")
                        }
                      >
                        {item.required ? t("chk_req") : t("chk_opt")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {!needsCollateral && (
              <p className="chk-hint">{t("chk_no_collateral")}</p>
            )}

            <div className="foot">{t("chk_foot")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
