---
kind: dependency_management
name: npm/Bun Dual Lockfiles with Semver-Restricted Dependencies
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - bun.lock
    - .gitignore
---

This Next.js project manages dependencies through two parallel lockfile formats — `package-lock.json` (npm, lockfileVersion 3) and `bun.lock` (Bun, lockfileVersion 1) — while declaring all packages in a single `package.json`. The manifest is marked `private: true`, indicating it is not published to any registry.

**Systems and tools used**
- Package manager: npm (primary, via `package-lock.json`) and Bun (secondary, via `bun.lock`). Both lockfiles are committed alongside the source.
- Registry: public npm registry (`https://registry.npmjs.org/`) as evidenced by resolved URLs in `package-lock.json`; no private registries or `npmrc` configuration files are present.
- No vendoring strategy (no `vendor/` directory); dependencies are installed into `node_modules` at install time.

**Key files**
- `package.json` — single source of truth for dependency declarations (runtime + devDependencies).
- `package-lock.json` — npm-generated deterministic lockfile (lockfileVersion 3) pinning exact versions and transitive dependencies.
- `bun.lock` — Bun-generated lockfile mirroring the same dependency graph.
- `.gitignore` — excludes `node_modules/` from version control, keeping lockfiles as the sole source of truth for reproducible installs.

**Architecture and conventions**
- All third-party packages are declared explicitly in `package.json` under `dependencies` or `devDependencies`; no implicit runtime imports without declaration.
- Runtime dependencies use caret ranges (`^18.3.1`, `^7.0.0`, `^4.4.3`, `^14.2.5`) allowing minor/patch updates within the specified major version, while the lockfiles pin exact resolved versions for reproducibility.
- Development tooling (TypeScript, Tailwind, PostCSS, Autoprefixer, type definitions) is isolated under `devDependencies`.
- Scripts are minimal and delegate entirely to the Next.js CLI (`next dev`, `next build`, `next start`, `next lint`), so dependency management does not involve custom build hooks or postinstall scripts.

**Constraints and observed rules**
- The presence of both `package-lock.json` and `bun.lock` implies that either npm or Bun may be used to install dependencies; both produce deterministic graphs that should remain in sync with `package.json`.
- Because `node_modules/` is gitignored, CI or local builds must run an install step before build/start to resolve dependencies from the lockfile.
- No `overrides`, `resolutions`, `pnpm-workspace.yaml`, or monorepo configuration exists; this is a flat single-package project.