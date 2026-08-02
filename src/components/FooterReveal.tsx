"use client";

/**
 * Curtain reveal for the footer.
 *
 * The footer is pinned to the bottom of the viewport *behind* the page, and the
 * page column is opaque, so the footer only appears as the last screenful of
 * content slides away — instead of just scrolling into view like any other
 * block.
 *
 * The slot reserves exactly the footer's height in scroll distance, measured at
 * runtime rather than hard-coded, because the footer is four columns wide on a
 * desktop and a tall stack on a phone.
 *
 * The effect turns itself off when it would misbehave: a footer taller than the
 * viewport could never be fully shown, and on a page too short to scroll there
 * is nothing to slide away. In both cases everything falls back to a plain
 * static footer.
 */
import React, { useEffect, useRef, useState } from "react";

export default function FooterReveal({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;

    const measure = () => {
      const fh = el.offsetHeight;
      const vh = window.innerHeight;
      const fits = fh > 0 && fh <= vh - 24;
      // scrollHeight already includes the slot, so compare against it directly
      const scrollable = document.documentElement.scrollHeight > vh + fh + 160;
      setHeight(fh);
      setOn(fits && scrollable);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    // Sections reveal on scroll and change the page height, so re-check once
    // things have settled.
    const t = setTimeout(measure, 800);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className={"foot-slot" + (on ? " on" : "")} style={on ? { height } : undefined}>
      <div ref={inner} className="foot-fixed">
        {children}
      </div>
    </div>
  );
}
