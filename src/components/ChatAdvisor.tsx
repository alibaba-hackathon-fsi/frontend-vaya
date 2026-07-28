"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { PURP, purpName, bankOf, type Purpose } from "@/data/banks";
import {
  recommend,
  fmtVND,
  fmtMonthly,
  termLabel,
  type ChatState,
  type Recommendation,
} from "@/lib/loanEngine";

/* ---------------------------------------------------------------- API types */

interface ApiRankedOffer {
  packageId: string;
  bank: string;
  score: number;
  monthlyPayment: number;
  dti: number;
  riskLevel: string;
  breakdown: {
    lai_suat_thap: number;
    giai_ngan_nhanh: number;
    do_an_toan: number;
  };
}

interface ApiRejectedOffer {
  packageId: string;
  reason: string;
}

/** Map frontend Purpose to API muc_dich enum. */
const PURPOSE_TO_MUC_DICH: Record<string, string> = {
  home: "mua_nha",
  car: "mua_xe",
  business: "kinh_doanh",
  personal: "tin_chap",
  secured: "mua_nha",
};

/** Generate a stable session ID for the chat. */
function makeSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------------------------------------------------------------- types */

type Chip = { label: string; action: () => void };

type ResultData = {
  purpose: Purpose;
  amount: number;
  term: number;
  recs: Recommendation[];
};

type ApiResultData = {
  ranked: ApiRankedOffer[];
  rejected: ApiRejectedOffer[];
  explanation?: string;
};

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; typing: boolean; kind: "text"; text: string }
  | {
      id: number;
      role: "bot";
      typing: boolean;
      kind: "result";
      result: ResultData;
    }
  | {
      id: number;
      role: "bot";
      typing: boolean;
      kind: "api-result";
      result: ApiResultData;
    };

/* ---------------------------------------------------------------- option builders (ported) */

const amtOpts = (k: Purpose): number[] =>
  k === "personal"
    ? [50e6, 1e8, 3e8, 5e8]
    : k === "car"
      ? [3e8, 6e8, 1e9, 1.5e9]
      : k === "business"
        ? [5e8, 1e9, 3e9, 5e9]
        : [8e8, 1.5e9, 2.5e9, 5e9];

const termOpts = (k: Purpose): number[] =>
  k === "personal"
    ? [12, 24, 36, 60]
    : k === "car"
      ? [36, 60, 84, 96]
      : [60, 120, 180, 240];

/* free-text parsers (ported verbatim in behavior) */
function qAmount(s: string): number | null {
  s = s.toLowerCase().replace(/,/g, "");
  let m = s.match(/([\d.]+)\s*(b|billion|tỷ|ty|亿)/);
  if (m) return Math.round(parseFloat(m[1]) * 1e9);
  m = s.match(/([\d.]+)\s*(m|million|triệu|tr|百万)/);
  if (m) return Math.round(parseFloat(m[1]) * 1e6);
  m = s.match(/([\d.]+)/);
  if (m) {
    const n = parseFloat(m[1]);
    return n < 1000 ? Math.round(n * 1e6) : Math.round(n);
  }
  return null;
}
function qTerm(s: string): number | null {
  s = s.toLowerCase();
  let m = s.match(/([\d.]+)\s*(y|year|năm|nam|年)/);
  if (m) return Math.round(parseFloat(m[1]) * 12);
  m = s.match(/([\d.]+)\s*(mo|month|tháng|thang|月)/);
  if (m) return Math.round(parseFloat(m[1]));
  m = s.match(/(\d+)/);
  if (m) {
    const n = parseInt(m[1]);
    return n <= 40 ? n * 12 : n;
  }
  return null;
}
function qPurpose(s: string): Purpose | null {
  s = s.toLowerCase();
  if (/home|house|property|nhà|nha|房|购房|房产/.test(s)) return "home";
  if (/car|auto|ô tô|oto|xe|车|购车/.test(s)) return "car";
  if (/business|sme|kinh doanh|经营|生意/.test(s)) return "business";
  if (/secured|collateral|thế chấp|the chap|抵押/.test(s)) return "secured";
  if (/personal|unsecured|tín chấp|tin chap|tiêu dùng|个人|信用/.test(s))
    return "personal";
  return null;
}

