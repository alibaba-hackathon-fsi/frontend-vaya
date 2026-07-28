---
kind: error_handling
name: Error Handling in Vaya AI Loan Advisor
category: error_handling
scope:
    - '**'
source_files:
    - src/app/api/calculate/route.ts
    - src/app/api/chat/route.ts
    - src/app/api/policy/route.ts
    - src/components/ChatAdvisor.tsx
    - src/lib/engine/amortization.ts
    - src/i18n/I18nProvider.tsx
---

This Next.js frontend for the Vaya AI Loan Advisor uses a layered error-handling approach that combines runtime validation, structured API responses, graceful degradation, and explicit assertion errors. The patterns differ between server routes, client components, and core engine libraries.

**Server-side API routes** (`src/app/api/*`)
- Input parsing failures are caught with `try/catch` around `request.json()` and return a JSON `{ error: "..." }` body with HTTP 400 status.
- Schema validation is performed via Zod (`LoanProfileSchema.safeParse`, `validateProfile`). When validation fails, the route returns a 400 response with a human-readable error string built from `parsed.error.issues.map(i => i.message).join("; ")`.
- Business-rule violations (e.g. missing `thoi_han_thang` / `thu_nhap_hang_thang`) also return 400 JSON responses with descriptive messages.
- External calls (LLM, RAG embedding) are wrapped in `try/catch` blocks that degrade gracefully: the chat route returns a fallback reply and sets `error: true` in the response object rather than throwing.
- SSE streaming separates authoritative results from LLM narration: if the explanation stream fails, an `explanation_error` event is emitted while the already-delivered `results` event remains valid.
- The `/api/policy` endpoint returns a 503 status when the RAG/LLM pipeline throws, with `{ answer, citations: [], belowThreshold: true, error: true }`.

**Client-side component** (`src/components/ChatAdvisor.tsx`)
- Network requests to `/api/calculate` use `.then(...).catch(...)`: on network failure the component falls back to a local scorer (`recommend(s)`), ensuring the UI never breaks.
- SSE consumption wraps the entire stream loop in a `try/catch`; on parse or connection errors it displays a Vietnamese user-facing message (`"Lỗi kết nối — vui lòng thử lại."`).
- Rejected loan offers are surfaced as a separate `rejected` array in the result payload and rendered with a muted notice line.

**Core engine libraries** (`src/lib/engine/*`)
- Functions like `amortize` and `calcMonthlyPayment` perform input validation by throwing `new Error("...")` with specific messages (e.g. `"loanAmount must be a positive integer VND amount"`, `"termMonths must be a positive integer"`, `"Rounding reconciliation failed: principal sum mismatch"`). These are programming-error assertions, not expected runtime conditions, and are intended to fail fast during development.
- No custom error classes are defined; plain `Error` instances are used throughout.

**Internationalization provider** (`src/i18n/I18nProvider.tsx`)
- `localStorage` access is wrapped in `try/catch` with empty catch bodies (`/* ignore storage errors */`), making persistence best-effort.
- The `useI18n` hook throws `new Error("useI18n must be used within <I18nProvider>")` if called outside the context, enforcing correct usage at runtime.

**Conventions observed**
- All API endpoints return a consistent `{ error: string }` shape for client-parseable failures, paired with appropriate HTTP status codes (400 for bad input, 503 for downstream service failures).
- Validation errors come from Zod schemas; business-rule errors are returned as JSON with descriptive messages.
- Unrecoverable external failures (LLM/RAG) are degraded gracefully rather than propagated as exceptions.
- Core calculation functions assert preconditions via thrown `Error`s — these are developer-facing invariants, not user-facing errors.
- There is no centralized error type, error-code enum, or global error middleware; error handling is localized per function/route.