---
kind: dependency_management
name: npm/Bun dual lockfiles with Next.js dependency management
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - bun.lock
    - package-lock.json
    - next.config.mjs
---

This Next.js 14 project manages dependencies through the standard npm ecosystem with a dual-lockfile setup and no vendoring strategy.

**Package manager and manifests**
- `package.json` declares runtime dependencies (`next@14.2.5`, `react@^18.3.1`, `react-dom@^18.3.1`, `openai@^7.0.0`, `zod@^4.4.3`) and dev dependencies (TypeScript, Tailwind CSS, PostCSS/Autoprefixer, React/Node type packages). All versions use caret ranges except `next`, which is pinned to an exact version.
- Two lockfiles coexist: `bun.lock` (Bun's lockfile format, lockfileVersion 1) and `package-lock.json` (npm v3 lockfile). Both record the same dependency graph resolved from the public npm registry; there is no `.npmrc` or private registry configuration visible.

**Build and tooling integration**
- Scripts in `package.json` delegate all lifecycle commands to Next.js (`dev`, `build`, `start`, `lint`). No custom install/update scripts exist.
- `next.config.mjs` enables React Strict Mode and disables ESLint during builds; it does not configure any package resolution overrides.
- TypeScript is configured via `tsconfig.json`; types for Node and React are declared as devDependencies rather than bundled at runtime.

**Resolution and update conventions**
- Dependencies are pulled exclusively from the default npm registry; no `resolutions`, `overrides`, `pnpm.overrides`, or `bun.overrides` fields are present.
- The presence of both `bun.lock` and `package-lock.json` indicates the codebase can be installed with either Bun or npm, but there is no documented rule enforcing which one must be used. The two lockfiles may drift if different managers are used across environments.
- No `node_modules` directory is committed; dependencies are installed on demand by the chosen package manager.

**Constraints and observations**
- Runtime-only dependency set is minimal (Next.js + React + OpenAI client + Zod), keeping the production bundle focused on UI and API calls.
- Development tooling is separated into `devDependencies`, following standard npm convention.
- There is no automated dependency-update tooling (e.g., Dependabot, Renovate) or security-audit script visible in the repository.