/* ---------------------------------------------------------------- component */

export default function ChatAdvisor({ seed }: { seed?: string }) {
  const router = useRouter();
  const { lang, t, tRaw } = useI18n();

  // Message list + chips live in refs (mutated imperatively like the source),
  // with a tick to force re-renders. This preserves the exact chained-timeout
  // flow without stale-closure issues.
  const sessionIdRef = useRef(makeSessionId());
  const messagesRef = useRef<Message[]>([]);
  const chipsRef = useRef<Chip[]>([]);
  const stateRef = useRef<ChatState>({
    step: "purpose",
    purpose: null,
    amount: null,
    term: null,
    age: null,
  });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((n) => n + 1), []);

  // Keep localized helpers stable per render via refs so async callbacks read
  // the current language.
  const tRef = useRef(t);
  const langRef = useRef(lang);
  const tRawRef = useRef(tRaw);
  tRef.current = t;
  langRef.current = lang;
  tRawRef.current = tRaw;

  // Read the localized `ages` array (t() only yields strings; ages is string[]).
  const ageLabels = (): string[] => {
    const raw = tRawRef.current("ages");
    return Array.isArray(raw) ? raw : [];
  };

  const nextId = () => ++idRef.current;

  const scrollChat = useCallback(() => {
    requestAnimationFrame(() => {
      const b = bodyRef.current;
      if (b) b.scrollTop = b.scrollHeight;
    });
  }, []);

  const setChips = useCallback(
    (a: Chip[]) => {
      chipsRef.current = a;
      rerender();
    },
    [rerender],
  );
  const clearChips = useCallback(() => {
    chipsRef.current = [];
    rerender();
  }, [rerender]);

  const addUser = useCallback(
    (txt: string) => {
      messagesRef.current = [
        ...messagesRef.current,
        { id: nextId(), role: "user", text: txt },
      ];
      rerender();
      scrollChat();
    },
    [rerender, scrollChat],
  );

  // addBot: show typing bubble, then reveal text after a delay, then run cb.
  const addBot = useCallback(
    (html: string, cb?: () => void) => {
      const id = nextId();
      messagesRef.current = [
        ...messagesRef.current,
        { id, role: "bot", typing: true, kind: "text", text: html },
      ];
      rerender();
      scrollChat();
      const timer = setTimeout(
        () => {
          messagesRef.current = messagesRef.current.map((m) =>
            m.id === id && m.role === "bot" ? { ...m, typing: false } : m,
          );
          rerender();
          scrollChat();
          cb && cb();
        },
        640 + Math.random() * 300,
      );
      timersRef.current.push(timer);
    },
    [rerender, scrollChat],
  );

  // addBotResult: same typing→reveal, but the payload is a result card.
  const addBotResult = useCallback(
    (result: ResultData, cb?: () => void) => {
      const id = nextId();
      messagesRef.current = [
        ...messagesRef.current,
        { id, role: "bot", typing: true, kind: "result", result },
      ];
      rerender();
      scrollChat();
      const timer = setTimeout(
        () => {
          messagesRef.current = messagesRef.current.map((m) =>
            m.id === id && m.role === "bot" ? { ...m, typing: false } : m,
          );
          rerender();
          scrollChat();
          cb && cb();
        },
        640 + Math.random() * 300,
      );
      timersRef.current.push(timer);
    },
    [rerender, scrollChat],
  );

  // addBotApiResult: render authoritative API results.
  const addBotApiResult = useCallback(
    (result: ApiResultData, cb?: () => void) => {
      const id = nextId();
      messagesRef.current = [
        ...messagesRef.current,
        { id, role: "bot", typing: true, kind: "api-result", result },
      ];
      rerender();
      scrollChat();
      const timer = setTimeout(
        () => {
          messagesRef.current = messagesRef.current.map((m) =>
            m.id === id && m.role === "bot" ? { ...m, typing: false } : m,
          );
          rerender();
          scrollChat();
          cb && cb();
        },
        640 + Math.random() * 300,
      );
      timersRef.current.push(timer);
    },
    [rerender, scrollChat],
  );

  /* ---- flow ---- */

  const purposeChips = useCallback(
    (): Chip[] =>
      (Object.keys(PURP) as Purpose[]).map((k) => ({
        label: purpName(k, langRef.current),
        action: () => pickPurpose(k),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ageChips = useCallback((): Chip[] => {
    return ageLabels().map((l, i) => ({
      label: l,
      action: () => pickAge([23, 30, 42, 55][i]),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askInput = useCallback(
    (q: string) => {
      clearChips();
      addBot(q);
      inputRef.current?.focus();
    },
    [addBot, clearChips],
  );

  const advance = useCallback(() => {
    const s = stateRef.current;
    const T = tRef.current;
    const L = langRef.current;
    if (!s.purpose) {
      s.step = "purpose";
      addBot(T("ask_purpose"), () => setChips(purposeChips()));
    } else if (s.amount == null) {
      s.step = "amount";
      addBot(T("ask_amount"), () =>
        setChips([
          ...amtOpts(s.purpose as Purpose).map((a) => ({
            label: fmtVND(a, L),
            action: () => pickAmount(a),
          })),
          {
            label: T("other"),
            action: () => {
              stateRef.current.step = "amount_free";
              askInput(T("ask_amount"));
            },
          },
        ]),
      );
    } else if (s.term == null) {
      s.step = "term";
      addBot(T("ask_term"), () =>
        setChips([
          ...termOpts(s.purpose as Purpose).map((m) => ({
            label: termLabel(m, T),
            action: () => pickTerm(m),
          })),
          {
            label: T("other"),
            action: () => {
              stateRef.current.step = "term_free";
              askInput(T("ask_term"));
            },
          },
        ]),
      );
    } else if (s.age == null) {
      s.step = "age";
      addBot(T("ask_age"), () => setChips(ageChips()));
    } else {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBot, askInput, setChips, purposeChips, ageChips]);

  const pickPurpose = (k: Purpose) => {
    addUser(purpName(k, langRef.current));
    stateRef.current.purpose = k;
    clearChips();
    advance();
  };
  const pickAmount = (a: number) => {
    addUser(fmtVND(a, langRef.current));
    stateRef.current.amount = a;
    clearChips();
    advance();
  };
  const pickTerm = (m: number) => {
    addUser(termLabel(m, tRef.current));
    stateRef.current.term = m;
    clearChips();
    advance();
  };
  const pickAge = (a: number) => {
    const labels = ageLabels();
    addUser(labels[a < 25 ? 0 : a < 36 ? 1 : a < 51 ? 2 : 3]);
    stateRef.current.age = a;
    clearChips();
    finish();
  };

  const handleFree = (txt: string) => {
    const p = qPurpose(txt);
    const a = qAmount(txt);
    const m = qTerm(txt);
    if (!p && stateRef.current.step === "purpose") {
      addBot(tRef.current("cant"), () => setChips(purposeChips()));
      return;
    }
    if (p) stateRef.current.purpose = p;
    if (a != null) stateRef.current.amount = a;
    if (m != null) stateRef.current.term = m;
    advance();
  };

  const handleText = (txt: string) => {
    addUser(txt);
    const st = stateRef.current.step;
    const T = tRef.current;
    if (st === "amount_free" || st === "amount") {
      const a = qAmount(txt);
      if (a == null) {
        addBot(T("ask_amount"));
        return;
      }
      stateRef.current.amount = a;
      advance();
    } else if (st === "term_free" || st === "term") {
      const m = qTerm(txt);
      if (m == null) {
        addBot(T("ask_term"));
        return;
      }
      stateRef.current.term = m;
      advance();
    } else if (st === "age") {
      const match = txt.match(/\d+/);
      const n = match ? parseInt(match[0]) : NaN;
      if (!n) {
        addBot(T("ask_age"));
        return;
      }
      stateRef.current.age = n;
      finish();
    } else {
      handleFree(txt);
    }
  };

  const finish = useCallback(() => {
    stateRef.current.step = "done";
    clearChips();
    const T = tRef.current;
    addBot(T("analyzing"), () => {
      const s = stateRef.current;
      const mucDich =
        PURPOSE_TO_MUC_DICH[s.purpose ?? "personal"] ?? "tin_chap";

      // Call the real Decision Engine via /api/calculate
      fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          muc_dich: mucDich,
          so_tien: s.amount,
          thoi_han_thang: s.term,
          thu_nhap_hang_thang: 30_000_000, // default assumption; wizard doesn't collect income
          no_hien_tai_hang_thang: 0,
          uu_tien: [],
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ranked && data.ranked.length > 0) {
            addBotApiResult(
              { ranked: data.ranked, rejected: data.rejected ?? [] },
              () => {
                const chipTimer = setTimeout(() => {
                  setChips([
                    {
                      label: tRef.current("restart"),
                      action: () => startChat(),
                    },
                  ]);
                }, 400);
                timersRef.current.push(chipTimer);
              },
            );
          } else {
            // Fallback to local scorer if API returns nothing
            const recs = recommend(s);
            addBotResult(
              {
                purpose: s.purpose as Purpose,
                amount: s.amount as number,
                term: s.term as number,
                recs,
              },
              () => {
                const chipTimer = setTimeout(() => {
                  setChips([
                    {
                      label: tRef.current("restart"),
                      action: () => startChat(),
                    },
                  ]);
                }, 400);
                timersRef.current.push(chipTimer);
              },
            );
          }
        })
        .catch(() => {
          // Network error — fallback to local scorer
          const recs = recommend(s);
          addBotResult(
            {
              purpose: s.purpose as Purpose,
              amount: s.amount as number,
              term: s.term as number,
              recs,
            },
            () => {
              const chipTimer = setTimeout(() => {
                setChips([
                  { label: tRef.current("restart"), action: () => startChat() },
                ]);
              }, 400);
              timersRef.current.push(chipTimer);
            },
          );
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBot, addBotResult, addBotApiResult, clearChips, setChips]);

  const startChat = useCallback(
    (seedText?: string) => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      messagesRef.current = [];
      chipsRef.current = [];
      sessionIdRef.current = makeSessionId();
      rerender();
      stateRef.current = {
        step: "purpose",
        purpose: null,
        amount: null,
        term: null,
        age: null,
      };
      const T = tRef.current;
      addBot(T("greet"), () => {
        if (seedText && seedText.trim()) {
          addUser(seedText);
          handleFree(seedText);
        } else {
          addBot(T("ask_purpose"), () => setChips(purposeChips()));
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addBot, addUser, rerender, setChips, purposeChips],
  );

  // Boot the conversation once on mount (with the optional seed).
  useEffect(() => {
    startChat(seed);
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart the conversation when the language changes (matches source, which
  // re-runs startChat() on language switch while the chat view is open).
  const didMountLang = useRef(false);
  useEffect(() => {
    if (!didMountLang.current) {
      didMountLang.current = true;
      return;
    }
    startChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  /** Send free-text to /api/chat and consume the SSE stream. */
  const sendToApiChat = useCallback(
    async (txt: string) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            message: txt,
          }),
        });

        const contentType = res.headers.get("content-type") ?? "";

        // Non-SSE JSON response (follow-up question, policy answer, etc.)
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (data.reply) addBot(data.reply);
          if (data.explanation) addBot(data.explanation);
          return;
        }

        // SSE stream (results + explanation)
        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ")) {
              const payload = JSON.parse(line.slice(6));
              if (currentEvent === "results" && payload.ranked) {
                addBotApiResult({
                  ranked: payload.ranked,
                  rejected: payload.rejected ?? [],
                });
              } else if (currentEvent === "explanation" && payload.delta) {
                addBot(payload.delta);
              } else if (currentEvent === "explanation_error") {
                addBot(payload.message ?? "Explanation unavailable.");
              }
              currentEvent = "";
            }
          }
        }
      } catch {
        addBot("Lỗi kết nối — vui lòng thử lại.");
      }
    },
    [addBot, addBotApiResult],
  );

  const sendCurrent = () => {
    const i = inputRef.current;
    if (!i) return;
    const v = i.value.trim();
    if (!v) return;
    i.value = "";

    // If the wizard is complete or not started, route through the AI chat API
    const step = stateRef.current.step;
    if (step === "done" || step === "purpose") {
      addUser(v);
      sendToApiChat(v);
      return;
    }

    handleText(v);
  };

  /* ---- render ---- */

  return (
    <section id="chatView" className="on">
      <div className="chat-shell">
        <div className="chat-head">
          <div className="av">
            <img className="avimg" src="/mascot/vaya-avatar.png" alt="Vaya" />
          </div>
          <div className="who">
            <b>Vaya</b>
            <span className="on-ind">{t("advisor_sub")}</span>
          </div>
          <div className="hact">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => startChat()}
            >
              {t("new_chat")}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => router.push("/")}
            >
              {t("back_home")}
            </button>
          </div>
        </div>

        <div className="chat-body" id="chatBody" ref={bodyRef}>
          {messagesRef.current.map((m) =>
            m.role === "user" ? (
              <div className="msg user" key={m.id}>
                <div className="bub">{m.text}</div>
              </div>
            ) : (
              <div className="msg bot" key={m.id}>
                <div className="mav">
                  <img
                    className="avimg"
                    src="/mascot/vaya-avatar.png"
                    alt="Vaya"
                  />
                </div>
                {m.typing ? (
                  <div className="typing">
                    <i />
                    <i />
                    <i />
                  </div>
                ) : m.kind === "text" ? (
                  <div className="bub">{m.text}</div>
                ) : m.kind === "api-result" ? (
                  <div className="bub">
                    <ApiResultCard data={m.result} />
                  </div>
                ) : (
                  <div className="bub">
                    <ResultCard data={m.result} lang={lang} t={t} />
                  </div>
                )}
              </div>
            ),
          )}
        </div>

        <div className="chat-chips" id="chatChips">
          {chipsRef.current.map((c, i) => (
            <button
              key={i}
              className="chip"
              style={{ animation: `rise .3s ${i * 0.04}s both` }}
              onClick={c.action}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="chat-input">
          <input
            id="chatInput"
            ref={inputRef}
            placeholder={t("chat_ph")}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendCurrent();
            }}
          />
          <button className="send" aria-label="Send" onClick={sendCurrent}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- result card */

function ResultCard({
  data,
  lang,
  t,
}: {
  data: ResultData;
  lang: "en" | "vi" | "zh";
  t: (k: string) => string;
}) {
  const { purpose, amount, term, recs } = data;
  const maxM = Math.max(...recs.map((r) => r.mo));
  const minM = Math.min(...recs.map((r) => r.mo));

  return (
    <>
      <div>
        {t("based_on")} <b>{purpName(purpose, lang)}</b> ·{" "}
        <b>{fmtVND(amount, lang)}</b> · <b>{termLabel(term, t)}</b>
      </div>
      <div className="result">
        <div className="rh">📊 {t("rec_head")}</div>
        {recs.map((r, i) => {
          const b = bankOf(r.code);
          const best = i === 0;
          const match = Math.min(99, Math.max(45, Math.round(r.score * 0.6)));
          return (
            <div
              className={"rec " + (best ? "best" : "")}
              key={r.code + r.product + i}
            >
              <div className="rt">
                <div className="bk2">
                  <b>{b.name}</b>
                  <div className="p">{r.product}</div>
                </div>
                {best ? (
                  <span className="tag-best">★ {t("best")}</span>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--green-text)",
                      fontWeight: 700,
                    }}
                  >
                    {match}% {t("fit")}
                  </span>
                )}
              </div>
              <div className="grid3">
                <div className="cell">
                  <div className="k">{t("rate")}</div>
                  <div className="v g">
                    {r.rate}%
                    {r.promoM ? (
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>
                        {" "}
                        →{r.std}%
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="cell">
                  <div className="k">{t("monthly")}</div>
                  <div className="v">{fmtMonthly(r.mo)}</div>
                </div>
                <div className="cell">
                  <div className="k">{t("term")}</div>
                  <div className="v">{termLabel(r.usedTerm, t)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="pill">{r.speed[lang] || r.speed.en}</span>
                <span className="pill">
                  {r.ltv ? "LTV " + r.ltv + "%" : t("no_coll")}
                </span>
              </div>
            </div>
          );
        })}
        <div
          style={{ padding: "12px 15px", borderTop: "1px solid var(--line)" }}
        >
          <div
            style={{
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--muted)",
              marginBottom: 9,
            }}
          >
            {t("pay_cmp")}
          </div>
          {recs.map((r, i) => (
            <div className="mc" key={r.code + "mc" + i}>
              <span className="lbl">{bankOf(r.code).name}</span>
              <div className="track">
                <div
                  className={"fill " + (r.mo === minM ? "b" : "")}
                  style={{ width: Math.round((r.mo / maxM) * 100) + "%" }}
                />
              </div>
              <span className="vv">{fmtMonthly(r.mo)}</span>
            </div>
          ))}
        </div>
        <div className="foot">{t("foot_note")}</div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- API result card */

function ApiResultCard({ data }: { data: ApiResultData }) {
  const { ranked, rejected } = data;

  if (ranked.length === 0) {
    return <div>Không tìm thấy gói vay phù hợp.</div>;
  }

  const maxPayment = Math.max(...ranked.map((r) => r.monthlyPayment));
  const minPayment = Math.min(...ranked.map((r) => r.monthlyPayment));

  return (
    <>
      <div className="result">
        <div className="rh">📊 Kết quả xếp hạng từ Decision Engine</div>
        {ranked.map((r, i) => {
          const best = i === 0;
          return (
            <div
              className={"rec " + (best ? "best" : "")}
              key={r.packageId + i}
            >
              <div className="rt">
                <div className="bk2">
                  <b>{r.bank}</b>
                  <div className="p">{r.packageId}</div>
                </div>
                {best ? (
                  <span className="tag-best">★ Tốt nhất</span>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--green-text)",
                      fontWeight: 700,
                    }}
                  >
                    {Math.round(r.score * 10) / 10} điểm
                  </span>
                )}
              </div>
              <div className="grid3">
                <div className="cell">
                  <div className="k">Trả/tháng</div>
                  <div className="v">{fmtMonthly(r.monthlyPayment)}</div>
                </div>
                <div className="cell">
                  <div className="k">DTI</div>
                  <div className="v g">{Math.round(r.dti * 100)}%</div>
                </div>
                <div className="cell">
                  <div className="k">Rủi ro</div>
                  <div className="v">{r.riskLevel}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div
          style={{ padding: "12px 15px", borderTop: "1px solid var(--line)" }}
        >
          <div
            style={{
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--muted)",
              marginBottom: 9,
            }}
          >
            So sánh trả hàng tháng
          </div>
          {ranked.map((r, i) => (
            <div className="mc" key={r.packageId + "mc" + i}>
              <span className="lbl">{r.bank}</span>
              <div className="track">
                <div
                  className={
                    "fill " + (r.monthlyPayment === minPayment ? "b" : "")
                  }
                  style={{
                    width:
                      Math.round((r.monthlyPayment / maxPayment) * 100) + "%",
                  }}
                />
              </div>
              <span className="vv">{fmtMonthly(r.monthlyPayment)}</span>
            </div>
          ))}
        </div>
        {rejected.length > 0 && (
          <div
            style={{ padding: "8px 15px", fontSize: 11, color: "var(--muted)" }}
          >
            {rejected.length} gói không phù hợp đã bị loại.
          </div>
        )}
        <div className="foot">
          Tính toán bởi Decision Engine — không phải LLM.
        </div>
      </div>
    </>
  );
}
