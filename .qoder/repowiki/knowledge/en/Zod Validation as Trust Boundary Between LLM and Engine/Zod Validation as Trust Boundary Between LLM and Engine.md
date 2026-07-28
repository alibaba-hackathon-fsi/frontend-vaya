---
kind: design
name: Zod Validation as Trust Boundary Between LLM and Engine
source: session
category: adr
---

# Zod Validation as Trust Boundary Between LLM and Engine

_Source: coding plans from commit period 9b7f269 → 34be1cc — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The AI layer processes natural language input through LLMs which may produce malformed or incomplete data. Business-critical financial calculations must never receive invalid input. The system needs a strict validation layer between untrusted AI output and deterministic calculation engine.

## Decision drivers
- security - never trust external input directly
- business correctness - financial calculations require valid data
- debugging - clear error messages when input is invalid
- performance - fail fast on bad input before expensive calculations

## Considered options
- **Runtime type checking only** _(rejected)_ — pros: Simple implementation, minimal overhead; cons: No compile-time guarantees, harder to maintain schema consistency
- **Zod schemas as trust boundary** — pros: Compile-time type inference, detailed error messages, well-maintained library, works in both Node.js and browser; cons: Adds ~5KB to bundle if included in client code

## Decision
Use Zod schemas in src/lib/validation/profileSchema.ts as the mandatory trust boundary. All LLM-extracted data and user input must pass through validateProfile() before reaching any engine function. The schema enforces MAX_LOAN (50B VND), MAX_INCOME (1B VND), required field detection, and proper value ranges. Zod is only used in server-side code to avoid client bundle bloat.

## Consequences
Invalid input is rejected early with descriptive error messages. The engine functions remain pure and assume valid input, making them easier to test and reason about. Schema changes automatically propagate type information throughout the system. Client bundles remain free of validation logic since it runs server-side.