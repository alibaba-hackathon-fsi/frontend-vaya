"use client";

/**
 * Inline glossary for the jargon the survival page prints as bare acronyms
 * (DTI, PTI, LTV…). Tapping or hovering the label opens a small card with the
 * expansion, a plain-language reading and the healthy range.
 *
 * The card is positioned `fixed` and clamped to the viewport: the metric grid
 * scrolls horizontally on phones and sits inside bordered cards, so an absolute
 * popover would either be clipped by an ancestor or push the page sideways.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { clampTip, safeTop } from "@/lib/chartTip";

export default function Term({ id, label }: { id: string; label: string }) {
  const { t } = useI18n();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect();
    const p = popRef.current?.getBoundingClientRect();
    if (!b) return;
    // Below first: these triggers sit inline in a line of text, so opening
    // downwards leaves what you were reading visible — and it cannot end up
    // behind the sticky header, which is what happened when it opened upwards.
    setPos(
      clampTip(
        { left: b.left, width: b.width, top: b.top, bottom: b.bottom },
        0.5,
        p?.width || 260,
        p?.height || 120,
        window.innerWidth,
        window.innerHeight,
        { topBound: safeTop(), preferBelow: true },
      ),
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDoc = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onDoc);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDoc);
    };
  }, [open, place]);

  const full = t("g_" + id + "_t");
  const plain = t("g_" + id + "_d");
  const healthy = t("g_" + id + "_h");
  if (!plain) return <>{label}</>;

  return (
    <span className="term">
      <button
        ref={btnRef}
        type="button"
        className={"term-btn" + (open ? " on" : "")}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {label}
        <i className="term-i" aria-hidden="true">
          ?
        </i>
      </button>
      {open && (
        <div
          ref={popRef}
          className="term-pop"
          role="tooltip"
          style={pos ? { top: pos.top, left: pos.left } : { opacity: 0, top: 0, left: 0 }}
        >
          {full && <b>{full}</b>}
          <p>{plain}</p>
          {healthy && (
            <span className="term-ok">
              {t("g_healthy")} {healthy}
            </span>
          )}
        </div>
      )}
    </span>
  );
}
