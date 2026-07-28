# Vaya — Your AI Loan Advisor

**Vaya** is a conversational AI loan advisor for the Vietnamese market. You describe
what you need in one sentence — purpose, amount, term — and Vaya compares official
loan products across 20+ banks, then explains everything in plain language. Private,
unbiased, and free.

This is a **front-end build** (UI + client-side rule-based engine). There is no backend
or LLM yet, but the code is structured so you can plug one in later without touching the UI.

---

## Highlights

- **Chat-first home page.** The hero is a chat launcher: type a question (or tap a
  suggestion chip) and Vaya takes you straight into the advisor.
- **Full advisor experience** at `/chat`: a typing-bubble conversation that collects
  your needs and returns best-fit products with a side-by-side comparison
  (rate, monthly payment, term, LTV) plus a monthly-payment mini-bar chart.
- **Loan market screener.** A fund-screener-style table of starting rates across banks —
  filter by loan type, sort any column, each row with a 12-month trend sparkline — next to
  an average-rate line chart.
- **Trilingual (i18n).** English (default), Tiếng Việt, and 中文. The language switch
  re-renders every visible string, the markets table, and the chat engine live. The choice
  is persisted to `localStorage` (`vaya_lang`).
- **Light theme, Vaya brand.** White canvas, green CTAs (`#00C776`), Deep Teal ink
  (`#013D3B`), strictly **square** corners, and the Vaya pixel-arrow logo.
- **Zero animation/chart dependencies.** All motion (reveal-on-scroll, manifesto
  scroll-fill, marquee, typing bubbles) is native JS/CSS, and **all charts are hand-written
  SVG** — no chart library, no GSAP/Lenis/Framer Motion.

## Tech stack

|                |                                                             |
| -------------- | ----------------------------------------------------------- |
| Framework      | **Next.js 14** (App Router) + **TypeScript**                |
| Styling        | **Tailwind CSS** + a hand-written design system in `globals.css` |
| i18n           | Lightweight React context (`src/i18n`) — EN / VI / ZH       |
| Charts         | **Native SVG** components (no chart library)                |
| Fonts          | Sora (display) + Plus Jakarta Sans (body) + Noto Sans SC, via Google Fonts `<link>` |
| Dependencies   | Just `next`, `react`, `react-dom` — the design is dependency-free |

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

> To export a fully **static** build (GitHub Pages, Netlify…): open `next.config.mjs`,
> enable `output: "export"`, then `npm run build` → the `out/` folder.

## The chat-first flow

1. On the home hero, the visitor types a question (e.g. *“Home loan around ₫2B for 20
   years”*) or taps a suggestion chip.
2. Submitting navigates to **`/chat?q=<question>`**.
3. The `/chat` page reads `q` via `useSearchParams` and seeds the advisor: it auto-adds the
   visitor's message and parses purpose / amount / term from free text, asking only for
   what's missing. With no `q`, the conversation starts from the greeting.
4. The engine (`src/lib/loanEngine.ts` → `recommend()`) scores packages and renders the
   result card with the monthly-payment comparison.

The markets table's **Ask →** buttons use the same mechanism (they deep-link into `/chat`
pre-seeded with a purpose-specific question).

## Structure

```
src/
├─ app/
│  ├─ layout.tsx        # fonts <link>, <I18nProvider>, <Navbar>, metadata
│  ├─ page.tsx          # HOME: hero → trust marquee → markets → why → how → manifesto → testimonials → faq → cta → footer
│  ├─ chat/page.tsx     # CHAT: reads ?q= and mounts the advisor
│  └─ globals.css       # the full Vaya design system (light theme, square borders)
├─ components/
│  ├─ Navbar.tsx        # logo, section links, EN/VI/中文 switcher, "Open advisor" → /chat
│  ├─ Logo.tsx          # <Logo/> (colored) and <LogoWhite/> pixel-arrow marks
│  ├─ Hero.tsx          # chat launcher → router.push(/chat?q=…)
│  ├─ MarketsSection.tsx# screener table (filter + sort + sparklines) + avg-rate line chart
│  ├─ WhySection.tsx, HowSection.tsx, Manifesto.tsx, Testimonials.tsx, Faq.tsx, CTA.tsx, Footer.tsx
│  ├─ ChatAdvisor.tsx   # the full conversational engine (state machine, typing bubbles, result card)
│  └─ charts/
│     ├─ LineChart.tsx  # SVG average-rate chart
│     └─ Sparkline.tsx  # SVG per-row trend sparkline
├─ i18n/
│  ├─ dict.ts           # the EN/VI/ZH dictionary + types
│  └─ I18nProvider.tsx  # context: lang (persisted), setLang, t()
├─ data/banks.ts        # BANKS, PURP, PKG (packages + computed trend/change), AVG series
└─ lib/loanEngine.ts    # monthly(), recommend(), fmtVND(), fmtMonthly(), termLabel()
```

## Wiring up a backend / LLM later

All the "intelligence" lives in **`src/lib/loanEngine.ts` → `recommend()`** (a
deterministic, client-side scorer). To use a real backend/LLM:

1. Keep the UI in `ChatAdvisor.tsx` as-is.
2. Replace the `recommend(state)` call with `await fetch("/api/advisor", …)` or an LLM call.
3. Return the same `Recommendation[]` shape — the UI needs no changes.

The bank data in `src/data/banks.ts` can likewise be swapped for a real source (API/CMS).

## Design tokens

Tweak colors/branding quickly in the `:root` block of `globals.css`:

```css
--bg:#ffffff;      --ink:#013D3B;       /* white canvas · Deep Teal ink */
--green:#00C776;   --green-text:#0A8F55; /* brand green · accessible green text */
--surface:#F4F7F9; --line:#E2E8EC;       /* panels · hairlines */
```

Corners are intentionally **square** (`border-radius:0`) throughout — keep them that way to
stay on-brand.

## Disclaimer

Bank names, interest rates, and loan packages in this project are **illustrative only** for
the demo — **not financial advice**, and may not reflect real-world policies.

---

© 2026 Vaya. Built for the Alibaba Cloud Hackathon.
