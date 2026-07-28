"use client";

// Hand-drawn brush underline under a green highlight phrase. Draws itself in
// when scrolled into view (stroke-dashoffset transition; see .ul-svg in globals.css).
import React, { useEffect, useRef } from "react";

export default function Underlined({ children, light }: { children: React.ReactNode; light?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("draw");
            io.disconnect();
          }
        }),
      { threshold: 0.55 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <span className="ul-wrap">
      <span className="g-text">{children}</span>
      <svg ref={ref} className={"ul-svg" + (light ? " light" : "")} viewBox="0 0 300 24" preserveAspectRatio="none">
        <path pathLength={1} d="M5,15 C70,4 130,20 190,11 C242,4 286,16 296,10" />
      </svg>
    </span>
  );
}
