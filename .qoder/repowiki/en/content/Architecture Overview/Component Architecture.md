# Component Architecture

<cite>
**Referenced Files in This Document**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [Footer.tsx](file://src/components/Footer.tsx)
- [Hero.tsx](file://src/components/Hero.tsx)
- [CTA.tsx](file://src/components/CTA.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)
- [loanEngine.ts](file://src/lib/loanEngine.ts)
- [route.ts](file://src/app/api/calculate/route.ts)
- [route.ts](file://src/app/api/chat/route.ts)
- [route.ts](file://src/app/api/policy/route.ts)
- [next.config.mjs](file://next.config.mjs)
- [package.json](file://package.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the component architecture of the frontend-vaya application built with Next.js App Router. It covers how server-side rendering and client-side interactivity are combined, the hierarchical structure from page components down to reusable UI components, separation of concerns across layout, business logic, and presentation layers, and patterns for composition, TypeScript integration, state management, and performance optimization.

## Project Structure
The project follows a feature-oriented layout under src:
- app: Next.js App Router pages, layouts, and API routes
- components: Reusable UI components (e.g., Navbar, Footer, Hero, CTA)
- i18n: Internationalization provider and dictionary
- lib: Business logic modules (e.g., loan engine)
- data: Static data used by components and engines

```mermaid
graph TB
subgraph "App Router"
L["layout.tsx"]
P["page.tsx"]
A1["api/calculate/route.ts"]
A2["api/chat/route.ts"]
A3["api/policy/route.ts"]
end
subgraph "Components"
N["Navbar.tsx"]
F["Footer.tsx"]
H["Hero.tsx"]
C["CTA.tsx"]
CA["ChatAdvisor.tsx"]
end
subgraph "i18n"
I18N["I18nProvider.tsx"]
DICT["dict.ts"]
end
subgraph "Lib"
LE["loanEngine.ts"]
end
L --> N
L --> F
P --> H
P --> C
P --> CA
CA --> A2
H --> A1
C --> A3
I18N --> DICT
CA --> LE
```

**Diagram sources**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [Footer.tsx](file://src/components/Footer.tsx)
- [Hero.tsx](file://src/components/Hero.tsx)
- [CTA.tsx](file://src/components/CTA.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)
- [loanEngine.ts](file://src/lib/loanEngine.ts)
- [route.ts](file://src/app/api/calculate/route.ts)
- [route.ts](file://src/app/api/chat/route.ts)
- [route.ts](file://src/app/api/policy/route.ts)

**Section sources**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [next.config.mjs](file://next.config.mjs)
- [package.json](file://package.json)

## Core Components
- Layout layer: layout.tsx defines global shell, metadata, and providers (e.g., i18n). It composes Navbar and Footer to ensure consistent chrome across pages.
- Page layer: page.tsx composes page-specific sections such as Hero, CTA, and ChatAdvisor. It orchestrates data fetching and client interactions.
- Presentation components: Navbar, Footer, Hero, CTA focus on rendering UI and handling local state. They receive props via TypeScript interfaces for type safety.
- Client-only features: ChatAdvisor handles chat interactions using client hooks and calls API routes for AI responses.

Key responsibilities:
- layout.tsx: Global structure, providers, SSR base
- page.tsx: Page composition and orchestration
- Navbar.tsx: Navigation UI and active state
- Footer.tsx: Site footer content
- Hero.tsx: Hero section with call-to-action
- CTA.tsx: Conversion-focused action block
- ChatAdvisor.tsx: Client-side chat flow and API integration

**Section sources**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [Footer.tsx](file://src/components/Footer.tsx)
- [Hero.tsx](file://src/components/Hero.tsx)
- [CTA.tsx](file://src/components/CTA.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)

## Architecture Overview
Next.js App Router enables server-rendered HTML with selective client hydration. The root layout renders shared chrome and providers. Pages compose sections that may be static or interactive. Client components handle user input and call server routes for business operations.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant NextSSR as "Next.js SSR"
participant Layout as "layout.tsx"
participant Page as "page.tsx"
participant Section as "Hero/CTA/ChatAdvisor"
participant API as "API Routes"
Browser->>NextSSR : "GET /"
NextSSR->>Layout : "Render layout (server)"
Layout-->>NextSSR : "HTML + Providers"
NextSSR->>Page : "Render page (server)"
Page-->>NextSSR : "HTML + Client Components"
NextSSR-->>Browser : "Initial HTML"
Browser->>Section : "Hydrate client components"
Section->>API : "POST /api/chat (interactive)"
API-->>Section : "JSON response"
Section-->>Browser : "Update UI"
```

**Diagram sources**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [route.ts](file://src/app/api/chat/route.ts)

## Detailed Component Analysis

### Layout Layer (layout.tsx)
- Provides global shell, metadata, and providers (e.g., i18n).
- Composes Navbar and Footer to maintain consistent navigation and branding.
- Ensures SSR baseline while allowing client components to hydrate within children.

```mermaid
classDiagram
class Layout {
+children
+providers
+metadata
}
class Navbar {
+items
+activeRoute
}
class Footer {
+links
+copyright
}
Layout --> Navbar : "composes"
Layout --> Footer : "composes"
```

**Diagram sources**
- [layout.tsx](file://src/app/layout.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [Footer.tsx](file://src/components/Footer.tsx)

**Section sources**
- [layout.tsx](file://src/app/layout.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [Footer.tsx](file://src/components/Footer.tsx)

### Page Composition (page.tsx)
- Assembles page sections: Hero, CTA, ChatAdvisor.
- Orchestrates data fetching and passes props to components.
- Uses client components where interactivity is required.

```mermaid
flowchart TD
Start(["Page Render"]) --> LoadData["Load page data (if any)"]
LoadData --> ComposeSections["Compose Hero, CTA, ChatAdvisor"]
ComposeSections --> HydrateClient["Hydrate client components"]
HydrateClient --> End(["Interactive UI Ready"])
```

**Diagram sources**
- [page.tsx](file://src/app/page.tsx)
- [Hero.tsx](file://src/components/Hero.tsx)
- [CTA.tsx](file://src/components/CTA.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)

**Section sources**
- [page.tsx](file://src/app/page.tsx)

### Presentation Components
- Navbar.tsx: Renders navigation items, highlights active route, supports responsive behavior.
- Footer.tsx: Displays links and copyright information; minimal state.
- Hero.tsx: Presents primary messaging and initial call-to-action; may include lightweight animations.
- CTA.tsx: Drives conversions; can trigger actions like opening chat or navigating.

Typical prop interface patterns:
- Title, subtitle, and action handlers for Hero and CTA
- Navigation items and active route for Navbar
- Content blocks and links for Footer

State management approaches:
- Local state via useState for UI toggles and form inputs
- Event-driven updates without global state for simple flows

TypeScript integration:
- Interfaces define prop contracts ensuring compile-time checks
- Enums or union types for route states and action types

**Section sources**
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [Footer.tsx](file://src/components/Footer.tsx)
- [Hero.tsx](file://src/components/Hero.tsx)
- [CTA.tsx](file://src/components/CTA.tsx)

### Client Interactivity (ChatAdvisor.tsx)
- Handles chat conversation state and messages
- Calls API routes for AI responses and policy calculations
- Updates UI reactively based on server responses

```mermaid
sequenceDiagram
participant User as "User"
participant Chat as "ChatAdvisor.tsx"
participant API as "/api/chat/route.ts"
participant Engine as "loanEngine.ts"
User->>Chat : "Send message"
Chat->>API : "POST chat payload"
API->>Engine : "Process request"
Engine-->>API : "Result"
API-->>Chat : "Response JSON"
Chat-->>User : "Updated conversation"
```

**Diagram sources**
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [route.ts](file://src/app/api/chat/route.ts)
- [loanEngine.ts](file://src/lib/loanEngine.ts)

**Section sources**
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [route.ts](file://src/app/api/chat/route.ts)
- [loanEngine.ts](file://src/lib/loanEngine.ts)

### Internationalization (I18nProvider.tsx and dict.ts)
- I18nProvider wraps the app to provide language context
- dict.ts holds translation keys and values
- Components consume i18n context to render localized text

```mermaid
classDiagram
class I18nProvider {
+locale
+messages
+t(key)
}
class Dict {
+en
+vi
}
I18nProvider --> Dict : "consumes"
```

**Diagram sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

### Business Logic Integration (loanEngine.ts)
- Encapsulates core calculations and rule evaluation
- Used by API routes and client components through well-defined functions
- Keeps UI components free from complex logic

```mermaid
flowchart TD
Input["Input parameters"] --> Validate["Validate inputs"]
Validate --> Compute["Compute results"]
Compute --> Format["Format output"]
Format --> Output["Return structured result"]
```

**Diagram sources**
- [loanEngine.ts](file://src/lib/loanEngine.ts)

**Section sources**
- [loanEngine.ts](file://src/lib/loanEngine.ts)

## Dependency Analysis
Component dependencies follow a clear hierarchy:
- layout.tsx depends on Navbar and Footer
- page.tsx depends on Hero, CTA, and ChatAdvisor
- ChatAdvisor depends on API routes and loanEngine
- I18nProvider provides context consumed by components

```mermaid
graph LR
Layout["layout.tsx"] --> Navbar["Navbar.tsx"]
Layout --> Footer["Footer.tsx"]
Page["page.tsx"] --> Hero["Hero.tsx"]
Page --> CTA["CTA.tsx"]
Page --> Chat["ChatAdvisor.tsx"]
Chat --> API_Chat["/api/chat/route.ts"]
Chat --> Engine["loanEngine.ts"]
I18N["I18nProvider.tsx"] --> Dict["dict.ts"]
```

**Diagram sources**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [Footer.tsx](file://src/components/Footer.tsx)
- [Hero.tsx](file://src/components/Hero.tsx)
- [CTA.tsx](file://src/components/CTA.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [route.ts](file://src/app/api/chat/route.ts)
- [loanEngine.ts](file://src/lib/loanEngine.ts)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

**Section sources**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [loanEngine.ts](file://src/lib/loanEngine.ts)

## Performance Considerations
- Use React.memo for pure presentation components to avoid unnecessary re-renders
- Apply lazy loading for heavy client components or charts to reduce initial bundle size
- Keep server components for data-heavy sections; hydrate only what is interactive
- Prefer static generation or server-side rendering for SEO-critical content
- Minimize prop drilling by using context (e.g., i18n) or component composition
- Debounce or throttle expensive client-side operations (e.g., search, analytics)

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Hydration mismatches: Ensure client and server render identical markup; avoid browser-only APIs during SSR
- API route errors: Validate payloads and handle exceptions gracefully; log server-side errors
- State synchronization: Use controlled components and explicit event handlers to keep UI in sync
- Type errors: Update interfaces when props change; run TypeScript compiler to catch inconsistencies
- Performance regressions: Profile with React DevTools; identify unnecessary re-renders and optimize memoization

**Section sources**
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [route.ts](file://src/app/api/chat/route.ts)

## Conclusion
The frontend-vaya application leverages Next.js App Router to deliver fast, SEO-friendly pages with selective client interactivity. The architecture cleanly separates layout, page composition, and presentation concerns, while integrating business logic through dedicated modules. TypeScript ensures type safety across the component hierarchy, and performance optimizations like memoization and lazy loading keep the app responsive. This structure scales well as new features and pages are added.