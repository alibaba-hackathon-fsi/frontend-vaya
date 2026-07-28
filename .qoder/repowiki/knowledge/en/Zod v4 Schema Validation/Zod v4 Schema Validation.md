---
kind: external_dependency
name: Zod v4 Schema Validation
slug: zod-v4
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
---

TypeScript-first schema validation library used as the trust boundary for all API inputs. Zod v4 is specifically configured with its updated API (different from v3) to validate loan profiles, chat messages, and policy queries before they enter the business logic pipeline. Provides runtime type safety and detailed error reporting.