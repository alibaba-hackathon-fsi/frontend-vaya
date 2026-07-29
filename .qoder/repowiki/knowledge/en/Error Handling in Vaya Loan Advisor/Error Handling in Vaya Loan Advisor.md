---
kind: error_handling
name: Error Handling in Vaya Loan Advisor
category: error_handling
scope:
    - '**'
source_files:
    - src/app/api/calculate/route.ts
    - src/app/api/chat/route.ts
    - src/app/api/policy/route.ts
    - src/lib/engine/amortization.ts
    - src/lib/engine/calcMonthlyPayment.ts
    - src/lib/engine/grace-period.ts
    - src/lib/engine/rate-schedule.ts
    - src/lib/engine/scenarios.ts
---

This Next.js application uses a layered error-handling approach that separates input validation, domain-level invariant enforcement, and external-service failure handling across its API routes and engine modules.

**1. Input validation with Zod schemas**
- All POST endpoints parse the request body inside `try/catch` blocks around `request.json()` and immediately return `{ error: "Invalid JSON body" }` with status 400 when parsing fails (`src/app/api/calculate/route.ts`, `src/app/api/chat/route.ts`, `src/app/api/policy/route.ts`).
- Business-schema validation is performed via Zod `safeParse` (e.g. `LoanProfileSchema.safeParse`) and returns a formatted list of field issues as a single `error` string with status 400 (`src/app/api/calculate/route.ts`).
- Additional required-field checks are done inline after schema validation, returning a descriptive `error` message for missing calculation fields.

**2. Domain-layer errors via thrown `Error` objects**
- Pure engine functions enforce preconditions by throwing native `Error` instances with human-readable messages (e.g. `amortization.ts`, `calcMonthlyPayment.ts`, `grace-period.ts`, `rate-schedule.ts`, `scenarios.ts`).
- Typical guards include positive-number checks, integer-type assertions, non-empty array requirements, overlapping period detection, and rounding-reconciliation failures. These errors are not caught inside the engine; they propagate to the caller.

**3. API-route error responses**
- Validation failures produce JSON bodies with an `error` field and HTTP 400.
- Missing-session or missing-message fields on `/api/chat` return a plain `Response(JSON.stringify({ error: ... }))` with status 400.
- The `/api/policy` route wraps the RAG pipeline in `try/catch` and returns a 503 response containing `{ answer, citations, belowThreshold: true, error: true }` when embedding/retrieval/LLM calls fail.

**4. External-service degradation patterns**
- LLM calls are wrapped in `try/catch` blocks that degrade gracefully: the chat route returns a localized fallback reply (`apiT("llm_error", lang)`) plus a `stage: "fallback_to_manual_form"` flag instead of crashing the stream (`src/app/api/chat/route.ts`).
- Policy-only queries return `{ answer: "not found in the documents", citations: [], error: true }` when retrieval yields no chunks.
- During SSE streaming, if the LLM explanation stream throws, the route writes an `explanation_error` event but still delivers the authoritative `results` event first, so clients always receive deterministic numbers even when narration fails.

**5. Response shape conventions**
- Client-facing JSON payloads consistently use an `error: boolean` field alongside domain data (e.g. chat policy results, policy query results) so the frontend can branch on success/failure without inspecting HTTP status alone.
- Structured error messages are localized through `apiT(key, lang)` rather than raw strings, ensuring consistent user-facing text.

**6. Notable absences**
- There is no centralized error class hierarchy, custom error types, or global error middleware — each route handles its own errors inline.
- No `panic`/`recover` pattern exists (Node.js convention); failures rely on thrown `Error` objects and `try/catch`.