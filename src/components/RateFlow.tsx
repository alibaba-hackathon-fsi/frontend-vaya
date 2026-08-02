"use client";

/**
 * Scroll-driven band of drifting arrows.
 *
 * Columns of chevrons travel in alternating directions, and the distance they
 * travel is tied to how far the page has scrolled — scroll down and they part,
 * scroll back and they close again. It is decorative, but it is the product's
 * one-line thesis made visible: rates are never still, some rising, most of
 * them falling, all of them moving while you are not looking.
 *
 * Each column is a single element tiling a chevron as a repeating background,
 * so eleven columns cost eleven DOM nodes rather than a few hundred, and the
 * loop is seamless by wrapping the offset at one tile height.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

/** Height of one chevron tile, must match the background-size in the CSS. */
const TILE = 54;
const COLS = 11;

export default function RateFlow() {
  const { t } = useI18n();
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Deterministic per-column character: direction, speed and depth. Derived
  // from the index so the server and client render the same thing.
  const cols = useMemo(
    () =>
      Array.from({ length: COLS }, (_, i) => {
        const down = i % 2 === 0;
        return {
          down,
          // Prime-ish spread keeps neighbouring columns from moving in lockstep.
          speed: 0.55 + ((i * 37) % 11) / 14,
          opacity: 0.22 + ((i * 53) % 7) / 12,
        };
      }),
    [],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let visible = false;
    let drift = 0;
    let last = window.scrollY;

    const frame = () => {
      const y = window.scrollY;
      // Scroll drives it; a slow constant crawl keeps the band alive when the
      // page is still, so it never looks frozen mid-screen.
      drift += (y - last) * 1.15 + 0.18;
      last = y;
      for (let i = 0; i < cols.length; i++) {
        const el = colRefs.current[i];
        if (!el) continue;
        const c = cols[i];
        const raw = drift * c.speed * (c.down ? 1 : -1);
        // Wrap into [0, TILE) so the tiled background never shows a seam.
        const off = ((raw % TILE) + TILE) % TILE;
        el.style.transform = `translate3d(0, ${off - TILE}px, 0)`;
      }
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) {
          last = window.scrollY;
          raf = requestAnimationFrame(frame);
        } else if (!visible && raf) {
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
    <section className="section flow-sec">
      <div className="wrap">
        <div className="flow-card reveal" ref={wrapRef}>
          <div className="flow-field" aria-hidden="true">
            {cols.map((c, i) => (
              <div className="flow-col" key={i}>
                <div
                  className={"flow-run " + (c.down ? "dn" : "up")}
                  style={{ opacity: c.opacity }}
                  ref={(el) => {
                    colRefs.current[i] = el;
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flow-body">
            <span className="sec-tag">{t("fl_tag")}</span>
            <h2>{t("fl_title")}</h2>
            <p>{t("fl_sub")}</p>
            <button className="btn btn-green" onClick={() => router.push("/chat")}>
              {t("cta_chat")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
