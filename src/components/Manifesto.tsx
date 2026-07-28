"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Lang } from "@/i18n/dict";

function hotSet(lang: Lang): Set<string> {
  if (lang === "en") return new Set(["conversation", "confidence", "Vaya", "clear", "right"]);
  if (lang === "vi") return new Set(["chuyện", "tự", "tin", "rõ", "đúng", "Vaya"]);
  return new Set(["对话", "自信", "清晰", "Vaya", "对"]);
}

export default function Manifesto() {
  const { lang, t } = useI18n();
  const ref = useRef<HTMLParagraphElement>(null);

  const words = useMemo(() => {
    const text = t("manifesto");
    const hot = hotSet(lang);
    return text.split(/\s+/).map((w) => {
      const k = w.replace(/[.,—]/g, "");
      return { w, hot: hot.has(k) };
    });
  }, [lang, t]);

  useEffect(() => {
    const fill = () => {
      const p = ref.current;
      if (!p) return;
      const spans = Array.from(p.querySelectorAll<HTMLSpanElement>(".word"));
      const tr = p.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.4;
      let pr = (start - tr.top) / (start - end + tr.height);
      pr = Math.max(0, Math.min(1, pr));
      const n = Math.round(pr * spans.length);
      spans.forEach((s, i) => s.classList.toggle("on", i < n));
    };
    const onScroll = () => requestAnimationFrame(fill);
    window.addEventListener("scroll", onScroll, { passive: true });
    fill();
    return () => window.removeEventListener("scroll", onScroll);
  }, [words]);

  return (
    <section className="section manifesto" id="manifesto">
      <div className="wrap">
        <span className="sec-tag">{t("belief_tag")}</span>
        <p className="big" id="manifestoText" ref={ref}>
          {words.map((item, i) => (
            <span key={i} className={"word" + (item.hot ? " hot" : "")}>
              {item.w}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
