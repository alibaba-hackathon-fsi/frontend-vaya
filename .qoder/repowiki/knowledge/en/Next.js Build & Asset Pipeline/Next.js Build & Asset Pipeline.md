---
kind: build_system
name: Next.js Build & Asset Pipeline
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - next.config.mjs
    - tsconfig.json
    - tailwind.config.ts
    - postcss.config.mjs
---

The project uses Next.js 14 as its build system with a minimal, convention-driven setup. There are no custom Makefiles, Dockerfiles, CI pipelines, or shell scripts — all build logic is expressed through npm scripts and Next.js configuration files.

**Build tools and pipeline**
- Development: `next dev` serves the app with hot reloading.
- Production build: `next build` compiles TypeScript, bundles assets, and generates the optimized production output in `.next/`.
- Preview: `next start` runs the compiled production server.
- Linting: `next lint` integrates ESLint into the build process.

**TypeScript compilation**
- `tsconfig.json` enables strict mode, incremental builds, and path aliases (`@/*` → `./src/*`).
- `noEmit: true` delegates all compilation to Next.js; TypeScript is used purely for type-checking.
- Module resolution uses the bundler strategy compatible with Next.js's internal bundler.

**Styling pipeline**
- Tailwind CSS v3 processes only files under `src/**/*.{ts,tsx}`.
- PostCSS runs Tailwind and Autoprefixer in sequence.
- The design system (colors, fonts, base styles) lives in `src/app/globals.css`; Tailwind config extends only brand tokens.

**Next.js configuration**
- React Strict Mode is enabled.
- ESLint errors are ignored during builds (`eslint.ignoreDuringBuilds: true`) so lint nitpicks do not block deployments.
- A static export mode (`output: "export"`) is commented out, indicating the capability to produce a fully static site for hosting like GitHub Pages.

**Dependency management**
- Dependencies pinned via `package-lock.json`; runtime deps include Next.js 14.2.5, React 18, OpenAI SDK, and Zod for validation.
- Dev dependencies cover TypeScript, Tailwind, PostCSS, Autoprefixer, and React/Node type definitions.
- Lockfile is `bun.lock`, suggesting Bun may be used as the package manager alongside npm lockfiles.

**What is absent**
- No Dockerfile, docker-compose, or containerization scripts.
- No CI/CD configuration (`.github/workflows`, CircleCI, Jenkins, etc.).
- No custom build/deploy shell scripts or Makefiles.
- No version bumping or release automation beyond the static `version: "1.0.0"` in `package.json`.