---
kind: configuration_system
name: Environment-Based Configuration via process.env
category: configuration_system
scope:
    - '**'
source_files:
    - src/lib/ai/provider.ts
    - src/lib/ai/rag/embed.ts
    - next.config.mjs
    - package.json
---

The Vaya application uses a minimal, environment-variable-driven configuration approach with no dedicated config files or configuration framework. All runtime settings are loaded directly from Node.js `process.env` at module load time.

**What system/approach is used**
- Plain `process.env` access throughout the codebase — no dotenv loader, no config objects, no schema validation for configuration values.
- Next.js built-in environment variable support (server-side only via `process.env`; no `NEXT_PUBLIC_` variables are used).
- Hardcoded fallback defaults in each module that reads an env var.

**Key files and packages**
- `src/lib/ai/provider.ts` — central LLM provider selection and credential loading (`LLM_PROVIDER`, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `DASHSCOPE_MODEL`).
- `src/lib/ai/rag/embed.ts` — embedding client configuration (`DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `DASHSCOPE_EMBEDDING_MODEL`).
- `next.config.mjs` — Next.js build/runtime config (minimal: strict mode, eslint ignore, optional static export toggle).
- `package.json` — defines dev/build/start scripts but no configuration-related dependencies beyond Next.js, OpenAI, React, Zod, Tailwind.

**Architecture and conventions**
- Each feature module that needs external service credentials creates its own OpenAI-compatible client instance by reading `process.env` directly.
- Provider switching is controlled by the `LLM_PROVIDER` env var, defaulting to `qwen` (DashScope) with `deepseek` as the alternative.
- Missing API keys produce placeholder strings like `"unset-configure-DASHSCOPE_API_KEY-in-.env"` rather than throwing errors at startup.
- There is no centralized configuration registry, validation layer, or type-safe config object — every consumer reads `process.env` independently.
- No `.env` file is committed; the pattern implies a local `.env` file should be created per developer/machine.

**Conventions and constraints**
- All secrets and runtime toggles must be supplied through `process.env` — there is no file-based configuration mechanism.
- Default values are always provided inline via `??` or `||` operators, so missing env vars result in hardcoded fallbacks rather than failures.
- The absence of `NEXT_PUBLIC_` prefixed variables means no configuration is exposed to the browser; all env access occurs on the server side (API routes and lib modules).
- Configuration is not validated at startup; invalid values propagate silently until they cause downstream API errors.