"use client";

/**
 * "Talk to a human" hand-off.
 *
 * Demo behaviour: the desk is deliberately shown as off duty. Rather than a dead
 * end, the offline state is the feature — it states when the desk reopens, keeps
 * the AI available in the meantime, and takes a callback request so the user
 * still leaves having done something.
 */
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

const AGENTS = [
  { id: "lan", name: "Lan Nguyễn", roleKey: "hm_role_home", av: "👩🏻‍💼" },
  { id: "minh", name: "Minh Trần", roleKey: "hm_role_biz", av: "👨🏻‍💼" },
  { id: "thao", name: "Thảo Phạm", roleKey: "hm_role_car", av: "👩🏻" },
];

const TOPICS = ["hm_topic_pkg", "hm_topic_docs", "hm_topic_reject", "hm_topic_other"];

export default function HumanAdvisor() {
  const { t } = useI18n();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const valid = name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || state === "sending") return;
    setState("sending");
    // Demo only — no request is made. The delay exists so the pending state is
    // visible to whoever is watching the walkthrough.
    setTimeout(() => setState("sent"), 1100);
  };

  return (
    <section className="pageview on">
      <div className="wrap">
        <button className="linkback" onClick={() => router.push("/chat")}>
          {t("hm_back")}
        </button>

        <div className="surv-hero has-aside">
          <div>
            <span className="sec-tag">{t("hm_tag")}</span>
            <h2>{t("hm_title")}</h2>
            <p>{t("hm_sub")}</p>
          </div>
          <div className="hm-hours">
            <div className="glab">{t("hm_hours_lab")}</div>
            <div className="hm-hrow">
              <span>{t("hm_hours_wd")}</span>
              <b>08:30 – 18:00</b>
            </div>
            <div className="hm-hrow">
              <span>{t("hm_hours_sat")}</span>
              <b>09:00 – 12:00</b>
            </div>
            <div className="hm-hrow">
              <span>{t("hm_hours_sun")}</span>
              <b className="hm-off">{t("hm_closed")}</b>
            </div>
          </div>
        </div>

        <div className="hm-banner">
          <span className="hm-dot" />
          <div>
            <b>{t("hm_offline_t")}</b>
            <p>{t("hm_offline_d")}</p>
          </div>
          <button className="btn btn-green btn-sm" onClick={() => router.push("/chat")}>
            {t("hm_use_ai")}
          </button>
        </div>

        <div className="hm-layout">
          <div>
            <div className="rc-clab">{t("hm_team")}</div>
            <div className="hm-team">
              {AGENTS.map((a) => (
                <div className="hm-agent" key={a.id}>
                  <span className="hm-av">{a.av}</span>
                  <div className="hm-who">
                    <b>{a.name}</b>
                    <small>{t(a.roleKey)}</small>
                  </div>
                  <span className="hm-status">
                    <i /> {t("hm_away")}
                  </span>
                </div>
              ))}
            </div>
            <p className="chk-hint">{t("hm_note")}</p>
          </div>

          <div className="hm-form-card">
            <div className="rc-clab">{t("hm_cb_title")}</div>
            {state === "sent" ? (
              <div className="hm-done">
                <div className="hm-done-ic">✓</div>
                <b>{t("hm_done_t")}</b>
                <p>{t("hm_done_d").replace("{phone}", phone)}</p>
                <div className="hm-done-act">
                  <button className="btn btn-ghost btn-sm" onClick={() => setState("idle")}>
                    {t("hm_done_again")}
                  </button>
                  <button className="btn btn-green btn-sm" onClick={() => router.push("/chat")}>
                    {t("hm_use_ai")}
                  </button>
                </div>
              </div>
            ) : (
              <form className="surv-form hm-form" onSubmit={submit}>
                <label className="fq">
                  <span>{t("hm_f_name")}</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("hm_f_name_ph")} />
                </label>
                <label className="fq">
                  <span>{t("hm_f_phone")}</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                  />
                </label>
                <label className="fq">
                  <span>{t("hm_f_topic")}</span>
                  <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {TOPICS.map((k) => (
                      <option value={k} key={k}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fq">
                  <span>{t("hm_f_note")}</span>
                  <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("hm_f_note_ph")} />
                </label>
                <button className="btn btn-green" disabled={!valid || state === "sending"}>
                  {state === "sending" ? t("hm_sending") : t("hm_send")}
                </button>
                <p className="hm-demo">{t("demo_note")}</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
