"use client";

/**
 * "Email me this checklist" — demo only, nothing is actually sent.
 *
 * The panel stays collapsed until asked for so it never competes with the
 * checklist itself, and the sent state repeats the address back so the user can
 * spot a typo, which is the one thing that actually goes wrong with this flow.
 */
import React, { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function EmailChecklist({ docCount }: { docCount: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [copy, setCopy] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const valid = EMAIL_RE.test(email.trim());

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || state === "sending") return;
    setState("sending");
    setTimeout(() => setState("sent"), 1000);
  };

  if (state === "sent") {
    return (
      <div className="mail-card sent">
        <span className="mail-tick">✓</span>
        <div className="mail-body">
          <b>{t("mail_done_t")}</b>
          <p>{t("mail_done_d").replace("{email}", email.trim())}</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setState("idle");
            setOpen(false);
          }}
        >
          {t("mail_again")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="mail-open" onClick={() => setOpen(true)}>
        <span className="mail-ic">✉</span>
        <span>
          <b>{t("mail_cta")}</b>
          <small>{t("mail_cta_sub").replace("{n}", String(docCount))}</small>
        </span>
        <span className="mail-arrow">→</span>
      </button>
    );
  }

  return (
    <form className="mail-card" onSubmit={send}>
      <div className="mail-head">
        <b>{t("mail_title")}</b>
        <button type="button" className="mail-x" onClick={() => setOpen(false)} aria-label={t("mail_close")}>
          ×
        </button>
      </div>
      <div className="mail-row">
        <input
          type="email"
          className="mail-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label={t("mail_title")}
        />
        <button className="btn btn-green" disabled={!valid || state === "sending"}>
          {state === "sending" ? t("mail_sending") : t("mail_send")}
        </button>
      </div>
      <label className="mail-check">
        <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} />
        <span>{t("mail_attach")}</span>
      </label>
    </form>
  );
}
