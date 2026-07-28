# Internationalization

<cite>
**Referenced Files in This Document**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
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
10. [Appendices](#appendices)

## Introduction
This document explains the internationalization (i18n) system used by the frontend-vaya application. It focuses on how translations are organized, how language switching is provided to components, and how to add or update translations consistently across the app. The i18n implementation centers around a provider component that exposes translation utilities and locale state throughout the React tree, and a dictionary file that stores all localized strings.

## Project Structure
The i18n system is implemented under src/i18n with two primary files:
- I18nProvider.tsx: Provides translation context, manages current language, and exposes helper functions to consumers.
- dict.ts: Holds the complete dictionary of translations keyed by language and category.

These are consumed by the application layout and various UI components to render localized content.

```mermaid
graph TB
subgraph "App Shell"
L["layout.tsx"]
P["page.tsx"]
end
subgraph "i18n"
PVT["I18nProvider.tsx"]
DICT["dict.ts"]
end
subgraph "Components"
CA["ChatAdvisor.tsx"]
NAV["Navbar.tsx"]
end
L --> PVT
P --> PVT
PVT --> DICT
CA --> PVT
NAV --> PVT
```

**Diagram sources**
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)
- [layout.tsx](file://src/app/layout.tsx)
- [page.tsx](file://src/app/page.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)

## Core Components
- I18nProvider
  - Responsibilities:
    - Maintain the current locale and expose it via React context.
    - Provide a translation function that resolves keys from the dictionary for the active language.
    - Expose methods to change the active language and persist preferences if needed.
    - Offer helpers for formatting numbers and dates based on the active locale.
  - Integration:
    - Wrapped around the application root so all descendant components can access translations without prop drilling.
- Dictionary (dict.ts)
  - Responsibilities:
    - Store all localized strings grouped by language and logical categories.
    - Provide a consistent key structure to ensure uniform usage across components.
  - Structure:
    - Top-level keys represent languages.
    - Under each language, keys represent categories (e.g., common, chat, navbar).
    - Within each category, keys map to string values.

Usage patterns:
- Components consume the provider’s translation function to render text.
- Language switching updates the provider’s state, causing re-renders with new locale-specific content.

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

## Architecture Overview
The i18n architecture follows a provider-consumer pattern:
- The provider holds locale state and translation resolution logic.
- Consumers (pages and components) call into the provider’s API to get localized strings and format values.
- The dictionary is the single source of truth for all text content.

```mermaid
sequenceDiagram
participant App as "Application Root"
participant Provider as "I18nProvider"
participant Dict as "Dictionary (dict.ts)"
participant Comp as "Component"
App->>Provider : Initialize with default language
Provider->>Dict : Load base dictionary
Comp->>Provider : t("category.key")
Provider-->>Comp : Localized string
Comp->>Provider : setLanguage(newLocale)
Provider->>Dict : Switch to new locale's entries
Provider-->>Comp : Re-render with new locale
```

**Diagram sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

## Detailed Component Analysis

### I18nProvider
- State and Context
  - Maintains current language code and provides a context value containing:
    - Translation function
    - Language setter
    - Locale-aware formatters (numbers, dates)
- Translation Resolution
  - Looks up keys within the active language’s dictionary.
  - Supports nested keys using dot notation.
  - Returns fallbacks when keys are missing.
- Language Switching
  - Updates the active language and triggers re-renders.
  - Can integrate with persistence mechanisms (e.g., cookies or localStorage) if configured.
- Formatting Utilities
  - Numbers: Uses the active locale for decimal separators, grouping, and currency formatting.
  - Dates: Uses the active locale for date/time formats.

```mermaid
classDiagram
class I18nProvider {
+state : currentLanguage
+contextValue : { t, setLanguage, formatDate, formatNumber }
+t(key) : string
+setLanguage(locale) : void
+formatDate(value, options) : string
+formatNumber(value, options) : string
}
class Dictionary {
+[language] : { [category] : { [key] : string } }
}
I18nProvider --> Dictionary : "reads"
```

**Diagram sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)

### Dictionary Structure
- Organization
  - Grouped by language codes (e.g., en, vi).
  - Each language contains categories such as common, chat, navbar, etc.
  - Keys should be descriptive and stable to avoid breaking changes.
- Best Practices
  - Use consistent naming conventions across languages.
  - Avoid embedding dynamic data in static strings; use placeholders where appropriate.
  - Keep pluralization rules separate from singular forms when necessary.

```mermaid
flowchart TD
Start(["Add New Translation"]) --> ChooseLang["Select Target Language"]
ChooseLang --> OpenDict["Open dict.ts"]
OpenDict --> LocateCategory["Locate Category"]
LocateCategory --> AddKey["Add Key and Value"]
AddKey --> ValidateConsistency{"Consistent Across Languages?"}
ValidateConsistency --> |No| SyncMissing["Sync Missing Keys"]
ValidateConsistency --> |Yes| Commit["Commit Changes"]
SyncMissing --> Commit
Commit --> End(["Done"])
```

**Diagram sources**
- [dict.ts](file://src/i18n/dict.ts)

**Section sources**
- [dict.ts](file://src/i18n/dict.ts)

### Using Translations in Components
- Consuming the translation function
  - Import the provider’s hook or context to access the translation function.
  - Call the translation function with a category.key path to retrieve localized text.
- Pluralization
  - If supported by the provider, pass count and choose between singular/plural keys.
  - Otherwise, implement conditional rendering based on counts.
- Formatting
  - Use the provider’s number formatter for currency, decimals, and units.
  - Use the provider’s date formatter for display dates and times.

```mermaid
sequenceDiagram
participant Comp as "Component"
participant Provider as "I18nProvider"
participant Dict as "Dictionary"
Comp->>Provider : t("common.welcome")
Provider->>Dict : Resolve "common.welcome" for current language
Dict-->>Provider : String value
Provider-->>Comp : Localized string
Comp->>Provider : formatNumber(amount, { style : "currency" })
Provider-->>Comp : Formatted number
Comp->>Provider : formatDate(date, { weekday : "long" })
Provider-->>Comp : Formatted date
```

**Diagram sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

### Language Detection and Fallback Strategy
- Detection
  - Determine initial language from browser settings, URL parameters, or stored preferences.
- Fallback
  - If a requested key is missing in the active language, fall back to a default language (e.g., English).
  - Ensure critical UI strings always have a fallback to prevent blank content.

```mermaid
flowchart TD
Init["Initialize i18n"] --> Detect["Detect Preferred Language"]
Detect --> SetActive["Set Active Language"]
SetActive --> Render["Render Content"]
Render --> Lookup["Lookup Key"]
Lookup --> Found{"Key Found?"}
Found --> |Yes| ReturnVal["Return Localized Value"]
Found --> |No| Fallback["Use Default Language"]
Fallback --> ReturnFallback["Return Fallback Value"]
ReturnVal --> End(["Done"])
ReturnFallback --> End
```

**Diagram sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

### Dynamic Language Loading
- Static vs Dynamic
  - Current implementation loads the entire dictionary at startup.
- Potential Enhancement
  - Split dictionaries per language and load on demand to reduce initial bundle size.
  - Cache loaded languages to avoid repeated network requests.

```mermaid
sequenceDiagram
participant App as "Application"
participant Provider as "I18nProvider"
participant Loader as "Dynamic Loader"
participant Dict as "Dictionary"
App->>Provider : Request language "vi"
Provider->>Loader : Load "vi" dictionary
Loader-->>Provider : Return "vi" entries
Provider->>Dict : Merge into active dictionary
Provider-->>App : Ready to translate in "vi"
```

**Diagram sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

## Dependency Analysis
- Internal Dependencies
  - I18nProvider depends on dict.ts for translation data.
  - Components depend on I18nProvider for translation and formatting APIs.
- External Dependencies
  - Check package.json for any i18n libraries or utilities used (if present).
- Coupling
  - Low coupling between components and i18n due to context-based consumption.
  - High cohesion within i18n module (provider and dictionary).

```mermaid
graph LR
Dict["dict.ts"] --> Provider["I18nProvider.tsx"]
Provider --> Page["page.tsx"]
Provider --> Layout["layout.tsx"]
Provider --> ChatAdvisor["ChatAdvisor.tsx"]
Provider --> Navbar["Navbar.tsx"]
```

**Diagram sources**
- [dict.ts](file://src/i18n/dict.ts)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [page.tsx](file://src/app/page.tsx)
- [layout.tsx](file://src/app/layout.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)

**Section sources**
- [dict.ts](file://src/i18n/dict.ts)
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [page.tsx](file://src/app/page.tsx)
- [layout.tsx](file://src/app/layout.tsx)
- [ChatAdvisor.tsx](file://src/components/ChatAdvisor.tsx)
- [Navbar.tsx](file://src/components/Navbar.tsx)
- [package.json](file://package.json)

## Performance Considerations
- Bundle Size
  - Keeping all translations in a single dictionary increases initial load. Consider lazy loading per language.
- Rendering
  - Language changes trigger re-renders; minimize unnecessary re-renders by memoizing components that consume translations.
- Formatting
  - Format numbers and dates only when needed; cache formatted results for frequently displayed values.

## Troubleshooting Guide
- Missing Keys
  - Ensure all keys exist in the active language; configure fallbacks to avoid empty strings.
- Incorrect Language Code
  - Verify language codes match those defined in the dictionary.
- Formatting Issues
  - Confirm locale identifiers are valid and supported by the runtime environment.
- Testing Multilingual Features
  - Write tests that switch languages and assert rendered text matches expected translations.
  - Mock the provider to isolate translation behavior.

**Section sources**
- [I18nProvider.tsx](file://src/i18n/I18nProvider.tsx)
- [dict.ts](file://src/i18n/dict.ts)

## Conclusion
The i18n system in frontend-vaya uses a straightforward provider-dictionary model to deliver localized content. By centralizing translation logic and data, it ensures consistency and ease of maintenance. Following the best practices outlined here will help you scale translations, improve performance, and maintain a smooth user experience across languages.

## Appendices

### Adding a New Language
- Steps
  - Add a new top-level language key in the dictionary.
  - Populate all categories with corresponding translations.
  - Update language detection to include the new code.
  - Test language switching and verify all keys resolve correctly.

### Right-to-Left (RTL) Support
- Considerations
  - Detect RTL locales and apply appropriate CSS direction.
  - Ensure layouts accommodate mirrored navigation and alignment.
  - Test components with RTL text to validate visual correctness.

### Testing Multilingual Functionality
- Unit Tests
  - Assert translation function returns correct strings for given keys.
  - Verify fallback behavior when keys are missing.
- Integration Tests
  - Simulate language switching and check UI updates accordingly.
  - Validate number and date formatting for different locales.