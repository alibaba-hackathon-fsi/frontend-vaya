---
kind: configuration_system
name: Environment-Based Configuration via process.env and Build-Time Config Files
category: configuration_system
scope:
    - '**'
source_files:
    - src/lib/ai/provider.ts
    - src/lib/ai/rag/embed.ts
    - next.config.mjs
    - tailwind.config.ts
    - package.json
---

The Vaya Next.js frontend uses a minimal, environment-variable-driven configuration system with no centralized config loader. Configuration is split across three layers:

**1. Runtime environment variables (process.env)**
- AI provider selection: `LLM_PROVIDER` switches between `deepseek` and the default `qwen` (DashScope) at runtime in `src/lib/ai/provider.ts`.
- API keys and endpoints: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `DASHSCOPE_MODEL`, and `DASHSCOPE_EMBEDDING_MODEL` are read directly from `process.env` in `src/lib/ai/provider.ts` and `src/lib/ai/rag/embed.ts`. Missing keys fall back to placeholder strings like `"unset-configure-DEEPSEEK_API_KEY-in-.env"` rather than throwing errors.
- No `NEXT_PUBLIC_` prefixed variables are used anywhere in the codebase; all configuration is consumed server-side (in route handlers and lib modules), not on the client.

**2. Build-time configuration files**
- `next.config.mjs`: Minimal Next.js config enabling React Strict Mode and disabling ESLint during builds (`eslint.ignoreDuringBuilds: true`). A commented-out `output: "export"` line indicates optional static export support.
- `tailwind.config.ts`: Defines Tailwind content paths, brand colors (`bg`, `ink`, `green`), and font families (`disp`, `body`). The comment explains that the design system actually lives in `src/app/globals.css` and Tailwind is kept minimal.
- `tsconfig.json`, `postcss.config.mjs`, and `package.json` scripts (`dev`, `build`, `start`, `lint`) define the build pipeline but contain no application-level configuration.

**3. Data-driven configuration (no external config files)**
- Business rules, loan products, bank data, eligibility rules, intake questions, scenarios, and risk rules are loaded from TypeScript modules under `src/data/` (e.g., `banks.ts`, `eligibilityRules.ts`, `loanPackages.ts`, `scenarios.ts`, `riskRules.ts`). These are statically imported and serve as the application's domain configuration — there are no `.yaml`, `.toml`, `.json`, or `.properties` files for runtime settings.

**Conventions observed:**
- All secrets and service endpoints are injected via `process.env` at runtime; there is no `.env` file committed to the repository (only a `.gitignore` exists).
- Default values are always provided inline as fallbacks when reading `process.env`, so the app never crashes on missing environment variables — it proceeds with placeholder values instead.
- There is no validation, schema enforcement, or typed configuration object; each module reads the env vars it needs directly.
- No feature flags, local development overrides, or configuration hot-reloading are implemented.