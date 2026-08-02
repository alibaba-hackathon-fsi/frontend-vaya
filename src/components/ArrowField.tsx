"use client";

/**
 * Scroll-driven field of drifting chevrons, meant to sit behind the content of
 * a dark panel.
 *
 * Columns travel in alternating directions and the distance they cover is tied
 * to how far the page has scrolled — scroll down and they part, scroll back and
 * they close. It is the product's one-line thesis made visible: rates are never
 * still, some rising, most falling, all of them moving while you are not
 * looking.
 *
 * Each column is a single element tiling one chevron as a repeating background,
 * so eleven columns cost eleven nodes rather than a few hundred, and the loop is
 * seamless because the offset wraps at exactly one tile.
 */
import React, { useEffect, useMemo, useRef } from "react";

/** Height of one chevron tile — must match background-size in the CSS. */
const TILE = 54;

export default function ArrowField({ columns = 11 }: { columns?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Derived from the index so server and client render identically.
  const cols = useMemo(
    () =>
      Array.from({ length: columns }, (_, i) => ({
        down: i % 2 === 0,
        // Uneven spread stops neighbouring columns moving in lockstep.
        speed: 0.55 + ((i * 37) % 11) / 14,
        opacity: 0.2 + ((i * 53) % 7) / 13,
      })),
    [columns],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let drift = 0;
    let last = window.scrollY;

    const frame = () => {
      const y = window.scrollY;
      // Scroll drives it; a slow crawl keeps it alive when the page is still.
      drift += (y - last) * 1.15 + 0.18;
      last = y;
      for (let i = 0; i < cols.length; i++) {
        const el = colRefs.current[i];
        if (!el) continue;
        const c = cols[i];
        const raw = drift * c.speed * (c.down ? 1 : -1);
        const off = ((raw % TILE) + TILE) % TILE;
        el.style.transform = `translate3d(0, ${off - TILE}px, 0)`;
      }
      raf = requestAnimationFrame(frame);
    };

    // Only burn frames while the panel is actually on screen.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !raf) {
          last = window.scrollY;
          raf = requestAnimationFrame(frame);
        } else if (!e.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 },
    );
    io.observe(wrap);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cols]);

  return (
    <div className="arrow-field" ref={wrapRef} aria-hidden="true">
      {cols.map((c, i) => (
        <div className="arrow-col" key={i}>
          <div
            className={"arrow-run " + (c.down ? "dn" : "up")}
            style={{ opacity: c.opacity }}
            ref={(el) => {
              colRefs.current[i] = el;
            }}
          />
        </div>
      ))}
    </div>
  );
}
