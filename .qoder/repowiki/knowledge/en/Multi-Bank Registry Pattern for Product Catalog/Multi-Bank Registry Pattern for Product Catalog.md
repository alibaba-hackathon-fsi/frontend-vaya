---
kind: design
name: Multi-Bank Registry Pattern for Product Catalog
source: session
category: adr
---

# Multi-Bank Registry Pattern for Product Catalog

_Source: coding plans from commit period 9b7f269 → 34be1cc — records intent at planning time; the implementation may lag or differ._

**Status:** accepted

## Context
The system needs to support multiple Vietnamese banks (starting with Vietcombank) with their specific loan products, eligibility rules, and scenarios. Data comes from both the old repository JSON files and Excel spreadsheets containing official bank product information.

## Decision drivers
- bank-agnostic architecture for future expansion
- typed data validation at import time
- separation of data from calculation logic
- support for different bank-specific rules and scenarios

## Considered options
- **Single monolithic product database** _(rejected)_ — pros: Simple queries, easy to add new fields; cons: Tight coupling between banks, hard to maintain bank-specific variations, violates separation of concerns
- **Per-bank TypeScript modules with registry** — pros: Type safety per bank, easy to add new banks by copying template, clear ownership boundaries, supports bank-specific features; cons: More files to manage, requires consistent interface across banks

## Decision
Implement a registry pattern where each bank has its own TypeScript module (src/data/products/vietcombank.ts) exporting typed product definitions, with a central index.ts providing bank-agnostic access methods. This allows adding new banks by creating a new module following the same interface while keeping the rest of the system unchanged.

## Consequences
New banks can be added by creating a new file in src/data/products/ without modifying existing code. Each bank's products are fully typed against shared engine types. The demo ships with Vietcombank only, but the architecture supports unlimited banks. Data mapping from Excel Vietnamese fields to TypeScript types happens during the port phase.