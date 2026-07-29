"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import {
  PURP,
  PKG,
  AVG,
  purpName,
  prodName,
  bankOf,
  logoSrc,
  type Purpose,
} from "@/data/banks";
import {
  recommend,
  fmtVND,
  fmtMonthly,
  termLabel,
  monthly,
  type ChatState,
  type Recommendation,
} from "@/lib/loanEngine";
import { amortSeries, lineMultiSvg, PAL } from "@/lib/survival";

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

const CHAT_SS_KEY = "vaya_chat_session";

type PersistedChat = {
  messages: Message[];
  state: ChatState;
  pkg: number | null;
  pkgAns: { amount: number | null; term: number | null; income: number | null };
  idCounter: number;
};

function saveChat(d: PersistedChat) {
  try {
    sessionStorage.setItem(CHAT_SS_KEY, JSON.stringify(d));
  } catch { /* noop */ }
}

function loadChat(): PersistedChat | null {
  try {
    const raw = sessionStorage.getItem(CHAT_SS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
    }
  | {
      id: number;
      role: "bot";
      typing: boolean;
      kind: "pkgresult";
      pkg: PkgResultData;
    };

/** Package-specific consultation result (advisor opened from a package page). */
type PkgResultData = {
  idx: number;
  amount: number;
  term: number;
  income: number;
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

export default function ChatAdvisor({
  seed,
  pkg,
}: {
  seed?: string;
  pkg?: number;
}) {
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
  // Package-advisor mode: when set, the conversation is about this product only.
  const pkgRef = useRef<number | null>(pkg != null && PKG[pkg] ? pkg : null);
  const pkgAns = useRef<{
    amount: number | null;
    term: number | null;
    income: number | null;
  }>({ amount: null, term: null, income: null });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => {
    setTick((n) => n + 1);
    // Persist chat state for session recovery
    saveChat({
      messages: messagesRef.current,
      state: stateRef.current,
      pkg: pkgRef.current,
      pkgAns: pkgAns.current,
      idCounter: idRef.current,
    });
  }, []);

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

  const addBotPkgResult = useCallback(
    (data: PkgResultData, cb?: () => void) => {
      const id = nextId();
      messagesRef.current = [
        ...messagesRef.current,
        { id, role: "bot", typing: true, kind: "pkgresult", pkg: data },
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

  /* ---- package-advisor flow ---- */

  const finishPkg = useCallback(() => {
    const idx = pkgRef.current as number;
    stateRef.current.step = "done";
    clearChips();
    addBot(tRef.current("analyzing"), () => {
      const timer = setTimeout(() => {
        addBotPkgResult(
          {
            idx,
            amount: pkgAns.current.amount || 0,
            term: pkgAns.current.term || 0,
            income: pkgAns.current.income || 0,
          },
          () => {
            const chipTimer = setTimeout(() => {
              setChips([
                {
                  label: tRef.current("pk_cta_surv"),
                  action: () => router.push(`/survival?pkg=${idx}`),
                },
                {
                  label: tRef.current("pk_cta_cmp"),
                  action: () => router.push("/chat"),
                },
                {
                  label: tRef.current("restart"),
                  action: () => startPkgChat(idx),
                },
              ]);
            }, 400);
            timersRef.current.push(chipTimer);
          },
        );
      }, 760);
      timersRef.current.push(timer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBot, addBotPkgResult, clearChips, setChips, router]);

  const askIncomePkg = useCallback(() => {
    stateRef.current.step = "pk_income";
    const T = tRef.current;
    addBot(T("pk_ask_income"), () =>
      setChips([
        ...[20e6, 35e6, 50e6, 80e6].map((v) => ({
          label: fmtVND(v, langRef.current),
          action: () => {
            addUser(fmtVND(v, langRef.current));
            pkgAns.current.income = v;
            clearChips();
            finishPkg();
          },
        })),
        {
          label: T("other"),
          action: () => {
            stateRef.current.step = "pk_income_free";
            clearChips();
            addBot(T("pk_ask_income"));
            inputRef.current?.focus();
          },
        },
      ]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBot, addUser, clearChips, setChips, finishPkg]);

  const askTermPkg = useCallback(() => {
    const p = PKG[pkgRef.current as number];
    stateRef.current.step = "pk_term";
    const T = tRef.current;
    let o = termOpts(p.purpose).filter((m) => m <= p.term);
    if (!o.length) o = [Math.min(p.term, 60)];
    addBot(T("pk_ask_term").replace("{max}", termLabel(p.term, T)), () =>
      setChips([
        ...o.map((m) => ({
          label: termLabel(m, T),
          action: () => {
            addUser(termLabel(m, T));
            pkgAns.current.term = m;
            clearChips();
            askIncomePkg();
          },
        })),
        {
          label: T("other"),
          action: () => {
            stateRef.current.step = "pk_term_free";
            clearChips();
            addBot(T("pk_ask_term").replace("{max}", termLabel(p.term, T)));
            inputRef.current?.focus();
          },
        },
      ]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBot, addUser, clearChips, setChips, askIncomePkg]);

  const askAmountPkg = useCallback(() => {
    const p = PKG[pkgRef.current as number];
    stateRef.current.step = "pk_amount";
    const T = tRef.current;
    let o = amtOpts(p.purpose).filter((a) => a <= p.max);
    if (!o.length) o = [Math.min(p.max, 1e9)];
    addBot(
      T("pk_ask_amount").replace("{max}", fmtVND(p.max, langRef.current)),
      () =>
        setChips([
          ...o.map((a) => ({
            label: fmtVND(a, langRef.current),
            action: () => {
              addUser(fmtVND(a, langRef.current));
              pkgAns.current.amount = a;
              clearChips();
              askTermPkg();
            },
          })),
          {
            label: T("other"),
            action: () => {
              stateRef.current.step = "pk_amount_free";
              clearChips();
              addBot(
                T("pk_ask_amount").replace(
                  "{max}",
                  fmtVND(p.max, langRef.current),
                ),
              );
              inputRef.current?.focus();
            },
          },
        ]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBot, addUser, clearChips, setChips, askTermPkg]);

  const startPkgChat = useCallback(
    (idx: number) => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      messagesRef.current = [];
      chipsRef.current = [];
      pkgRef.current = idx;
      pkgAns.current = { amount: null, term: null, income: null };
      rerender();
      const p = PKG[idx],
        b = bankOf(p.code);
      stateRef.current = {
        step: "pk_amount",
        purpose: p.purpose,
        amount: null,
        term: null,
        age: null,
      };
      addBot(
        tRef
          .current("pk_greet")
          .replace("{bank}", b.name)
          .replace("{product}", prodName(p, langRef.current))
          .replace("{rate}", String(p.rate)),
        () => askAmountPkg(),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addBot, rerender, askAmountPkg],
  );

  const handleTextPkg = (txt: string) => {
    addUser(txt);
    const st = stateRef.current.step as string;
    const p = PKG[pkgRef.current as number];
    const T = tRef.current;
    if (st.startsWith("pk_amount")) {
      const a = qAmount(txt);
      if (a == null) {
        addBot(
          T("pk_ask_amount").replace("{max}", fmtVND(p.max, langRef.current)),
        );
        return;
      }
      pkgAns.current.amount = a;
      askTermPkg();
    } else if (st.startsWith("pk_term")) {
      const m = qTerm(txt);
      if (m == null) {
        addBot(T("pk_ask_term").replace("{max}", termLabel(p.term, T)));
        return;
      }
      pkgAns.current.term = m;
      askIncomePkg();
    } else if (st.startsWith("pk_income")) {
      const v = qAmount(txt);
      if (v == null) {
        addBot(T("pk_ask_income"));
        return;
      }
      pkgAns.current.income = v;
      finishPkg();
    } else finishPkg();
  };

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
    if (pkgRef.current != null) return handleTextPkg(txt);
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
      // Always use local Decision Engine for consistent ResultCard UI
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addBot, addBotResult, clearChips, setChips]);

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

  // Boot the conversation once on mount.
  // Only restore from sessionStorage when there is NO new intent (no seed, no pkg).
  // A seed or pkg means the user clicked a fresh entry point and expects a new conversation.
  useEffect(() => {
    const hasNewIntent = seed != null || pkg != null;
    const saved = !hasNewIntent ? loadChat() : null;
    if (saved && saved.messages.length > 0) {
      // Restore persisted session (user navigated back without a new intent)
      messagesRef.current = saved.messages.map((m) =>
        m.role === "bot" ? { ...m, typing: false } : m,
      );
      stateRef.current = saved.state;
      pkgRef.current = saved.pkg;
      pkgAns.current = saved.pkgAns;
      idRef.current = saved.idCounter;
      rerender();
      scrollChat();
    } else if (pkgRef.current != null) {
      startPkgChat(pkgRef.current);
    } else {
      startChat(seed);
    }
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
    if (pkgRef.current != null) startPkgChat(pkgRef.current);
    else startChat();
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
            lang: langRef.current,
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
                // Convert to local ResultCard format for consistent UI
                const s = stateRef.current;
                const recs = recommend(s);
                addBotResult({
                  purpose: (s.purpose ?? "personal") as Purpose,
                  amount: (s.amount ?? 0) as number,
                  term: (s.term ?? 60) as number,
                  recs,
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
    [addBot, addBotResult],
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
              onClick={() => {
                pkgRef.current = null;
                startChat();
              }}
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
                ) : m.kind === "pkgresult" ? (
                  <div className="bub">
                    <PkgResultCard data={m.pkg} lang={lang} t={t} />
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
  const router = useRouter();
  const { purpose, amount, term, recs } = data;
  const maxM = Math.max(...recs.map((r) => r.mo));
  const minM = Math.min(...recs.map((r) => r.mo));
  const cheap = recs.find((r) => r.mo === minM);
  const save = maxM - minM;
  // Spread the comparison bars (cheapest → 48%, priciest → 100%) so close
  // payments still read as a clear visual ranking.
  const barW = (m: number) =>
    Math.round(48 + ((m - minM) / (maxM - minM || 1)) * 52);
  const insight =
    save > 0 && cheap
      ? t("insight")
          .replace("{bank}", bankOf(cheap.code).name)
          .replace("{save}", fmtMonthly(save))
      : "";

  return (
    <>
      <div>
        {t("based_on")} <b>{purpName(purpose, lang)}</b> ·{" "}
        <b>{fmtVND(amount, lang)}</b> · <b>{termLabel(term, t)}</b>
      </div>
      <div className="result">
        <div className="rh">📊 {t("rec_head")}</div>
        {insight && <div className="rc-insight">{insight}</div>}
        <div className="rc-clab">{t("pay_cmp")}</div>
        <div className="rc-list">
          {recs.map((r, i) => {
            const b = bankOf(r.code);
            const best = i === 0;
            const match = Math.min(99, Math.max(45, Math.round(r.score * 0.6)));
            const cheapest = r.mo === minM;
            return (
              <div
                className={"rc-row " + (best ? "best" : "")}
                key={r.code + i}
              >
                <div className="rc-head">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="rc-logo" src={logoSrc(r.code)} alt={b.name} />
                  <div className="rc-name">
                    <b>{b.name}</b>
                    <small>{prodName(r, lang)}</small>
                  </div>
                  {best ? (
                    <span className="rc-tag">★ {t("best")}</span>
                  ) : (
                    <span className="rc-fit">
                      {match}% {t("fit")}
                    </span>
                  )}
                </div>
                <div className="rc-bar">
                  <div className="rc-track">
                    <div
                      className={"rc-fill " + (cheapest ? "cheap" : "")}
                      style={{ width: barW(r.mo) + "%" }}
                    />
                  </div>
                  <span className="rc-mo">
                    {fmtMonthly(r.mo)}
                    <small>/{t("mo")}</small>
                  </span>
                </div>
                <div className="rc-meta">
                  <span className="rc-rate">
                    {r.rate}%{r.promoM ? <i> →{r.std}%</i> : null}
                  </span>{" "}
                  · <span>{termLabel(r.usedTerm, t)}</span> ·{" "}
                  <span>{r.ltv ? "LTV " + r.ltv + "%" : t("no_coll")}</span> ·{" "}
                  <span>⏱ {r.speed[lang] || r.speed.en}</span>
                </div>
              </div>
            );
          })}
        </div>
        {(() => {
          // Cumulative amount paid per bank — a real line chart, distinct colours.
          const series = recs.map((r, i) => {
            const amt = Math.min(amount || r.max, r.max);
            return {
              name: bankOf(r.code).name,
              color: PAL[i % PAL.length],
              vals: amortSeries(amt, r.std, r.usedTerm).cum,
            };
          });
          const maxLen = Math.max(...series.map((s) => s.vals.length));
          series.forEach((s) => {
            while (s.vals.length < maxLen)
              s.vals.push(s.vals[s.vals.length - 1]);
          });
          return (
            <>
              <div className="rc-clab">{t("cmp_line_title")}</div>
              <div
                className="surv-chart"
                dangerouslySetInnerHTML={{ __html: lineMultiSvg(series) }}
              />
              <div className="surv-legend">
                {series.map((s, i) => (
                  <span
                    className="lg lg-c"
                    key={i}
                    style={
                      { ["--lgc" as string]: s.color } as React.CSSProperties
                    }
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </>
          );
        })()}
        <div className="rc-clab">{t("cmp_title")}</div>
        <div className="rc-cmp">
          {(() => {
            const items = recs.map((r, i) => {
              const P = Math.min(amount || r.max, r.max);
              return {
                name: bankOf(r.code).name,
                color: PAL[i % PAL.length],
                interest: Math.max(0, r.mo * r.usedTerm - P),
              };
            });
            const mx = Math.max(...items.map((x) => x.interest)) || 1;
            return items.map((x, i) => (
              <div className="cmp-row" key={i}>
                <span className="cmp-name">{x.name}</span>
                <div className="cmp-track">
                  <div
                    className="cmp-fill"
                    style={{
                      width: Math.round((x.interest / mx) * 100) + "%",
                      background: x.color,
                    }}
                  />
                </div>
                <span className="cmp-val">{fmtMonthly(x.interest)}</span>
              </div>
            ));
          })()}
        </div>
        <div className="chk-cta">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push(`/checklist?purpose=${purpose}`)}
          >
            {t("cta_checklist")}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              router.push(`/survival?p=${purpose}&a=${amount}&t=${term}`)
            }
          >
            {t("cta_analysis")}
          </button>
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

/* ---------------------------------------------------------------- package-advisor result */

function PkgResultCard({
  data,
  lang,
  t,
}: {
  data: PkgResultData;
  lang: "en" | "vi" | "zh";
  t: (k: string) => string;
}) {
  const p = PKG[data.idx];
  const b = bankOf(p.code);
  const amt = Math.min(data.amount || p.max, p.max);
  const term = Math.min(data.term || p.term, p.term);
  const inc = data.income || 0;
  const a = amortSeries(amt, p.std, term);
  const promoEmi = monthly(amt, p.rate, term);
  const dti = inc > 0 ? (a.emi / inc) * 100 : 0;
  const okAmt = (data.amount || 0) <= p.max;
  const okTerm = (data.term || 0) <= p.term;
  const okDti = dti <= 45;
  const fit = okAmt && okTerm && okDti;
  const vclass = fit ? (dti <= 35 ? "good" : "ok") : "risk";
  const vlab =
    vclass === "good"
      ? t("pk_v_good")
      : vclass === "ok"
        ? t("pk_v_ok")
        : t("pk_v_bad");
  const mktAvg = AVG[AVG.length - 1];
  const delta = p.rate - mktAvg;
  const facts: [string, string][] = [
    [t("pk_emi"), fmtMonthly(a.emi)],
    [t("pk_promo"), fmtMonthly(promoEmi)],
    [t("pk_interest"), fmtMonthly(a.interest)],
    [t("pk_total"), fmtMonthly(amt + a.interest)],
    [t("m_dti"), dti.toFixed(0) + "%"],
    [
      t("pk_vs"),
      (delta <= 0 ? "▼ " : "▲ ") + Math.abs(delta).toFixed(1) + " pts",
    ],
  ];
  const checks: [boolean, string][] = [
    [okAmt, t("pk_c_amount")],
    [okTerm, t("pk_c_term")],
    [okDti, t("pk_c_dti")],
    [!!p.ltv, t("pk_c_coll")],
  ];
  const series = [
    { name: t("pk_rem"), color: "#0A8F55", vals: a.rem },
    { name: t("pk_cum"), color: "#8180C8", vals: a.cum },
  ];
  return (
    <div className="result">
      <div className="rh">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="rc-logo" src={logoSrc(p.code)} alt="" /> {b.name} ·{" "}
        {prodName(p, lang)}
      </div>
      <div className={"pk-verdict pk-" + vclass}>{vlab}</div>
      <div className="rc-clab">{t("pk_head")}</div>
      <div className="sm-grid pk-facts">
        {facts.map((f, i) => (
          <div className="sm" key={i}>
            <div className="smk">{f[0]}</div>
            <div className="smv">{f[1]}</div>
          </div>
        ))}
      </div>
      <div className="rc-clab">{t("pk_elig")}</div>
      <div className="pk-checks">
        {checks.map((c, i) => (
          <span className={"pk-chk " + (c[0] ? "ok" : "no")} key={i}>
            {c[0] ? "✓" : "✕"} {c[1]}
          </span>
        ))}
      </div>
      <div className="rc-clab">{t("pk_amort")}</div>
      <div
        className="surv-chart"
        dangerouslySetInnerHTML={{ __html: lineMultiSvg(series, 600, 200) }}
      />
      <div className="surv-legend">
        {series.map((s, i) => (
          <span
            className="lg lg-c"
            key={i}
            style={{ ["--lgc" as string]: s.color } as React.CSSProperties}
          >
            {s.name}
          </span>
        ))}
      </div>
      <div className="foot">{t("foot_note")}</div>
    </div>
  );
}
