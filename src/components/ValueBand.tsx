"use client";

// Continuously scrolling value-prop band (light theme, green gradient), with
// short phrases separated by ✦ sparkles. rAF ticker loops seamlessly.
import React, { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function ValueBand() {
  const { lang, tRaw } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const raw = tRaw("vpband");
  const items: string[] = Array.isArray(raw) ? raw : [];

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let x = 0;
    const step = () => {
      const half = el.scrollWidth / 2;
      x -= 0.5;
      if (half > 0 && -x >= half) x += half;
      el.style.transform = `translateX(${x.toFixed(1)}px)`;
      raf = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(raf);
  }, [lang]);

  return (
    <section className="vpband">
      <div className="vpband-track" ref={trackRef}>
        {[...items, ...items].map((x, i) => (
          <React.Fragment key={i}>
            <span className="vp-i">{x}</span>
            <span className="vp-s">✦</span>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
