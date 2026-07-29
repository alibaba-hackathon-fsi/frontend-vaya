---
kind: frontend_style
name: Tailwind + CSS Custom Properties Design System
category: frontend_style
scope:
    - '**'
source_files:
    - src/app/globals.css
    - tailwind.config.ts
    - postcss.config.mjs
    - package.json
---

The Vaya frontend uses a hybrid styling approach built on Tailwind CSS v3.4 with a hand-authored global stylesheet that serves as the single source of truth for the design system.

**System and tools**
- Tailwind CSS is configured via `tailwind.config.ts` with only minimal color and font extensions (`bg`, `ink`, `green`, `disp`, `body`). The comment in that file explicitly states the design system lives in `src/app/globals.css` and was ported verbatim from a prior single-file app.
- PostCSS is set up through `postcss.config.mjs` to run Tailwind and Autoprefixer.
- Global styles are declared in `src/app/globals.css`, which is imported by the Next.js root layout. It uses `@tailwind base/components/utilities` and then defines the entire visual identity.

**Design tokens and theme**
- All colors, fonts, spacing, and easing values are exposed as CSS custom properties under `:root` (e.g. `--bg`, `--surface`, `--ink`, `--green`, `--font-disp`, `--maxw`, `--ease`). Components reference these variables rather than hard-coded values.
- The light theme uses white backgrounds, deep teal ink (`#013D3B`), green CTAs (`#00C776`), and square borders (`border-radius:0`) consistently across buttons, chips, cards, tables, and inputs.
- Typography is split into two families: `Sora` + `Plus Jakarta Sans` + `Noto Sans SC` for display headings and `Plus Jakarta Sans` + `Noto Sans SC` for body text.

**Styling methodology**
- Utility-first Tailwind classes are used sparingly; most UI structure and appearance is implemented with hand-written BEM-style class names (`.btn`, `.btn-green`, `.launcher`, `.hero`, `.section`, `.card`, `.chat-shell`, `.msg`, `.result`, etc.).
- Responsive behavior is handled with CSS `@media` queries directly in `globals.css` (breakpoints at 920px, 860px, 820px, 600px) rather than Tailwind's responsive prefixes.
- Animations and transitions use CSS keyframes and `transition` with a shared cubic-bezier easing (`--ease`), including reveal-on-scroll, marquee scrolling, typing indicators, mascot floating, and typewriter caret blinking.
- A `prefers-reduced-motion` media query disables animations for accessibility.

**Component-level styling conventions**
- Reusable UI primitives live in `src/components/` (e.g. `ChatAdvisor.tsx`, `Hero.tsx`, `Navbar.tsx`, `MarketsSection.tsx`, `Faq.tsx`, `CTA.tsx`, `Testimonials.tsx`, `HowSection.tsx`, `WhySection.tsx`, `Manifesto.tsx`, `Underlined.tsx`, `Logo.tsx`, `Footer.tsx`) and rely on the shared CSS classes defined in `globals.css`.
- Chart components (`src/components/charts/LineChart.tsx`, `Sparkline.tsx`) are styled inline or via SVG attributes but still consume the CSS custom properties for colors.
- The chat view (`src/app/chat/page.tsx`) is styled entirely through the `.chat-*` class family in `globals.css`, keeping the conversational UI visually consistent with the landing page.

**Constraints and conventions observed**
- Square corners are enforced globally — every button, chip, card, table cell, and input explicitly sets `border-radius:0`.
- Color usage is centralized through CSS variables; no arbitrary hex values appear outside `globals.css` except within Tailwind's minimal config.
- Layout widths are constrained by the `.wrap` utility using `min(92%, var(--maxw))` where `--maxw: 1200px`.
- The design system is intentionally kept flat: there is no component library abstraction layer, no CSS-in-JS, and no separate theme files — everything flows from the single `globals.css` file.