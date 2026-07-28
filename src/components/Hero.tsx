"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

export default function Hero() {
  const router = useRouter();
  const { lang, t, tRaw } = useI18n();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [typed, setTyped] = useState("");

  const openChat = (seed: string) => {
    const q = seed.trim();
    router.push(q ? `/chat?q=${encodeURIComponent(q)}` : "/chat");
  };
  const send = () => openChat(inputRef.current?.value ?? "");
  const suggestKeys = ["s1", "s2", "s3", "s4"] as const;

  // Title typewriter — cycles the localized `hero_tw` phrases into the green span.
  useEffect(() => {
    const raw = tRaw("hero_tw");
    const phrases = Array.isArray(raw) && raw.length ? raw : [t("hero_t2")];
    let wi = 0,
      ci = 0,
      del = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const w = phrases[wi % phrases.length];
      setTyped(w.slice(0, ci));
      if (!del) {
        ci++;
        if (ci > w.length) {
          del = true;
          timer = setTimeout(tick, 1600);
          return;
        }
      } else {
        ci--;
        if (ci < 0) {
          del = false;
          wi++;
          ci = 0;
        }
      }
      timer = setTimeout(tick, del ? 45 : 82);
    };
    tick();
    return () => clearTimeout(timer);
  }, [lang, t, tRaw]);

  // Placeholder typewriter — set imperatively (the textarea has no `placeholder`
  // prop) so frequent title re-renders don't reset it. Pauses on focus/typing.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const raw = tRaw("ph_tw");
    const phrases = Array.isArray(raw) ? raw : [];
    if (!phrases.length) return;
    let pi = 0,
      pc = 0,
      del = false,
      paused = false;
    let timer: ReturnType<typeof setTimeout>;
    const onFocus = () => {
      paused = true;
      el.setAttribute("placeholder", "");
    };
    const onBlur = () => {
      if (!el.value) paused = false;
    };
    const onInput = () => {
      paused = !!el.value;
    };
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    el.addEventListener("input", onInput);
    const tick = () => {
      if (paused) {
        timer = setTimeout(tick, 400);
        return;
      }
      const w = phrases[pi % phrases.length];
      el.setAttribute("placeholder", w.slice(0, pc) + "▋");
      if (!del) {
        pc++;
        if (pc > w.length) {
          del = true;
          timer = setTimeout(tick, 1600);
          return;
        }
      } else {
        pc--;
        if (pc < 0) {
          del = false;
          pi++;
          pc = 0;
        }
      }
      timer = setTimeout(tick, del ? 34 : 64);
    };
    tick();
    return () => {
      clearTimeout(timer);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("input", onInput);
    };
  }, [lang, tRaw]);

  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="blob b1" />
        <div className="blob b2" />
      </div>
      {/* Animated mascot — a true-transparent looping WebP that sits a fixed
          distance left of the centered content and gestures toward the chat. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-mascot" src="/mascot/vaya-mascot.webp" alt="Vaya mascot" aria-hidden="true" />
      <div className="wrap hero-inner">
        <span className="eyebrow">
          <span className="dot" /> <span>{t("hero_eyebrow")}</span>
        </span>
        <h1>
          <span className="hl-1">{t("hero_t1")}</span>
          <span className="hl-2">
            <span className="g-text type-tw">{typed}</span>
            <span className="tw-caret" />
          </span>
        </h1>
        <p className="sub">{t("hero_sub")}</p>

        <div className="launcher">
          <textarea
            ref={inputRef}
            id="heroInput"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="lrow">
            <button className="send" aria-label="Ask" type="button" onClick={send}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="suggests">
          <span className="lbl">{t("suggest")}</span>
          {suggestKeys.map((k) => (
            <button
              key={k}
              className="chip"
              type="button"
              onClick={(e) => openChat(e.currentTarget.textContent || "")}
            >
              {t(k)}
            </button>
          ))}
        </div>

        <div className="social">
          <div className="avs">
            <span>M</span>
            <span>A</span>
            <span>L</span>
            <span>+</span>
          </div>
          <span className="stars">★★★★★</span>
          <span>{t("social")}</span>
        </div>
      </div>
    </section>
  );
}
