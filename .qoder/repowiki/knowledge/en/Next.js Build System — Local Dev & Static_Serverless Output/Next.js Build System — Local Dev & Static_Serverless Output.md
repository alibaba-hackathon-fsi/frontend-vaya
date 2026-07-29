---
kind: build_system
name: Next.js Build System — Local Dev & Static/Serverless Output
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - next.config.mjs
    - tsconfig.json
    - postcss.config.mjs
    - tailwind.config.ts
---

This repository uses the standard Next.js 14 build system with no custom Makefiles, Dockerfiles, or CI pipelines. All build orchestration is handled through npm scripts and Next.js's built-in toolchain.

**Build tools and configuration**
- Package manager: npm (lockfile `package-lock.json` present alongside `bun.lock`, indicating possible local use of Bun but official scripts target npm).
- Runtime/build tool: Next.js 14.2.5 (`next build` for production, `next dev` for development, `next start` to serve the built app).
- TypeScript compilation via `tsconfig.json` with strict mode, `noEmit: true` (Next.js handles emit), path alias `@/* → ./src/*`, and the Next.js TS plugin.
- CSS pipeline: Tailwind CSS 3.4.7 + PostCSS + Autoprefixer, configured in `postcss.config.mjs` and `tailwind.config.ts`. The design system lives in `src/app/globals.css` with Tailwind kept minimal.
- Linting: `next lint` script; ESLint is intentionally ignored during builds (`eslint.ignoreDuringBuilds: true`) per the comment in `next.config.mjs`.

**Build outputs**
- Development: `next dev` serves a hot-reloading server.
- Production: `next build` generates an optimized Node.js server bundle under `.next/` (the directory exists at repo root). A fully static export is supported via the commented `output: "export"` option in `next.config.mjs` for deployment targets like GitHub Pages.

**Packaging and distribution**
- No containerization (no Dockerfile found) and no CI/CD configuration (no `.github/workflows`, no `Makefile`, no `build*.sh`).
- The package is marked `private: true` in `package.json`, so it is not published to npm.
- Dependencies are pinned by version ranges in `dependencies` and `devDependencies`; no vendoring strategy beyond `node_modules`.

**Conventions observed**
- All build/dev/start/lint commands are thin wrappers around Next.js CLI commands defined in `package.json` scripts.
- TypeScript is compiled in-place by Next.js; the project does not produce standalone `.js` artifacts outside `.next/`.
- ESLint failures do not block production builds (explicitly configured in `next.config.mjs`).
- The CSS approach favors hand-written styles in `globals.css` over Tailwind utility classes, keeping Tailwind configuration minimal.