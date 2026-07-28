---
kind: design
name: Pure Decision Engine with Server-Side AI Layer
source: session
category: adr
---

# Pure Decision Engine with Server-Side AI Layer

_Source: coding plans from commit period 9b7f269 → 34be1cc — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The frontend-vaya project is a UI-only Next.js 14 application with no backend logic. The existing loanEngine.ts is a toy scorer that lacks DTI calculations, risk scoring, MCDA ranking, eligibility rules, and cashflow analysis. The old banking4hackathon repository contains proven business logic (DTI, amortization, survivability, etc.) that needs to be migrated into this new frontend project.

## Decision drivers
- deterministic financial calculations must be pure and offline
- LLM should never compute numbers - only extract intent and narrate results
- validation as trust boundary before business logic
- multi-bank extensibility from day one
- preserve existing frontend without rewrites

## Considered options
- **Keep separate backend service** _(rejected)_ — pros: Clean separation of concerns, existing Express API could be reused; cons: Adds operational complexity, defeats purpose of single-Next.js deployment, breaks the goal of building everything in frontend-vaya
- **Client-side LLM calls** _(rejected)_ — pros: Simpler architecture, no API routes needed; cons: API keys exposed in browser, bundle size increases, violates security model
- **Server-side Next.js API routes with pure engine** — pros: Single deployment surface, API keys stay server-side, engine remains testable pure functions, SSE streaming supported natively; cons: Requires careful dependency management to keep engine pure

## Decision
Build a pure TypeScript Decision Engine in src/lib/engine/ with zero dependencies and no I/O, paired with server-side AI workflow in src/lib/ai/ accessed via Next.js API routes. All financial calculations (DTI, payment, risk, MCDA ranking, cashflow simulation) are deterministic pure functions. LLM providers (Qwen/DashScope primary, DeepSeek fallback) handle only intent extraction, narrative generation, and policy Q&A - never numerical computation.

## Consequences
The decision engine can be tested independently, deployed anywhere, and provides authoritative financial calculations. AI layer requires environment variables (DASHSCOPE_API_KEY or DEEPSEEK_API_KEY) but keeps client bundles free of LLM dependencies. Validation via Zod schemas serves as the trust boundary between untrusted LLM output and business logic. Multi-bank registry pattern enables adding new banks without code changes.