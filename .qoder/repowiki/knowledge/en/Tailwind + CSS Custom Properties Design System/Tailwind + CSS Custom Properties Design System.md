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

The Vaya frontend uses a hybrid styling approach built on Next.js 14 with Tailwind CSS v3.4 and PostCSS (autoprefixer). The system centers around a single source of truth for the design system: `src/app/globals.css`, which is explicitly documented as being ported verbatim from the original single-file app.

**Core architecture:**
- `tailwind.config.ts` is intentionally minimal, extending only three brand colors (`bg`, `ink`, `green`) and two font families (`disp`, `body`). All visual identity lives in CSS custom properties under `:root` — backgrounds, surfaces, ink tones, green variants, fonts, spacing tokens, and easing curves.
- `postcss.config.mjs` chains Tailwind and Autoprefixer; no other preprocessors are used.
- Components import styles via the global stylesheet rather than using CSS Modules or styled-components.

**Design tokens and theme:**
- Light-only theme defined entirely through CSS variables (`--bg`, `--surface`, `--ink`, `--green`, etc.) with semantic naming for UI states (`--green-soft`, `--muted`, `--line`, `--line-2`).
- Typography uses Sora for display headings and Plus Jakarta Sans for body text, with Noto Sans SC as fallback for CJK.
- Brand accent is green (`#00C776`) with deep teal ink (`#013D3B`); all borders are square (`border-radius: 0`) as a deliberate stylistic constraint.

**Styling conventions observed across components:**
- Utility classes from Tailwind are used sparingly; most layout and component styling is done via hand-written CSS classes (`.btn`, `.card`, `.section`, `.hero`, `.chat-shell`, `.result`, etc.).
- Responsive breakpoints are applied inline within the CSS file using `@media` queries (e.g., `max-width: 920px`, `820px`, `860px`, `600px`).
- Animations are defined as keyframes directly in the stylesheet (`mq`, `rise`, `bp`, `mfloat`, `cblink`) with a shared `--ease` cubic-bezier curve.
- Motion respects `prefers-reduced-motion` by disabling animations when requested.
- Chat UI has its own dedicated section (`#chatView`) toggled via an `.on` class, keeping landing page and chat view styles separate but co-located.

**No component library or design token framework is used.** The entire aesthetic is maintained through the single `globals.css` file plus the small Tailwind color/font extensions.